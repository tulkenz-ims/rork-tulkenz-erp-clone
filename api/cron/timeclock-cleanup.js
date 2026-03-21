import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    // Find all active entries older than 12 hours
    const { data: staleEntries, error: fetchError } = await supabase
      .from('time_entries')
      .select('id, clock_in, break_minutes, date')
      .eq('status', 'active')
      .lt('clock_in', cutoff);

    if (fetchError) throw fetchError;

    if (!staleEntries || staleEntries.length === 0) {
      return res.status(200).json({ message: 'No stale entries found.', closed: 0 });
    }

    let closed = 0;
    const errors = [];

    for (const entry of staleEntries) {
      try {
        // Midnight = end of the check-in date (23:59:59 in UTC stored date)
        // date column is a date type — build end-of-day timestamp
        const entryDate = entry.date; // e.g. "2026-03-19"
        const clockOut = new Date(`${entryDate}T23:59:59.000Z`);
        const clockIn = new Date(entry.clock_in);

        const rawMinutes = (clockOut - clockIn) / 1000 / 60;
        const breakMins = entry.break_minutes || 0;
        const workedMinutes = Math.max(rawMinutes - breakMins, 0);
        const totalHours = parseFloat((workedMinutes / 60).toFixed(4));

        const { error: updateError } = await supabase
          .from('time_entries')
          .update({
            clock_out: clockOut.toISOString(),
            total_hours: totalHours,
            status: 'completed',
            notes: 'Auto-closed by nightly cleanup — no check-out recorded.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id);

        if (updateError) throw updateError;
        closed++;
      } catch (entryError) {
        errors.push({ id: entry.id, error: entryError.message });
      }
    }

    return res.status(200).json({
      message: `Cleanup complete. ${closed} entr${closed === 1 ? 'y' : 'ies'} closed.`,
      closed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[timeclock-cleanup] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
