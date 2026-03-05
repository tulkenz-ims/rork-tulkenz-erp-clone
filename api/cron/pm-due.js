// api/cron/pm-due.js
// Vercel Cron Job — Auto-posts due PM Schedules to Task Feed
// Runs daily at 6:00 AM CST (12:00 UTC)
// Protected by CRON_SECRET environment variable
//
// SETUP:
// 1. Create folder: api/cron/ in your project root
// 2. Place this file at: api/cron/pm-due.js
// 3. Add CRON_SECRET to Vercel Environment Variables (any random string you make up)
// 4. Add cron config to vercel.json (see bottom of file)
// 5. Deploy — Vercel handles the rest

const { createClient } = require('@supabase/supabase-js');

// ══════════════════════════════════ CONFIG ══════════════════════════════════

const FREQUENCY_DAYS = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
};

const DEPARTMENT_NAMES = {
  '1000': 'Projects / Offices',
  '1001': 'Maintenance',
  '1002': 'Sanitation',
  '1003': 'Production',
  '1004': 'Quality',
  '1005': 'Safety',
  '1006': 'HR',
  '1008': 'Warehouse',
  '1009': 'IT / Technology',
};

// ══════════════════════════════════ HELPERS ══════════════════════════════════

function generatePostNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(100000 + Math.random() * 900000));
  return `TF-${yy}${mm}${dd}-${rand}`;
}

function calculateNextDue(frequency, scheduleDays) {
  const now = new Date();
  const days = FREQUENCY_DAYS[frequency] || 30;

  // For daily/weekly/biweekly with specific days, find next matching day
  if ((frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly') && scheduleDays && scheduleDays.length > 0) {
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDays = scheduleDays.map(d => dayMap[d]).filter(d => d !== undefined).sort((a, b) => a - b);

    if (targetDays.length > 0) {
      const currentDay = now.getDay();
      // Find the next scheduled day after today
      let nextDay = targetDays.find(d => d > currentDay);
      let daysUntil;

      if (nextDay !== undefined) {
        daysUntil = nextDay - currentDay;
      } else {
        // Wrap to next week
        nextDay = targetDays[0];
        daysUntil = 7 - currentDay + nextDay;
      }

      // For biweekly, add an extra week
      if (frequency === 'biweekly') {
        daysUntil += 7;
      }

      const nextDue = new Date(now);
      nextDue.setDate(nextDue.getDate() + daysUntil);
      return nextDue.toISOString();
    }
  }

  // Default: add frequency days
  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + days);
  return nextDue.toISOString();
}

function buildTaskList(tasks) {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return '';
  return '\n\nTasks:\n' + tasks
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((t, i) => `${i + 1}. ${t.description}${t.required ? ' (Required)' : ''}`)
    .join('\n');
}

function buildSafetyNotes(safety) {
  if (!safety) return '';
  const parts = [];
  if (safety.lotoRequired) {
    parts.push('⚠️ LOTO REQUIRED');
    if (safety.lotoSteps && safety.lotoSteps.length > 0) {
      parts.push('LOTO Steps: ' + safety.lotoSteps
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(s => s.description)
        .join(' → '));
    }
  }
  if (safety.permits && safety.permits.length > 0) {
    parts.push('Permits: ' + safety.permits.join(', '));
  }
  if (safety.ppeRequired && safety.ppeRequired.length > 0) {
    parts.push('PPE: ' + safety.ppeRequired.join(', '));
  }
  return parts.length > 0 ? '\n\n' + parts.join('\n') : '';
}

// ══════════════════════════════════ MAIN HANDLER ══════════════════════════════════

module.exports = async (req, res) => {
  // ── Security check ──
  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Init Supabase with service role (bypasses RLS) ──
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  const todayISO = now.toISOString();
  const results = { processed: 0, posted: 0, errors: [], skipped: 0 };

  try {
    // ── Step 1: Find all active PMs that are due ──
    const { data: duePMs, error: fetchError } = await supabase
      .from('pm_schedules')
      .select('*')
      .eq('active', true)
      .lte('next_due', todayISO)
      .order('next_due', { ascending: true });

    if (fetchError) {
      console.error('Error fetching due PMs:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch PM schedules', details: fetchError.message });
    }

    if (!duePMs || duePMs.length === 0) {
      console.log('No PMs due today');
      return res.status(200).json({ message: 'No PMs due', ...results });
    }

    console.log(`Found ${duePMs.length} due PM(s)`);

    // ── Step 2: Process each due PM ──
    for (const pm of duePMs) {
      results.processed++;

      try {
        const departments = pm.departments || ['1001'];
        const tasks = pm.tasks || [];
        const safety = pm.safety || {};
        const postNumber = generatePostNumber();

        // Build the notes from PM details
        const notes = [
          `[AUTO] Preventive Maintenance — ${pm.name}`,
          pm.description || '',
          `Equipment: ${pm.equipment_name || 'N/A'} (${pm.equipment_tag || 'N/A'})`,
          `Frequency: ${pm.frequency || 'N/A'} | Priority: ${pm.priority || 'medium'}`,
          `Est. Hours: ${pm.estimated_hours || 'N/A'}`,
          pm.assigned_name ? `Assigned To: ${pm.assigned_name}` : '',
          buildTaskList(tasks),
          buildSafetyNotes(safety),
        ].filter(Boolean).join('\n');

        // ── Create PM Work Order ──
        const woNumber = `WO-PM-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(100000 + Math.random() * 900000))}`;

        const woData = {
          organization_id: pm.organization_id,
          work_order_number: woNumber,
          title: `PM: ${pm.name}`,
          description: pm.description || `Preventive Maintenance — ${pm.name}\nEquipment: ${pm.equipment_name || 'N/A'} (${pm.equipment_tag || 'N/A'})\nFrequency: ${pm.frequency}`,
          status: 'open',
          priority: pm.priority || 'medium',
          type: 'preventive',
          source: 'pm_schedule',
          source_id: pm.id,
          assigned_to: pm.assigned_to || null,
          assigned_name: pm.assigned_name || null,
          facility_id: pm.facility_id || null,
          equipment_id: pm.equipment_id || null,
          equipment: pm.equipment_name || null,
          location: pm.equipment_name || null,
          due_date: new Date().toISOString().split('T')[0],
          estimated_hours: pm.estimated_hours || null,
          department: '1001',
          department_name: 'Maintenance',
          tasks: tasks.length > 0 ? tasks : null,
          safety: (safety.lotoRequired || (safety.permits && safety.permits.length > 0) || (safety.ppeRequired && safety.ppeRequired.length > 0)) ? safety : null,
          attachments: {
            photos: pm.photos || [],
            documents: pm.documents || [],
          },
        };

        const { data: newWO, error: woError } = await supabase
          .from('work_orders')
          .insert(woData)
          .select('id, work_order_number')
          .single();

        if (woError) {
          console.error(`Error creating PM work order for PM ${pm.id}:`, woError);
          results.errors.push({ pm_id: pm.id, pm_name: pm.name, error: 'Work order: ' + woError.message });
          continue;
        }

        console.log(`✓ Created PM Work Order ${woNumber} for "${pm.name}"`);

        // ── Insert Task Feed Post (linked to work order) ──
        const postData = {
          organization_id: pm.organization_id,
          post_number: postNumber,
          template_id: null,
          template_name: `PM: ${pm.name}`,
          template_snapshot: null,
          created_by_id: null,
          created_by_name: 'PM Auto-Scheduler',
          facility_id: pm.facility_id || null,
          location_id: null,
          location_name: pm.equipment_name || null,
          form_data: {
            pm_schedule_id: pm.id,
            work_order_id: newWO.id,
            work_order_number: newWO.work_order_number,
            equipment_name: pm.equipment_name,
            equipment_tag: pm.equipment_tag,
            equipment_id: pm.equipment_id,
            frequency: pm.frequency,
            priority: pm.priority,
            estimated_hours: pm.estimated_hours,
            tasks: tasks,
            safety: safety,
            auto_generated: true,
            generated_at: todayISO,
            work_order_type: 'preventive',
          },
          photo_url: (pm.photos && pm.photos.length > 0) ? pm.photos[0] : null,
          additional_photos: (pm.photos && pm.photos.length > 1) ? pm.photos.slice(1) : [],
          notes: notes,
          status: 'pending',
          total_departments: departments.length,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: false,
          reporting_department: '1001',
          reporting_department_name: 'Maintenance',
        };

        const { data: newPost, error: postError } = await supabase
          .from('task_feed_posts')
          .insert(postData)
          .select('id')
          .single();

        if (postError) {
          console.error(`Error creating post for PM ${pm.id}:`, postError);
          results.errors.push({ pm_id: pm.id, pm_name: pm.name, error: postError.message });
          continue;
        }

        // ── Insert Department Tasks ──
        const deptTasks = departments.map(deptCode => ({
          organization_id: pm.organization_id,
          post_id: newPost.id,
          post_number: postNumber,
          department_code: deptCode,
          department_name: DEPARTMENT_NAMES[deptCode] || `Dept ${deptCode}`,
          status: 'pending',
          module_reference_type: 'pm_work_order',
          module_reference_id: newWO.id,
          is_original: true,
          priority: pm.priority || 'medium',
        }));

        const { error: deptError } = await supabase
          .from('task_feed_department_tasks')
          .insert(deptTasks);

        if (deptError) {
          console.error(`Error creating dept tasks for PM ${pm.id}:`, deptError);
          results.errors.push({ pm_id: pm.id, pm_name: pm.name, error: 'Dept tasks: ' + deptError.message });
        }

        // ── Insert Task Verification (so it appears in feed) ──
        const { error: tvError } = await supabase
          .from('task_verifications')
          .insert({
            organization_id: pm.organization_id,
            department_code: '1001',
            department_name: 'Maintenance',
            facility_code: pm.facility_id || null,
            location_id: null,
            location_name: pm.equipment_name || 'N/A',
            category_id: 'pm-auto',
            category_name: 'Preventive Maintenance',
            action: `PM: ${pm.name}`,
            notes: notes,
            photo_uri: (pm.photos && pm.photos.length > 0) ? pm.photos[0] : null,
            employee_id: null,
            employee_name: 'PM Auto-Scheduler',
            status: 'verified',
            source_type: 'task_feed_post',
            source_id: newPost.id,
            source_number: postNumber,
            linked_work_order_id: newWO.id,
          });

        if (tvError) {
          console.error(`Error creating task verification for PM ${pm.id}:`, tvError);
          results.errors.push({ pm_id: pm.id, pm_name: pm.name, error: 'Task verification: ' + tvError.message });
        }

        // ── Update PM Schedule: advance next_due ──
        const newNextDue = calculateNextDue(pm.frequency, pm.schedule_days);

        const { error: updateError } = await supabase
          .from('pm_schedules')
          .update({
            next_due: newNextDue,
            last_completed: todayISO,
          })
          .eq('id', pm.id);

        if (updateError) {
          console.error(`Error updating next_due for PM ${pm.id}:`, updateError);
          results.errors.push({ pm_id: pm.id, pm_name: pm.name, error: 'Update next_due: ' + updateError.message });
        }

        results.posted++;
        console.log(`✓ Posted PM "${pm.name}" → ${postNumber} | WO: ${woNumber} | ${departments.length} depts | Next due: ${newNextDue}`);

        } catch (pmError) {
        console.error(`Unexpected error processing PM ${pm.id}:`, pmError);
        results.errors.push({ pm_id: pm.id, pm_name: pm.name, error: pmError.message });
      }
    }

    console.log(`Done: ${results.posted}/${results.processed} posted, ${results.errors.length} errors`);
    return res.status(200).json({
      message: `Processed ${results.processed} PM(s)`,
      ...results,
    });

  } catch (err) {
    console.error('Cron job failed:', err);
    return res.status(500).json({ error: 'Cron job failed', details: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// VERCEL.JSON — Add this to your existing vercel.json:
//
// {
//   "crons": [
//     {
//       "path": "/api/cron/pm-due",
//       "schedule": "0 12 * * *"
//     }
//   ]
// }
//
// Schedule: "0 12 * * *" = every day at 12:00 UTC = 6:00 AM CST
//
// ENVIRONMENT VARIABLES NEEDED (in Vercel dashboard):
// - CRON_SECRET: any random string you make up (e.g. "tulkenz-pm-cron-2026-secret")
// - NEXT_PUBLIC_SUPABASE_URL: (you already have this)
// - SUPABASE_SERVICE_ROLE_KEY: (you already have this)
// ══════════════════════════════════════════════════════════════════════════════
