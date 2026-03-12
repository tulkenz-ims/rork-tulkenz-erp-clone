// api/cron/sanitation-due.js
// Vercel Cron Job — Auto-generates Sanitation Work Orders from Templates
// Runs every hour to catch hourly + per_shift + daily tasks
// Protected by CRON_SECRET environment variable

const { createClient } = require('@supabase/supabase-js');

// ══════════════════════════════════ CONFIG ══════════════════════════════════

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

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

// How often each frequency generates a work order
// Cron runs hourly — this controls which frequencies fire on each run
const FREQUENCY_HOURS = {
  hourly:     1,
  per_shift:  8,    // 3 shifts = every 8 hours
  pre_op:     8,
  daily:      24,
  weekly:     168,
  monthly:    720,
  quarterly:  2160,
  annual:     8760,
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

function generateWONumber(supabase) {
  // Uses the DB function created in Phase 1
  return supabase.rpc('generate_san_wo_number');
}

function calculateNextDue(frequency, hourlyIntervalMin) {
  const now = new Date();

  // Hourly — use hourly_interval_min if set, otherwise 60 min
  if (frequency === 'hourly') {
    const intervalMin = hourlyIntervalMin || 60;
    return new Date(now.getTime() + intervalMin * 60 * 1000).toISOString();
  }

  const hours = FREQUENCY_HOURS[frequency] || 24;
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function isDue(nextDueDateStr) {
  if (!nextDueDateStr) return true; // Never run — run now
  return new Date(nextDueDateStr) <= new Date();
}

function buildChecklistFromTemplate(checklistItems) {
  // Converts template checklist_items array into
  // work order checklist_completion tracking structure
  if (!checklistItems || !Array.isArray(checklistItems)) return [];
  return checklistItems.map((item, i) => ({
    id: i,
    label: typeof item === 'string' ? item : item.label,
    completed: false,
    completed_at: null,
  }));
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
    // ── Step 1: Fetch all active sanitation templates ──
    const { data: templates, error: fetchError } = await supabase
      .from('sanitation_templates')
      .select('*')
      .eq('is_active', true)
      .eq('org_id', ORG_ID)
      .order('next_due_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching sanitation templates:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch sanitation templates',
        details: fetchError.message,
      });
    }

    if (!templates || templates.length === 0) {
      console.log('No active sanitation templates found');
      return res.status(200).json({ message: 'No templates found', ...results });
    }

    console.log(`Found ${templates.length} active template(s)`);

    // ── Step 2: Process each template ──
    for (const template of templates) {
      results.processed++;

      try {
        // Skip if not due yet
        if (!isDue(template.next_due_date)) {
          results.skipped++;
          console.log(`⏭ Skipping "${template.task_name}" — not due until ${template.next_due_date}`);
          continue;
        }

        const departments = template.departments_notified && template.departments_notified.length > 0
          ? template.departments_notified
          : [1002]; // Default to Sanitation dept

        const postNumber = generatePostNumber();

        // ── Generate WO number via DB function ──
        const { data: woNumberData, error: woNumError } = await generateWONumber(supabase);
        if (woNumError) {
          console.error(`Error generating WO number for template ${template.id}:`, woNumError);
          results.errors.push({ template_id: template.id, error: 'WO number: ' + woNumError.message });
          continue;
        }
        const woNumber = woNumberData;

        // ── Step 3: Create sanitation_work_orders record ──
        const woData = {
          org_id: ORG_ID,
          wo_number: woNumber,
          template_id: template.id,
          template_code: template.task_code || null,
          task_name: template.task_name,
          room: template.room,
          area_description: template.area_description || null,
          equipment: template.equipment || null,
          ssop_id: template.ssop_id || null,
          department_id: template.department_id || 1002,
          departments_notified: departments,
          frequency: template.frequency,
          scheduled_date: now.toISOString().split('T')[0],
          due_date: todayISO,
          is_preop: template.is_preop || false,
          requires_qa_signoff: template.requires_qa_signoff || false,
          requires_atp_test: template.requires_atp_test || false,
          atp_pass_threshold: template.atp_pass_threshold || 250,
          status: 'pending',
          assigned_to: null,       // Filled when tech taps Start
          assigned_user_id: null,  // Filled when tech taps Start
          chemical_used: template.chemical_name || null,
          actual_concentration: null,
          contact_time_min: template.contact_time_min || null,
          application_method: template.method || null,
          checklist_completion: buildChecklistFromTemplate(template.checklist_items),
          atp_reading: null,
          atp_result: null,
          photos: [],
          tech_initial: null,
          tech_ppn: null,
          tech_signed_at: null,
          qa_initial: null,
          qa_ppn: null,
          qa_signed_at: null,
          qa_user_id: null,
          completed_at: null,
          notes: null,
          task_feed_post_id: null,
          post_status: 'pending',
        };

        const { data: newWO, error: woError } = await supabase
          .from('sanitation_work_orders')
          .insert(woData)
          .select('id, wo_number')
          .single();

        if (woError) {
          console.error(`Error creating WO for template ${template.id}:`, woError);
          results.errors.push({
            template_id: template.id,
            template_name: template.task_name,
            error: 'Work order: ' + woError.message,
          });
          continue;
        }

        console.log(`✓ Created Sanitation WO ${woNumber} for "${template.task_name}"`);

        // ── Step 4: Build task feed post notes ──
        const notes = [
          `[AUTO] Sanitation Task — ${template.task_name}`,
          `Room: ${template.room}${template.area_description ? ' — ' + template.area_description : ''}`,
          template.equipment ? `Equipment: ${template.equipment}` : '',
          `Frequency: ${template.frequency}`,
          template.chemical_name ? `Chemical: ${template.chemical_name}${template.chemical_concentration ? ' @ ' + template.chemical_concentration : ''}` : '',
          template.contact_time_min ? `Contact Time: ${template.contact_time_min} min` : '',
          template.method ? `Method: ${template.method}` : '',
          template.estimated_minutes ? `Est. Time: ${template.estimated_minutes} min` : '',
          template.requires_atp_test ? '🧪 ATP Test Required' : '',
          template.is_preop ? '✅ Pre-Op Inspection' : '',
          template.requires_qa_signoff ? '📋 QA Sign-Off Required' : '',
        ].filter(Boolean).join('\n');

        // ── Step 5: Insert Task Feed Post ──
        const postData = {
          organization_id: ORG_ID,
          post_number: postNumber,
          template_id: null,
          template_name: `[SANITATION] ${template.task_name}`,
          template_snapshot: null,
          created_by_id: null,
          created_by_name: 'Sanitation Auto-Scheduler',
          facility_id: null,
          location_id: null,
          location_name: template.room,
          form_data: {
            sanitation_template_id: template.id,
            sanitation_wo_id: newWO.id,
            sanitation_wo_number: newWO.wo_number,
            template_code: template.task_code,
            task_name: template.task_name,
            room: template.room,
            frequency: template.frequency,
            chemical_name: template.chemical_name,
            requires_atp_test: template.requires_atp_test,
            is_preop: template.is_preop,
            requires_qa_signoff: template.requires_qa_signoff,
            auto_generated: true,
            generated_at: todayISO,
            work_order_type: 'sanitation',
          },
          photo_url: null,
          additional_photos: [],
          notes: notes,
          status: 'pending',
          total_departments: departments.length,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: false,
          reporting_department: String(template.department_id || 1002),
          reporting_department_name: DEPARTMENT_NAMES[String(template.department_id || 1002)] || 'Sanitation',
        };

        const { data: newPost, error: postError } = await supabase
          .from('task_feed_posts')
          .insert(postData)
          .select('id')
          .single();

        if (postError) {
          console.error(`Error creating task feed post for template ${template.id}:`, postError);
          results.errors.push({
            template_id: template.id,
            template_name: template.task_name,
            error: 'Task feed post: ' + postError.message,
          });
          continue;
        }

        // ── Step 6: Insert Department Tasks (one per dept) ──
        const deptTasks = departments.map(deptCode => ({
          organization_id: ORG_ID,
          post_id: newPost.id,
          post_number: postNumber,
          department_code: String(deptCode),
          department_name: DEPARTMENT_NAMES[String(deptCode)] || `Dept ${deptCode}`,
          status: 'pending',
          module_reference_type: 'sanitation_work_order',
          module_reference_id: newWO.id,
          is_original: true,
          priority: template.requires_atp_test || template.is_preop ? 'high' : 'medium',
        }));

        const { error: deptError } = await supabase
          .from('task_feed_department_tasks')
          .insert(deptTasks);

        if (deptError) {
          console.error(`Error creating dept tasks for template ${template.id}:`, deptError);
          results.errors.push({
            template_id: template.id,
            template_name: template.task_name,
            error: 'Dept tasks: ' + deptError.message,
          });
        }

        // ── Step 7: Insert Task Verification (appears in feed) ──
        const { error: tvError } = await supabase
          .from('task_verifications')
          .insert({
            organization_id: ORG_ID,
            department_code: String(template.department_id || 1002),
            department_name: DEPARTMENT_NAMES[String(template.department_id || 1002)] || 'Sanitation',
            facility_code: null,
            location_id: null,
            location_name: template.room,
            category_id: 'sanitation-auto',
            category_name: template.is_preop
              ? 'Pre-Op Inspection'
              : template.requires_atp_test
              ? 'ATP Swab'
              : 'Sanitation Task',
            action: `[SANITATION] ${template.task_name}`,
            notes: notes,
            photo_uri: null,
            employee_id: null,
            employee_name: 'Sanitation Auto-Scheduler',
            status: 'verified',
            source_type: 'task_feed_post',
            source_id: newPost.id,
            source_number: postNumber,
            linked_work_order_id: null,
          });

        if (tvError) {
          console.error(`Error creating task verification for template ${template.id}:`, tvError);
          results.errors.push({
            template_id: template.id,
            template_name: template.task_name,
            error: 'Task verification: ' + tvError.message,
          });
        }

        // ── Step 8: Link post ID back to work order ──
        await supabase
          .from('sanitation_work_orders')
          .update({
            task_feed_post_id: newPost.id,
            post_status: 'posted',
          })
          .eq('id', newWO.id);

        // ── Step 9: Advance next_due_date on template ──
        const newNextDue = calculateNextDue(template.frequency, template.hourly_interval_min);

        const { error: updateError } = await supabase
          .from('sanitation_templates')
          .update({
            next_due_date: newNextDue,
            last_completed_at: todayISO,
          })
          .eq('id', template.id);

        if (updateError) {
          console.error(`Error updating next_due_date for template ${template.id}:`, updateError);
          results.errors.push({
            template_id: template.id,
            template_name: template.task_name,
            error: 'Update next_due_date: ' + updateError.message,
          });
        }

        results.posted++;
        console.log(
          `✓ Posted "${template.task_name}" → ${postNumber} | WO: ${woNumber} | ` +
          `${departments.length} dept(s) | Next due: ${newNextDue}`
        );

      } catch (templateError) {
        console.error(`Unexpected error processing template ${template.id}:`, templateError);
        results.errors.push({
          template_id: template.id,
          template_name: template.task_name,
          error: templateError.message,
        });
      }
    }

    console.log(`Done: ${results.posted}/${results.processed} posted, ${results.skipped} skipped, ${results.errors.length} errors`);
    return res.status(200).json({
      message: `Processed ${results.processed} template(s)`,
      ...results,
    });

  } catch (err) {
    console.error('Sanitation cron job failed:', err);
    return res.status(500).json({ error: 'Cron job failed', details: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// VERCEL.JSON — Add this to your existing crons array:
//
// {
//   "path": "/api/cron/sanitation-due",
//   "schedule": "0 * * * *"
// }
//
// Schedule: "0 * * * *" = top of every hour
// This catches hourly tasks every hour, daily tasks once a day, etc.
// The isDue() check prevents double-firing.
//
// ENVIRONMENT VARIABLES (already set from pm-due.js):
// - CRON_SECRET
// - EXPO_PUBLIC_SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// ══════════════════════════════════════════════════════════════════════════════
