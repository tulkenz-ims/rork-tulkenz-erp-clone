// api/cron/hygiene-signoff-reminder.js
// Vercel Cron Job — Daily Room Hygiene Sign-Off Reminder
// Runs at 10 PM CST (04:00 UTC next day) every day
// Sends push notification to Quality + Admin users if any
// daily room hygiene reports are still unsigned for today

const { createClient } = require('@supabase/supabase-js');

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';
const CST_TIMEZONE = 'America/Chicago';

function getTodayCST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: CST_TIMEZONE });
}

module.exports = async (req, res) => {
  // ── Security check ──
  const cronSecret = req.headers['authorization'];
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const todayCST = getTodayCST();
  console.log(`[HygieneReminder] Running for date: ${todayCST}`);

  try {
    // ── Step 1: Find unsigned reports for today ──
    const { data: openReports, error: reportsError } = await supabase
      .from('daily_room_hygiene_reports')
      .select('id, room_name, total_entries, report_date')
      .eq('organization_id', ORG_ID)
      .eq('report_date', todayCST)
      .eq('status', 'open');

    if (reportsError) {
      console.error('[HygieneReminder] Error fetching reports:', reportsError);
      return res.status(500).json({ error: reportsError.message });
    }

    if (!openReports || openReports.length === 0) {
      console.log('[HygieneReminder] No unsigned reports for today — nothing to do');
      return res.status(200).json({ message: 'No unsigned reports', sent: 0 });
    }

    console.log(`[HygieneReminder] Found ${openReports.length} unsigned report(s)`);

    const roomList = openReports.map(r => r.room_name).join(', ');
    const title = `⚠️ Room Hygiene Sign-Off Required`;
    const body = `${openReports.length} room report${openReports.length > 1 ? 's' : ''} unsigned for today: ${roomList}`;

    // ── Step 2: Get push tokens for Quality (1004) + Admin users ──
    // First get admin employee IDs
    const { data: adminEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', ORG_ID)
      .eq('is_platform_admin', true)
      .eq('status', 'active');

    const adminIds = (adminEmployees || []).map(e => e.id);

    // Get Quality dept tokens
    let tokenQuery = supabase
      .from('user_push_tokens')
      .select('push_token, user_id, department_code')
      .eq('organization_id', ORG_ID)
      .eq('is_active', true)
      .eq('department_code', '1004');

    const { data: qualityTokens } = await tokenQuery;

    // Get admin tokens separately if any admin IDs found
    let adminTokens: any[] = [];
    if (adminIds.length > 0) {
      const { data: at } = await supabase
        .from('user_push_tokens')
        .select('push_token, user_id, department_code')
        .eq('organization_id', ORG_ID)
        .eq('is_active', true)
        .in('user_id', adminIds);
      adminTokens = at || [];
    }

    // Merge and deduplicate by push_token
    const allTokens = [...(qualityTokens || []), ...adminTokens];
    const uniqueTokens = Array.from(
      new Map(allTokens.map(t => [t.push_token, t])).values()
    ).filter(t => t.push_token);

    if (uniqueTokens.length === 0) {
      console.log('[HygieneReminder] No push tokens found for Quality/Admin');
      return res.status(200).json({ message: 'No tokens found', sent: 0 });
    }

    console.log(`[HygieneReminder] Sending to ${uniqueTokens.length} device(s)`);

    // ── Step 3: Send push notifications via Expo ──
    const messages = uniqueTokens.map(t => ({
      to: t.push_token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'hygiene_signoff_reminder',
        reportCount: openReports.length,
        reportDate: todayCST,
        actionUrl: '/quality/roomhygienelog',
      },
      priority: 'high',
      channelId: 'task_feed_urgent',
    }));

    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const result = await response.json();
        console.log('[HygieneReminder] Expo push response:', JSON.stringify(result));
        sent += chunk.length;
      } catch (fetchError) {
        console.error('[HygieneReminder] Error sending chunk:', fetchError);
      }
    }

    // ── Step 4: Log the notification ──
    await supabase.from('notification_logs').insert({
      organization_id: ORG_ID,
      notification_type: 'hygiene_signoff_reminder',
      target_type: 'role',
      target_department_code: '1004',
      source_type: 'cron',
      source_id: null,
      source_number: null,
      push_sent: true,
      push_sent_at: new Date().toISOString(),
      push_recipients: sent,
    });

    console.log(`[HygieneReminder] Done — sent ${sent} notifications for ${openReports.length} unsigned report(s)`);
    return res.status(200).json({
      message: `Sent ${sent} reminder notifications`,
      unsignedReports: openReports.length,
      rooms: roomList,
      sent,
    });

  } catch (err: any) {
    console.error('[HygieneReminder] Cron failed:', err);
    return res.status(500).json({ error: 'Cron failed', details: err.message });
  }
};
