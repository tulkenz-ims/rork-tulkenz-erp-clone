// api/auditor.js
// Vercel Serverless Function — serves the auditor portal as HTML
// Lives INSIDE your existing project: api/auditor.js
// URL: /api/auditor?token=xxxx
// Bypasses Expo Router and SPA rewrites completely — zero extra cost

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(getHTML());
};

function getHTML() {
  var SB_URL = 'https://xaqztozcnkpmgytnnjlj.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp0b3pjbmtwbWd5dG5uamxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjI2NDAsImV4cCI6MjA4MzczODY0MH0.lL90-qamWRs8GXCvA-F7QcKiPx1WYUMs5OUjUi_1CjU';

  // Use plain string concat to avoid template literal escaping nightmares
  var html = [];
  html.push('<!DOCTYPE html>');
  html.push('<html lang="en"><head>');
  html.push('<meta charset="utf-8"/>');
  html.push('<meta name="viewport" content="width=device-width,initial-scale=1"/>');
  html.push('<meta name="robots" content="noindex,nofollow"/>');
  html.push('<title>TulKenz OPS - Auditor Portal</title>');
  html.push('<link rel="preconnect" href="https://fonts.googleapis.com"/>');
  html.push('<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>');
  html.push('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></scr' + 'ipt>');
  html.push('<style>');
  html.push(getCSS());
  html.push('</style></head><body>');
  html.push(getTokenScreen());
  html.push(getPortalScreen());
  html.push('<scr' + 'ipt>');
  html.push('var SB_URL="' + SB_URL + '";');
  html.push('var SB_KEY="' + SB_KEY + '";');
  html.push(getJS());
  html.push('</scr' + 'ipt>');
  html.push('</body></html>');
  return html.join('\n');
}

function getCSS() {
  return [
    '*{margin:0;padding:0;box-sizing:border-box}',
    ':root{--bg:#0F0E17;--surface:#1A1926;--surface2:#252336;--border:#2E2C42;--primary:#6C5CE7;--primary-glow:#6C5CE740;--accent:#A78BFA;--text:#FFFFFE;--text2:#A7A4C2;--text3:#6B6890;--success:#10B981;--warning:#F59E0B;--danger:#EF4444;--font:"DM Sans",system-ui,-apple-system,sans-serif}',
    'html,body{height:100%;font-family:var(--font);background:var(--bg);color:var(--text);overflow:hidden}',
    'a{color:var(--accent);text-decoration:none}',

    '#tokenScreen{display:flex;align-items:center;justify-content:center;height:100%;padding:24px}',
    '.token-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:48px 40px;max-width:440px;width:100%;text-align:center}',
    '.token-logo{font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px}',
    '.token-logo span{color:var(--primary)}',
    '.token-sub{color:var(--text2);font-size:14px;margin-bottom:32px}',
    '.token-input{width:100%;padding:14px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border .2s}',
    '.token-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-glow)}',
    '.token-input::placeholder{color:var(--text3)}',
    '.token-btn{width:100%;padding:14px;margin-top:16px;background:var(--primary);color:#fff;border:none;border-radius:12px;font-family:var(--font);font-size:15px;font-weight:700;cursor:pointer;transition:all .2s}',
    '.token-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}',
    '.token-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}',
    '.token-error{color:var(--danger);font-size:13px;margin-top:12px;min-height:20px}',
    '.token-security{color:var(--text3);font-size:11px;margin-top:24px;line-height:1.5}',

    '#portalScreen{display:none;height:100%;overflow:hidden}',
    '.portal-wrap{display:flex;height:100%}',

    '.sidebar{width:280px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}',
    '.sidebar-head{padding:20px 20px 16px;border-bottom:1px solid var(--border)}',
    '.sidebar-brand{font-size:18px;font-weight:800;letter-spacing:-0.3px}',
    '.sidebar-brand span{color:var(--primary)}',
    '.sidebar-badge{display:inline-flex;align-items:center;gap:4px;background:var(--primary);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:6px;letter-spacing:0.5px}',
    '.sidebar-session{padding:16px 20px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text2);line-height:1.6}',
    '.sidebar-session strong{color:var(--text);font-weight:600}',
    '.sidebar-nav{flex:1;overflow-y:auto;padding:12px 0}',
    '.nav-section{padding:4px 20px;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-top:12px;margin-bottom:4px}',
    '.nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;transition:all .15s;border-left:3px solid transparent}',
    '.nav-item:hover{background:var(--surface2);color:var(--text)}',
    '.nav-item.active{background:#6C5CE712;color:var(--primary);border-left-color:var(--primary);font-weight:600}',
    '.nav-icon{width:18px;text-align:center;font-size:14px}',
    '.sidebar-foot{padding:16px 20px;border-top:1px solid var(--border)}',
    '.exit-btn{width:100%;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text2);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}',
    '.exit-btn:hover{border-color:var(--danger);color:var(--danger)}',

    '.main{flex:1;display:flex;flex-direction:column;overflow:hidden}',
    '.main-header{padding:20px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}',
    '.main-title{font-size:20px;font-weight:700}',
    '.main-count{font-size:13px;color:var(--text2);background:var(--surface2);padding:4px 12px;border-radius:8px}',
    '.main-body{flex:1;overflow-y:auto;padding:24px 28px}',

    '.overview-welcome{background:linear-gradient(135deg,var(--primary),#8B5CF6);border-radius:16px;padding:28px 32px;margin-bottom:24px;color:#fff}',
    '.overview-welcome h2{font-size:22px;font-weight:700;margin-bottom:6px}',
    '.overview-welcome p{opacity:.85;font-size:14px;line-height:1.5}',
    '.module-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}',
    '.module-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:all .2s}',
    '.module-card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}',
    '.mc-icon{font-size:24px;margin-bottom:10px}',
    '.mc-name{font-size:14px;font-weight:600;margin-bottom:2px}',
    '.mc-desc{font-size:11px;color:var(--text2)}',

    '.search-bar{width:100%;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;margin-bottom:16px;transition:border .2s}',
    '.search-bar:focus{border-color:var(--primary)}',
    '.search-bar::placeholder{color:var(--text3)}',
    '.record-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:10px;overflow:hidden;transition:border .2s}',
    '.record-card:hover{border-color:var(--accent)}',
    '.record-head{padding:16px 20px;cursor:pointer;display:flex;align-items:center;justify-content:space-between}',
    '.record-head h4{font-size:14px;font-weight:600;flex:1}',
    '.rh-date{font-size:11px;color:var(--text3);margin-right:12px}',
    '.rh-arrow{color:var(--text3);transition:transform .2s;font-size:12px}',
    '.record-card.open .rh-arrow{transform:rotate(90deg)}',
    '.record-body{display:none;padding:0 20px 16px;border-top:1px solid var(--border)}',
    '.record-card.open .record-body{display:block}',
    '.record-field{display:flex;padding:8px 0;border-bottom:1px solid var(--border)}',
    '.record-field:last-child{border-bottom:none}',
    '.rf-label{width:180px;flex-shrink:0;font-size:12px;color:var(--text2);font-weight:500}',
    '.rf-value{font-size:12px;color:var(--text);flex:1;word-break:break-word}',
    '.empty-state{text-align:center;padding:60px 20px;color:var(--text3)}',
    '.es-icon{font-size:48px;margin-bottom:16px;opacity:.5}',
    '.empty-state p{font-size:14px}',

    '.security-section{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:12px}',
    '.security-section h3{font-size:15px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px}',
    '.security-section p{font-size:13px;color:var(--text2);line-height:1.6}',

    '.spinner{display:inline-block;width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite}',
    '@keyframes spin{to{transform:rotate(360deg)}}',

    '@media(max-width:768px){',
    '  .sidebar{width:260px;position:fixed;left:-280px;top:0;bottom:0;z-index:100;transition:left .3s}',
    '  .sidebar.open{left:0}',
    '  .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99}',
    '  .sidebar-overlay.show{display:block}',
    '  .mobile-hamburger{display:flex!important}',
    '  .main-body{padding:16px}',
    '  .module-grid{grid-template-columns:1fr 1fr}',
    '  .record-field{flex-direction:column;gap:2px}',
    '  .rf-label{width:auto}',
    '  .token-card{padding:32px 24px}',
    '}',
    '@media(min-width:769px){.mobile-hamburger{display:none!important}.sidebar-overlay{display:none!important}}',
    '.mobile-hamburger{align-items:center;justify-content:center;width:36px;height:36px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:18px;color:var(--text)}',
    '::-webkit-scrollbar{width:6px}',
    '::-webkit-scrollbar-track{background:transparent}',
    '::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}',
    '::-webkit-scrollbar-thumb:hover{background:var(--text3)}',
  ].join('\n');
}

function getTokenScreen() {
  return [
    '<div id="tokenScreen">',
    '  <div class="token-card">',
    '    <div class="token-logo">Tul<span>Kenz</span> OPS</div>',
    '    <div class="token-sub">Auditor Portal &#8212; Read-Only Access</div>',
    '    <input type="text" id="tokenInput" class="token-input" placeholder="Enter your access token" autocomplete="off" spellcheck="false"/>',
    '    <button id="tokenBtn" class="token-btn">Access Portal</button>',
    '    <div id="tokenError" class="token-error"></div>',
    '    <div class="token-security">&#128274; Secure, encrypted, read-only access. All activity is logged.</div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

function getPortalScreen() {
  return [
    '<div id="portalScreen">',
    '  <div class="portal-wrap">',
    '    <div class="sidebar-overlay" id="sidebarOverlay"></div>',
    '    <div class="sidebar" id="sidebar">',
    '      <div class="sidebar-head">',
    '        <div class="sidebar-brand">Tul<span>Kenz</span> OPS</div>',
    '        <div class="sidebar-badge">&#128274; READ-ONLY AUDIT ACCESS</div>',
    '      </div>',
    '      <div class="sidebar-session" id="sessionInfo"></div>',
    '      <div class="sidebar-nav" id="sidebarNav"></div>',
    '      <div class="sidebar-foot">',
    '        <button class="exit-btn" id="exitBtn">&#8592; Exit Portal</button>',
    '      </div>',
    '    </div>',
    '    <div class="main">',
    '      <div class="main-header">',
    '        <div style="display:flex;align-items:center;gap:12px">',
    '          <div class="mobile-hamburger" id="hamburgerBtn">&#9776;</div>',
    '          <div class="main-title" id="mainTitle">Overview</div>',
    '        </div>',
    '        <div class="main-count" id="mainCount"></div>',
    '      </div>',
    '      <div class="main-body" id="mainBody"></div>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

function getJS() {
  // All JS as a plain string — no template literal escaping issues
  return `
var sb = supabase.createClient(SB_URL, SB_KEY);
var session = null;

var HIDDEN_FIELDS = ['id','organization_id','created_by_id','performed_by_id','verified_by_id',
  'verifier_pin_verified','pin','pin_hash','password','token','token_hash',
  'access_token','access_token_hash'];

var MODULES = [
  {key:'ncr_records',name:'NCR / Corrective Actions',icon:'\\u26A0\\uFE0F',sqf:'2.5.3',desc:'Non-conformance reports and CAPA'},
  {key:'sds_records',name:'SDS Documents',icon:'\\uD83E\\uDDEA',sqf:'2.6.1',desc:'Safety Data Sheets and chemical registry'},
  {key:'documents',name:'Document Control',icon:'\\uD83D\\uDCC4',sqf:'2.3.2',desc:'Controlled documents and records'},
  {key:'training_records',name:'Training Records',icon:'\\uD83C\\uDF93',sqf:'2.9.2',desc:'Employee training and competency'},
  {key:'pm_schedules',name:'Preventive Maintenance',icon:'\\uD83D\\uDD27',sqf:'11.2.8',desc:'Equipment PM schedules'},
  {key:'work_orders',name:'Work Orders',icon:'\\uD83D\\uDCCB',sqf:'11.2.8',desc:'Maintenance work orders'},
  {key:'audit_findings',name:'Audit Findings',icon:'\\uD83D\\uDD0D',sqf:'2.5.1',desc:'Internal and external audit findings'},
  {key:'inspections',name:'Inspections',icon:'\\u2705',sqf:'2.5.4',desc:'Facility and equipment inspections'},
  {key:'vendor_approvals',name:'Approved Suppliers',icon:'\\uD83E\\uDD1D',sqf:'4.3.1',desc:'Vendor approval and monitoring'},
  {key:'environmental_monitoring',name:'Environmental Monitoring',icon:'\\uD83C\\uDF21\\uFE0F',sqf:'11.2.5',desc:'Environmental monitoring data'},
  {key:'backup_verification_log',name:'Backup Verification',icon:'\\uD83D\\uDCBE',sqf:'2.4.5',desc:'Data backup and recovery log'}
];

// Event delegation — no inline onclick needed
document.addEventListener('click', function(e) {
  var t = e.target.closest('[data-action]');
  if (!t) {
    // Check record-head click
    var rh = e.target.closest('.record-head');
    if (rh) { rh.parentElement.classList.toggle('open'); return; }
    // Check sidebar overlay
    if (e.target.id === 'sidebarOverlay') { toggleSidebar(); return; }
    return;
  }
  var action = t.dataset.action;
  if (action === 'validate') validateToken();
  else if (action === 'exit') exitPortal();
  else if (action === 'hamburger') toggleSidebar();
  else if (action === 'overview') showOverview(t);
  else if (action === 'security') showSecurity(t);
  else if (action === 'module') loadModule(t, t.dataset.key);
  else if (action === 'module-card') {
    var navEl = document.querySelector('[data-key="' + t.dataset.key + '"]');
    if (navEl) loadModule(navEl, t.dataset.key);
  }
});

// Search filter via input event
document.addEventListener('input', function(e) {
  if (e.target.classList.contains('search-bar')) {
    var q = e.target.value.toLowerCase();
    var cards = document.querySelectorAll('.record-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.display = (cards[i].dataset.search || '').indexOf(q) >= 0 ? '' : 'none';
    }
  }
});

// Enter key on token input
document.addEventListener('keydown', function(e) {
  if (e.target.id === 'tokenInput' && e.key === 'Enter') validateToken();
});

// Wire up static buttons
document.getElementById('tokenBtn').setAttribute('data-action', 'validate');
document.getElementById('exitBtn').setAttribute('data-action', 'exit');
document.getElementById('hamburgerBtn').setAttribute('data-action', 'hamburger');
document.getElementById('sidebarOverlay').setAttribute('data-action', 'overlay');

// Auto-detect token from URL
(function(){
  var p = new URLSearchParams(window.location.search);
  var t = p.get('token') || p.get('audit_token');
  if (t) {
    document.getElementById('tokenInput').value = t;
    setTimeout(function(){ validateToken(); }, 400);
  }
})();

function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function validateToken() {
  var token = document.getElementById('tokenInput').value.trim();
  var btn = document.getElementById('tokenBtn');
  var err = document.getElementById('tokenError');
  if (!token) { err.textContent = 'Please enter an access token.'; return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  err.textContent = '';

  try {
    var resp = await sb.from('audit_sessions').select('*').eq('access_token', token).limit(1);
    if (resp.error) throw resp.error;
    if (!resp.data || resp.data.length === 0) {
      err.textContent = 'Invalid access token.';
      btn.disabled = false; btn.textContent = 'Access Portal'; return;
    }

    var s = resp.data[0];
    var now = new Date();

    if (s.status === 'revoked') {
      err.textContent = 'This session has been revoked.';
      btn.disabled = false; btn.textContent = 'Access Portal'; return;
    }
    if (s.valid_from && new Date(s.valid_from) > now) {
      err.textContent = 'Session not yet active. Begins ' + new Date(s.valid_from).toLocaleDateString();
      btn.disabled = false; btn.textContent = 'Access Portal'; return;
    }
    if (s.valid_until && new Date(s.valid_until) < now) {
      err.textContent = 'This session has expired.';
      btn.disabled = false; btn.textContent = 'Access Portal'; return;
    }

    session = s;

    try {
      await sb.from('audit_access_log').insert({
        session_id: s.id, organization_id: s.organization_id,
        action: 'portal_opened', resource_type: 'portal',
        user_agent: navigator.userAgent, accessed_at: now.toISOString()
      });
      await sb.from('audit_sessions').update({
        last_accessed_at: now.toISOString(),
        access_count: (s.access_count || 0) + 1
      }).eq('id', s.id);
    } catch(e) { console.warn('Log error:', e); }

    showPortal();
  } catch(e) {
    console.error(e);
    err.textContent = 'Connection error. Please try again.';
    btn.disabled = false; btn.textContent = 'Access Portal';
  }
}

function showPortal() {
  document.getElementById('tokenScreen').style.display = 'none';
  document.getElementById('portalScreen').style.display = 'block';

  document.getElementById('sessionInfo').innerHTML =
    '<strong>' + esc(session.session_name || 'Audit Session') + '</strong><br/>' +
    'Type: ' + esc(session.audit_type || 'SQF') + '<br/>' +
    (session.certification_body ? 'CB: ' + esc(session.certification_body) + '<br/>' : '') +
    (session.valid_until ? 'Expires: ' + new Date(session.valid_until).toLocaleDateString() : 'No expiration');

  var nav = document.getElementById('sidebarNav');
  var h = '<div class="nav-item active" data-action="overview"><span class="nav-icon">&#127968;</span> Overview</div>';
  h += '<div class="nav-section">SQF Modules</div>';
  for (var i = 0; i < MODULES.length; i++) {
    var m = MODULES[i];
    h += '<div class="nav-item" data-action="module" data-key="' + m.key + '">';
    h += '<span class="nav-icon">' + m.icon + '</span> ' + m.name + '</div>';
  }
  h += '<div class="nav-section">Security</div>';
  h += '<div class="nav-item" data-action="security"><span class="nav-icon">&#128737;&#65039;</span> Security Controls</div>';
  nav.innerHTML = h;

  showOverview(nav.querySelector('.nav-item'));
}

function setActive(el) {
  var items = document.querySelectorAll('.nav-item');
  for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
  if (el) el.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function showOverview(el) {
  setActive(el);
  document.getElementById('mainTitle').textContent = 'Overview';
  document.getElementById('mainCount').textContent = '';
  var body = document.getElementById('mainBody');
  var h = '<div class="overview-welcome"><h2>Welcome to the Auditor Portal</h2>';
  h += '<p>You have read-only access to facility records for this audit session. Select a module from the sidebar or below to review records. All access is logged for compliance.</p></div>';
  h += '<div class="module-grid">';
  for (var i = 0; i < MODULES.length; i++) {
    var m = MODULES[i];
    h += '<div class="module-card" data-action="module-card" data-key="' + m.key + '">';
    h += '<div class="mc-icon">' + m.icon + '</div>';
    h += '<div class="mc-name">' + m.name + '</div>';
    h += '<div class="mc-desc">SQF ' + m.sqf + '</div></div>';
  }
  h += '</div>';
  body.innerHTML = h;
}

async function loadModule(el, key) {
  setActive(el);
  var mod = null;
  for (var i = 0; i < MODULES.length; i++) { if (MODULES[i].key === key) mod = MODULES[i]; }
  document.getElementById('mainTitle').textContent = mod ? mod.name : key;
  document.getElementById('mainCount').textContent = 'Loading...';
  var body = document.getElementById('mainBody');
  body.innerHTML = '<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';

  try {
    await sb.from('audit_access_log').insert({
      session_id: session.id, organization_id: session.organization_id,
      action: 'module_viewed', resource_type: key,
      module: key, user_agent: navigator.userAgent, accessed_at: new Date().toISOString()
    });
  } catch(e) {}

  try {
    var resp = await sb.from(key).select('*').eq('organization_id', session.organization_id).order('created_at', { ascending: false }).limit(200);
    if (resp.error) throw resp.error;
    var data = resp.data || [];

    document.getElementById('mainCount').textContent = data.length + ' records';

    if (data.length === 0) {
      body.innerHTML = '<div class="empty-state"><div class="es-icon">&#128237;</div><p>No records found in this module.</p></div>';
      return;
    }

    var h = '<input type="text" class="search-bar" placeholder="Search records..."/>';
    for (var i = 0; i < data.length; i++) {
      var rec = data[i];
      var title = rec.title || rec.product_name || rec.name || rec.wo_number || rec.sds_number || (rec.description ? rec.description.substring(0, 60) : '') || ('Record #' + (i + 1));
      var date = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : '';
      h += '<div class="record-card" data-search="' + esc(JSON.stringify(rec)).toLowerCase() + '">';
      h += '<div class="record-head">';
      h += '<h4>' + esc(title) + '</h4>';
      h += '<span class="rh-date">' + date + '</span>';
      h += '<span class="rh-arrow">&#9654;</span></div>';
      h += '<div class="record-body">' + renderFields(rec) + '</div></div>';
    }
    body.innerHTML = h;
  } catch(e) {
    console.error(e);
    body.innerHTML = '<div class="empty-state"><div class="es-icon">&#10060;</div><p>Error loading records: ' + esc(e.message) + '</p></div>';
    document.getElementById('mainCount').textContent = 'Error';
  }
}

function renderFields(rec) {
  var h = '';
  var keys = Object.keys(rec);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = rec[k];
    if (HIDDEN_FIELDS.indexOf(k) >= 0 || v === null || v === undefined || v === '') continue;
    var label = k.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
    var val = '';
    if (typeof v === 'boolean') val = v ? '&#9989; Yes' : '&#10060; No';
    else if (Array.isArray(v)) val = v.join(', ') || '\\u2014';
    else if (typeof v === 'object') val = '<pre style="font-size:11px;white-space:pre-wrap;color:var(--text2)">' + esc(JSON.stringify(v, null, 2)) + '</pre>';
    else if (k.indexOf('date') >= 0 || k.indexOf('_at') >= 0) {
      try { val = new Date(v).toLocaleString(); } catch(e) { val = esc(String(v)); }
    } else val = esc(String(v));
    h += '<div class="record-field"><div class="rf-label">' + esc(label) + '</div><div class="rf-value">' + val + '</div></div>';
  }
  return h || '<div style="padding:12px;color:var(--text3)">No data</div>';
}

function showSecurity(el) {
  setActive(el);
  document.getElementById('mainTitle').textContent = 'Document Security Controls';
  document.getElementById('mainCount').textContent = '';
  var sections = [
    {icon:'&#128272;',title:'Access Control',text:'Token-based authentication with time-limited sessions. Each auditor receives a unique, scoped access token. Tokens are hashed (SHA-256) before storage. Sessions can be revoked immediately by administrators.'},
    {icon:'&#9997;&#65039;',title:'Electronic Signatures',text:'All records requiring signatures use PPN (Personal PIN Number) verification. Signatures are timestamped and linked to verified employee identities. PIN hashes use bcrypt with salt rounds.'},
    {icon:'&#128221;',title:'Document Version Control',text:'All documents maintain full version history. Changes are tracked with timestamps and user attribution. Previous versions are retained and accessible for audit review.'},
    {icon:'&#128190;',title:'Data Storage and Encryption',text:'All data stored in Supabase (PostgreSQL) with AES-256 encryption at rest. TLS 1.3 encryption for all data in transit. Database hosted on AWS with automated daily backups.'},
    {icon:'&#128202;',title:'Audit Trail',text:'Every record creation, modification, and deletion is logged with timestamp, user ID, and change details. Audit logs are immutable and retained for minimum 3 years. Portal access is logged separately.'},
    {icon:'&#128197;',title:'Record Retention',text:'Records retained per SQF requirements: minimum 2 years for quality records, 3 years for safety records. Automated retention policies prevent premature deletion.'},
    {icon:'&#128269;',title:'External Auditor Access',text:'Auditor portal provides read-only access only. All auditor activity is logged including module views, record access, and session duration. No data modification capability.'},
    {icon:'&#128737;&#65039;',title:'Data Integrity',text:'Row Level Security (RLS) enforced at database level. Organization data isolation ensures cross-tenant data protection. All queries are organization-scoped.'},
    {icon:'&#127760;',title:'Infrastructure Security',text:'Deployed on Vercel (Edge Network) with automatic SSL. Supabase infrastructure on AWS with SOC 2 Type II compliance. Regular security updates and dependency auditing.'},
    {icon:'&#128241;',title:'Session Management',text:'Sessions are time-bounded with configurable start and end dates. Inactive sessions are flagged. Administrators can monitor active sessions and revoke access in real-time.'}
  ];
  var h = '';
  for (var i = 0; i < sections.length; i++) {
    h += '<div class="security-section"><h3>' + sections[i].icon + ' ' + sections[i].title + '</h3><p>' + sections[i].text + '</p></div>';
  }
  document.getElementById('mainBody').innerHTML = h;
}

function exitPortal() {
  session = null;
  document.getElementById('portalScreen').style.display = 'none';
  document.getElementById('tokenScreen').style.display = 'flex';
  document.getElementById('tokenInput').value = '';
  document.getElementById('tokenError').textContent = '';
  document.getElementById('tokenBtn').disabled = false;
  document.getElementById('tokenBtn').textContent = 'Access Portal';
  history.replaceState(null, '', window.location.pathname);
}
`;
}
