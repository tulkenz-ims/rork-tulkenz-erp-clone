// api/auditor.js
// Vercel Serverless Function — TulKenz OPS Auditor Portal
// Updated: PM tabs, WO filtering, Sanitation Program live data

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(getHTML());
};

function getHTML() {
  var SB_URL = 'https://xaqztozcnkpmgytnnjlj.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp0b3pjbmtwbWd5dG5uamxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjI2NDAsImV4cCI6MjA4MzczODY0MH0.lL90-qamWRs8GXCvA-F7QcKiPx1WYUMs5OUjUi_1CjU';
  var html = [];
  html.push('<!DOCTYPE html><html lang="en"><head>');
  html.push('<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>');
  html.push('<meta name="robots" content="noindex,nofollow"/>');
  html.push('<title>TulKenz OPS - Auditor Portal</title>');
  html.push('<link rel="preconnect" href="https://fonts.googleapis.com"/>');
  html.push('<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>');
  html.push('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></scr'+'ipt>');
  html.push('<style>'); html.push(getCSS()); html.push('</style></head><body>');
  html.push(getTokenScreen()); html.push(getPortalScreen());
  html.push('<scr'+'ipt>');
  html.push('var SB_URL="'+SB_URL+'";');
  html.push('var SB_KEY="'+SB_KEY+'";');
  html.push(getJS());
  html.push('</scr'+'ipt></body></html>');
  return html.join('\n');
}

function getCSS() {
  return [
    '*{margin:0;padding:0;box-sizing:border-box}',
    ':root{--bg:#0F0E17;--surface:#1A1926;--surface2:#252336;--border:#2E2C42;--primary:#6C5CE7;--primary-glow:#6C5CE740;--accent:#A78BFA;--text:#FFFFFE;--text1:#FFFFFE;--text2:#A7A4C2;--text3:#6B6890;--success:#10B981;--warning:#F59E0B;--danger:#EF4444;--font:"DM Sans",system-ui,-apple-system,sans-serif}',
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
    '.sidebar{width:300px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}',
    '.sidebar-head{padding:20px 20px 16px;border-bottom:1px solid var(--border)}',
    '.sidebar-brand{font-size:18px;font-weight:800;letter-spacing:-0.3px}',
    '.sidebar-brand span{color:var(--primary)}',
    '.sidebar-badge{display:inline-flex;align-items:center;gap:4px;background:var(--primary);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:6px;letter-spacing:0.5px}',
    '.sidebar-session{padding:16px 20px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text2);line-height:1.6}',
    '.sidebar-session strong{color:var(--text);font-weight:600}',
    '.sidebar-nav{flex:1;overflow-y:auto;padding:8px 0}',
    '.nav-section{padding:10px 20px 6px;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-top:6px}',
    '.nav-group{margin-bottom:2px}',
    '.nav-group-head{display:flex;align-items:center;gap:8px;padding:8px 20px;font-size:12px;font-weight:700;color:var(--text2);cursor:pointer;transition:all .15s;user-select:none}',
    '.nav-group-head:hover{color:var(--text);background:var(--surface2)}',
    '.nav-group-head .ng-arrow{font-size:10px;transition:transform .2s;color:var(--text3)}',
    '.nav-group.open .ng-arrow{transform:rotate(90deg)}',
    '.nav-group-head .ng-icon{width:18px;text-align:center;font-size:14px}',
    '.nav-group-head .ng-label{flex:1}',
    '.nav-group-head .ng-sqf{font-size:9px;color:var(--text3);font-weight:600;background:var(--surface2);padding:1px 6px;border-radius:4px}',
    '.nav-group-items{display:none;padding:2px 0 4px 0}',
    '.nav-group.open .nav-group-items{display:block}',
    '.nav-item{display:flex;align-items:center;gap:10px;padding:8px 20px 8px 44px;font-size:12px;font-weight:500;color:var(--text3);cursor:pointer;transition:all .15s;border-left:3px solid transparent}',
    '.nav-item:hover{background:var(--surface2);color:var(--text)}',
    '.nav-item.active{background:#6C5CE712;color:var(--primary);border-left-color:var(--primary);font-weight:600}',
    '.nav-item .ni-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}',
    '.nav-item-top{padding-left:20px;font-size:13px;font-weight:500;color:var(--text2)}',
    '.nav-item-top.active{color:var(--primary);font-weight:600}',
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
    '.overview-welcome .ow-edition{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.2);padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;margin-top:10px}',
    '.section-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:16px;overflow:hidden;transition:all .2s}',
    '.section-card:hover{border-color:var(--primary)}',
    '.sc-head{padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer}',
    '.sc-num{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;flex-shrink:0}',
    '.sc-info{flex:1}',
    '.sc-name{font-size:15px;font-weight:700}',
    '.sc-desc{font-size:12px;color:var(--text2);margin-top:2px}',
    '.sc-arrow{color:var(--text3);font-size:14px}',
    '.sc-modules{border-top:1px solid var(--border);padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px}',
    '.sc-mod{font-size:11px;padding:4px 10px;border-radius:6px;background:var(--surface2);color:var(--text2);cursor:pointer;transition:all .15s}',
    '.sc-mod:hover{background:var(--primary);color:#fff}',
    '.placeholder-view{text-align:center;padding:60px 28px}',
    '.ph-icon{font-size:48px;margin-bottom:16px;opacity:.5}',
    '.ph-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px}',
    '.ph-desc{font-size:14px;color:var(--text2);max-width:480px;margin:0 auto 24px}',
    '.ph-items{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;max-width:500px;margin:0 auto;text-align:left}',
    '.ph-items h4{font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px}',
    '.ph-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text2)}',
    '.ph-item .phi-dot{width:6px;height:6px;border-radius:50%;background:var(--text3);flex-shrink:0}',
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
    '.back-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text2);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:20px;transition:all .2s}',
    '.back-btn:hover{border-color:var(--primary);color:var(--primary)}',
    '.ncr-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;margin-bottom:10px;cursor:pointer;transition:all .2s}',
    '.ncr-card:hover{border-color:var(--primary);transform:translateY(-1px)}',
    '.ncr-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
    '.ncr-num{font-size:14px;font-weight:700;color:var(--primary)}',
    '.ncr-title{font-size:13px;color:var(--text);margin-bottom:10px}',
    '.ncr-badges{display:flex;gap:6px;flex-wrap:wrap}',
    '.badge{display:inline-flex;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600}',
    '.badge-minor{background:#FEF3C7;color:#D97706}',
    '.badge-major{background:#FFF7ED;color:#EA580C}',
    '.badge-critical{background:#FEF2F2;color:#DC2626}',
    '.badge-open{background:#DBEAFE;color:#2563EB}',
    '.badge-investigation{background:#EDE9FE;color:#7C3AED}',
    '.badge-containment{background:#FEF3C7;color:#D97706}',
    '.badge-root_cause{background:#FCE7F3;color:#DB2777}',
    '.badge-corrective_action{background:#FFF7ED;color:#EA580C}',
    '.badge-verification{background:#CFFAFE;color:#0891B2}',
    '.badge-closed{background:#D1FAE5;color:#059669}',
    '.badge-rejected{background:#F3F4F6;color:#6B7280}',
    '.tab-bar{display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid var(--border);overflow-x:auto}',
    '.tab-btn{padding:10px 16px;font-size:12px;font-weight:600;color:var(--text2);cursor:pointer;border:none;background:none;font-family:var(--font);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;white-space:nowrap;flex-shrink:0}',
    '.tab-btn.active{color:var(--primary);border-bottom-color:var(--primary)}',
    '.tab-btn:hover:not(.active){color:var(--text)}',
    '.filter-chips{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}',
    '.chip{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--text2);transition:all .15s}',
    '.chip.active{background:var(--primary);color:#fff;border-color:var(--primary)}',
    '.tl-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px}',
    '.tl-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
    '.tl-card-title{font-size:13px;font-weight:700;color:var(--text)}',
    '.tl-card-time{font-size:11px;color:var(--text3)}',
    '.tl-card-body{font-size:12px;color:var(--text2);line-height:1.5}',
    '.tl-card-field{display:flex;gap:8px;margin-top:4px}',
    '.tl-field-label{font-size:11px;color:var(--text3);font-weight:600;min-width:80px}',
    '.tl-field-value{font-size:11px;color:var(--text)}',
    '.dept-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px}',
    '.dept-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
    '.dept-name{font-size:14px;font-weight:700}',
    '.dept-status{font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px}',
    '.dept-status.completed{background:#D1FAE5;color:#059669}',
    '.dept-status.not_involved{background:#F3F4F6;color:#6B7280}',
    '.dept-status.pending{background:#FEF3C7;color:#D97706}',
    '.dept-status.in_progress{background:#DBEAFE;color:#2563EB}',
    '.dept-detail{font-size:12px;color:var(--text2);margin-top:4px}',
    '.dept-sig{font-size:11px;color:#059669;margin-top:4px;display:flex;align-items:center;gap:4px}',
    '.connected-section{margin-top:24px}',
    '.connected-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:8px}',
    '.paper-form{background:#FFFFFF;border:2px solid #B0B0B0;border-radius:4px;overflow:hidden;margin-bottom:24px}',
    '.pf-title-bar{background:#4A90A4;padding:10px;text-align:center;border-bottom:1px solid #B0B0B0}',
    '.pf-title-bar h2{color:#fff;font-size:16px;font-weight:700;margin:0}',
    '.pf-section{display:flex;align-items:center;gap:6px;background:#D6EAF8;padding:6px 10px;border-bottom:1px solid #B0B0B0}',
    '.pf-section-label{font-size:12px;font-weight:700;color:#1B4F72}',
    '.pf-section-title{font-size:12px;font-weight:600;color:#1B4F72}',
    '.pf-row{display:flex;border-bottom:1px solid #B0B0B0;min-height:32px}',
    '.pf-row:last-child{border-bottom:none}',
    '.pf-label{background:#F5F6F7;padding:4px 8px;border-right:1px solid #B0B0B0;font-size:11px;font-weight:600;color:#444;display:flex;align-items:center;flex-shrink:0}',
    '.pf-value{background:#fff;padding:4px 8px;border-right:1px solid #B0B0B0;font-size:12px;color:#333;display:flex;align-items:center;flex:1;word-break:break-word}',
    '.pf-value:last-child{border-right:none}',
    '.pf-sig-verified{display:flex;align-items:center;gap:6px;color:#059669;font-weight:600;font-size:12px}',
    '.pf-sig-stamp{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;padding:6px 10px;font-size:11px;color:#065F46;font-family:monospace;white-space:pre-wrap;line-height:1.4}',
    '.pf-sig-unverified{color:#EF4444;font-weight:600;font-size:12px}',
    '.pf-form-num{padding:4px 10px;border-bottom:1px solid #B0B0B0;background:#FAFAFA;font-size:10px;color:#777}',
    '.pf-badges{display:flex;gap:8px;padding:8px 10px;border-bottom:1px solid #B0B0B0;background:#FAFAFA}',
    '@media(max-width:768px){.sidebar{width:280px;position:fixed;left:-300px;top:0;bottom:0;z-index:100;transition:left .3s}.sidebar.open{left:0}.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99}.sidebar-overlay.show{display:block}.mobile-hamburger{display:flex!important}.main-body{padding:16px}.record-field{flex-direction:column;gap:2px}.rf-label{width:auto}.token-card{padding:32px 24px}}',
    '@media(min-width:769px){.mobile-hamburger{display:none!important}.sidebar-overlay{display:none!important}}',
    '.mobile-hamburger{align-items:center;justify-content:center;width:36px;height:36px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:18px;color:var(--text)}',
    '::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:var(--text3)}',
  ].join('\n');
}

function getTokenScreen() {
  return '<div id="tokenScreen"><div class="token-card"><div class="token-logo">Tul<span>Kenz</span> OPS</div><div class="token-sub">Auditor Portal &#8212; Read-Only Access</div><input type="text" id="tokenInput" class="token-input" placeholder="Enter your access token" autocomplete="off" spellcheck="false"/><button id="tokenBtn" class="token-btn">Access Portal</button><div id="tokenError" class="token-error"></div><div class="token-security">&#128274; Secure, encrypted, read-only access. All activity is logged.</div></div></div>';
}

function getPortalScreen() {
  return '<div id="portalScreen"><div class="portal-wrap"><div class="sidebar-overlay" id="sidebarOverlay"></div><div class="sidebar" id="sidebar"><div class="sidebar-head"><div class="sidebar-brand">Tul<span>Kenz</span> OPS</div><div class="sidebar-badge">&#128274; READ-ONLY AUDIT ACCESS</div></div><div class="sidebar-session" id="sessionInfo"></div><div class="sidebar-nav" id="sidebarNav"></div><div class="sidebar-foot"><button class="exit-btn" id="exitBtn">&#8592; Exit Portal</button></div></div><div class="main"><div class="main-header"><div style="display:flex;align-items:center;gap:12px"><div class="mobile-hamburger" id="hamburgerBtn">&#9776;</div><div class="main-title" id="mainTitle">Overview</div></div><div class="main-count" id="mainCount"></div></div><div class="main-body" id="mainBody"></div></div></div></div>';
}

function getJS() {
  return `
var sb = supabase.createClient(SB_URL, SB_KEY);
var session = null;
var currentNCRData = null;

var AUDIT_TYPES = {
  sqf: {
    label:'SQF Edition 10', badge:'SQF Food Safety Code \u2014 Edition 10 \u2022 Food Manufacturing',
    sections:[
      {id:'s1',num:'1',name:'Management & Culture',sqf:'2.1',color:'#6C5CE7',icon:'\uD83C\uDFDB\uFE0F',desc:'Management commitment, food safety policy, food safety culture plan',
        modules:[
          {key:'_ph_sqf_policy',name:'Food Safety Policy',sqf:'2.1.1',ph:true,phIcon:'\uD83D\uDCC3',phDesc:'Documented food safety policy, management commitment statement, and organizational chart.',phItems:['Food safety policy statement','Management commitment documentation','Organizational chart with food safety roles','SQF practitioner designation','Management review records']},
          {key:'_ph_sqf_culture',name:'Food Safety Culture Plan',sqf:'2.1.2',ph:true,phIcon:'\uD83C\uDF1F',phDesc:'Measurable objectives for building a positive food safety culture.',phItems:['Culture plan objectives & KPIs','Employee engagement surveys','Food safety communication records','Culture assessment results','Leadership involvement evidence']},
          {key:'_ph_sqf_mgmt',name:'Management Review',sqf:'2.1.3',ph:true,phIcon:'\uD83D\uDCCA',phDesc:'Regular management reviews of the food safety system effectiveness.',phItems:['Management review meeting minutes','System effectiveness assessments','Resource allocation decisions','Improvement action items','Review frequency documentation']},
        ]},
      {id:'s2',num:'2',name:'Food Safety System',sqf:'2.2\u20132.4',color:'#EF4444',icon:'\u2622\uFE0F',desc:'HACCP, allergen management, chemical hazards, supplier approval, environmental monitoring',
        modules:[
          {key:'sds_records',name:'SDS / Chemical Hazards',sqf:'2.3.1',table:'sds_records'},
          {key:'_allergen_view',name:'Allergen Management',sqf:'2.8.1',special:'allergen'},
          {key:'vendor_approvals',name:'Approved Suppliers',sqf:'2.3.4',table:'vendor_approvals'},
          {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'2.4.8',table:'environmental_monitoring'},
          {key:'_ph_sqf_haccp',name:'HACCP Plan',sqf:'2.4.1',ph:true,phIcon:'\u26A0\uFE0F',phDesc:'Hazard analysis, critical control points, and food safety plans.',phItems:['Hazard analysis worksheets','CCP determination records','Critical limits & monitoring procedures','Corrective action procedures','HACCP plan validation records','Flow diagrams & process descriptions']},
        ]},
      {id:'s3',num:'3',name:'Verification & Improvement',sqf:'2.5\u20132.6',color:'#10B981',icon:'\u2705',desc:'Document control, NCR/CAPA, internal audits, traceability, validation',
        modules:[
          {key:'documents',name:'Document Control',sqf:'2.2.1',special:'doc_dashboard'},
          {key:'ncr_records',name:'NCR / Corrective Actions',sqf:'2.5.3',table:'ncr_records'},
          {key:'audit_findings',name:'Internal Audits',sqf:'2.5.4',table:'audit_findings'},
          {key:'_ph_sqf_trace',name:'Traceability & Recall',sqf:'2.6.1',ph:true,phIcon:'\uD83D\uDD0D',phDesc:'Product identification, traceability system, mock recall records.',phItems:['Traceability system documentation','Mock recall test results & timing','Lot coding / date coding procedures','Receiving & shipping trace records','Withdrawal & recall procedure']},
          {key:'backup_verification_log',name:'Backup Verification',sqf:'2.2.3',table:'backup_verification_log'},
        ]},
      {id:'s4',num:'4',name:'Support Programs',sqf:'2.7\u20132.9',color:'#F59E0B',icon:'\uD83C\uDF93',desc:'Training, food defense, food fraud, change management',
        modules:[
          {key:'training_records',name:'Training Records',sqf:'2.9.1',table:'training_records'},
          {key:'_ph_sqf_defense',name:'Food Defense & Fraud',sqf:'2.7.1',ph:true,phIcon:'\uD83D\uDEE1\uFE0F',phDesc:'Site security, vulnerability assessments, food fraud mitigation.',phItems:['Food defense plan','Vulnerability assessment','Food fraud mitigation plan','Site security measures documentation','Visitor & contractor access controls']},
          {key:'_ph_sqf_change',name:'Change Management',sqf:'2.3.5',ph:true,phIcon:'\uD83D\uDD04',phDesc:'Documented procedures for managing process, personnel, and equipment changes.',phItems:['Change management procedure','Change request & approval records','Risk assessment for changes','Post-change verification records']},
        ]},
      {id:'gmp',num:'11',name:'GMP \u2014 Good Manufacturing Practices',sqf:'Module 11',color:'#8B5CF6',icon:'\uD83C\uDFED',desc:'Facility, equipment, hygiene, sanitation, maintenance, pest control',
        modules:[
          {key:'pm_schedules',name:'Preventive Maintenance',sqf:'11.2.8',special:'pm_section'},
          {key:'work_orders',name:'Work Orders',sqf:'11.2.8',special:'work_orders_section'},
          {key:'inspections',name:'Facility Inspections',sqf:'11.2.1',table:'inspections'},
          {key:'sanitation_program',name:'Sanitation Program',sqf:'11.2.6',special:'sanitation_section'},
          {key:'_ph_sqf_pest',name:'Pest Control',sqf:'11.2.4',ph:true,phIcon:'\uD83D\uDC1B',phDesc:'Integrated pest management program and monitoring.',phItems:['IPM program documentation','Pest control operator contract & license','Trap map and inspection logs','Pest activity trend reports','Corrective actions for pest findings']},
        ]},
    ]},
  brcgs:{label:'BRCGS Issue 9',badge:'BRCGS Global Standard for Food Safety \u2022 Issue 9',sections:[
    {id:'b1',num:'1',name:'Senior Management Commitment',sqf:'Clause 1',color:'#6C5CE7',icon:'\uD83C\uDFDB\uFE0F',desc:'Management commitment, food safety policy, culture',modules:[
      {key:'_ph_brc_policy',name:'Food Safety & Quality Policy',sqf:'1.1.1',ph:true,phIcon:'\uD83D\uDCC3',phDesc:'Documented policy signed by senior management.',phItems:['Signed food safety & quality policy','Organizational chart','Food safety culture plan','Management commitment evidence','Communication of policy to all staff']},
      {key:'_ph_brc_review',name:'Management Review',sqf:'1.1.10',ph:true,phIcon:'\uD83D\uDCCA',phDesc:'Annual management review of the food safety and quality system.',phItems:['Management review minutes','Previous audit action plans','Customer complaints analysis','Incident & corrective action review']},
    ]},
    {id:'b2',num:'2',name:'Food Safety Plan \u2014 HACCP',sqf:'Clause 2',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'HACCP team, prerequisite programmes, hazard analysis, CCPs',modules:[
      {key:'_ph_brc_haccp',name:'HACCP Plan',sqf:'2.7\u20132.14',ph:true,phIcon:'\u26A0\uFE0F',phDesc:'Codex Alimentarius-based HACCP plan with flow diagrams.',phItems:['HACCP team & qualifications','Product descriptions & intended use','Process flow diagrams (verified on-site)','Hazard analysis worksheets','CCP determination & critical limits']},
      {key:'sds_records',name:'Chemical Hazard Controls',sqf:'2.8',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Hazard Analysis',sqf:'2.8 / 5.3',special:'allergen'},
    ]},
    {id:'b3',num:'3',name:'Food Safety & Quality Management',sqf:'Clause 3',color:'#10B981',icon:'\u2705',desc:'Document control, corrective actions, traceability, complaints',modules:[
      {key:'documents',name:'Document Control',sqf:'3.2',special:'doc_dashboard'},
      {key:'ncr_records',name:'Corrective & Preventive Actions',sqf:'3.7',table:'ncr_records'},
      {key:'audit_findings',name:'Internal Audits',sqf:'3.4',table:'audit_findings'},
      {key:'vendor_approvals',name:'Approved Suppliers',sqf:'3.5.1',table:'vendor_approvals'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'3.2',table:'backup_verification_log'},
    ]},
    {id:'b4',num:'4',name:'Site Standards',sqf:'Clause 4',color:'#F59E0B',icon:'\uD83C\uDFED',desc:'Facility layout, equipment, maintenance, hygiene, pest management',modules:[
      {key:'pm_schedules',name:'Preventive Maintenance',sqf:'4.7',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'4.7',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'4.1\u20134.4',table:'inspections'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'4.11.7',table:'environmental_monitoring'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'4.11',special:'sanitation_section'},
      {key:'_ph_brc_pest',name:'Pest Control',sqf:'4.14',ph:true,phIcon:'\uD83D\uDC1B',phDesc:'Pest management programme with competent provider.',phItems:['Pest control contract & competency','Site pest control map','Inspection frequency & records','Trend analysis of pest activity','Proofing & corrective actions']},
    ]},
    {id:'b5',num:'5',name:'Product Control',sqf:'Clause 5',color:'#3B82F6',icon:'\uD83D\uDCE6',desc:'Product design, allergen management, packaging, product inspection',modules:[
      {key:'_allergen_view',name:'Allergen Management',sqf:'5.3',special:'allergen'},
      {key:'sds_records',name:'Chemical Controls',sqf:'5.4',table:'sds_records'},
    ]},
    {id:'b6',num:'6',name:'Personnel',sqf:'Clause 7',color:'#EC4899',icon:'\uD83E\uDDD1\u200D\uD83C\uDFED',desc:'Training, personal hygiene, protective clothing, medical screening',modules:[
      {key:'training_records',name:'Training Records',sqf:'7.1',table:'training_records'},
    ]},
  ]},
  fssc:{label:'FSSC 22000',badge:'FSSC 22000 Version 6 \u2022 ISO 22000:2018 + Sector PRPs',sections:[
    {id:'fc1',num:'4\u20135',name:'Context & Leadership',sqf:'ISO 22000 Cl. 4\u20135',color:'#6C5CE7',icon:'\uD83C\uDFDB\uFE0F',desc:'Context of the organization, leadership commitment, food safety policy',modules:[
      {key:'_ph_fssc_lead',name:'Leadership & Policy',sqf:'Cl. 5.1\u20135.3',ph:true,phIcon:'\uD83D\uDCC3',phDesc:'Management commitment, food safety policy, organizational roles.',phItems:['Food safety policy (signed)','Roles, responsibilities & authorities','Management commitment evidence','FSMS resource allocation']},
      {key:'documents',name:'Document Control',sqf:'Cl. 7.5',special:'doc_dashboard'},
    ]},
    {id:'fc2',num:'6\u20137',name:'Planning & Support',sqf:'ISO 22000 Cl. 6\u20137',color:'#3B82F6',icon:'\uD83D\uDCCB',desc:'Risk-based planning, objectives, resources, competence, communication',modules:[
      {key:'training_records',name:'Competence & Training',sqf:'Cl. 7.2',table:'training_records'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'Cl. 7.5',table:'backup_verification_log'},
    ]},
    {id:'fc3',num:'8',name:'Operations',sqf:'ISO 22000 Cl. 8',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'PRPs, traceability, hazard analysis, HACCP plan, allergen management',modules:[
      {key:'sds_records',name:'Chemical Hazard Controls',sqf:'Cl. 8.5.2',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Management',sqf:'Cl. 8.5.1',special:'allergen'},
      {key:'vendor_approvals',name:'Supplier Controls',sqf:'Cl. 8.5.1.5',table:'vendor_approvals'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'Cl. 8.5.1.3',table:'environmental_monitoring'},
      {key:'_ph_fssc_haccp',name:'Hazard Analysis & CCP Plan',sqf:'Cl. 8.5',ph:true,phIcon:'\u26A0\uFE0F',phDesc:'Hazard analysis, determination of CCPs and OPRPs.',phItems:['Hazard analysis worksheets','CCP determination & decision trees','Critical limits & monitoring','OPRP management programmes','Validation of control measures']},
    ]},
    {id:'fc4',num:'8',name:'Site Standards & PRPs',sqf:'ISO/TS 22002-1',color:'#F59E0B',icon:'\uD83C\uDFED',desc:'Facility, equipment, maintenance, sanitation, pest control',modules:[
      {key:'pm_schedules',name:'Preventive Maintenance',sqf:'ISO/TS 22002-1 Cl. 8',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'ISO/TS 22002-1 Cl. 8',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'ISO/TS 22002-1 Cl. 4\u20135',table:'inspections'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'ISO/TS 22002-1 Cl. 11',special:'sanitation_section'},
      {key:'_ph_fssc_pest',name:'Pest Control',sqf:'ISO/TS 22002-1 Cl. 12',ph:true,phIcon:'\uD83D\uDC1B',phDesc:'Pest management programme.',phItems:['Pest control programme & contract','Bait station / trap map','Inspection & trend reports','Corrective actions for findings']},
    ]},
    {id:'fc5',num:'9\u201310',name:'Performance & Improvement',sqf:'ISO 22000 Cl. 9\u201310',color:'#10B981',icon:'\u2705',desc:'Monitoring, internal audit, management review, nonconformity, corrective action',modules:[
      {key:'ncr_records',name:'Nonconformity & Corrective Actions',sqf:'Cl. 10.1',table:'ncr_records'},
      {key:'audit_findings',name:'Internal Audits',sqf:'Cl. 9.2',table:'audit_findings'},
    ]},
  ]},
  internal:{label:'Internal Audit',badge:'Internal Food Safety & Quality Audit',sections:[
    {id:'i1',num:'1',name:'Management System Review',sqf:'Internal',color:'#6C5CE7',icon:'\uD83C\uDFDB\uFE0F',desc:'Policy, management commitment, document control, management review',modules:[
      {key:'documents',name:'Document Control',sqf:'Internal',special:'doc_dashboard'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'Internal',table:'backup_verification_log'},
    ]},
    {id:'i2',num:'2',name:'Food Safety & HACCP',sqf:'Internal',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'HACCP plan review, hazard analysis, allergen management, chemical controls',modules:[
      {key:'sds_records',name:'Chemical Hazard Controls',sqf:'Internal',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Management',sqf:'Internal',special:'allergen'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'Internal',table:'environmental_monitoring'},
    ]},
    {id:'i3',num:'3',name:'Corrective Actions & Verification',sqf:'Internal',color:'#10B981',icon:'\u2705',desc:'NCR/CAPA review, audit findings follow-up, traceability testing',modules:[
      {key:'ncr_records',name:'NCR / CAPA Review',sqf:'Internal',table:'ncr_records'},
      {key:'audit_findings',name:'Previous Audit Follow-up',sqf:'Internal',table:'audit_findings'},
    ]},
    {id:'i4',num:'4',name:'Site Standards & GMP',sqf:'Internal',color:'#F59E0B',icon:'\uD83C\uDFED',desc:'Facility condition, equipment maintenance, sanitation, pest control, hygiene',modules:[
      {key:'pm_schedules',name:'Preventive Maintenance',sqf:'Internal',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'Internal',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'Internal',table:'inspections'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'Internal',special:'sanitation_section'},
    ]},
    {id:'i5',num:'5',name:'Personnel & Training',sqf:'Internal',color:'#3B82F6',icon:'\uD83C\uDF93',desc:'Training completeness, competency assessments, supplier management',modules:[
      {key:'training_records',name:'Training Records',sqf:'Internal',table:'training_records'},
      {key:'vendor_approvals',name:'Supplier Management',sqf:'Internal',table:'vendor_approvals'},
    ]},
  ]},
  regulatory:{label:'Regulatory Inspection',badge:'Regulatory Compliance \u2022 FDA / FSMA / State / Local',sections:[
    {id:'r1',num:'1',name:'Food Safety Plan & Preventive Controls',sqf:'21 CFR 117 Subpart C',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'Hazard analysis, preventive controls, allergen controls, sanitation controls',modules:[
      {key:'sds_records',name:'Chemical Hazard Controls',sqf:'\u00A7117.135',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Controls',sqf:'\u00A7117.135(c)',special:'allergen'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'\u00A7117.165',table:'environmental_monitoring'},
      {key:'_ph_reg_fsp',name:'Written Food Safety Plan',sqf:'\u00A7117.126',ph:true,phIcon:'\uD83D\uDCD1',phDesc:'Written food safety plan including hazard analysis and preventive controls.',phItems:['Hazard analysis','Process preventive controls','Allergen preventive controls','Sanitation preventive controls','Supply-chain preventive controls','Recall plan']},
    ]},
    {id:'r2',num:'2',name:'Current Good Manufacturing Practices',sqf:'21 CFR 117 Subpart B',color:'#3B82F6',icon:'\uD83C\uDFED',desc:'Personnel, plant & grounds, sanitary operations, equipment, production controls',modules:[
      {key:'pm_schedules',name:'Equipment Maintenance',sqf:'\u00A7117.40',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'\u00A7117.40',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'\u00A7117.35',table:'inspections'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'\u00A7117.35',special:'sanitation_section'},
    ]},
    {id:'r3',num:'3',name:'Supply Chain & Traceability',sqf:'21 CFR 117 Subpart G',color:'#F59E0B',icon:'\uD83D\uDE9A',desc:'Supplier verification, food traceability, supply-chain controls',modules:[
      {key:'vendor_approvals',name:'Supplier Verification',sqf:'\u00A7117.405',table:'vendor_approvals'},
    ]},
    {id:'r4',num:'4',name:'Verification & Recordkeeping',sqf:'21 CFR 117 Subpart F',color:'#10B981',icon:'\u2705',desc:'Verification activities, corrective actions, records, training',modules:[
      {key:'documents',name:'Document Control',sqf:'\u00A7117.305',special:'doc_dashboard'},
      {key:'ncr_records',name:'Corrective Actions',sqf:'\u00A7117.150',table:'ncr_records'},
      {key:'audit_findings',name:'Verification Activities',sqf:'\u00A7117.155',table:'audit_findings'},
      {key:'training_records',name:'Training & Qualification',sqf:'\u00A7117.4',table:'training_records'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'\u00A7117.305(e)',table:'backup_verification_log'},
    ]},
  ]},
  customer:{label:'Customer Audit',badge:'Customer / Retailer Audit \u2022 Supplier Qualification',sections:[
    {id:'c1',num:'1',name:'Quality Management System',sqf:'Customer',color:'#6C5CE7',icon:'\uD83D\uDCCB',desc:'Document control, management commitment, organizational structure',modules:[
      {key:'documents',name:'Document Control',sqf:'Customer',special:'doc_dashboard'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'Customer',table:'backup_verification_log'},
    ]},
    {id:'c2',num:'2',name:'Food Safety & HACCP',sqf:'Customer',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'HACCP plan, allergen programme, chemical controls, environmental monitoring',modules:[
      {key:'sds_records',name:'Chemical Controls',sqf:'Customer',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Programme',sqf:'Customer',special:'allergen'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'Customer',table:'environmental_monitoring'},
    ]},
    {id:'c3',num:'3',name:'Facility & Operations',sqf:'Customer',color:'#F59E0B',icon:'\uD83C\uDFED',desc:'Facility condition, maintenance, sanitation, pest control, production controls',modules:[
      {key:'pm_schedules',name:'Preventive Maintenance',sqf:'Customer',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'Customer',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'Customer',table:'inspections'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'Customer',special:'sanitation_section'},
    ]},
    {id:'c4',num:'4',name:'Supplier & Traceability',sqf:'Customer',color:'#3B82F6',icon:'\uD83D\uDE9A',desc:'Supplier approval, incoming inspection, traceability, recall readiness',modules:[
      {key:'vendor_approvals',name:'Supplier Approval',sqf:'Customer',table:'vendor_approvals'},
    ]},
    {id:'c5',num:'5',name:'Corrective Actions & Training',sqf:'Customer',color:'#10B981',icon:'\u2705',desc:'NCR/CAPA management, training programme, previous audit follow-up',modules:[
      {key:'ncr_records',name:'Corrective Actions',sqf:'Customer',table:'ncr_records'},
      {key:'audit_findings',name:'Previous Audit Follow-up',sqf:'Customer',table:'audit_findings'},
      {key:'training_records',name:'Training Records',sqf:'Customer',table:'training_records'},
    ]},
  ]},
  other:{label:'Other Audit',badge:'Custom Audit \u2022 All Modules Available',sections:[
    {id:'x1',num:'1',name:'Documentation & Management',sqf:'General',color:'#6C5CE7',icon:'\uD83D\uDCCB',desc:'Document control, backup verification, management system overview',modules:[
      {key:'documents',name:'Document Control',sqf:'General',special:'doc_dashboard'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'General',table:'backup_verification_log'},
    ]},
    {id:'x2',num:'2',name:'Food Safety & Chemical Controls',sqf:'General',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'SDS records, allergen management, chemical controls, environmental monitoring',modules:[
      {key:'sds_records',name:'SDS / Chemical Records',sqf:'General',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Management',sqf:'General',special:'allergen'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'General',table:'environmental_monitoring'},
    ]},
    {id:'x3',num:'3',name:'Corrective Actions & Audits',sqf:'General',color:'#10B981',icon:'\u2705',desc:'NCR/CAPA records, audit findings, training records',modules:[
      {key:'ncr_records',name:'NCR / Corrective Actions',sqf:'General',table:'ncr_records'},
      {key:'audit_findings',name:'Audit Findings',sqf:'General',table:'audit_findings'},
      {key:'training_records',name:'Training Records',sqf:'General',table:'training_records'},
    ]},
    {id:'x4',num:'4',name:'Facility & Maintenance',sqf:'General',color:'#F59E0B',icon:'\uD83C\uDFED',desc:'Preventive maintenance, work orders, facility inspections, supplier approvals',modules:[
      {key:'pm_schedules',name:'Preventive Maintenance',sqf:'General',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'General',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'General',table:'inspections'},
      {key:'vendor_approvals',name:'Supplier Approvals',sqf:'General',table:'vendor_approvals'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'General',special:'sanitation_section'},
    ]},
  ]},
  fda:{label:'FDA / FSMA Inspection',badge:'FDA Food Safety Modernization Act \u2022 21 CFR 117',sections:[
    {id:'f1',num:'1',name:'Food Safety Plan & Preventive Controls',sqf:'21 CFR 117 Subpart C',color:'#EF4444',icon:'\u26A0\uFE0F',desc:'Hazard analysis, preventive controls, allergen controls, sanitation controls',modules:[
      {key:'sds_records',name:'Chemical Hazard Controls',sqf:'\u00A7117.135',table:'sds_records'},
      {key:'_allergen_view',name:'Allergen Controls',sqf:'\u00A7117.135(c)',special:'allergen'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'\u00A7117.165',table:'environmental_monitoring'},
      {key:'_ph_fda_fsp',name:'Written Food Safety Plan',sqf:'\u00A7117.126',ph:true,phIcon:'\uD83D\uDCD1',phDesc:'Written food safety plan including hazard analysis and preventive controls.',phItems:['Hazard analysis','Process preventive controls','Allergen preventive controls','Sanitation preventive controls','Recall plan']},
    ]},
    {id:'f2',num:'2',name:'Current Good Manufacturing Practices',sqf:'21 CFR 117 Subpart B',color:'#3B82F6',icon:'\uD83C\uDFED',desc:'Personnel, plant & grounds, sanitary operations, equipment, production controls',modules:[
      {key:'pm_schedules',name:'Equipment Maintenance',sqf:'\u00A7117.40',special:'pm_section'},
      {key:'work_orders',name:'Work Orders',sqf:'\u00A7117.40',special:'work_orders_section'},
      {key:'inspections',name:'Facility Inspections',sqf:'\u00A7117.35',table:'inspections'},
      {key:'sanitation_program',name:'Sanitation Program',sqf:'\u00A7117.35',special:'sanitation_section'},
    ]},
    {id:'f3',num:'3',name:'Supply Chain & Traceability',sqf:'21 CFR 117 Subpart G',color:'#F59E0B',icon:'\uD83D\uDE9A',desc:'Supplier verification, food traceability',modules:[
      {key:'vendor_approvals',name:'Supplier Verification',sqf:'\u00A7117.405',table:'vendor_approvals'},
    ]},
    {id:'f4',num:'4',name:'Verification & Recordkeeping',sqf:'21 CFR 117 Subpart F',color:'#10B981',icon:'\u2705',desc:'Verification activities, corrective actions, records, training',modules:[
      {key:'documents',name:'Document Control',sqf:'\u00A7117.305',special:'doc_dashboard'},
      {key:'ncr_records',name:'Corrective Actions',sqf:'\u00A7117.150',table:'ncr_records'},
      {key:'audit_findings',name:'Verification Activities',sqf:'\u00A7117.155',table:'audit_findings'},
      {key:'training_records',name:'Training & Qualification',sqf:'\u00A7117.4',table:'training_records'},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'\u00A7117.305(e)',table:'backup_verification_log'},
    ]},
  ]},
  osha:{label:'OSHA Safety Inspection',badge:'OSHA 29 CFR 1910 \u2022 General Industry \u2022 Food Manufacturing',sections:[
    {id:'o1',num:'1',name:'Hazardous Energy Control (LOTO)',sqf:'29 CFR 1910.147',color:'#EF4444',icon:'\u26A1',desc:'Lockout/tagout \u2014 #1 most cited standard in food manufacturing',modules:[
      {key:'pm_schedules',name:'Equipment LOTO Schedules',sqf:'1910.147(c)(4)',special:'pm_section'},
      {key:'work_orders',name:'Maintenance Work Orders',sqf:'1910.147(d)',special:'work_orders_section'},
      {key:'training_records',name:'LOTO Training Records',sqf:'1910.147(c)(7)',table:'training_records'},
      {key:'_ph_osha_loto',name:'LOTO Program',sqf:'1910.147(c)(1)',ph:true,phIcon:'\uD83D\uDD12',phDesc:'Energy control program with machine-specific procedures and periodic inspections.',phItems:['Written energy control program','Machine-specific LOTO procedures','Periodic inspection records (annual minimum)','Employee training certifications','Authorized/affected employee lists']},
    ]},
    {id:'o2',num:'2',name:'Machine Guarding & Equipment',sqf:'29 CFR 1910.212\u2013219',color:'#F59E0B',icon:'\u2699\uFE0F',desc:'Machine guarding, point-of-operation protection',modules:[
      {key:'inspections',name:'Equipment Safety Inspections',sqf:'1910.212',table:'inspections'},
      {key:'_ph_osha_guard',name:'Machine Guarding Program',sqf:'1910.212(a)',ph:true,phIcon:'\uD83D\uDEE1\uFE0F',phDesc:'Guard requirements for all machines that may cause injury.',phItems:['Machine guarding inventory & assessments','Point-of-operation guard documentation','Power transmission apparatus guarding','Guarding deficiency correction records']},
    ]},
    {id:'o3',num:'3',name:'HazCom & Chemical Safety',sqf:'29 CFR 1910.1200',color:'#8B5CF6',icon:'\uD83E\uDDEA',desc:'Hazard communication, SDS management, GHS labeling',modules:[
      {key:'sds_records',name:'Safety Data Sheets',sqf:'1910.1200(g)',table:'sds_records'},
      {key:'_allergen_view',name:'Chemical Allergen Hazards',sqf:'1910.1200(d)',special:'allergen'},
      {key:'_ph_osha_hazcom',name:'HazCom Written Program',sqf:'1910.1200(e)',ph:true,phIcon:'\uD83D\uDCDD',phDesc:'Written hazard communication program with chemical inventory and labeling procedures.',phItems:['Written HazCom program','Chemical inventory list','Container labeling procedures (GHS)','SDS accessibility & maintenance plan','Employee HazCom training records']},
    ]},
    {id:'o4',num:'4',name:'General Safety & Health',sqf:'29 CFR 1910 Subparts D\u2013I',color:'#10B981',icon:'\uD83E\uDDBA',desc:'Walking surfaces, exits, PPE, electrical, fire protection, emergency action plans',modules:[
      {key:'_ph_osha_ppe',name:'Personal Protective Equipment',sqf:'1910.132\u2013138',ph:true,phIcon:'\uD83E\uDDE4',phDesc:'PPE hazard assessments, selection, training, and maintenance.',phItems:['PPE hazard assessment (written certification)','PPE selection documentation','Employee PPE training records','PPE inspection & replacement logs']},
      {key:'_ph_osha_fire',name:'Fire Protection & Egress',sqf:'1910.34\u201339',ph:true,phIcon:'\uD83D\uDD25',phDesc:'Emergency exits, fire extinguishers, sprinkler systems, emergency plans.',phItems:['Emergency action plan','Fire prevention plan','Fire extinguisher inspection logs (monthly)','Sprinkler system inspection records','Exit route & signage compliance','Evacuation drill records']},
    ]},
    {id:'o5',num:'5',name:'Recordkeeping & Incident Mgmt',sqf:'29 CFR 1904',color:'#3B82F6',icon:'\uD83D\uDCCB',desc:'OSHA 300 logs, incident reporting, corrective actions, injury tracking',modules:[
      {key:'ncr_records',name:'Incident / NCR Records',sqf:'1904.29',table:'ncr_records'},
      {key:'documents',name:'Document Control',sqf:'1904.33',special:'doc_dashboard'},
      {key:'audit_findings',name:'Safety Audit Findings',sqf:'1904.35',table:'audit_findings'},
      {key:'_ph_osha_300',name:'OSHA 300 Log',sqf:'1904.29\u201332',ph:true,phIcon:'\uD83D\uDCC5',phDesc:'Log of work-related injuries and illnesses, annual summary, and reporting.',phItems:['OSHA Form 300 \u2014 Log of Injuries & Illnesses','OSHA Form 300A \u2014 Annual Summary','OSHA Form 301 \u2014 Incident Reports','Severe injury reporting (8hr/24hr rule)','5-year retention of all 300 forms']},
    ]},
  ]},
  esg:{label:'ESG Audit',badge:'Environmental, Social & Governance \u2022 Sustainability Reporting',sections:[
    {id:'e1',num:'E',name:'Environmental',sqf:'GRI 300 Series',color:'#10B981',icon:'\uD83C\uDF3F',desc:'Water, waste, energy, emissions, chemical management, environmental compliance',modules:[
      {key:'sds_records',name:'Chemical Inventory',sqf:'GRI 306',table:'sds_records'},
      {key:'_ph_esg_water',name:'Water Management',sqf:'GRI 303',ph:true,phIcon:'\uD83D\uDCA7',phDesc:'Water withdrawal, consumption, discharge, and quality management.',phItems:['Water usage tracking by source','Wastewater discharge permits & monitoring','Water recycling/reuse metrics','Water efficiency targets & progress','Water quality testing records']},
      {key:'_ph_esg_waste',name:'Waste & Recycling',sqf:'GRI 306',ph:true,phIcon:'\u267B\uFE0F',phDesc:'Waste generation, recycling programs, landfill diversion, and food waste reduction.',phItems:['Waste generation by category','Recycling rate metrics & targets','Food waste reduction program','Waste hauler certifications','Hazardous waste manifests']},
      {key:'_ph_esg_energy',name:'Energy & Emissions',sqf:'GRI 302/305',ph:true,phIcon:'\u26A1',phDesc:'Energy consumption, renewable energy, GHG emissions.',phItems:['Energy consumption by source','Scope 1 emissions (direct)','Scope 2 emissions (purchased electricity)','Scope 3 emissions (value chain)','Energy efficiency targets & progress']},
      {key:'_ph_esg_comply',name:'Environmental Compliance',sqf:'GRI 307',ph:true,phIcon:'\uD83D\uDCDC',phDesc:'Regulatory compliance, permits, violations, and corrective actions.',phItems:['Environmental permits & licenses','Regulatory inspection records','Violation history & corrective actions']},
    ]},
    {id:'e2',num:'S',name:'Social',sqf:'GRI 400 Series',color:'#3B82F6',icon:'\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1',desc:'Worker health & safety, labor practices, training, diversity, community impact',modules:[
      {key:'ncr_records',name:'Safety Incidents',sqf:'GRI 403',table:'ncr_records'},
      {key:'training_records',name:'Training & Development',sqf:'GRI 404',table:'training_records'},
      {key:'_ph_esg_health',name:'Worker Health & Safety',sqf:'GRI 403',ph:true,phIcon:'\u2695\uFE0F',phDesc:'Occupational health management system, injury rates, wellness programs.',phItems:['OHS management system documentation','TRIR (Total Recordable Incident Rate)','DART Rate','Workers compensation metrics','Wellness program participation']},
      {key:'_ph_esg_labor',name:'Labor Practices',sqf:'GRI 401\u2013402',ph:true,phIcon:'\u2696\uFE0F',phDesc:'Employment practices, labor rights, benefits, and working conditions.',phItems:['Employee demographics & turnover rates','Benefits program documentation','Working hours & overtime tracking','Minimum wage compliance']},
    ]},
    {id:'e3',num:'G',name:'Governance',sqf:'GRI 200 Series',color:'#8B5CF6',icon:'\uD83C\uDFDB\uFE0F',desc:'Ethics, compliance, transparency, anti-corruption, supply chain responsibility',modules:[
      {key:'documents',name:'Document Control',sqf:'GRI 102',special:'doc_dashboard'},
      {key:'vendor_approvals',name:'Supply Chain Assessment',sqf:'GRI 308/414',table:'vendor_approvals'},
      {key:'audit_findings',name:'Compliance Audits',sqf:'GRI 205\u2013206',table:'audit_findings'},
      {key:'backup_verification_log',name:'Data Integrity',sqf:'GRI 102-56',table:'backup_verification_log'},
      {key:'_ph_esg_ethics',name:'Ethics & Anti-Corruption',sqf:'GRI 205',ph:true,phIcon:'\uD83D\uDCDC',phDesc:'Business ethics, anti-corruption policies, whistleblower protections.',phItems:['Code of conduct / ethics policy','Anti-corruption policy & training','Whistleblower protection program','Conflicts of interest disclosures']},
      {key:'_ph_esg_report',name:'ESG Reporting & Disclosure',sqf:'GRI 102',ph:true,phIcon:'\uD83D\uDCCA',phDesc:'Sustainability reporting frameworks and stakeholder communication.',phItems:['Annual sustainability/ESG report','GRI Content Index','UN SDG alignment mapping','Stakeholder engagement records','Materiality assessment']},
    ]},
  ]},
};

var activeSections=[],activeAuditType=null,MODULE_MAP={},ALL_MODULES=[];

function loadAuditStructure(t){
  t=(t||'sqf').toLowerCase().trim();
  if(AUDIT_TYPES[t])activeAuditType=AUDIT_TYPES[t];
  else if(t.indexOf('fssc')>=0||t.indexOf('22000')>=0)activeAuditType=AUDIT_TYPES.fssc;
  else if(t.indexOf('brcgs')>=0||t.indexOf('brc')>=0)activeAuditType=AUDIT_TYPES.brcgs;
  else if(t.indexOf('osha')>=0)activeAuditType=AUDIT_TYPES.osha;
  else if(t.indexOf('esg')>=0)activeAuditType=AUDIT_TYPES.esg;
  else if(t.indexOf('customer')>=0)activeAuditType=AUDIT_TYPES.customer;
  else if(t.indexOf('internal')>=0)activeAuditType=AUDIT_TYPES.internal;
  else if(t.indexOf('fda')>=0)activeAuditType=AUDIT_TYPES.fda;
  else if(t.indexOf('regulatory')>=0||t.indexOf('fsma')>=0)activeAuditType=AUDIT_TYPES.regulatory;
  else activeAuditType=AUDIT_TYPES.other;
  activeSections=activeAuditType.sections;
  MODULE_MAP={};ALL_MODULES=[];
  for(var si=0;si<activeSections.length;si++){
    var sec=activeSections[si];
    for(var mi=0;mi<sec.modules.length;mi++){var m=sec.modules[mi];m._section=sec;MODULE_MAP[m.key]=m;ALL_MODULES.push(m);}
  }
}

var HIDDEN_FIELDS=['id','organization_id','created_by_id','performed_by_id','verified_by_id','pin','pin_hash','password','token','token_hash','access_token','access_token_hash','discovered_by_id','closed_by_id','assigned_to_id','approved_by_id','rejected_by_id','reviewed_by_id','submitted_by_id','completed_by_id','updated_by_id','facility_id','capa_id','form_style','form_version','template_id','template_snapshot'];
var SEVERITY_MAP={minor:'Minor',major:'Major',critical:'Critical'};
var STATUS_MAP={open:'Open',investigation:'Investigation',containment:'Containment',root_cause:'Root Cause',corrective_action:'Corrective Action',verification:'Verification',closed:'Closed',rejected:'Rejected'};

document.addEventListener('click',function(e){
  var t=e.target.closest('[data-action]');
  if(!t){
    var rh=e.target.closest('.record-head');
    if(rh){rh.parentElement.classList.toggle('open');return;}
    if(e.target.id==='sidebarOverlay'){toggleSidebar();return;}
    var gh=e.target.closest('.nav-group-head');
    if(gh){gh.parentElement.classList.toggle('open');return;}
    return;
  }
  var action=t.dataset.action;
  if(action==='validate')validateToken();
  else if(action==='exit')exitPortal();
  else if(action==='hamburger')toggleSidebar();
  else if(action==='overview')showOverview(t);
  else if(action==='security')showSecurity(t);
  else if(action==='module')loadModule(t,t.dataset.key);
  else if(action==='module-card'){var navEl=document.querySelector('[data-key="'+t.dataset.key+'"]');if(navEl){navEl.closest('.nav-group').classList.add('open');loadModule(navEl,t.dataset.key);}}
  else if(action==='ncr-detail')showNCRDetail(t.dataset.id);
  else if(action==='back-to-ncr-list')loadModule(document.querySelector('[data-key="ncr_records"]'),'ncr_records');
  else if(action==='open-section'){var secId=t.dataset.section;var grp=document.querySelector('.nav-group[data-section="'+secId+'"]');if(grp){grp.classList.add('open');var first=grp.querySelector('.nav-item');if(first){loadModule(first,first.dataset.key);}}}
  else if(action==='switch-tab')switchTab(t.dataset.tab,t.dataset.group);
  else if(action==='filter-chip')filterChip(t.dataset.filter,t.dataset.group);
});

document.addEventListener('input',function(e){
  if(e.target.classList.contains('search-bar')){
    var q=e.target.value.toLowerCase();
    var cards=document.querySelectorAll('[data-search]');
    for(var i=0;i<cards.length;i++){
      var el=cards[i];
      var parent=el.closest('[data-tab-content]');
      if(parent&&!parent.classList.contains('active-tab'))continue;
      el.style.display=el.dataset.search.indexOf(q)>=0?'':'none';
    }
  }
});

document.getElementById('tokenBtn').setAttribute('data-action','validate');
document.getElementById('exitBtn').setAttribute('data-action','exit');
document.getElementById('hamburgerBtn').setAttribute('data-action','hamburger');

(function(){var p=new URLSearchParams(window.location.search);var t=p.get('token')||p.get('audit_token');if(t){document.getElementById('tokenInput').value=t;setTimeout(function(){validateToken();},400);}})();

function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function fmtDate(v){try{return new Date(v).toLocaleString();}catch(e){return v||'N/A';}}
function fmtSnake(s){return s?s.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}):'N/A';}

function switchTab(tabId,group){
  var allTabs=document.querySelectorAll('[data-tab][data-group="'+group+'"]');
  var allContents=document.querySelectorAll('[data-tab-content][data-group="'+group+'"]');
  for(var i=0;i<allTabs.length;i++)allTabs[i].classList.toggle('active',allTabs[i].dataset.tab===tabId);
  for(var j=0;j<allContents.length;j++){var isActive=allContents[j].dataset.tab===tabId;allContents[j].classList.toggle('active-tab',isActive);allContents[j].style.display=isActive?'':'none';}
}

function filterChip(filter,group){
  var chips=document.querySelectorAll('.chip[data-group="'+group+'"]');
  for(var i=0;i<chips.length;i++)chips[i].classList.toggle('active',chips[i].dataset.filter===filter);
  var cards=document.querySelectorAll('[data-filter-type]');
  for(var j=0;j<cards.length;j++)cards[j].style.display=(filter==='all'||cards[j].dataset.filterType===filter)?'':'none';
}

async function validateToken(){
  var token=document.getElementById('tokenInput').value.trim();
  var btn=document.getElementById('tokenBtn');var err=document.getElementById('tokenError');
  if(!token){err.textContent='Please enter an access token.';return;}
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>';err.textContent='';
  try{
    var resp=await sb.from('audit_sessions').select('*').eq('access_token',token).limit(1);
    if(resp.error)throw resp.error;
    if(!resp.data||resp.data.length===0){err.textContent='Invalid access token.';btn.disabled=false;btn.textContent='Access Portal';return;}
    var s=resp.data[0];var now=new Date();
    if(s.status==='revoked'){err.textContent='This session has been revoked.';btn.disabled=false;btn.textContent='Access Portal';return;}
    if(s.valid_from&&new Date(s.valid_from)>now){err.textContent='Session not yet active.';btn.disabled=false;btn.textContent='Access Portal';return;}
    if(s.valid_until&&new Date(s.valid_until)<now){err.textContent='This session has expired.';btn.disabled=false;btn.textContent='Access Portal';return;}
    session=s;
    try{await sb.from('audit_access_log').insert({session_id:s.id,organization_id:s.organization_id,module:'portal',action:'portal_opened',resource_type:'portal',user_agent:navigator.userAgent});await sb.from('audit_sessions').update({last_accessed_at:now.toISOString(),access_count:(s.access_count||0)+1}).eq('id',s.id);}catch(e){console.warn('Log error:',e);}
    showPortal();
  }catch(e){console.error(e);err.textContent='Connection error.';btn.disabled=false;btn.textContent='Access Portal';}
}

function showPortal(){
  document.getElementById('tokenScreen').style.display='none';
  document.getElementById('portalScreen').style.display='block';
  loadAuditStructure(session.audit_type||'SQF');
  document.getElementById('sessionInfo').innerHTML='<strong>'+esc(session.session_name||'Audit Session')+'</strong><br/>Type: '+esc(activeAuditType.label)+'<br/>'+(session.certification_body?'CB: '+esc(session.certification_body)+'<br/>':'')+(session.valid_until?'Expires: '+new Date(session.valid_until).toLocaleDateString():'No expiration');
  var nav=document.getElementById('sidebarNav');
  var h='<div class="nav-item nav-item-top active" data-action="overview"><span class="nav-icon">&#127968;</span> Overview</div>';
  for(var si=0;si<activeSections.length;si++){
    var sec=activeSections[si];
    h+='<div class="nav-group" data-section="'+sec.id+'"><div class="nav-group-head"><span class="ng-arrow">&#9654;</span><span class="ng-icon">'+sec.icon+'</span><span class="ng-label">'+sec.name+'</span><span class="ng-sqf">'+sec.sqf+'</span></div><div class="nav-group-items">';
    for(var mi=0;mi<sec.modules.length;mi++){var m=sec.modules[mi];h+='<div class="nav-item" data-action="module" data-key="'+m.key+'"><span class="ni-dot" style="background:'+sec.color+'"></span>'+m.name+'</div>';}
    h+='</div></div>';
  }
  h+='<div class="nav-section">System</div><div class="nav-item nav-item-top" data-action="security"><span class="nav-icon">&#128737;&#65039;</span> Security Controls</div>';
  nav.innerHTML=h;
  showOverview(nav.querySelector('.nav-item'));
}

function setActive(el){var items=document.querySelectorAll('.nav-item');for(var i=0;i<items.length;i++)items[i].classList.remove('active');if(el)el.classList.add('active');document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show');}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show');}

function showOverview(el){
  setActive(el);
  document.getElementById('mainTitle').textContent='Audit Overview';
  document.getElementById('mainCount').textContent=activeAuditType.label;
  var body=document.getElementById('mainBody');
  var h='<div class="overview-welcome"><h2>Welcome to the Auditor Portal</h2><p>Read-only access to facility records organized by '+esc(activeAuditType.label)+' structure. All access is logged for compliance. Select a section below or use the sidebar to navigate.</p><div class="ow-edition">&#128220; '+activeAuditType.badge+'</div></div>';
  for(var si=0;si<activeSections.length;si++){
    var sec=activeSections[si];
    h+='<div class="section-card"><div class="sc-head" data-action="open-section" data-section="'+sec.id+'"><div class="sc-num" style="background:'+sec.color+'">'+sec.num+'</div><div class="sc-info"><div class="sc-name">'+sec.name+'</div><div class="sc-desc">'+sec.desc+'</div></div><div class="sc-arrow">&#9654;</div></div><div class="sc-modules">';
    for(var mi=0;mi<sec.modules.length;mi++){var m=sec.modules[mi];h+='<div class="sc-mod" data-action="module-card" data-key="'+m.key+'">'+m.name+' <span style="opacity:.5">'+m.sqf+'</span></div>';}
    h+='</div></div>';
  }
  body.innerHTML=h;
}

async function loadModule(el,key){
  setActive(el);
  var mod=MODULE_MAP[key];if(!mod)return;
  document.getElementById('mainTitle').textContent=mod.name;
  document.getElementById('mainCount').textContent=mod.sqf;
  var body=document.getElementById('mainBody');
  body.innerHTML='<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';
  try{await sb.from('audit_access_log').insert({session_id:session.id,organization_id:session.organization_id,module:key,action:'module_viewed',resource_type:key,user_agent:navigator.userAgent});}catch(e){}
  if(mod.ph){renderPlaceholder(body,mod);return;}
  if(mod.special==='doc_dashboard'){await renderDocumentDashboard(body);return;}
  if(mod.special==='allergen'){await renderAllergenView(body);return;}
  if(mod.special==='pm_section'){await renderPMSection(body,mod);return;}
  if(mod.special==='work_orders_section'){await renderWorkOrdersSection(body,mod);return;}
  if(mod.special==='sanitation_section'){await renderSanitationSection(body,mod);return;}
  try{
    var resp=await sb.from(mod.table||key).select('*').eq('organization_id',session.organization_id).order('created_at',{ascending:false}).limit(200);
    if(resp.error)throw resp.error;
    var data=resp.data||[];
    document.getElementById('mainCount').textContent=mod.sqf+' \u2022 '+data.length+' records';
    if(data.length===0){body.innerHTML='<div class="empty-state"><div class="es-icon">&#128237;</div><p>No records found in <strong>'+mod.name+'</strong>.</p></div>';return;}
    if(key==='ncr_records'){currentNCRData=data;renderNCRList(data);return;}
    if(key==='sds_records'){renderSDSList(data);return;}
    var h='<input type="text" class="search-bar" placeholder="Search records..."/>';
    for(var i=0;i<data.length;i++){
      var rec=data[i];
      var title=rec.title||rec.product_name||rec.name||rec.wo_number||rec.work_order_number||rec.sds_number||(rec.description?rec.description.substring(0,60):'')||('Record #'+(i+1));
      var date=rec.created_at?new Date(rec.created_at).toLocaleDateString():'';
      h+='<div class="record-card" data-search="'+esc(JSON.stringify(rec)).toLowerCase()+'"><div class="record-head"><h4>'+esc(title)+'</h4><span class="rh-date">'+date+'</span><span class="rh-arrow">&#9654;</span></div><div class="record-body">'+renderFields(rec)+'</div></div>';
    }
    body.innerHTML=h;
  }catch(e){console.error(e);body.innerHTML='<div class="empty-state"><div class="es-icon">&#10060;</div><p>Error: '+esc(e.message)+'</p></div>';document.getElementById('mainCount').textContent='Error';}
}

async function renderPMSection(body,mod){
  body.innerHTML='<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';
  try{
    var tplResp=await sb.from('pm_schedules').select('*').eq('organization_id',session.organization_id).order('name',{ascending:true});
    var woResp=await sb.from('work_orders').select('*').eq('organization_id',session.organization_id).eq('type','preventive').order('created_at',{ascending:false}).limit(200);
    var templates=tplResp.data||[];var pmWOs=woResp.data||[];
    document.getElementById('mainCount').textContent=mod.sqf+' \u2022 '+templates.length+' schedules, '+pmWOs.length+' records';
    var h='<div class="tab-bar"><button class="tab-btn active" data-action="switch-tab" data-tab="program" data-group="pm">PM Program ('+templates.length+')</button><button class="tab-btn" data-action="switch-tab" data-tab="records" data-group="pm">PM Records ('+pmWOs.length+')</button></div>';
    h+='<div data-tab-content data-tab="program" data-group="pm" class="active-tab">';
    if(templates.length===0){h+='<div class="empty-state"><div class="es-icon">&#128197;</div><p>No PM schedules found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search PM schedules..."/>';
      for(var i=0;i<templates.length;i++){
        var t=templates[i];var title=t.name||t.title||'PM Schedule #'+(i+1);var freq=t.frequency||t.pm_frequency||'';var date=t.created_at?new Date(t.created_at).toLocaleDateString():'';
        h+='<div class="record-card" data-search="'+esc((title+' '+freq).toLowerCase())+'"><div class="record-head"><h4>'+esc(title)+'</h4>';
        if(freq)h+='<span style="font-size:11px;background:var(--primary);color:#fff;padding:2px 8px;border-radius:6px;margin-right:8px">'+esc(freq)+'</span>';
        h+='<span class="rh-date">'+date+'</span><span class="rh-arrow">&#9654;</span></div><div class="record-body">'+renderFields(t)+'</div></div>';
      }
    }
    h+='</div><div data-tab-content data-tab="records" data-group="pm" style="display:none">';
    if(pmWOs.length===0){h+='<div class="empty-state"><div class="es-icon">&#128203;</div><p>No PM work orders found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search PM records..."/>';
      for(var j=0;j<pmWOs.length;j++){
        var wo=pmWOs[j];var woTitle=wo.title||wo.work_order_number||'PM Work Order';var woStatus=wo.status||'open';
        var sc=woStatus==='completed'?'#10B981':woStatus==='in_progress'?'#3B82F6':'#F59E0B';
        var woDate=wo.completed_at?new Date(wo.completed_at).toLocaleDateString():(wo.created_at?new Date(wo.created_at).toLocaleDateString():'');
        h+='<div class="record-card" data-search="'+esc((woTitle+' '+woStatus+' '+(wo.work_order_number||'')).toLowerCase())+'"><div class="record-head"><h4>'+esc(woTitle)+'</h4>';
        h+='<span style="font-size:11px;background:'+sc+'22;color:'+sc+';padding:2px 8px;border-radius:6px;margin-right:8px">'+esc(woStatus.toUpperCase())+'</span>';
        h+='<span class="rh-date">'+woDate+'</span><span class="rh-arrow">&#9654;</span></div><div class="record-body">'+renderFields(wo)+'</div></div>';
      }
    }
    h+='</div>';
    body.innerHTML=h;
  }catch(e){body.innerHTML='<div class="empty-state"><div class="es-icon">&#10060;</div><p>Error: '+esc(e.message)+'</p></div>';}
}

async function renderWorkOrdersSection(body,mod){
  body.innerHTML='<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';
  try{
    var resp=await sb.from('work_orders').select('*').eq('organization_id',session.organization_id).in('type',['corrective','emergency']).order('created_at',{ascending:false}).limit(300);
    var data=resp.data||[];
    var corrective=data.filter(function(w){return w.type==='corrective';});
    var emergency=data.filter(function(w){return w.type==='emergency';});
    document.getElementById('mainCount').textContent=mod.sqf+' \u2022 '+data.length+' records';
    var h='<div class="filter-chips"><div class="chip active" data-action="filter-chip" data-filter="all" data-group="wo">All ('+data.length+')</div><div class="chip" data-action="filter-chip" data-filter="corrective" data-group="wo">Corrective ('+corrective.length+')</div><div class="chip" data-action="filter-chip" data-filter="emergency" data-group="wo">Emergency ('+emergency.length+')</div></div>';
    if(data.length===0){h+='<div class="empty-state"><div class="es-icon">&#128203;</div><p>No corrective or emergency work orders found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search work orders..."/>';
      for(var i=0;i<data.length;i++){
        var wo=data[i];var title=wo.title||wo.work_order_number||'Work Order';var woStatus=wo.status||'open';var woType=wo.type||'corrective';
        var sc=woStatus==='completed'?'#10B981':woStatus==='in_progress'?'#3B82F6':woStatus==='open'?'#F59E0B':'#6B7280';
        var tc=woType==='emergency'?'#EF4444':'#6C5CE7';var date=wo.created_at?new Date(wo.created_at).toLocaleDateString():'';
        h+='<div class="record-card" data-search="'+esc((title+' '+woStatus+' '+woType+' '+(wo.work_order_number||'')+' '+(wo.equipment||'')).toLowerCase())+'" data-filter-type="'+esc(woType)+'"><div class="record-head"><h4>'+esc(title)+'</h4>';
        h+='<span style="font-size:10px;background:'+tc+'22;color:'+tc+';padding:2px 7px;border-radius:5px;margin-right:6px;font-weight:700">'+esc(woType.toUpperCase())+'</span>';
        h+='<span style="font-size:10px;background:'+sc+'22;color:'+sc+';padding:2px 7px;border-radius:5px;margin-right:8px;font-weight:600">'+esc(woStatus.toUpperCase())+'</span>';
        h+='<span class="rh-date">'+date+'</span><span class="rh-arrow">&#9654;</span></div><div class="record-body">'+renderFields(wo)+'</div></div>';
      }
    }
    body.innerHTML=h;
  }catch(e){body.innerHTML='<div class="empty-state"><div class="es-icon">&#10060;</div><p>Error: '+esc(e.message)+'</p></div>';}
}

async function renderSanitationSection(body,mod){
  body.innerHTML='<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';
  try{
    var woResp=await sb.from('sanitation_work_orders').select('*').eq('org_id',session.organization_id).order('scheduled_date',{ascending:false}).limit(300);
    var atpResp=await sb.from('sanitation_atp_logs').select('*').eq('org_id',session.organization_id).order('created_at',{ascending:false}).limit(200);
    var ssopResp=await sb.from('sanitation_ssops').select('*').eq('org_id',session.organization_id).order('ssop_code',{ascending:true});
    var capaResp=await sb.from('sanitation_capa').select('*').eq('org_id',session.organization_id).order('created_at',{ascending:false}).limit(200);
    var allWOs=woResp.data||[];var atpData=atpResp.data||[];var ssopData=ssopResp.data||[];var capaData=capaResp.data||[];
    var scheduleMap={};
    for(var si=0;si<allWOs.length;si++){var w=allWOs[si];var sk=(w.task_name||'')+'|'+(w.room||'');if(!scheduleMap[sk])scheduleMap[sk]={task_name:w.task_name,room:w.room,frequency:w.frequency,total:0,completed:0};scheduleMap[sk].total++;if(w.status==='completed')scheduleMap[sk].completed++;}
    var schedules=Object.values(scheduleMap);
    var pendingWOs=allWOs.filter(function(w){return w.status==='pending'||w.status==='in_progress';});
    var completedWOs=allWOs.filter(function(w){return w.status==='completed';});
    var preopWOs=allWOs.filter(function(w){return w.task_name&&w.task_name.toLowerCase().indexOf('pre-op')>=0;});
    document.getElementById('mainCount').textContent=mod.sqf+' \u2022 '+schedules.length+' scheduled tasks';
    var h='<div class="tab-bar">';
    h+='<button class="tab-btn active" data-action="switch-tab" data-tab="schedule" data-group="san">Master Schedule ('+schedules.length+')</button>';
    h+='<button class="tab-btn" data-action="switch-tab" data-tab="tasks" data-group="san">Scheduled Tasks ('+allWOs.length+')</button>';
    h+='<button class="tab-btn" data-action="switch-tab" data-tab="preop" data-group="san">Pre-Op ('+preopWOs.length+')</button>';
    h+='<button class="tab-btn" data-action="switch-tab" data-tab="atp" data-group="san">ATP Records ('+atpData.length+')</button>';
    h+='<button class="tab-btn" data-action="switch-tab" data-tab="ssop" data-group="san">SSOP Library ('+ssopData.length+')</button>';
    h+='<button class="tab-btn" data-action="switch-tab" data-tab="capa" data-group="san">CAPA ('+capaData.length+')</button></div>';
    // Tab 1: Master Schedule
    h+='<div data-tab-content data-tab="schedule" data-group="san" class="active-tab">';
    if(schedules.length===0){h+='<div class="empty-state"><div class="es-icon">&#128197;</div><p>No sanitation schedules found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search sanitation schedule..."/>';
      for(var i=0;i<schedules.length;i++){
        var sched=schedules[i];var pct=sched.total>0?Math.round((sched.completed/sched.total)*100):0;var pc=pct>=80?'#10B981':pct>=50?'#F59E0B':'#EF4444';
        h+='<div class="record-card" data-search="'+esc((sched.task_name+' '+(sched.room||'')+' '+(sched.frequency||'')).toLowerCase())+'"><div class="record-head"><h4>'+esc(sched.task_name||'Sanitation Task')+'</h4>';
        if(sched.frequency)h+='<span style="font-size:11px;background:var(--surface2);color:var(--text2);padding:2px 8px;border-radius:5px;margin-right:8px">'+esc(sched.frequency)+'</span>';
        h+='<span style="font-size:11px;color:'+pc+';font-weight:700;margin-right:8px">'+pct+'% done</span>';
        h+='<span class="rh-date">'+esc(sched.room||'')+'</span><span class="rh-arrow">&#9654;</span></div>';
        h+='<div class="record-body"><div class="record-field"><div class="rf-label">Room / Area</div><div class="rf-value">'+esc(sched.room||'N/A')+'</div></div>';
        h+='<div class="record-field"><div class="rf-label">Frequency</div><div class="rf-value">'+esc(sched.frequency||'N/A')+'</div></div>';
        h+='<div class="record-field"><div class="rf-label">Completed</div><div class="rf-value" style="color:'+pc+'">'+sched.completed+' / '+sched.total+' ('+pct+'%)</div></div></div></div>';
      }
    }
    h+='</div>';
    // Tab 2: Scheduled Tasks
    h+='<div data-tab-content data-tab="tasks" data-group="san" style="display:none">';
    h+='<div class="filter-chips"><div class="chip active" data-action="filter-chip" data-filter="all" data-group="san-tasks">All ('+allWOs.length+')</div><div class="chip" data-action="filter-chip" data-filter="pending" data-group="san-tasks">Pending ('+pendingWOs.length+')</div><div class="chip" data-action="filter-chip" data-filter="completed" data-group="san-tasks">Completed ('+completedWOs.length+')</div></div>';
    if(allWOs.length===0){h+='<div class="empty-state"><div class="es-icon">&#128203;</div><p>No sanitation work orders found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search sanitation tasks..."/>';
      for(var j=0;j<allWOs.length;j++){
        var wo2=allWOs[j];var ws=wo2.status||'pending';var sc2=ws==='completed'?'#10B981':ws==='in_progress'?'#3B82F6':'#F59E0B';
        var hasSig=!!(wo2.tech_signature_stamp||wo2.qa_signature_stamp);
        h+='<div class="record-card" data-search="'+esc(((wo2.task_name||'')+' '+(wo2.room||'')+' '+(wo2.wo_number||'')+' '+ws).toLowerCase())+'" data-filter-type="'+esc(ws)+'"><div class="record-head"><h4>'+esc(wo2.task_name||wo2.wo_number||'Sanitation Task')+'</h4>';
        h+='<span style="font-size:10px;background:'+sc2+'22;color:'+sc2+';padding:2px 7px;border-radius:5px;margin-right:6px;font-weight:700">'+esc(ws.toUpperCase())+'</span>';
        if(hasSig)h+='<span style="font-size:10px;color:#10B981;margin-right:8px">&#9989; SIGNED</span>';
        h+='<span class="rh-date">'+esc(wo2.scheduled_date||'')+'</span><span class="rh-arrow">&#9654;</span></div>';
        h+='<div class="record-body"><div class="record-field"><div class="rf-label">WO Number</div><div class="rf-value">'+esc(wo2.wo_number||'N/A')+'</div></div>';
        h+='<div class="record-field"><div class="rf-label">Room / Area</div><div class="rf-value">'+esc(wo2.room||'N/A')+'</div></div>';
        h+='<div class="record-field"><div class="rf-label">Scheduled Date</div><div class="rf-value">'+esc(wo2.scheduled_date||'N/A')+'</div></div>';
        if(wo2.tech_name)h+='<div class="record-field"><div class="rf-label">Technician</div><div class="rf-value">'+esc(wo2.tech_name)+'</div></div>';
        if(wo2.tech_signature_stamp)h+='<div class="record-field"><div class="rf-label">Tech Signature</div><div class="rf-value" style="color:#10B981;font-size:11px">&#9989; '+esc(wo2.tech_signature_stamp)+'</div></div>';
        if(wo2.qa_signature_stamp)h+='<div class="record-field"><div class="rf-label">QA Signature</div><div class="rf-value" style="color:#10B981;font-size:11px">&#9989; '+esc(wo2.qa_signature_stamp)+'</div></div>';
        h+='</div></div>';
      }
    }
    h+='</div>';
    // Tab 3: Pre-Op
    h+='<div data-tab-content data-tab="preop" data-group="san" style="display:none">';
    if(preopWOs.length===0){h+='<div class="empty-state"><div class="es-icon">&#128269;</div><p>No Pre-Op inspection records found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search Pre-Op inspections..."/>';
      for(var k=0;k<preopWOs.length;k++){
        var po=preopWOs[k];var ps=po.status||'pending';var pc2=ps==='completed'?'#10B981':'#F59E0B';
        h+='<div class="record-card" data-search="'+esc(((po.task_name||'')+' '+(po.room||'')+' '+ps).toLowerCase())+'"><div class="record-head"><h4>'+esc(po.task_name||'Pre-Op Inspection')+'</h4>';
        h+='<span style="font-size:10px;background:'+pc2+'22;color:'+pc2+';padding:2px 7px;border-radius:5px;margin-right:8px;font-weight:700">'+esc(ps.toUpperCase())+'</span>';
        h+='<span class="rh-date">'+esc(po.scheduled_date||'')+'</span><span class="rh-arrow">&#9654;</span></div>';
        h+='<div class="record-body"><div class="record-field"><div class="rf-label">Room</div><div class="rf-value">'+esc(po.room||'N/A')+'</div></div>';
        if(po.tech_name)h+='<div class="record-field"><div class="rf-label">Technician</div><div class="rf-value">'+esc(po.tech_name)+'</div></div>';
        if(po.qa_signature_stamp)h+='<div class="record-field"><div class="rf-label">QA Sign-Off</div><div class="rf-value" style="color:#10B981">&#9989; '+esc(po.qa_signature_stamp)+'</div></div>';
        h+='</div></div>';
      }
    }
    h+='</div>';
    // Tab 4: ATP
    h+='<div data-tab-content data-tab="atp" data-group="san" style="display:none">';
    if(atpData.length===0){h+='<div class="empty-state"><div class="es-icon">&#129514;</div><p>No ATP swab records found.</p></div>';}
    else{
      var atpPass=atpData.filter(function(a){return a.atp_result==='pass';}).length;
      var atpFail=atpData.filter(function(a){return a.atp_result==='fail';}).length;
      h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'+statCard(atpData.length,'Total Swabs','#4A90A4')+statCard(atpPass,'Pass','#10B981')+statCard(atpFail,'Fail','#EF4444')+'</div>';
      h+='<input type="text" class="search-bar" placeholder="Search ATP records..."/>';
      for(var ai=0;ai<atpData.length;ai++){
        var atp=atpData[ai];var ar=atp.atp_result||'unknown';var ac=ar==='pass'?'#10B981':ar==='fail'?'#EF4444':'#6B7280';
        h+='<div class="record-card" data-search="'+esc(((atp.log_number||'')+' '+(atp.room||'')+' '+ar+' '+(atp.surface_location||'')).toLowerCase())+'"><div class="record-head"><h4>'+esc(atp.log_number||'ATP Swab')+' \u2014 '+esc(atp.room||'')+'</h4>';
        h+='<span style="font-size:11px;background:'+ac+'22;color:'+ac+';padding:2px 8px;border-radius:5px;margin-right:8px;font-weight:800">'+esc(ar.toUpperCase())+'</span>';
        h+='<span class="rh-date">'+esc(atp.swab_date||'')+'</span><span class="rh-arrow">&#9654;</span></div>';
        h+='<div class="record-body"><div class="record-field"><div class="rf-label">RLU Reading</div><div class="rf-value" style="color:'+ac+';font-weight:700">'+(atp.rlu_reading!=null?atp.rlu_reading:'N/A')+' RLU</div></div>';
        h+='<div class="record-field"><div class="rf-label">Surface Location</div><div class="rf-value">'+esc(atp.surface_location||'N/A')+'</div></div>';
        h+='<div class="record-field"><div class="rf-label">Reason for Swab</div><div class="rf-value">'+esc(atp.reason_for_swab||'N/A')+'</div></div>';
        if(atp.tech_name)h+='<div class="record-field"><div class="rf-label">Technician</div><div class="rf-value">'+esc(atp.tech_name)+'</div></div>';
        if(atp.tech_signature_stamp)h+='<div class="record-field"><div class="rf-label">Signature</div><div class="rf-value" style="color:#10B981;font-size:11px">&#9989; '+esc(atp.tech_signature_stamp)+'</div></div>';
        if(atp.corrective_action)h+='<div class="record-field"><div class="rf-label">Corrective Action</div><div class="rf-value">'+esc(atp.corrective_action)+'</div></div>';
        h+='</div></div>';
      }
    }
    h+='</div>';
    // Tab 5: SSOP Library
    h+='<div data-tab-content data-tab="ssop" data-group="san" style="display:none">';
    if(ssopData.length===0){h+='<div class="empty-state"><div class="es-icon">&#128218;</div><p>No SSOPs found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search SSOPs..."/>';
      for(var xi=0;xi<ssopData.length;xi++){
        var ssop=ssopData[xi];var ss=ssop.status||'active';var ssc=ss==='active'?'#10B981':'#F59E0B';
        h+='<div class="record-card" data-search="'+esc(((ssop.ssop_code||'')+' '+(ssop.title||'')+' '+(ssop.area||'')).toLowerCase())+'"><div class="record-head"><div style="flex:1"><div style="font-size:11px;font-weight:700;color:var(--accent)">'+esc(ssop.ssop_code||'')+'</div><h4 style="margin:2px 0 0">'+esc(ssop.title||'SSOP')+'</h4></div>';
        h+='<span style="font-size:10px;background:'+ssc+'22;color:'+ssc+';padding:2px 7px;border-radius:5px;margin-right:8px">'+esc(ss.toUpperCase())+'</span>';
        h+='<span class="rh-date">'+esc(ssop.area||'')+'</span><span class="rh-arrow">&#9654;</span></div>';
        h+='<div class="record-body"><div class="record-field"><div class="rf-label">Area / Room</div><div class="rf-value">'+esc(ssop.area||'N/A')+'</div></div>';
        if(ssop.version)h+='<div class="record-field"><div class="rf-label">Version</div><div class="rf-value">'+esc(ssop.version)+'</div></div>';
        if(ssop.effective_date)h+='<div class="record-field"><div class="rf-label">Effective Date</div><div class="rf-value">'+esc(ssop.effective_date)+'</div></div>';
        if(ssop.description)h+='<div class="record-field"><div class="rf-label">Description</div><div class="rf-value">'+esc(ssop.description)+'</div></div>';
        h+='</div></div>';
      }
    }
    h+='</div>';
    // Tab 6: CAPA
    h+='<div data-tab-content data-tab="capa" data-group="san" style="display:none">';
    if(capaData.length===0){h+='<div class="empty-state"><div class="es-icon">&#128221;</div><p>No sanitation CAPA records found.</p></div>';}
    else{
      h+='<input type="text" class="search-bar" placeholder="Search CAPA records..."/>';
      for(var ci=0;ci<capaData.length;ci++){
        var capa=capaData[ci];var cs=capa.status||'open';var cc=cs==='closed'?'#10B981':cs==='open'?'#EF4444':'#F59E0B';
        h+='<div class="record-card" data-search="'+esc(((capa.capa_number||'')+' '+(capa.room||'')+' '+(capa.how_detected||'')+' '+cs).toLowerCase())+'"><div class="record-head"><h4>'+esc(capa.capa_number||'Sanitation CAPA')+'</h4>';
        h+='<span style="font-size:10px;background:'+cc+'22;color:'+cc+';padding:2px 7px;border-radius:5px;margin-right:8px;font-weight:700">'+esc(cs.toUpperCase())+'</span>';
        h+='<span class="rh-date">'+esc(capa.detected_date||'')+'</span><span class="rh-arrow">&#9654;</span></div>';
        h+='<div class="record-body"><div class="record-field"><div class="rf-label">Room</div><div class="rf-value">'+esc(capa.room||'N/A')+'</div></div>';
        h+='<div class="record-field"><div class="rf-label">How Detected</div><div class="rf-value">'+esc(capa.how_detected||'N/A')+'</div></div>';
        if(capa.incident_description)h+='<div class="record-field"><div class="rf-label">Incident</div><div class="rf-value">'+esc(capa.incident_description)+'</div></div>';
        if(capa.root_cause_summary)h+='<div class="record-field"><div class="rf-label">Root Cause</div><div class="rf-value">'+esc(capa.root_cause_summary)+'</div></div>';
        if(capa.corrective_action)h+='<div class="record-field"><div class="rf-label">Corrective Action</div><div class="rf-value">'+esc(capa.corrective_action)+'</div></div>';
        if(capa.tech_name)h+='<div class="record-field"><div class="rf-label">Filed By</div><div class="rf-value">'+esc(capa.tech_name)+'</div></div>';
        if(capa.tech_signature_stamp)h+='<div class="record-field"><div class="rf-label">Signature</div><div class="rf-value" style="color:#10B981;font-size:11px">&#9989; '+esc(capa.tech_signature_stamp)+'</div></div>';
        h+='</div></div>';
      }
    }
    h+='</div>';
    body.innerHTML=h;
  }catch(e){console.error('[Sanitation]',e);body.innerHTML='<div class="empty-state"><div class="es-icon">&#10060;</div><p>Error loading sanitation data: '+esc(e.message)+'</p></div>';}
}

function renderPlaceholder(body,mod){
  var h='<div class="placeholder-view"><div class="ph-icon">'+(mod.phIcon||'&#128196;')+'</div><div class="ph-title">'+esc(mod.name)+'</div><div class="ph-desc">'+esc(mod.phDesc||'This module is structured and ready for documentation.')+'</div><div class="ph-items"><h4>'+esc(mod.sqf)+' \u2014 Required Documentation</h4>';
  if(mod.phItems){for(var i=0;i<mod.phItems.length;i++){h+='<div class="ph-item"><span class="phi-dot"></span>'+esc(mod.phItems[i])+'</div>';}}
  h+='</div></div>';
  body.innerHTML=h;
  document.getElementById('mainCount').textContent=mod.sqf+' \u2022 Framework Ready';
}

async function renderAllergenView(body){
  body.innerHTML='<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';
  var resp=await sb.from('sds_records').select('id,product_name,manufacturer,primary_department,sds_master_number,contains_allergens,allergens,allergen_notes,allergen_isolation_required,allergen_isolation_notes,status').eq('organization_id',session.organization_id);
  var all=resp.data||[];
  var allergenRecords=all.filter(function(r){return r.contains_allergens===true||(r.allergens&&r.allergens.length>0);});
  var isolationRequired=allergenRecords.filter(function(r){return r.allergen_isolation_required===true;});
  document.getElementById('mainCount').textContent='Allergen Management \u2022 '+allergenRecords.length+' allergen chemicals';
  var h='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+statCard(all.length,'Total Chemicals','#4A90A4')+statCard(allergenRecords.length,'Contain Allergens','#DC2626')+statCard(isolationRequired.length,'Isolation Required','#EF4444')+statCard(all.length-allergenRecords.length,'Allergen-Free','#10B981')+'</div>';
  if(allergenRecords.length===0){h+='<div class="empty-state"><div class="es-icon">&#9989;</div><p>No chemicals flagged as containing allergens.</p></div>';body.innerHTML=h;return;}
  h+='<input type="text" class="search-bar" placeholder="Search allergen records..."/>';
  for(var i=0;i<allergenRecords.length;i++){
    var rec=allergenRecords[i];var name=rec.product_name||'Unknown Chemical';var binderRef=buildSdsBinderRef(rec.primary_department,rec.sds_master_number);
    var searchStr=(name+' '+(rec.allergens||'')+' '+(rec.primary_department||'')+' '+(binderRef||'')).toLowerCase();
    h+='<div class="record-card" data-search="'+esc(searchStr)+'"><div class="record-head" style="padding:14px 16px"><div style="flex:1">';
    if(binderRef)h+='<div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:2px">'+esc(binderRef)+'</div>';
    h+='<h4 style="margin:0;font-size:15px">'+esc(name)+'</h4>';
    if(rec.manufacturer)h+='<div style="font-size:12px;color:var(--text3);margin-top:2px">'+esc(rec.manufacturer)+'</div>';
    h+='</div><div style="display:flex;gap:6px;align-items:center"><span style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">ALLERGEN</span>';
    if(rec.allergen_isolation_required)h+='<span style="background:#FEE2E2;color:#DC2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">ISOLATION</span>';
    h+='</div><span class="rh-arrow">&#9654;</span></div>';
    h+='<div class="record-body" style="padding:12px 16px;border-top:1px solid var(--border)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:1px">';
    h+=sdsCell('Allergens',rec.allergens)+sdsCell('Department',rec.primary_department)+sdsCell('Allergen Notes',rec.allergen_notes)+sdsCell('Isolation Required',rec.allergen_isolation_required?'Yes':'No',rec.allergen_isolation_required?'#DC2626':null);
    if(rec.allergen_isolation_notes)h+=sdsCell('Isolation Notes',rec.allergen_isolation_notes);
    h+=sdsCell('Status',rec.status);
    h+='</div></div></div>';
  }
  body.innerHTML=h;
}

function renderNCRList(data){
  var body=document.getElementById('mainBody');
  var h='<input type="text" class="search-bar" placeholder="Search NCRs by number, description, status..."/>';
  for(var i=0;i<data.length;i++){
    var ncr=data[i];var sev=ncr.severity||'minor';var stat=ncr.status||'open';
    h+='<div class="ncr-card" data-action="ncr-detail" data-id="'+ncr.id+'" data-search="'+esc(ncr.ncr_number+' '+(ncr.title||'')+' '+(ncr.description||'')+' '+stat+' '+sev).toLowerCase()+'">';
    h+='<div class="ncr-card-top"><span class="ncr-num">'+esc(ncr.ncr_number||'')+'</span><span style="font-size:11px;color:var(--text3)">'+(ncr.discovered_date||'')+'</span></div>';
    h+='<div class="ncr-title">'+esc(ncr.title||ncr.description||'Untitled')+'</div>';
    h+='<div class="ncr-badges"><span class="badge badge-'+sev+'">'+(SEVERITY_MAP[sev]||sev)+'</span><span class="badge badge-'+stat+'">'+(STATUS_MAP[stat]||fmtSnake(stat))+'</span>';
    if(ncr.capa_required)h+='<span class="badge" style="background:#EDE9FE;color:#7C3AED">CAPA</span>';
    h+='</div></div>';
  }
  body.innerHTML=h;
}

async function showNCRDetail(ncrId){
  var ncr=null;
  if(currentNCRData){for(var i=0;i<currentNCRData.length;i++){if(currentNCRData[i].id===ncrId){ncr=currentNCRData[i];break;}}}
  if(!ncr)return;
  document.getElementById('mainTitle').textContent=ncr.ncr_number||'NCR Detail';
  document.getElementById('mainCount').textContent='NCR Record';
  var body=document.getElementById('mainBody');
  try{await sb.from('audit_access_log').insert({session_id:session.id,organization_id:session.organization_id,module:'ncr_records',action:'record_viewed',resource_type:'ncr_records',resource_id:ncr.id,resource_name:ncr.ncr_number,user_agent:navigator.userAgent});}catch(e){}
  var h='<div data-action="back-to-ncr-list" class="back-btn">&#8592; Back to NCR List</div>';
  h+=renderPaperForm(ncr);
  h+='<div class="connected-section"><div class="connected-title">&#128279; Connected Records &amp; Event Chain</div><div id="connectedRecords"><div style="text-align:center;padding:30px"><span class="spinner"></span> Loading connected records...</div></div></div>';
  body.innerHTML=h;
  loadConnectedRecords(ncr);
}

function renderPaperForm(ncr){
  var h='<div class="paper-form"><div style="padding:10px 14px;border-bottom:1px solid #B0B0B0;background:#F9F9F9;display:flex;gap:16px;align-items:center">';
  h+='<div><div style="font-size:10px;color:#888">NCR Number</div><div style="font-weight:700;font-size:14px">'+esc(ncr.ncr_number||'')+'</div></div>';
  h+='<div><div style="font-size:10px;color:#888">Type</div><div style="font-size:13px">'+fmtSnake(ncr.ncr_type)+'</div></div></div>';
  h+='<div class="pf-title-bar"><h2>Non-Conformance Report (NCR)</h2></div>';
  h+='<div class="pf-form-num">'+esc(ncr.ncr_number||'')+'</div>';
  h+='<div class="pf-badges"><span class="badge badge-'+(ncr.status||'open')+'">'+(STATUS_MAP[ncr.status]||fmtSnake(ncr.status))+'</span><span class="badge badge-'+(ncr.severity||'minor')+'">'+(SEVERITY_MAP[ncr.severity]||fmtSnake(ncr.severity))+'</span></div>';
  h+='<div class="pf-section"><span class="pf-section-label">Non-Conformity Details</span></div>';
  h+='<div class="pf-row"><div class="pf-label" style="width:140px">Description</div><div class="pf-value" style="min-height:48px;white-space:pre-wrap">'+esc(ncr.description||'N/A')+'</div></div>';
  if(ncr.containment_actions||ncr.root_cause||ncr.corrective_actions){
    h+='<div class="pf-section"><span class="pf-section-label">Investigation &amp; Actions</span></div>';
    if(ncr.containment_actions)h+='<div class="pf-row"><div class="pf-label" style="width:140px">Containment Actions</div><div class="pf-value" style="white-space:pre-wrap">'+esc(ncr.containment_actions)+'</div></div>';
    if(ncr.root_cause)h+='<div class="pf-row"><div class="pf-label" style="width:140px">Root Cause</div><div class="pf-value" style="white-space:pre-wrap">'+esc(ncr.root_cause)+'</div></div>';
    if(ncr.corrective_actions)h+='<div class="pf-row"><div class="pf-label" style="width:140px">Corrective Actions</div><div class="pf-value" style="white-space:pre-wrap">'+esc(ncr.corrective_actions)+'</div></div>';
  }
  h+='<div class="pf-section"><span class="pf-section-label">Originator Signature</span></div>';
  if(ncr.originator_pin_verified&&ncr.originator_signature_stamp){
    h+='<div class="pf-row"><div class="pf-label" style="width:140px">Signature Status</div><div class="pf-value"><div class="pf-sig-verified">&#9989; VERIFIED \u2014 Signed via PPN</div></div></div>';
    h+='<div class="pf-row"><div class="pf-label" style="width:140px">Originator</div><div class="pf-value">'+esc(ncr.originator_name||'N/A')+'</div></div>';
    h+='<div class="pf-row"><div class="pf-label" style="width:140px">Signature Stamp</div><div class="pf-value"><div class="pf-sig-stamp">'+esc(ncr.originator_signature_stamp)+'</div></div></div>';
  }else{h+='<div class="pf-row"><div class="pf-label" style="width:140px">Signature Status</div><div class="pf-value"><div class="pf-sig-unverified">&#10060; NOT SIGNED</div></div></div>';}
  h+='<div class="pf-row"><div class="pf-label" style="width:140px">Created</div><div class="pf-value">'+fmtDate(ncr.created_at)+'</div></div>';
  h+='</div>';
  return h;
}

async function loadConnectedRecords(ncr){
  var container=document.getElementById('connectedRecords');
  if(!container)return;
  var h='';
  try{
    var formLinks1=await sb.from('task_feed_form_links').select('*').eq('form_number',ncr.ncr_number);
    var formLinks2=await sb.from('task_feed_form_links').select('*').eq('form_id',ncr.id);
    var allLinks=(formLinks1.data||[]).concat(formLinks2.data||[]);
    var seenPostIds={};var links=[];
    for(var li=0;li<allLinks.length;li++){if(!seenPostIds[allLinks[li].post_id]){seenPostIds[allLinks[li].post_id]=true;links.push(allLinks[li]);}}
    var postIdMap={};links.forEach(function(l){postIdMap[l.post_id]=true;});
    var postIds=Object.keys(postIdMap);
    if(postIds.length>0){
      var postsResp=await sb.from('task_feed_posts').select('*').in('id',postIds);
      var posts=postsResp.data||[];
      var deptResp=await sb.from('task_feed_department_tasks').select('*').in('post_id',postIds).order('created_at',{ascending:true});
      var deptTasks=deptResp.data||[];
      for(var p=0;p<posts.length;p++){
        var post=posts[p];
        h+='<div style="margin-bottom:20px"><h3 style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px">&#128196; Task Feed Post: '+esc(post.post_number||'')+'</h3>';
        h+='<div class="tl-card" style="margin-bottom:16px;border-left:3px solid var(--primary)"><div class="tl-card-head"><span class="tl-card-title">'+esc(post.template_name||'Incident Post')+'</span><span class="tl-card-time">'+fmtDate(post.created_at)+'</span></div>';
        h+='<div class="tl-card-body"><div class="tl-card-field"><span class="tl-field-label">Created By</span><span class="tl-field-value">'+esc(post.created_by_name||'N/A')+'</span></div>';
        h+='<div class="tl-card-field"><span class="tl-field-label">Status</span><span class="tl-field-value">'+fmtSnake(post.status)+'</span></div></div></div>';
        var postDepts=deptTasks.filter(function(d){return d.post_id===post.id;});
        if(postDepts.length>0){
          h+='<h4 style="font-size:14px;font-weight:600;color:var(--text);margin:12px 0 8px">&#127970; Department Responses</h4>';
          for(var d=0;d<postDepts.length;d++){
            var dept=postDepts[d];
            h+='<div class="dept-card"><div class="dept-header"><span class="dept-name">'+esc(dept.department_name||dept.department_code||'Unknown')+'</span><span class="dept-status '+(dept.status||'pending')+'">'+fmtSnake(dept.status||'pending')+'</span></div>';
            if(dept.completed_by_name)h+='<div class="dept-detail">Completed by: '+esc(dept.completed_by_name)+'</div>';
            h+='</div>';
          }
        }
        h+='</div>';
      }
    }else{h='<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">No connected Task Feed posts found for this NCR.</div>';}
  }catch(e){h='<div style="color:var(--danger);font-size:13px">Error loading connected records: '+esc(e.message||'Unknown error')+'</div>';}
  container.innerHTML=h;
}

async function renderDocumentDashboard(body){
  body.innerHTML='<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';
  var sdsResp=await sb.from('sds_records').select('id,status,contains_allergens,primary_department,sds_master_number,signal_word').eq('organization_id',session.organization_id);
  var sdsData=sdsResp.data||[];
  var sdsActive=sdsData.filter(function(r){return r.status==='active';}).length;
  var sdsExpired=sdsData.filter(function(r){return r.status==='expired';}).length;
  var sdsAllergen=sdsData.filter(function(r){return r.contains_allergens===true;}).length;
  var deptCounts={};
  for(var i=0;i<sdsData.length;i++){var dept=sdsData[i].primary_department||'Unassigned';deptCounts[dept]=(deptCounts[dept]||0)+1;}
  document.getElementById('mainCount').textContent='Document Control \u2022 '+sdsData.length+' total documents';
  var h='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+statCard(sdsData.length,'Total Docs','#4A90A4')+statCard(sdsActive,'Active','#10B981')+statCard(sdsExpired,'Expired','#EF4444')+statCard(sdsAllergen,'Allergen','#DC2626')+'</div>';
  var categories=[
    {name:'SDS Sheets',count:sdsData.length,icon:'&#129514;',color:'#10B981',desc:'Safety Data Sheets \u2014 chemical registry, allergens, hazard info',nav:'sds_records'},
    {name:'SOPs',count:0,icon:'&#128203;',color:'#3B82F6',desc:'Standard Operating Procedures'},
    {name:'Policies',count:0,icon:'&#128220;',color:'#F59E0B',desc:'Company policies and guidelines'},
    {name:'Certifications',count:0,icon:'&#127942;',color:'#10B981',desc:'Facility and personnel certifications'},
  ];
  h+='<div style="border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px"><div style="padding:12px 16px;background:rgba(74,144,164,0.1);font-weight:700;font-size:13px;color:#4A90A4;border-bottom:1px solid var(--border)">Document Categories</div>';
  for(var ci=0;ci<categories.length;ci++){
    var cat=categories[ci];var cc=cat.count>0?cat.color:'var(--text3)';var ca=cat.nav?' data-nav="'+cat.nav+'"':'';
    h+='<div'+ca+' style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);'+(cat.nav?'cursor:pointer':'')+'"><span style="font-size:20px;margin-right:12px;width:28px;text-align:center">'+cat.icon+'</span>';
    h+='<div style="flex:1"><div style="font-weight:600;font-size:14px;color:var(--text1)">'+cat.name+'</div><div style="font-size:11px;color:var(--text3);margin-top:1px">'+cat.desc+'</div></div>';
    h+='<span style="font-weight:700;font-size:18px;color:'+cc+';margin-right:8px">'+cat.count+'</span>';
    if(cat.nav)h+='<span style="color:var(--text3);font-size:12px">&#9654;</span>';
    h+='</div>';
  }
  h+='</div>';
  body.innerHTML=h;
  body.addEventListener('click',function(e){var el=e.target.closest('[data-nav]');if(el){var navKey=el.getAttribute('data-nav');var navEl=document.querySelector('[data-key="'+navKey+'"]');if(navEl){navEl.closest('.nav-group').classList.add('open');navEl.click();}}});
}

function statCard(num,label,color){return '<div style="border-radius:10px;border:1px solid var(--border);padding:16px;text-align:center;background:'+color+'0A"><div style="font-size:28px;font-weight:800;color:'+color+'">'+num+'</div><div style="font-size:11px;font-weight:600;color:var(--text3);margin-top:2px">'+label+'</div></div>';}

function buildSdsBinderRef(department,masterNumber){
  if(!masterNumber&&masterNumber!==0)return null;
  var deptMap={'maintenance':'MAINT','production':'PROD','sanitation':'SAN','quality':'QUAL','safety':'SAFETY','warehouse':'WH','shipping':'SHIP','receiving':'REC'};
  var dept=department?department.toLowerCase().trim():'';
  var prefix=deptMap[dept]||(department?department.toUpperCase().substring(0,5):'SDS');
  return prefix+' SDS #'+masterNumber;
}

function renderSDSList(data){
  var body=document.getElementById('mainBody');
  var h='<input type="text" class="search-bar" placeholder="Search SDS documents..."/>';
  for(var i=0;i<data.length;i++){
    var rec=data[i];var name=rec.product_name||rec.sds_number||'Untitled SDS';var status=rec.status||'active';
    var sc=status==='active'?'#10B981':status==='expired'?'#EF4444':'#F59E0B';
    var hasAllergens=rec.contains_allergens===true;var sw=rec.signal_word&&rec.signal_word!=='none'&&rec.signal_word!=='N/A'?rec.signal_word:'';
    var revDate=rec.revision_date?new Date(rec.revision_date).toLocaleDateString():'';
    var br=buildSdsBinderRef(rec.primary_department,rec.sds_master_number);
    var sd=(name+' '+(rec.manufacturer||'')+' '+(rec.cas_number||'')+' '+(rec.allergens||'')+' '+(rec.primary_department||'')+' '+(br||'')).toLowerCase();
    h+='<div class="record-card" data-search="'+esc(sd)+'"><div class="record-head" style="padding:14px 16px"><div style="flex:1">';
    if(br)h+='<div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:2px">'+esc(br)+'</div>';
    h+='<h4 style="margin:0;font-size:15px">'+esc(name)+'</h4>';
    if(rec.primary_department)h+='<div style="font-size:12px;color:var(--text3);margin-top:2px">'+esc(rec.primary_department)+'</div>';
    h+='</div><div style="display:flex;align-items:center;gap:8px">';
    if(hasAllergens)h+='<span style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">ALLERGEN</span>';
    if(sw)h+='<span style="background:'+(sw.toLowerCase()==='danger'?'#FEE2E2':'#FEF3C7')+';color:'+(sw.toLowerCase()==='danger'?'#DC2626':'#D97706')+';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">'+esc(sw.toUpperCase())+'</span>';
    h+='<span style="background:'+sc+'22;color:'+sc+';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">'+esc(status.charAt(0).toUpperCase()+status.slice(1))+'</span>';
    if(revDate)h+='<span class="rh-date">'+revDate+'</span>';
    h+='</div><span class="rh-arrow">&#9654;</span></div>';
    h+='<div class="record-body">';
    if(rec.file_url){
      var sl=br||rec.sds_number||'SDS Document';
      h+='<div style="padding:14px 16px;border-bottom:2px solid var(--border);display:flex;align-items:center;gap:14px;background:rgba(59,130,246,0.06)">';
      h+='<img src="https://api.qrserver.com/v1/create-qr-code/?size=64x64&data='+encodeURIComponent(rec.file_url)+'" alt="QR" style="width:64px;height:64px;border-radius:6px;border:1px solid var(--border)" />';
      h+='<div style="flex:1"><div style="font-weight:700;font-size:14px;color:var(--text1)">'+esc(sl)+'</div></div>';
      h+='<a href="'+esc(rec.file_url)+'" target="_blank" rel="noopener" style="background:var(--accent);color:#fff;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">View PDF</a></div>';
    }
    h+='<div style="display:grid;grid-template-columns:1fr 1fr">'+sdsCell('Product Name',rec.product_name)+sdsCell('Manufacturer',rec.manufacturer)+sdsCell('CAS Number',rec.cas_number)+sdsCell('Department',rec.primary_department)+sdsCell('Revision Date',rec.revision_date?new Date(rec.revision_date).toLocaleDateString():null)+sdsCell('Status',rec.status)+'</div>';
    if(rec.contains_allergens===true||rec.allergens){
      h+='<div style="padding:8px 12px;background:rgba(220,38,38,0.12);font-weight:700;font-size:12px;color:#DC2626;border-bottom:1px solid var(--border)">&#9888;&#65039; ALLERGEN INFORMATION</div>';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr">'+sdsCell('Contains Allergens',rec.contains_allergens?'Yes':'No',rec.contains_allergens?'#DC2626':null)+sdsCell('Allergens',rec.allergens)+sdsCell('Isolation Required',rec.allergen_isolation_required===true?'Yes':'No',rec.allergen_isolation_required?'#DC2626':null)+'</div>';
    }
    h+='</div></div>';
  }
  body.innerHTML=h;
}

function sdsCell(label,val,highlight){
  var display=(val!==null&&val!==undefined&&val!==''&&val!=='N/A')?esc(String(val)):null;
  if(!display)return'';
  var style=highlight?'font-weight:700;color:'+highlight:'color:var(--text1)';
  return'<div style="padding:6px 12px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)"><div style="font-size:10px;font-weight:600;color:var(--text3);margin-bottom:1px">'+label+'</div><div style="font-size:13px;'+style+'">'+display+'</div></div>';
}

function renderFields(rec){
  var h='';var keys=Object.keys(rec);
  for(var i=0;i<keys.length;i++){
    var k=keys[i];var v=rec[k];
    if(HIDDEN_FIELDS.indexOf(k)>=0)continue;
    var label=k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
    if(v===null||v===undefined||v===''){h+='<div class="record-field"><div class="rf-label">'+esc(label)+'</div><div class="rf-value" style="color:var(--text3)">N/A</div></div>';continue;}
    var val='';
    if(typeof v==='boolean')val=v?'Yes':'No';
    else if(Array.isArray(v))val=v.length>0?v.join(', '):'<span style="color:var(--text3)">N/A</span>';
    else if(typeof v==='object')val='<pre style="font-size:11px;white-space:pre-wrap;color:var(--text2)">'+esc(JSON.stringify(v,null,2))+'</pre>';
    else if(k.indexOf('date')>=0||k.indexOf('_at')>=0){try{val=new Date(v).toLocaleString();}catch(e){val=esc(String(v));}}
    else{val=esc(String(v));}
    h+='<div class="record-field"><div class="rf-label">'+esc(label)+'</div><div class="rf-value">'+val+'</div></div>';
  }
  return h||'<div style="padding:12px;color:var(--text3)">No data</div>';
}

function showSecurity(el){
  setActive(el);
  document.getElementById('mainTitle').textContent='Document Security Controls';
  document.getElementById('mainCount').textContent='';
  var sections=[
    {icon:'&#128272;',title:'Access Control',text:'Token-based authentication with time-limited sessions. Each auditor receives a unique, scoped access token. Tokens are hashed (SHA-256) before storage. Sessions can be revoked immediately by administrators.'},
    {icon:'&#9997;&#65039;',title:'Electronic Signatures',text:'All records requiring signatures use PPN (Personal PIN Number) verification. Signatures are timestamped and linked to verified employee identities.'},
    {icon:'&#128221;',title:'Document Version Control',text:'All documents maintain full version history. Changes are tracked with timestamps and user attribution.'},
    {icon:'&#128190;',title:'Data Storage and Encryption',text:'All data stored in Supabase (PostgreSQL) with AES-256 encryption at rest. TLS 1.3 encryption for all data in transit.'},
    {icon:'&#128202;',title:'Audit Trail',text:'Every record access is logged with timestamp, user ID, and details. Audit logs are immutable and retained for minimum 3 years.'},
    {icon:'&#128269;',title:'External Auditor Access',text:'Auditor portal provides read-only access only. All auditor activity is logged. No data modification capability.'},
    {icon:'&#128737;&#65039;',title:'Data Integrity',text:'Row Level Security (RLS) enforced at database level. Organization data isolation ensures cross-tenant data protection.'},
  ];
  var h='';
  for(var i=0;i<sections.length;i++){h+='<div class="security-section"><h3>'+sections[i].icon+' '+sections[i].title+'</h3><p>'+sections[i].text+'</p></div>';}
  document.getElementById('mainBody').innerHTML=h;
}

function exitPortal(){
  session=null;currentNCRData=null;
  document.getElementById('portalScreen').style.display='none';
  document.getElementById('tokenScreen').style.display='flex';
  document.getElementById('tokenInput').value='';
  document.getElementById('tokenError').textContent='';
  document.getElementById('tokenBtn').disabled=false;
  document.getElementById('tokenBtn').textContent='Access Portal';
  history.replaceState(null,'',window.location.pathname);
}
`;
}
