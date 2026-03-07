// api/simulator.js
// Vercel Serverless Function — Production Line Simulator
// Pushes realistic sensor data into sensor_readings and updates room_status
// Call: POST /api/simulator?action=start|stop|tick|status
// Can be called manually or on a timer from the frontend

const { createClient } = require('@supabase/supabase-js');

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

// ══════════════════════════════════ SIMULATION STATE ══════════════════════════════════

// In-memory state (resets on cold start — fine for demo)
let simState = {
  running: false,
  tick: 0,
  rooms: {
    PA1: { status: 'running', bagsTotal: 0, minuteStart: 0, event: null, eventTick: 0 },
    PR1: { status: 'running', bagsTotal: 0, minuteStart: 0, event: null, eventTick: 0 },
    PR2: { status: 'running', bagsTotal: 0, minuteStart: 0, event: null, eventTick: 0 },
  },
};

// ══════════════════════════════════ SENSOR PROFILES ══════════════════════════════════

// Normal operating values with natural variation
const PROFILES = {
  PA1: {
    'Bags Per Minute': { base: 55, variance: 3, slow: 35, stopped: 0 },
    'Vertical Seal Temp': { base: 280, variance: 3, drift: 15, driftRate: 0.5 },
    'Front Endseal Temp': { base: 290, variance: 2, drift: 12, driftRate: 0.4 },
    'Rear Endseal Temp': { base: 290, variance: 2, drift: 12, driftRate: 0.4 },
    'Air Pressure': { base: 70, variance: 2, leak: -8, leakRate: 0.3 },
    'Film Tension': { base: 15, variance: 1.5, loose: 8, tight: 22 },
    'Encoder Speed': { base: 12, variance: 1, slow: 7, stopped: 0 },
    'Auger Speed': { base: 120, variance: 5, slow: 80, stopped: 0 },
    'Auger Motor Temp': { base: 140, variance: 5, hot: 185 },
    'Auger Vibration': { base: 2.5, variance: 0.5, bad: 7.5 },
    'Hopper Level': { base: 60, variance: 8, low: 15, full: 92 },
    'Conveyor Speed': { base: 30, variance: 2, slow: 18, stopped: 0 },
    'Print Quality': { base: 98, variance: 1, bad: 82 },
  },
  PR1: {
    'Fill Rate': { base: 42, variance: 3, slow: 28, stopped: 0 },
    'Filler Motor Temp': { base: 130, variance: 4, hot: 175 },
    'Seal Temperature': { base: 300, variance: 3, drift: 18, driftRate: 0.5 },
    'Air Pressure': { base: 70, variance: 2, leak: -8, leakRate: 0.3 },
    'Auger Speed': { base: 100, variance: 4, slow: 65, stopped: 0 },
    'Auger Motor Temp': { base: 150, variance: 5, hot: 195 },
    'Auger Vibration': { base: 3.0, variance: 0.6, bad: 8.5 },
    'Hopper Level': { base: 55, variance: 10, low: 12, full: 88 },
    'Conveyor Speed': { base: 25, variance: 2, slow: 15, stopped: 0 },
    'Reject Count': { base: 0, variance: 0, spike: 4 },
    'Sensitivity': { base: 100, variance: 0.5, degraded: 87 },
  },
  PR2: {
    'Fill Rate': { base: 42, variance: 3, slow: 28, stopped: 0 },
    'Filler Motor Temp': { base: 130, variance: 4, hot: 175 },
    'Seal Temperature': { base: 300, variance: 3, drift: 18, driftRate: 0.5 },
    'Air Pressure': { base: 70, variance: 2, leak: -8, leakRate: 0.3 },
    'Auger Speed': { base: 100, variance: 4, slow: 65, stopped: 0 },
    'Auger Motor Temp': { base: 150, variance: 5, hot: 195 },
    'Auger Vibration': { base: 3.0, variance: 0.6, bad: 8.5 },
    'Hopper Level': { base: 55, variance: 10, low: 12, full: 88 },
    'Conveyor Speed': { base: 25, variance: 2, slow: 15, stopped: 0 },
    'Reject Count': { base: 0, variance: 0, spike: 4 },
    'Sensitivity': { base: 100, variance: 0.5, degraded: 87 },
  },
};

// ══════════════════════════════════ EVENT SCENARIOS ══════════════════════════════════

const EVENTS = [
  {
    name: 'seal_temp_drift',
    description: 'Vertical seal temperature drifting high',
    duration: 20, // ticks
    rooms: ['PA1'],
    affects: { 'Vertical Seal Temp': 'drift_up' },
    severity: 'warning',
    wo_reason: 'Vertical seal temperature drifting above setpoint - check heating element and thermocouple',
  },
  {
    name: 'air_pressure_drop',
    description: 'Air pressure dropping - possible leak',
    duration: 15,
    rooms: ['PA1', 'PR1', 'PR2'],
    affects: { 'Air Pressure': 'leak' },
    severity: 'critical',
    wo_reason: 'Air pressure dropped below 60 PSI - check supply line and pneumatic connections for leaks',
  },
  {
    name: 'auger_slowdown',
    description: 'Auger speed decreasing - possible product bridging',
    duration: 12,
    rooms: ['PA1', 'PR1', 'PR2'],
    affects: { 'Auger Speed': 'slow', 'Hopper Level': 'dropping' },
    severity: 'warning',
    wo_reason: 'Auger speed dropped below threshold - check for product bridging in hopper or auger wear',
  },
  {
    name: 'film_jam',
    description: 'Film jam - line stopped',
    duration: 8,
    rooms: ['PA1'],
    affects: { 'Bags Per Minute': 'stopped', 'Encoder Speed': 'stopped', 'Conveyor Speed': 'stopped' },
    severity: 'critical',
    wo_reason: 'Film jam caused line stoppage - check film tracking, tension, and forming collar for obstruction',
  },
  {
    name: 'vibration_spike',
    description: 'High vibration on auger motor - possible bearing wear',
    duration: 25,
    rooms: ['PR1', 'PR2'],
    affects: { 'Auger Vibration': 'spike' },
    severity: 'warning',
    wo_reason: 'Auger motor vibration exceeding threshold - inspect bearings and motor alignment',
  },
  {
    name: 'metal_detect_rejects',
    description: 'Metal detector rejecting bags',
    duration: 6,
    rooms: ['PR1', 'PR2'],
    affects: { 'Reject Count': 'spike' },
    severity: 'critical',
    wo_reason: 'Metal detector rejecting multiple bags - check magnets, product source, and equipment for metal contamination',
  },
  {
    name: 'hopper_low',
    description: 'Hopper level critically low - auger not keeping up',
    duration: 10,
    rooms: ['PA1', 'PR1', 'PR2'],
    affects: { 'Hopper Level': 'low' },
    severity: 'warning',
    wo_reason: 'Hopper level critically low - check supersack, auger feed rate, and product flow',
  },
  {
    name: 'scheduled_break',
    description: 'Scheduled break - line paused',
    duration: 15,
    rooms: ['PA1', 'PR1', 'PR2'],
    affects: { '_all': 'idle' },
    severity: 'info',
    scheduled: true,
  },
];

// ══════════════════════════════════ VALUE GENERATORS ══════════════════════════════════

function normalValue(profile) {
  return profile.base + (Math.random() - 0.5) * 2 * profile.variance;
}

function getStatus(value, sensor) {
  if (sensor.critical_low !== null && value <= sensor.critical_low) return 'critical';
  if (sensor.critical_high !== null && value >= sensor.critical_high) return 'critical';
  if (sensor.warning_low !== null && value <= sensor.warning_low) return 'warning';
  if (sensor.warning_high !== null && value >= sensor.warning_high) return 'warning';
  return 'normal';
}

function generateValue(sensorName, profile, roomState, eventAffects, tickInEvent) {
  if (!profile) return null;

  // If room is idle from scheduled break
  if (eventAffects && eventAffects['_all'] === 'idle') {
    if (sensorName.includes('Speed') || sensorName.includes('Rate') || sensorName === 'Conveyor Speed') return 0;
    if (sensorName === 'Hopper Level') return profile.base; // stays where it was
    return normalValue(profile); // temps hold
  }

  // Check if this sensor is affected by current event
  const effect = eventAffects ? eventAffects[sensorName] : null;

  if (effect === 'drift_up') {
    return profile.base + (profile.drift || 10) * (tickInEvent / 20) + (Math.random() - 0.5) * profile.variance;
  }
  if (effect === 'leak') {
    return profile.base + (profile.leak || -8) * (tickInEvent / 15) + Math.random() * profile.variance;
  }
  if (effect === 'slow') {
    return (profile.slow || profile.base * 0.6) + Math.random() * profile.variance;
  }
  if (effect === 'stopped') {
    return profile.stopped !== undefined ? profile.stopped : 0;
  }
  if (effect === 'spike') {
    return (profile.bad || profile.spike || profile.base * 2.5) + Math.random() * 1.5;
  }
  if (effect === 'dropping') {
    return Math.max(5, profile.base - tickInEvent * 4 + Math.random() * 3);
  }
  if (effect === 'low') {
    return (profile.low || 12) + Math.random() * 5;
  }

  // Normal operation
  return normalValue(profile);
}

// ══════════════════════════════════ MAIN HANDLER ══════════════════════════════════

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action || 'tick';

  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── STATUS ──
  if (action === 'status') {
    return res.status(200).json({ simState });
  }

  // ── START ──
  if (action === 'start') {
    simState.running = true;
    simState.tick = 0;
    simState.rooms = {
      PA1: { status: 'running', bagsTotal: 0, minuteStart: 0, event: null, eventTick: 0 },
      PR1: { status: 'running', bagsTotal: 0, minuteStart: 0, event: null, eventTick: 0 },
      PR2: { status: 'running', bagsTotal: 0, minuteStart: 0, event: null, eventTick: 0 },
    };

    // Set all rooms to running
    await supabase
      .from('room_status')
      .update({ status: 'running', andon_color: 'green', bags_today: 0, bags_per_minute: 0, uptime_percent: 100, updated_at: new Date().toISOString() })
      .eq('organization_id', ORG_ID)
      .in('room_code', ['PA1', 'PR1', 'PR2']);

    return res.status(200).json({ message: 'Simulation started', simState });
  }

  // ── STOP ──
  if (action === 'stop') {
    simState.running = false;

    await supabase
      .from('room_status')
      .update({ status: 'idle', andon_color: 'gray', bags_per_minute: 0, updated_at: new Date().toISOString() })
      .eq('organization_id', ORG_ID)
      .in('room_code', ['PA1', 'PR1', 'PR2']);

    return res.status(200).json({ message: 'Simulation stopped', simState });
  }

  // ── TICK ──
  if (action === 'tick') {
    if (!simState.running) {
      return res.status(200).json({ message: 'Simulation not running. Call ?action=start first.' });
    }

    simState.tick++;
    const now = new Date().toISOString();
    const sensorReadings = [];
    const roomUpdates = [];
    const events = [];

    // Get all sensors from DB
    const { data: sensors, error: sensorErr } = await supabase
      .from('equipment_sensors')
      .select('id, room_code, sensor_name, sensor_type, target_value, warning_low, warning_high, critical_low, critical_high, auto_wo_on_critical')
      .eq('organization_id', ORG_ID)
      .in('room_code', ['PA1', 'PR1', 'PR2']);

    if (sensorErr) {
      console.error('[Simulator] Error fetching sensors:', sensorErr);
      return res.status(500).json({ error: sensorErr.message });
    }

    // Process each room
    for (const roomCode of ['PA1', 'PR1', 'PR2']) {
      const room = simState.rooms[roomCode];
      const roomSensors = sensors.filter(s => s.room_code === roomCode);
      const roomProfiles = PROFILES[roomCode];

      // ── Maybe trigger an event ──
      if (!room.event && simState.tick > 5) {
        // Random event every ~30-60 ticks
        if (Math.random() < 0.04) {
          const eligible = EVENTS.filter(e => e.rooms.includes(roomCode));
          const chosen = eligible[Math.floor(Math.random() * eligible.length)];
          if (chosen) {
            room.event = chosen;
            room.eventTick = 0;
            console.log(`[Simulator] Event triggered in ${roomCode}: ${chosen.name} - ${chosen.description}`);

            if (chosen.scheduled) {
              room.status = 'break';
            }
          }
        }
      }

      // ── Progress event ──
      let eventAffects = null;
      if (room.event) {
        room.eventTick++;
        eventAffects = room.event.affects;

        // Event over?
        if (room.eventTick >= room.event.duration) {
          console.log(`[Simulator] Event ended in ${roomCode}: ${room.event.name}`);
          room.event = null;
          room.eventTick = 0;
          room.status = 'running';
        }
      }

      // ── Generate sensor readings ──
      let bagsThisTick = 0;
      let hasWarning = false;
      let hasCritical = false;

      for (const sensor of roomSensors) {
        const profile = roomProfiles[sensor.sensor_name];
        if (!profile) continue;

        const value = generateValue(sensor.sensor_name, profile, room, eventAffects, room.eventTick);
        if (value === null) continue;

        const roundedValue = Math.round(value * 100) / 100;
        const status = getStatus(roundedValue, sensor);

        if (status === 'warning') hasWarning = true;
        if (status === 'critical') hasCritical = true;

        sensorReadings.push({
          organization_id: ORG_ID,
          sensor_id: sensor.id,
          room_code: roomCode,
          value: roundedValue,
          status: status,
          recorded_at: now,
        });

        // Track bags
        if (sensor.sensor_name === 'Bags Per Minute' || sensor.sensor_name === 'Fill Rate') {
          bagsThisTick = Math.round(roundedValue / 6); // 10-second tick = 1/6 of a minute
        }

        // Auto-create WO on critical if enabled
        if (status === 'critical' && sensor.auto_wo_on_critical && room.event && !room.event._woCreated) {
          events.push({
            room_code: roomCode,
            sensor_name: sensor.sensor_name,
            value: roundedValue,
            reason: room.event.wo_reason || `${sensor.sensor_name} at critical level: ${roundedValue} ${sensor.sensor_type}`,
            severity: room.event.severity,
          });
          room.event._woCreated = true;
        }
      }

      // Update bag count
      room.bagsTotal += bagsThisTick;

      // Determine room display status
      let andonColor = 'green';
      let roomStatus = 'running';
      if (room.status === 'break') {
        andonColor = 'yellow';
        roomStatus = 'cleaning';
      } else if (hasCritical) {
        andonColor = 'red';
        roomStatus = 'running';
      } else if (hasWarning) {
        andonColor = 'yellow';
        roomStatus = 'running';
      }

      // Calculate bags per minute (average over last readings)
      const currentBPM = room.status === 'break' ? 0 : (bagsThisTick * 6);
      const uptimePercent = room.status === 'break' ? 
        Math.round(((simState.tick - room.eventTick) / simState.tick) * 100) :
        Math.round(((simState.tick - (room.event ? room.eventTick : 0)) / simState.tick) * 100);

      roomUpdates.push({
        organization_id: ORG_ID,
        room_code: roomCode,
        room_name: roomCode === 'PA1' ? 'Packet Area 1' : roomCode === 'PR1' ? 'Production Room 1' : 'Production Room 2',
        status: roomStatus,
        andon_color: andonColor,
        bags_today: room.bagsTotal,
        bags_per_minute: currentBPM,
        target_bags_per_minute: roomCode === 'PA1' ? 60 : 45,
        uptime_percent: Math.min(100, uptimePercent),
        updated_at: now,
        updated_by: 'Simulator',
      });
    }

    // ── Batch insert sensor readings ──
    if (sensorReadings.length > 0) {
      const { error: insertErr } = await supabase
        .from('sensor_readings')
        .insert(sensorReadings);

      if (insertErr) {
        console.error('[Simulator] Error inserting readings:', insertErr);
      }
    }

    // ── Upsert room status ──
    for (const update of roomUpdates) {
      await supabase
        .from('room_status')
        .upsert(update, { onConflict: 'organization_id,room_code' });
    }

    // ── Create production events and WOs for critical issues ──
    for (const evt of events) {
      // Log production event
      await supabase
        .from('production_events')
        .insert({
          organization_id: ORG_ID,
          room_code: evt.room_code,
          event_type: evt.severity === 'critical' ? 'equipment_fault' : 'performance_degradation',
          category: 'unscheduled',
          reason: evt.reason,
          equipment_name: evt.sensor_name,
          started_at: now,
          auto_generated: true,
        });

      // Auto-create work order
      const woNumber = `WO-AI-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(100000 + Math.random() * 900000))}`;

      await supabase
        .from('work_orders')
        .insert({
          organization_id: ORG_ID,
          facility_id: '32e5177f-8cc1-4bbd-a323-6cbd0cc1f9ca',
          work_order_number: woNumber,
          title: `[AUTO] ${evt.sensor_name} - ${evt.room_code}`,
          description: evt.reason,
          status: 'open',
          priority: evt.severity === 'critical' ? 'critical' : 'high',
          type: 'reactive',
          source: 'sensor_alert',
          location: evt.room_code,
          department: '1001',
          department_name: 'Maintenance',
          due_date: new Date().toISOString().split('T')[0],
        });

      // Post to Task Feed
      const postNumber = `TF-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(100000 + Math.random() * 900000))}`;

      const { data: post } = await supabase
        .from('task_feed_posts')
        .insert({
          organization_id: ORG_ID,
          post_number: postNumber,
          template_name: `Sensor Alert: ${evt.sensor_name}`,
          created_by_name: 'AI Sensor Monitor',
          location_name: evt.room_code,
          notes: `[AUTO] ${evt.reason}\n\nSensor: ${evt.sensor_name}\nValue: ${evt.value}\nRoom: ${evt.room_code}\nWork Order: ${woNumber}`,
          status: 'pending',
          total_departments: 1,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: evt.severity === 'critical',
          reporting_department: '1001',
          reporting_department_name: 'Maintenance',
        })
        .select('id')
        .single();

      if (post) {
        await supabase
          .from('task_feed_department_tasks')
          .insert({
            organization_id: ORG_ID,
            post_id: post.id,
            post_number: postNumber,
            department_code: '1001',
            department_name: 'Maintenance',
            status: 'pending',
            module_reference_type: 'sensor_alert',
            is_original: true,
            priority: evt.severity === 'critical' ? 'critical' : 'high',
          });
      }

      console.log(`[Simulator] Auto-WO created: ${woNumber} for ${evt.sensor_name} in ${evt.room_code}`);
    }

    // ── Clean up old readings (keep last 2 hours) ──
    if (simState.tick % 60 === 0) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('sensor_readings')
        .delete()
        .eq('organization_id', ORG_ID)
        .lt('recorded_at', twoHoursAgo);
    }

    return res.status(200).json({
      tick: simState.tick,
      readings: sensorReadings.length,
      events: events.length,
      rooms: Object.fromEntries(
        Object.entries(simState.rooms).map(([code, room]) => [
          code,
          { status: room.status, bags: room.bagsTotal, event: room.event?.name || null },
        ])
      ),
    });
  }

  // ── TRIGGER EVENT (manual) ──
  if (action === 'trigger') {
    const eventName = req.query.event || req.body?.event;
    const roomCode = req.query.room || req.body?.room || 'PA1';

    const event = EVENTS.find(e => e.name === eventName);
    if (!event) {
      return res.status(400).json({ error: 'Unknown event', available: EVENTS.map(e => e.name) });
    }

    if (simState.rooms[roomCode]) {
      simState.rooms[roomCode].event = { ...event };
      simState.rooms[roomCode].eventTick = 0;
      return res.status(200).json({ message: `Event '${eventName}' triggered in ${roomCode}`, event });
    }

    return res.status(400).json({ error: 'Unknown room', available: ['PA1', 'PR1', 'PR2'] });
  }

  return res.status(400).json({ error: 'Unknown action', available: ['start', 'stop', 'tick', 'status', 'trigger'] });
};
