import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split('T')[0];

    const in60 = new Date(today);
    in60.setDate(in60.getDate() + 60);
    const in60Str = in60.toISOString().split('T')[0];

    const results = {
      overdue_sessions: 0,
      expiring_certs_30: 0,
      expiring_certs_60: 0,
      expired_certs_updated: 0,
      task_feed_posts: 0,
      errors: [],
    };

    // ── 1. OVERDUE TRAINING SESSIONS ──────────────────────────────
    // Sessions that are assigned/in_progress and past their due date
    const { data: overdueSessions, error: overdueError } = await supabase
      .from('training_sessions')
      .select('id, session_number, employee_name, template_title, due_date, department_code, employee_id')
      .eq('organization_id', ORG_ID)
      .in('status', ['assigned', 'in_progress'])
      .lt('due_date', todayStr)
      .not('due_date', 'is', null);

    if (overdueError) {
      results.errors.push({ step: 'overdue_sessions', error: overdueError.message });
    } else if (overdueSessions && overdueSessions.length > 0) {
      results.overdue_sessions = overdueSessions.length;

      for (const session of overdueSessions) {
        try {
          // Check if we already posted a task feed alert today for this session
          const { data: existingPost } = await supabase
            .from('task_feed_posts')
            .select('id')
            .eq('organization_id', ORG_ID)
            .eq('reference_id', session.id)
            .eq('post_type', 'training_overdue')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle();

          if (!existingPost) {
            await supabase.from('task_feed_posts').insert({
              organization_id: ORG_ID,
              post_type: 'training_overdue',
              title: `Training Overdue: ${session.template_title}`,
              description: `${session.employee_name}'s training session ${session.session_number} is overdue. Due date was ${session.due_date}.`,
              department: 'training',
              priority: 'high',
              status: 'open',
              source: 'training',
              reference_id: session.id,
              reference_number: session.session_number,
              assigned_to_name: session.employee_name,
              assigned_to_id: session.employee_id,
              metadata: {
                alert_type: 'overdue_session',
                session_id: session.id,
                due_date: session.due_date,
                days_overdue: Math.ceil(
                  (today.getTime() - new Date(session.due_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                ),
              },
            });
            results.task_feed_posts++;
          }
        } catch (postError) {
          results.errors.push({
            step: 'overdue_post',
            session_id: session.id,
            error: postError.message,
          });
        }
      }
    }

    // ── 2. CERTIFICATIONS EXPIRING WITHIN 30 DAYS ─────────────────
    const { data: expiring30, error: exp30Error } = await supabase
      .from('training_certifications')
      .select('id, certification_number, certification_name, employee_name, employee_id, expiration_date, department_code')
      .eq('organization_id', ORG_ID)
      .eq('status', 'active')
      .eq('is_lifetime', false)
      .lte('expiration_date', in30Str)
      .gte('expiration_date', todayStr);

    if (exp30Error) {
      results.errors.push({ step: 'expiring_30', error: exp30Error.message });
    } else if (expiring30 && expiring30.length > 0) {
      results.expiring_certs_30 = expiring30.length;

      for (const cert of expiring30) {
        try {
          const daysLeft = Math.ceil(
            (new Date(cert.expiration_date).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Only post on specific day milestones to avoid daily spam
          // Post at 30, 14, 7, 3, 1 days remaining
          const alertDays = [30, 14, 7, 3, 1];
          if (!alertDays.includes(daysLeft)) continue;

          const { data: existingPost } = await supabase
            .from('task_feed_posts')
            .select('id')
            .eq('organization_id', ORG_ID)
            .eq('reference_id', cert.id)
            .eq('post_type', 'cert_expiring')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle();

          if (!existingPost) {
            await supabase.from('task_feed_posts').insert({
              organization_id: ORG_ID,
              post_type: 'cert_expiring',
              title: `Certification Expiring in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}: ${cert.certification_name}`,
              description: `${cert.employee_name}'s ${cert.certification_name} (${cert.certification_number}) expires on ${cert.expiration_date}. Retraining may be required.`,
              department: 'training',
              priority: daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'normal' : 'low',
              status: 'open',
              source: 'training',
              reference_id: cert.id,
              reference_number: cert.certification_number,
              assigned_to_name: cert.employee_name,
              assigned_to_id: cert.employee_id,
              metadata: {
                alert_type: 'cert_expiring',
                cert_id: cert.id,
                expiration_date: cert.expiration_date,
                days_remaining: daysLeft,
              },
            });
            results.task_feed_posts++;
          }
        } catch (postError) {
          results.errors.push({
            step: 'expiring_30_post',
            cert_id: cert.id,
            error: postError.message,
          });
        }
      }
    }

    // ── 3. CERTIFICATIONS EXPIRING 31-60 DAYS (low priority watch) ─
    const { data: expiring60, error: exp60Error } = await supabase
      .from('training_certifications')
      .select('id, certification_number, certification_name, employee_name, expiration_date')
      .eq('organization_id', ORG_ID)
      .eq('status', 'active')
      .eq('is_lifetime', false)
      .lte('expiration_date', in60Str)
      .gt('expiration_date', in30Str);

    if (exp60Error) {
      results.errors.push({ step: 'expiring_60', error: exp60Error.message });
    } else {
      results.expiring_certs_60 = expiring60?.length || 0;
    }

    // ── 4. AUTO-EXPIRE PAST-DUE CERTIFICATIONS ────────────────────
    // Mark active certs whose expiration_date has passed as expired
    const { data: nowExpired, error: expireError } = await supabase
      .from('training_certifications')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', ORG_ID)
      .eq('status', 'active')
      .eq('is_lifetime', false)
      .lt('expiration_date', todayStr)
      .select('id, certification_number, certification_name, employee_name, employee_id, expiration_date');

    if (expireError) {
      results.errors.push({ step: 'auto_expire', error: expireError.message });
    } else if (nowExpired && nowExpired.length > 0) {
      results.expired_certs_updated = nowExpired.length;

      // Post task feed alert for newly expired certs
      for (const cert of nowExpired) {
        try {
          await supabase.from('task_feed_posts').insert({
            organization_id: ORG_ID,
            post_type: 'cert_expired',
            title: `Certification Expired: ${cert.certification_name}`,
            description: `${cert.employee_name}'s ${cert.certification_name} (${cert.certification_number}) expired on ${cert.expiration_date}. Retraining is required before this employee can perform related tasks.`,
            department: 'training',
            priority: 'high',
            status: 'open',
            source: 'training',
            reference_id: cert.id,
            reference_number: cert.certification_number,
            assigned_to_name: cert.employee_name,
            assigned_to_id: cert.employee_id,
            metadata: {
              alert_type: 'cert_expired',
              cert_id: cert.id,
              expiration_date: cert.expiration_date,
            },
          });
          results.task_feed_posts++;
        } catch (postError) {
          results.errors.push({
            step: 'expired_post',
            cert_id: cert.id,
            error: postError.message,
          });
        }
      }
    }

    // ── 5. CHECK RETRAINING DUE ───────────────────────────────────
    // Find completed sessions where retraining interval has elapsed
    // and no newer session exists for the same employee + template
    const { data: completedSessions, error: retError } = await supabase
      .from('training_sessions')
      .select(`
        id, session_number, employee_id, employee_name,
        template_id, template_title, completed_at,
        training_templates!inner (
          retraining_required,
          retraining_interval_days
        )
      `)
      .eq('organization_id', ORG_ID)
      .eq('status', 'completed')
      .not('completed_at', 'is', null);

    if (retError) {
      results.errors.push({ step: 'retraining_check', error: retError.message });
    } else if (completedSessions && completedSessions.length > 0) {
      for (const session of completedSessions) {
        try {
          const template = (session as any).training_templates;
          if (!template?.retraining_required || !template?.retraining_interval_days) continue;

          const completedAt = new Date(session.completed_at);
          const retrainingDue = new Date(completedAt);
          retrainingDue.setDate(
            retrainingDue.getDate() + template.retraining_interval_days
          );

          // Only alert if retraining is due within 30 days
          const daysUntilRetraining = Math.ceil(
            (retrainingDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilRetraining > 30 || daysUntilRetraining < 0) continue;

          // Check if a newer completed session exists for this employee + template
          const { data: newerSession } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('organization_id', ORG_ID)
            .eq('employee_id', session.employee_id)
            .eq('template_id', session.template_id)
            .eq('status', 'completed')
            .gt('completed_at', session.completed_at)
            .maybeSingle();

          if (newerSession) continue; // Already retrained

          // Check if already assigned for retraining
          const { data: pendingRetraining } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('organization_id', ORG_ID)
            .eq('employee_id', session.employee_id)
            .eq('template_id', session.template_id)
            .in('status', ['assigned', 'in_progress'])
            .maybeSingle();

          if (pendingRetraining) continue; // Already assigned

          const alertMilestones = [30, 14, 7, 1];
          if (!alertMilestones.includes(daysUntilRetraining)) continue;

          // Check if we already posted today
          const { data: existingPost } = await supabase
            .from('task_feed_posts')
            .select('id')
            .eq('organization_id', ORG_ID)
            .eq('reference_id', session.id)
            .eq('post_type', 'retraining_due')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle();

          if (!existingPost) {
            await supabase.from('task_feed_posts').insert({
              organization_id: ORG_ID,
              post_type: 'retraining_due',
              title: `Retraining Due in ${daysUntilRetraining} Day${daysUntilRetraining === 1 ? '' : 's'}: ${session.template_title}`,
              description: `${session.employee_name} is due for retraining on ${session.template_title}. Retraining due: ${retrainingDue.toISOString().split('T')[0]}.`,
              department: 'training',
              priority: daysUntilRetraining <= 7 ? 'high' : 'normal',
              status: 'open',
              source: 'training',
              reference_id: session.id,
              reference_number: session.session_number,
              assigned_to_name: session.employee_name,
              assigned_to_id: session.employee_id,
              metadata: {
                alert_type: 'retraining_due',
                original_session_id: session.id,
                template_id: session.template_id,
                retraining_due_date: retrainingDue.toISOString().split('T')[0],
                days_until_retraining: daysUntilRetraining,
              },
            });
            results.task_feed_posts++;
          }
        } catch (retPostError: any) {
          results.errors.push({
            step: 'retraining_post',
            session_id: session.id,
            error: retPostError.message,
          });
        }
      }
    }

    console.log('[training-due] Complete:', results);

    return res.status(200).json({
      message: 'Training due check complete.',
      ...results,
    });
  } catch (err: any) {
    console.error('[training-due] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
