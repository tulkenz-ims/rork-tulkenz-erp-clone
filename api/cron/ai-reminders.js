// api/cron/ai-reminders.js
// TulKenz OPS — AI Reminders Cron Job
// Runs every 5 minutes to fire due reminders
// Schedule: */5 * * * *

const { createClient } = require('@supabase/supabase-js');

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

module.exports = async (req, res) => {
  // Verify cron secret
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const results = {
    reminders_fired: 0,
    task_feed_posts: 0,
    errors: [],
  };

  try {
    // ── 1. Find all due reminders ────────────────────────────────
    const { data: dueReminders, error: fetchError } = await sb
      .from('ai_user_notes')
      .select('id, employee_id, employee_name, title, content, reminder_at')
      .eq('organization_id', ORG_ID)
      .eq('note_type', 'reminder')
      .eq('reminder_sent', false)
      .is('deleted_at', null)
      .lte('reminder_at', now)
      .limit(50);

    if (fetchError) throw fetchError;
    if (!dueReminders || dueReminders.length === 0) {
      console.log('[ai-reminders] No due reminders found.');
      return res.status(200).json({ ...results, message: 'No due reminders.' });
    }

    console.log(`[ai-reminders] Found ${dueReminders.length} due reminder(s).`);

    for (const reminder of dueReminders) {
      try {
        // ── 2. Create a Task Feed notification post for the employee ──
        const postNumber = `TF-${String(new Date().getFullYear()).slice(-2)}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Math.floor(100000+Math.random()*900000)}`;

        const { data: post, error: postError } = await sb
          .from('task_feed_posts')
          .insert({
            organization_id: ORG_ID,
            post_number: postNumber,
            template_name: '🔔 AI Reminder',
            created_by_name: 'AI Assistant',
            form_data: {
              source: 'ai_reminder',
              reminder_id: reminder.id,
              employee_id: reminder.employee_id,
              employee_name: reminder.employee_name,
              reminder_content: reminder.content,
              reminder_title: reminder.title,
              reminder_at: reminder.reminder_at,
            },
            notes: `[REMINDER] ${reminder.employee_name}: ${reminder.content}`,
            status: 'pending',
            total_departments: 1,
            completed_departments: 0,
            completion_rate: 0,
            is_production_hold: false,
            reporting_department: '1001',
            reporting_department_name: 'System',
          })
          .select('id')
          .single();

        if (postError) {
          console.error(`[ai-reminders] Failed to create post for reminder ${reminder.id}:`, postError.message);
          results.errors.push(`Post error for ${reminder.employee_name}: ${postError.message}`);
        } else {
          results.task_feed_posts++;

          // Create department task targeted to the employee's record
          await sb.from('task_feed_department_tasks').insert({
            organization_id: ORG_ID,
            post_id: post.id,
            post_number: postNumber,
            department_code: '1000',
            department_name: reminder.employee_name,
            status: 'pending',
            module_reference_type: 'ai_reminder',
            is_original: true,
            priority: 'medium',
          });
        }

        // ── 3. Create an in-app notification ─────────────────────
        await sb.from('notifications').insert({
          organization_id: ORG_ID,
          title: `🔔 Reminder: ${reminder.title || 'AI Reminder'}`,
          notification_type: 'ai_reminder',
          status: 'unread',
          employee_id: reminder.employee_id,
          form_data: {
            reminder_id: reminder.id,
            content: reminder.content,
            reminder_at: reminder.reminder_at,
          },
        }).catch(e => {
          // Notifications table may have different schema — non-fatal
          console.warn('[ai-reminders] Notification insert warning:', e.message);
        });

        // ── 4. Mark reminder as sent ─────────────────────────────
        const { error: updateError } = await sb
          .from('ai_user_notes')
          .update({
            reminder_sent: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`[ai-reminders] Failed to mark reminder ${reminder.id} as sent:`, updateError.message);
          results.errors.push(`Update error for ${reminder.id}: ${updateError.message}`);
        } else {
          results.reminders_fired++;
          console.log(`[ai-reminders] Fired reminder for ${reminder.employee_name}: "${reminder.content}"`);
        }

      } catch (reminderErr) {
        console.error(`[ai-reminders] Error processing reminder ${reminder.id}:`, reminderErr.message);
        results.errors.push(`Reminder ${reminder.id}: ${reminderErr.message}`);
      }
    }

    console.log(`[ai-reminders] Done. Fired: ${results.reminders_fired}, Posts: ${results.task_feed_posts}, Errors: ${results.errors.length}`);
    return res.status(200).json({
      success: true,
      ...results,
      message: `Fired ${results.reminders_fired} reminder(s).`,
    });

  } catch (err) {
    console.error('[ai-reminders] Fatal error:', err.message);
    return res.status(500).json({ error: err.message, ...results });
  }
};
