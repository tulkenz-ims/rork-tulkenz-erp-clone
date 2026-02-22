// api/auditor.js
// Vercel Serverless Function — TulKenz OPS Auditor Portal
// SQF Edition 10 Structure: 4 Sections + GMP Module 11
// URL: /api/auditor?token=xxxx

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(getHTML());
};

function getHTML() {
  var SB_URL = 'https://xaqztozcnkpmgytnnjlj.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp0b3pjbmtwbWd5dG5uamxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjI2NDAsImV4cCI6MjA4MzczODY0MH0.lL90-qamWRs8GXCvA-F7QcKiPx1WYUMs5OUjUi_1CjU';

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
    ':root{--bg:#0F0E17;--surface:#1A1926;--surface2:#252336;--border:#2E2C42;--primary:#6C5CE7;--primary-glow:#6C5CE740;--accent:#A78BFA;--text:#FFFFFE;--text1:#FFFFFE;--text2:#A7A4C2;--text3:#6B6890;--success:#10B981;--warning:#F59E0B;--danger:#EF4444;--font:"DM Sans",system-ui,-apple-system,sans-serif}',
    'html,body{height:100%;font-family:var(--font);background:var(--bg);color:var(--text);overflow:hidden}',
    'a{color:var(--accent);text-decoration:none}',

    // Token screen
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

    // Portal layout
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

    // Main content
    '.main{flex:1;display:flex;flex-direction:column;overflow:hidden}',
    '.main-header{padding:20px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}',
    '.main-title{font-size:20px;font-weight:700}',
    '.main-count{font-size:13px;color:var(--text2);background:var(--surface2);padding:4px 12px;border-radius:8px}',
    '.main-body{flex:1;overflow-y:auto;padding:24px 28px}',

    // Overview
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
    '.sc-mod .sm-count{font-weight:700;margin-left:4px}',

    // Placeholder
    '.placeholder-view{text-align:center;padding:60px 28px}',
    '.ph-icon{font-size:48px;margin-bottom:16px;opacity:.5}',
    '.ph-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px}',
    '.ph-desc{font-size:14px;color:var(--text2);max-width:480px;margin:0 auto 24px}',
    '.ph-items{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;max-width:500px;margin:0 auto;text-align:left}',
    '.ph-items h4{font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px}',
    '.ph-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text2)}',
    '.ph-item .phi-dot{width:6px;height:6px;border-radius:50%;background:var(--text3);flex-shrink:0}',

    // Search & records
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

    // Security
    '.security-section{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:12px}',
    '.security-section h3{font-size:15px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px}',
    '.security-section p{font-size:13px;color:var(--text2);line-height:1.6}',

    // Spinner
    '.spinner{display:inline-block;width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite}',
    '@keyframes spin{to{transform:rotate(360deg)}}',

    // Back button
    '.back-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text2);font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:20px;transition:all .2s}',
    '.back-btn:hover{border-color:var(--primary);color:var(--primary)}',

    // NCR Card (list view)
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

    // ===== PAPER FORM STYLES =====
    '.paper-form{background:#FFFFFF;border:2px solid #B0B0B0;border-radius:4px;overflow:hidden;margin-bottom:24px}',
    '.pf-header{display:flex;border-bottom:1px solid #B0B0B0;background:#fff}',
    '.pf-header-logo{width:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border-right:1px solid #B0B0B0}',
    '.pf-logo-box{width:40px;height:40px;background:#4A90A4;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700}',
    '.pf-logo-cap{font-size:7px;color:#888;margin-top:2px;text-align:center}',
    '.pf-header-info{flex:1;padding:6px 10px;border-right:1px solid #B0B0B0;display:flex;flex-direction:column;justify-content:center}',
    '.pf-info-row{display:flex;margin-bottom:2px}',
    '.pf-info-label{font-size:10px;font-weight:600;color:#555;width:100px}',
    '.pf-info-value{font-size:10px;color:#333;flex:1}',
    '.pf-header-meta{width:120px;padding:6px 8px;display:flex;flex-direction:column;justify-content:center}',
    '.pf-meta-text{font-size:9px;color:#777;margin-bottom:1px}',
    '.pf-title-bar{background:#4A90A4;padding:10px;text-align:center;border-bottom:1px solid #B0B0B0}',
    '.pf-title-bar h2{color:#fff;font-size:16px;font-weight:700;letter-spacing:0.3px;margin:0}',
    '.pf-form-num{padding:4px 10px;border-bottom:1px solid #B0B0B0;background:#FAFAFA;font-size:10px;color:#777}',
    '.pf-badges{display:flex;gap:8px;padding:8px 10px;border-bottom:1px solid #B0B0B0;background:#FAFAFA}',
    '.pf-section{display:flex;align-items:center;gap:6px;background:#D6EAF8;padding:6px 10px;border-bottom:1px solid #B0B0B0}',
    '.pf-section-label{font-size:12px;font-weight:700;color:#1B4F72}',
    '.pf-section-title{font-size:12px;font-weight:600;color:#1B4F72}',
    '.pf-sub-header{padding:5px 10px;border-bottom:1px solid #B0B0B0;background:#F0F6FB;font-size:11px;font-weight:600;color:#2C3E50;font-style:italic}',
    '.pf-row{display:flex;border-bottom:1px solid #B0B0B0;min-height:32px}',
    '.pf-row:last-child{border-bottom:none}',
    '.pf-label{background:#F5F6F7;padding:4px 8px;border-right:1px solid #B0B0B0;font-size:11px;font-weight:600;color:#444;display:flex;align-items:center;flex-shrink:0}',
    '.pf-value{background:#fff;padding:4px 8px;border-right:1px solid #B0B0B0;font-size:12px;color:#333;display:flex;align-items:center;flex:1;word-break:break-word}',
    '.pf-value:last-child{border-right:none}',
    '.pf-sig-verified{display:flex;align-items:center;gap:6px;color:#059669;font-weight:600;font-size:12px}',
    '.pf-sig-stamp{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;padding:6px 10px;font-size:11px;color:#065F46;font-family:monospace;white-space:pre-wrap;line-height:1.4}',
    '.pf-sig-unverified{color:#EF4444;font-weight:600;font-size:12px}',

    // Connected Records
    '.connected-section{margin-top:24px}',
    '.connected-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:8px}',
    '.timeline{position:relative;padding-left:28px}',
    '.timeline::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:2px;background:var(--border)}',
    '.tl-item{position:relative;margin-bottom:16px}',
    '.tl-dot{position:absolute;left:-22px;top:6px;width:12px;height:12px;border-radius:50%;border:2px solid var(--border);background:var(--bg)}',
    '.tl-dot.green{border-color:#10B981;background:#10B981}',
    '.tl-dot.blue{border-color:#3B82F6;background:#3B82F6}',
    '.tl-dot.orange{border-color:#F59E0B;background:#F59E0B}',
    '.tl-dot.red{border-color:#EF4444;background:#EF4444}',
    '.tl-dot.purple{border-color:#8B5CF6;background:#8B5CF6}',
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
    '.hold-tag-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px}',

    // Responsive
    '@media(max-width:768px){',
    '  .sidebar{width:280px;position:fixed;left:-300px;top:0;bottom:0;z-index:100;transition:left .3s}',
    '  .sidebar.open{left:0}',
    '  .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99}',
    '  .sidebar-overlay.show{display:block}',
    '  .mobile-hamburger{display:flex!important}',
    '  .main-body{padding:16px}',
    '  .record-field{flex-direction:column;gap:2px}',
    '  .rf-label{width:auto}',
    '  .token-card{padding:32px 24px}',
    '  .pf-header{flex-direction:column}',
    '  .pf-row{flex-wrap:wrap}',
    '  .pf-label{min-width:100px}',
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
  return `
var sb = supabase.createClient(SB_URL, SB_KEY);
var session = null;
var currentNCRData = null;

// ════════════════════════════════════════════════════════════════
// SQF EDITION 10 — FOUR SECTIONS + GMP
// ════════════════════════════════════════════════════════════════
var SECTIONS = [
  { id:'s1', num:'1', name:'Management & Culture', sqf:'2.1', color:'#6C5CE7', icon:'\\uD83C\\uDFDB\\uFE0F',
    desc:'Management commitment, food safety policy, food safety culture plan',
    modules:[
      {key:'_ph_policy',      name:'Food Safety Policy',      sqf:'2.1.1', ph:true, phIcon:'\\uD83D\\uDCC3', phDesc:'Documented food safety policy, management commitment statement, and organizational chart.', phItems:['Food safety policy statement','Management commitment documentation','Organizational chart with food safety roles','SQF practitioner designation','Management review records']},
      {key:'_ph_culture',     name:'Food Safety Culture Plan', sqf:'2.1.2', ph:true, phIcon:'\\uD83C\\uDF1F', phDesc:'Measurable objectives for building a positive food safety culture across the facility.', phItems:['Culture plan objectives & KPIs','Employee engagement surveys','Food safety communication records','Culture assessment results','Leadership involvement evidence']},
      {key:'_ph_mgmt_review', name:'Management Review',        sqf:'2.1.3', ph:true, phIcon:'\\uD83D\\uDCCA', phDesc:'Regular management reviews of the food safety system effectiveness.', phItems:['Management review meeting minutes','System effectiveness assessments','Resource allocation decisions','Improvement action items','Review frequency documentation']},
    ]
  },
  { id:'s2', num:'2', name:'Food Safety System', sqf:'2.2–2.4', color:'#EF4444', icon:'\\u2622\\uFE0F',
    desc:'HACCP, allergen management, chemical hazards, supplier approval, environmental monitoring',
    modules:[
      {key:'sds_records',     name:'SDS / Chemical Hazards', sqf:'2.3.1', table:'sds_records'},
      {key:'_allergen_view',  name:'Allergen Management',    sqf:'2.8.1', special:'allergen'},
      {key:'vendor_approvals',name:'Approved Suppliers',     sqf:'2.3.4', table:'vendor_approvals'},
      {key:'environmental_monitoring',name:'Environmental Monitoring',sqf:'2.4.8',table:'environmental_monitoring'},
      {key:'_ph_haccp',       name:'HACCP Plan',             sqf:'2.4.1', ph:true, phIcon:'\\u26A0\\uFE0F', phDesc:'Hazard analysis, critical control points, and food safety plans.', phItems:['Hazard analysis worksheets','CCP determination records','Critical limits & monitoring procedures','Corrective action procedures','HACCP plan validation records','Flow diagrams & process descriptions']},
    ]
  },
  { id:'s3', num:'3', name:'Verification & Improvement', sqf:'2.5–2.6', color:'#10B981', icon:'\\u2705',
    desc:'Document control, NCR/CAPA, internal audits, traceability, validation',
    modules:[
      {key:'documents',       name:'Document Control',        sqf:'2.2.1', special:'doc_dashboard'},
      {key:'ncr_records',     name:'NCR / Corrective Actions',sqf:'2.5.3', table:'ncr_records'},
      {key:'audit_findings',  name:'Internal Audits',         sqf:'2.5.4', table:'audit_findings'},
      {key:'_ph_traceability',name:'Traceability & Recall',   sqf:'2.6.1', ph:true, phIcon:'\\uD83D\\uDD0D', phDesc:'Product identification, traceability system, mock recall records.', phItems:['Traceability system documentation','Mock recall test results & timing','Lot coding / date coding procedures','Receiving & shipping trace records','Withdrawal & recall procedure','SQFI & CB notification procedures']},
      {key:'backup_verification_log',name:'Backup Verification',sqf:'2.2.3',table:'backup_verification_log'},
    ]
  },
  { id:'s4', num:'4', name:'Support Programs', sqf:'2.7–2.9', color:'#F59E0B', icon:'\\uD83C\\uDF93',
    desc:'Training, food defense, food fraud, change management',
    modules:[
      {key:'training_records',name:'Training Records',         sqf:'2.9.1', table:'training_records'},
      {key:'_ph_food_defense',name:'Food Defense & Fraud',     sqf:'2.7.1', ph:true, phIcon:'\\uD83D\\uDEE1\\uFE0F', phDesc:'Site security, vulnerability assessments, food fraud mitigation.', phItems:['Food defense plan','Vulnerability assessment (CARVER+Shock or equivalent)','Food fraud mitigation plan','Economically motivated adulteration assessment','Site security measures documentation','Visitor & contractor access controls']},
      {key:'_ph_change_mgmt', name:'Change Management',        sqf:'2.3.5', ph:true, phIcon:'\\uD83D\\uDD04', phDesc:'Documented procedures for managing process, personnel, and equipment changes.', phItems:['Change management procedure','Change request & approval records','Risk assessment for changes','Post-change verification records','Communication of changes to affected personnel']},
    ]
  },
  { id:'gmp', num:'11', name:'GMP — Good Manufacturing Practices', sqf:'Module 11', color:'#8B5CF6', icon:'\\uD83C\\uDFED',
    desc:'Facility, equipment, hygiene, sanitation, maintenance, pest control',
    modules:[
      {key:'pm_schedules',    name:'Preventive Maintenance',   sqf:'11.2.8', table:'pm_schedules'},
      {key:'work_orders',     name:'Work Orders',              sqf:'11.2.8', table:'work_orders'},
      {key:'inspections',     name:'Facility Inspections',     sqf:'11.2.1', table:'inspections'},
      {key:'_ph_sanitation',  name:'Sanitation & Cleaning',    sqf:'11.2.6', ph:true, phIcon:'\\uD83E\\uDDF9', phDesc:'Master sanitation schedule, cleaning verification, pre-op inspections.', phItems:['Master sanitation schedule','Pre-operational inspection records','Cleaning chemical approvals','Sanitation SOP library','ATP / swab verification records','Clean-in-place (CIP) logs']},
      {key:'_ph_pest',        name:'Pest Control',             sqf:'11.2.4', ph:true, phIcon:'\\uD83D\\uDC1B', phDesc:'Integrated pest management program and monitoring.', phItems:['IPM program documentation','Pest control operator contract & license','Trap map and inspection logs','Pest activity trend reports','Corrective actions for pest findings']},
    ]
  },
];

// Build flat lookup
var MODULE_MAP = {};
var ALL_MODULES = [];
for (var si = 0; si < SECTIONS.length; si++) {
  var sec = SECTIONS[si];
  for (var mi = 0; mi < sec.modules.length; mi++) {
    var m = sec.modules[mi];
    m._section = sec;
    MODULE_MAP[m.key] = m;
    ALL_MODULES.push(m);
  }
}

var HIDDEN_FIELDS = ['id','organization_id','created_by_id','performed_by_id','verified_by_id',
  'pin','pin_hash','password','token','token_hash','access_token','access_token_hash',
  'discovered_by_id','closed_by_id','assigned_to_id','approved_by_id','rejected_by_id',
  'reviewed_by_id','submitted_by_id','completed_by_id','updated_by_id',
  'facility_id','capa_id','form_style','form_version','template_id','template_snapshot'];

var SEVERITY_MAP = {minor:'Minor',major:'Major',critical:'Critical'};
var STATUS_MAP = {open:'Open',investigation:'Investigation',containment:'Containment',root_cause:'Root Cause',corrective_action:'Corrective Action',verification:'Verification',closed:'Closed',rejected:'Rejected'};

// ── Event delegation ──
document.addEventListener('click', function(e) {
  var t = e.target.closest('[data-action]');
  if (!t) {
    var rh = e.target.closest('.record-head');
    if (rh) { rh.parentElement.classList.toggle('open'); return; }
    if (e.target.id === 'sidebarOverlay') { toggleSidebar(); return; }
    // Nav group toggle
    var gh = e.target.closest('.nav-group-head');
    if (gh) { gh.parentElement.classList.toggle('open'); return; }
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
    if (navEl) { navEl.closest('.nav-group').classList.add('open'); loadModule(navEl, t.dataset.key); }
  }
  else if (action === 'ncr-detail') showNCRDetail(t.dataset.id);
  else if (action === 'back-to-ncr-list') loadModule(document.querySelector('[data-key="ncr_records"]'), 'ncr_records');
  else if (action === 'open-section') {
    var secId = t.dataset.section;
    var grp = document.querySelector('.nav-group[data-section="' + secId + '"]');
    if (grp) { grp.classList.add('open'); var first = grp.querySelector('.nav-item'); if (first) { loadModule(first, first.dataset.key); } }
  }
});

document.addEventListener('input', function(e) {
  if (e.target.classList.contains('search-bar')) {
    var q = e.target.value.toLowerCase();
    var cards = e.target.parentElement ? e.target.parentElement.querySelectorAll('[data-search]') : document.querySelectorAll('[data-search]');
    for (var i = 0; i < cards.length; i++) { cards[i].style.display = cards[i].dataset.search.indexOf(q) >= 0 ? '' : 'none'; }
  }
});

document.getElementById('tokenBtn').setAttribute('data-action', 'validate');
document.getElementById('exitBtn').setAttribute('data-action', 'exit');
document.getElementById('hamburgerBtn').setAttribute('data-action', 'hamburger');

(function(){
  var p = new URLSearchParams(window.location.search);
  var t = p.get('token') || p.get('audit_token');
  if (t) {
    document.getElementById('tokenInput').value = t;
    setTimeout(function(){ validateToken(); }, 400);
  }
})();

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtDate(v) { try { return new Date(v).toLocaleString(); } catch(e) { return v || 'N/A'; } }
function fmtSnake(s) { return s ? s.replace(/_/g,' ').replace(/\\b\\w/g, function(c){return c.toUpperCase();}) : 'N/A'; }

// ── Auth ──
async function validateToken() {
  var token = document.getElementById('tokenInput').value.trim();
  var btn = document.getElementById('tokenBtn');
  var err = document.getElementById('tokenError');
  if (!token) { err.textContent = 'Please enter an access token.'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; err.textContent = '';
  try {
    var resp = await sb.from('audit_sessions').select('*').eq('access_token', token).limit(1);
    if (resp.error) throw resp.error;
    if (!resp.data || resp.data.length === 0) { err.textContent = 'Invalid access token.'; btn.disabled = false; btn.textContent = 'Access Portal'; return; }
    var s = resp.data[0]; var now = new Date();
    if (s.status === 'revoked') { err.textContent = 'This session has been revoked.'; btn.disabled = false; btn.textContent = 'Access Portal'; return; }
    if (s.valid_from && new Date(s.valid_from) > now) { err.textContent = 'Session not yet active.'; btn.disabled = false; btn.textContent = 'Access Portal'; return; }
    if (s.valid_until && new Date(s.valid_until) < now) { err.textContent = 'This session has expired.'; btn.disabled = false; btn.textContent = 'Access Portal'; return; }
    session = s;
    try {
      await sb.from('audit_access_log').insert({ session_id: s.id, organization_id: s.organization_id, module: 'portal', action: 'portal_opened', resource_type: 'portal', user_agent: navigator.userAgent });
      await sb.from('audit_sessions').update({ last_accessed_at: now.toISOString(), access_count: (s.access_count || 0) + 1 }).eq('id', s.id);
    } catch(e) { console.warn('Log error:', e); }
    showPortal();
  } catch(e) { console.error(e); err.textContent = 'Connection error.'; btn.disabled = false; btn.textContent = 'Access Portal'; }
}

// ══════════════════════════════════════════════
// PORTAL — Sidebar with SQF Ed10 Sections
// ══════════════════════════════════════════════
function showPortal() {
  document.getElementById('tokenScreen').style.display = 'none';
  document.getElementById('portalScreen').style.display = 'block';
  document.getElementById('sessionInfo').innerHTML = '<strong>' + esc(session.session_name || 'Audit Session') + '</strong><br/>Type: ' + esc(session.audit_type || 'SQF') + '<br/>' + (session.certification_body ? 'CB: ' + esc(session.certification_body) + '<br/>' : '') + (session.valid_until ? 'Expires: ' + new Date(session.valid_until).toLocaleDateString() : 'No expiration');

  var nav = document.getElementById('sidebarNav');
  var h = '<div class="nav-item nav-item-top active" data-action="overview"><span class="nav-icon">&#127968;</span> Overview</div>';

  for (var si = 0; si < SECTIONS.length; si++) {
    var sec = SECTIONS[si];
    h += '<div class="nav-group" data-section="' + sec.id + '">';
    h += '<div class="nav-group-head"><span class="ng-arrow">&#9654;</span><span class="ng-icon">' + sec.icon + '</span><span class="ng-label">' + sec.name + '</span><span class="ng-sqf">' + sec.sqf + '</span></div>';
    h += '<div class="nav-group-items">';
    for (var mi = 0; mi < sec.modules.length; mi++) {
      var m = sec.modules[mi];
      h += '<div class="nav-item" data-action="module" data-key="' + m.key + '"><span class="ni-dot" style="background:' + sec.color + '"></span>' + m.name + '</div>';
    }
    h += '</div></div>';
  }

  h += '<div class="nav-section">System</div>';
  h += '<div class="nav-item nav-item-top" data-action="security"><span class="nav-icon">&#128737;&#65039;</span> Security Controls</div>';
  nav.innerHTML = h;
  showOverview(nav.querySelector('.nav-item'));
}

function setActive(el) { var items = document.querySelectorAll('.nav-item'); for (var i = 0; i < items.length; i++) items[i].classList.remove('active'); if (el) el.classList.add('active'); document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); }

// ══════════════════════════════════════════════
// OVERVIEW — SQF Ed10 Section Cards
// ══════════════════════════════════════════════
function showOverview(el) {
  setActive(el);
  document.getElementById('mainTitle').textContent = 'Audit Overview';
  document.getElementById('mainCount').textContent = 'SQF Edition 10';
  var body = document.getElementById('mainBody');

  var h = '<div class="overview-welcome"><h2>Welcome to the Auditor Portal</h2><p>Read-only access to facility records organized by SQF Edition 10 structure. All access is logged for compliance. Select a section below or use the sidebar to navigate.</p><div class="ow-edition">&#128220; SQF Food Safety Code — Edition 10 &bull; Food Manufacturing</div></div>';

  for (var si = 0; si < SECTIONS.length; si++) {
    var sec = SECTIONS[si];
    h += '<div class="section-card">';
    h += '<div class="sc-head" data-action="open-section" data-section="' + sec.id + '">';
    h += '<div class="sc-num" style="background:' + sec.color + '">' + sec.num + '</div>';
    h += '<div class="sc-info"><div class="sc-name">' + sec.name + '</div><div class="sc-desc">' + sec.desc + '</div></div>';
    h += '<div class="sc-arrow">&#9654;</div>';
    h += '</div>';
    h += '<div class="sc-modules">';
    for (var mi = 0; mi < sec.modules.length; mi++) {
      var m = sec.modules[mi];
      h += '<div class="sc-mod" data-action="module-card" data-key="' + m.key + '">' + m.name + ' <span style="opacity:.5">' + m.sqf + '</span></div>';
    }
    h += '</div></div>';
  }

  body.innerHTML = h;
}

// ══════════════════════════════════════════════
// LOAD MODULE — Routes to correct renderer
// ══════════════════════════════════════════════
async function loadModule(el, key) {
  setActive(el);
  var mod = MODULE_MAP[key];
  if (!mod) return;

  var secLabel = mod._section ? mod._section.num + '.' : '';
  document.getElementById('mainTitle').textContent = mod.name;
  document.getElementById('mainCount').textContent = 'SQF ' + mod.sqf;
  var body = document.getElementById('mainBody');
  body.innerHTML = '<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';

  try { await sb.from('audit_access_log').insert({ session_id: session.id, organization_id: session.organization_id, module: key, action: 'module_viewed', resource_type: key, user_agent: navigator.userAgent }); } catch(e) {}

  // Placeholder modules
  if (mod.ph) { renderPlaceholder(body, mod); return; }

  // Special renderers
  if (mod.special === 'doc_dashboard') { await renderDocumentDashboard(body); return; }
  if (mod.special === 'allergen') { await renderAllergenView(body); return; }

  // Data-driven modules
  try {
    var resp = await sb.from(mod.table || key).select('*').eq('organization_id', session.organization_id).order('created_at', { ascending: false }).limit(200);
    if (resp.error) throw resp.error;
    var data = resp.data || [];
    document.getElementById('mainCount').textContent = 'SQF ' + mod.sqf + ' \\u2022 ' + data.length + ' records';

    if (data.length === 0) { body.innerHTML = '<div class="empty-state"><div class="es-icon">&#128237;</div><p>No records found in <strong>' + mod.name + '</strong>.</p></div>'; return; }

    // Special rendering for NCR records
    if (key === 'ncr_records') { currentNCRData = data; renderNCRList(data); return; }

    // Special rendering for SDS records
    if (key === 'sds_records') { renderSDSList(data); return; }

    // Default rendering for other modules
    var h = '<input type="text" class="search-bar" placeholder="Search records..."/>';
    for (var i = 0; i < data.length; i++) {
      var rec = data[i];
      var title = rec.title || rec.product_name || rec.name || rec.wo_number || rec.sds_number || (rec.description ? rec.description.substring(0,60) : '') || ('Record #' + (i+1));
      var date = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : '';
      h += '<div class="record-card" data-search="' + esc(JSON.stringify(rec)).toLowerCase() + '"><div class="record-head"><h4>' + esc(title) + '</h4><span class="rh-date">' + date + '</span><span class="rh-arrow">&#9654;</span></div><div class="record-body">' + renderFields(rec) + '</div></div>';
    }
    body.innerHTML = h;
  } catch(e) {
    console.error(e);
    body.innerHTML = '<div class="empty-state"><div class="es-icon">&#10060;</div><p>Error: ' + esc(e.message) + '</p></div>';
    document.getElementById('mainCount').textContent = 'Error';
  }
}

// ══════════════════════════════════════════════
// PLACEHOLDER MODULE VIEW
// ══════════════════════════════════════════════
function renderPlaceholder(body, mod) {
  var h = '<div class="placeholder-view">';
  h += '<div class="ph-icon">' + (mod.phIcon || '&#128196;') + '</div>';
  h += '<div class="ph-title">' + esc(mod.name) + '</div>';
  h += '<div class="ph-desc">' + esc(mod.phDesc || 'This module is structured and ready for documentation.') + '</div>';
  h += '<div class="ph-items">';
  h += '<h4>SQF ' + esc(mod.sqf) + ' \\u2014 Required Documentation</h4>';
  if (mod.phItems) {
    for (var i = 0; i < mod.phItems.length; i++) {
      h += '<div class="ph-item"><span class="phi-dot"></span>' + esc(mod.phItems[i]) + '</div>';
    }
  }
  h += '</div></div>';
  body.innerHTML = h;
  document.getElementById('mainCount').textContent = 'SQF ' + mod.sqf + ' \\u2022 Framework Ready';
}

// ══════════════════════════════════════════════
// ALLERGEN MANAGEMENT VIEW
// ══════════════════════════════════════════════
async function renderAllergenView(body) {
  body.innerHTML = '<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';

  var resp = await sb.from('sds_records').select('id, product_name, manufacturer, primary_department, sds_master_number, contains_allergens, allergens, allergen_notes, allergen_isolation_required, allergen_isolation_notes, status').eq('organization_id', session.organization_id);
  var all = resp.data || [];
  var allergenRecords = all.filter(function(r) { return r.contains_allergens === true || (r.allergens && r.allergens.length > 0); });
  var isolationRequired = allergenRecords.filter(function(r) { return r.allergen_isolation_required === true; });

  document.getElementById('mainCount').textContent = 'SQF 2.8.1 \\u2022 ' + allergenRecords.length + ' allergen chemicals';

  var h = '';

  // Summary stats
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';
  h += statCard(all.length, 'Total Chemicals', '#4A90A4');
  h += statCard(allergenRecords.length, 'Contain Allergens', '#DC2626');
  h += statCard(isolationRequired.length, 'Isolation Required', '#EF4444');
  h += statCard(all.length - allergenRecords.length, 'Allergen-Free', '#10B981');
  h += '</div>';

  if (allergenRecords.length === 0) {
    h += '<div class="empty-state"><div class="es-icon">&#9989;</div><p>No chemicals flagged as containing allergens.</p></div>';
    body.innerHTML = h;
    return;
  }

  h += '<input type="text" class="search-bar" placeholder="Search allergen records..."/>';

  for (var i = 0; i < allergenRecords.length; i++) {
    var rec = allergenRecords[i];
    var name = rec.product_name || 'Unknown Chemical';
    var binderRef = buildSdsBinderRef(rec.primary_department, rec.sds_master_number);
    var searchStr = (name + ' ' + (rec.allergens || '') + ' ' + (rec.primary_department || '') + ' ' + (binderRef || '')).toLowerCase();

    h += '<div class="record-card" data-search="' + esc(searchStr) + '">';
    h += '<div class="record-head" style="padding:14px 16px">';
    h += '<div style="flex:1">';
    if (binderRef) h += '<div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:0.3px;margin-bottom:2px">' + esc(binderRef) + '</div>';
    h += '<h4 style="margin:0;font-size:15px">' + esc(name) + '</h4>';
    if (rec.manufacturer) h += '<div style="font-size:12px;color:var(--text3);margin-top:2px">' + esc(rec.manufacturer) + '</div>';
    h += '</div>';
    h += '<div style="display:flex;gap:6px;align-items:center">';
    h += '<span style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">ALLERGEN</span>';
    if (rec.allergen_isolation_required) h += '<span style="background:#FEE2E2;color:#DC2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">ISOLATION</span>';
    h += '</div>';
    h += '<span class="rh-arrow">&#9654;</span></div>';

    h += '<div class="record-body" style="padding:12px 16px;border-top:1px solid var(--border)">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px">';
    h += sdsCell('Allergens', rec.allergens);
    h += sdsCell('Department', rec.primary_department);
    h += sdsCell('Allergen Notes', rec.allergen_notes);
    h += sdsCell('Isolation Required', rec.allergen_isolation_required ? 'Yes' : 'No', rec.allergen_isolation_required ? '#DC2626' : null);
    if (rec.allergen_isolation_notes) h += sdsCell('Isolation Notes', rec.allergen_isolation_notes);
    h += sdsCell('Status', rec.status);
    h += '</div></div></div>';
  }

  body.innerHTML = h;
}

// ══════════════════════════════════════════════
// NCR LIST
// ══════════════════════════════════════════════
function renderNCRList(data) {
  var body = document.getElementById('mainBody');
  var h = '<input type="text" class="search-bar" placeholder="Search NCRs by number, description, status..."/>';
  for (var i = 0; i < data.length; i++) {
    var ncr = data[i];
    var sev = ncr.severity || 'minor';
    var stat = ncr.status || 'open';
    h += '<div class="ncr-card" data-action="ncr-detail" data-id="' + ncr.id + '" data-search="' + esc(ncr.ncr_number + ' ' + (ncr.title || '') + ' ' + (ncr.description || '') + ' ' + stat + ' ' + sev).toLowerCase() + '">';
    h += '<div class="ncr-card-top"><span class="ncr-num">' + esc(ncr.ncr_number || '') + '</span><span style="font-size:11px;color:var(--text3)">' + (ncr.discovered_date || '') + '</span></div>';
    h += '<div class="ncr-title">' + esc(ncr.title || ncr.description || 'Untitled') + '</div>';
    h += '<div class="ncr-badges">';
    h += '<span class="badge badge-' + sev + '">' + (SEVERITY_MAP[sev] || sev) + '</span>';
    h += '<span class="badge badge-' + stat + '">' + (STATUS_MAP[stat] || fmtSnake(stat)) + '</span>';
    if (ncr.capa_required) h += '<span class="badge" style="background:#EDE9FE;color:#7C3AED">CAPA</span>';
    h += '</div></div>';
  }
  body.innerHTML = h;
}

// ══════════════════════════════════════════════
// NCR DETAIL — Paper Form + Connected Records
// ══════════════════════════════════════════════
async function showNCRDetail(ncrId) {
  var ncr = null;
  if (currentNCRData) { for (var i = 0; i < currentNCRData.length; i++) { if (currentNCRData[i].id === ncrId) { ncr = currentNCRData[i]; break; } } }
  if (!ncr) return;

  document.getElementById('mainTitle').textContent = ncr.ncr_number || 'NCR Detail';
  document.getElementById('mainCount').textContent = 'SQF 2.5.3';
  var body = document.getElementById('mainBody');

  try { await sb.from('audit_access_log').insert({ session_id: session.id, organization_id: session.organization_id, module: 'ncr_records', action: 'record_viewed', resource_type: 'ncr_records', resource_id: ncr.id, resource_name: ncr.ncr_number, user_agent: navigator.userAgent }); } catch(e) {}

  var h = '<div data-action="back-to-ncr-list" class="back-btn">&#8592; Back to NCR List</div>';
  h += renderPaperForm(ncr);
  h += '<div class="connected-section"><div class="connected-title">&#128279; Connected Records &amp; Event Chain</div>';
  h += '<div id="connectedRecords"><div style="text-align:center;padding:30px"><span class="spinner"></span> Loading connected records...</div></div></div>';
  body.innerHTML = h;
  loadConnectedRecords(ncr);
}

// ── Paper Form Render ──
function renderPaperForm(ncr) {
  var h = '<div class="paper-form">';
  h += '<div class="pf-header">';
  h += '<div class="pf-header-logo"><div class="pf-logo-box">LOGO</div><div class="pf-logo-cap">YOUR LOGO HERE</div></div>';
  h += '<div class="pf-header-info">';
  h += '<div class="pf-info-row"><span class="pf-info-label">Organization:</span><span class="pf-info-value">Admin Organization</span></div>';
  h += '<div class="pf-info-row"><span class="pf-info-label">NCR Number:</span><span class="pf-info-value">' + esc(ncr.ncr_number || '') + '</span></div>';
  h += '<div class="pf-info-row"><span class="pf-info-label">Type:</span><span class="pf-info-value">' + fmtSnake(ncr.ncr_type) + '</span></div>';
  h += '<div class="pf-info-row"><span class="pf-info-label">Source:</span><span class="pf-info-value">' + fmtSnake(ncr.source) + '</span></div>';
  h += '</div>';
  h += '<div class="pf-header-meta"><span class="pf-meta-text">Form Style: ' + esc(ncr.form_style || 'Standard') + '</span><span class="pf-meta-text">Version: ' + esc(ncr.form_version || '1.0') + '</span><span class="pf-meta-text">Date: ' + esc(ncr.discovered_date || '') + '</span></div>';
  h += '</div>';
  h += '<div class="pf-title-bar"><h2>Non-Conformance Report (NCR)</h2></div>';
  h += '<div class="pf-form-num">Automated Form Number: ' + esc(ncr.ncr_number || '') + '</div>';
  h += '<div class="pf-badges">';
  h += '<span class="badge badge-' + (ncr.status || 'open') + '">' + (STATUS_MAP[ncr.status] || fmtSnake(ncr.status)) + '</span>';
  h += '<span class="badge badge-' + (ncr.severity || 'minor') + '">' + (SEVERITY_MAP[ncr.severity] || fmtSnake(ncr.severity)) + '</span>';
  h += '</div>';

  h += '<div class="pf-section"><span class="pf-section-label">Section 1:</span><span class="pf-section-title">General Information</span></div>';
  h += '<div class="pf-sub-header">Project Information</div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:100px">Package</div><div class="pf-value">' + esc(ncr.project_package || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:130px">Item / Component No</div><div class="pf-value">' + esc(ncr.item_component_no || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:150px">Specification Ref No</div><div class="pf-value">' + esc(ncr.specification_reference_no || 'N/A') + '</div></div>';
  h += '<div class="pf-sub-header">Contractor Information</div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:80px">Location</div><div class="pf-value">' + esc(ncr.contractor_location || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:100px">Person in Charge</div><div class="pf-value">' + esc(ncr.contractor_person_in_charge || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:60px">Phone</div><div class="pf-value">' + esc(ncr.contractor_phone || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:50px">Email</div><div class="pf-value">' + esc(ncr.contractor_email || 'N/A') + '</div></div>';
  h += '<div class="pf-sub-header">Supplier Information</div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:80px">Location</div><div class="pf-value">' + esc(ncr.supplier_location || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:100px">Person in Charge</div><div class="pf-value">' + esc(ncr.supplier_person_in_charge || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:60px">Phone</div><div class="pf-value">' + esc(ncr.supplier_phone || 'N/A') + '</div>';
  h += '<div class="pf-label" style="width:50px">Email</div><div class="pf-value">' + esc(ncr.supplier_email || 'N/A') + '</div></div>';

  h += '<div class="pf-section"><span class="pf-section-label">Section 2:</span><span class="pf-section-title">Non-Conformity Details</span></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Description of Non-Conformity</div><div class="pf-value" style="min-height:48px;white-space:pre-wrap">' + esc(ncr.description || 'N/A') + '</div></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Non-Conformity Category</div><div class="pf-value">' + esc(ncr.non_conformity_category || 'N/A') + '</div></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Recommendation by Originator</div><div class="pf-value" style="min-height:48px;white-space:pre-wrap">' + esc(ncr.recommendation_by_originator || 'N/A') + '</div></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Project Time Delay?</div><div class="pf-value"><strong>' + (ncr.project_time_delay ? 'Yes' : 'No') + '</strong>';
  if (ncr.project_time_delay && ncr.expected_delay_estimate) h += ' \\u2014 Expected: ' + esc(ncr.expected_delay_estimate);
  h += '</div></div>';

  if (ncr.product_name || ncr.lot_number || ncr.location) {
    h += '<div class="pf-sub-header">Product / Location Details</div>';
    h += '<div class="pf-row">';
    if (ncr.product_name) h += '<div class="pf-label" style="width:80px">Product</div><div class="pf-value">' + esc(ncr.product_name) + '</div>';
    if (ncr.lot_number) h += '<div class="pf-label" style="width:70px">Lot No.</div><div class="pf-value">' + esc(ncr.lot_number) + '</div>';
    if (ncr.location) h += '<div class="pf-label" style="width:70px">Location</div><div class="pf-value">' + esc(ncr.location) + '</div>';
    h += '</div>';
  }

  if (ncr.containment_actions || ncr.root_cause || ncr.corrective_actions || ncr.preventive_actions) {
    h += '<div class="pf-section"><span class="pf-section-label">Investigation &amp; Actions</span></div>';
    if (ncr.containment_actions) h += '<div class="pf-row"><div class="pf-label" style="width:140px">Containment Actions</div><div class="pf-value" style="white-space:pre-wrap">' + esc(ncr.containment_actions) + '</div></div>';
    if (ncr.root_cause) h += '<div class="pf-row"><div class="pf-label" style="width:140px">Root Cause</div><div class="pf-value" style="white-space:pre-wrap">' + esc(ncr.root_cause) + '</div></div>';
    if (ncr.root_cause_category) h += '<div class="pf-row"><div class="pf-label" style="width:140px">Root Cause Category</div><div class="pf-value">' + esc(ncr.root_cause_category) + '</div></div>';
    if (ncr.corrective_actions) h += '<div class="pf-row"><div class="pf-label" style="width:140px">Corrective Actions</div><div class="pf-value" style="white-space:pre-wrap">' + esc(ncr.corrective_actions) + '</div></div>';
    if (ncr.preventive_actions) h += '<div class="pf-row"><div class="pf-label" style="width:140px">Preventive Actions</div><div class="pf-value" style="white-space:pre-wrap">' + esc(ncr.preventive_actions) + '</div></div>';
  }

  h += '<div class="pf-section"><span class="pf-section-label">Section 3:</span><span class="pf-section-title">Response by Contractors Involved</span></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Contractors Involved</div><div class="pf-value">' + esc((ncr.contractors_involved || []).join(', ') || 'N/A') + '</div></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Outcome of Investigation</div><div class="pf-value" style="min-height:48px;white-space:pre-wrap">' + esc(ncr.outcome_of_investigation || 'N/A') + '</div></div>';

  h += '<div class="pf-section"><span class="pf-section-label">Originator Signature</span></div>';
  if (ncr.originator_pin_verified && ncr.originator_signature_stamp) {
    h += '<div class="pf-row"><div class="pf-label" style="width:140px">Signature Status</div><div class="pf-value"><div class="pf-sig-verified">&#9989; VERIFIED \\u2014 Signed via PPN</div></div></div>';
    h += '<div class="pf-row"><div class="pf-label" style="width:140px">Originator</div><div class="pf-value">' + esc(ncr.originator_name || 'N/A') + '</div>';
    h += '<div class="pf-label" style="width:80px">Department</div><div class="pf-value">' + esc(ncr.originator_department_code || 'N/A') + '</div>';
    h += '<div class="pf-label" style="width:60px">Initials</div><div class="pf-value">' + esc(ncr.originator_initials || 'N/A') + '</div></div>';
    h += '<div class="pf-row"><div class="pf-label" style="width:140px">Signature Stamp</div><div class="pf-value"><div class="pf-sig-stamp">' + esc(ncr.originator_signature_stamp) + '</div></div></div>';
    h += '<div class="pf-row"><div class="pf-label" style="width:140px">Signed At</div><div class="pf-value">' + fmtDate(ncr.originator_signed_at) + '</div></div>';
  } else {
    h += '<div class="pf-row"><div class="pf-label" style="width:140px">Signature Status</div><div class="pf-value"><div class="pf-sig-unverified">&#10060; NOT SIGNED</div></div></div>';
  }

  if (ncr.disposition || ncr.customer_notified !== null) {
    h += '<div class="pf-section"><span class="pf-section-label">Disposition &amp; Closure</span></div>';
    h += '<div class="pf-row"><div class="pf-label" style="width:140px">Disposition</div><div class="pf-value">' + esc(ncr.disposition || 'N/A') + '</div>';
    h += '<div class="pf-label" style="width:120px">Customer Notified</div><div class="pf-value">' + (ncr.customer_notified ? 'Yes' : 'No') + '</div>';
    h += '<div class="pf-label" style="width:100px">CAPA Required</div><div class="pf-value">' + (ncr.capa_required ? 'Yes' : 'No') + '</div></div>';
    if (ncr.closed_by) {
      h += '<div class="pf-row"><div class="pf-label" style="width:140px">Closed By</div><div class="pf-value">' + esc(ncr.closed_by) + '</div>';
      h += '<div class="pf-label" style="width:80px">Closed Date</div><div class="pf-value">' + esc(ncr.closed_date || 'N/A') + '</div></div>';
    }
  }

  h += '<div class="pf-section"><span class="pf-section-label">Record Metadata</span></div>';
  h += '<div class="pf-row"><div class="pf-label" style="width:140px">Created</div><div class="pf-value">' + fmtDate(ncr.created_at) + '</div>';
  h += '<div class="pf-label" style="width:100px">Last Updated</div><div class="pf-value">' + fmtDate(ncr.updated_at) + '</div></div>';
  h += '</div>';
  return h;
}

// ══════════════════════════════════════════════
// CONNECTED RECORDS
// ══════════════════════════════════════════════
async function loadConnectedRecords(ncr) {
  var container = document.getElementById('connectedRecords');
  if (!container) return;
  var h = '';

  try {
    var formLinks1 = await sb.from('task_feed_form_links').select('*').eq('form_number', ncr.ncr_number);
    var formLinks2 = await sb.from('task_feed_form_links').select('*').eq('form_id', ncr.id);
    var allLinks = (formLinks1.data || []).concat(formLinks2.data || []);
    var seenPostIds = {};
    var links = [];
    for (var li = 0; li < allLinks.length; li++) {
      if (!seenPostIds[allLinks[li].post_id]) { seenPostIds[allLinks[li].post_id] = true; links.push(allLinks[li]); }
    }

    var deptRef1 = await sb.from('task_feed_department_tasks').select('post_id').eq('module_reference_id', ncr.id);
    var deptRef2 = await sb.from('task_feed_department_tasks').select('post_id').eq('module_history_id', ncr.id);

    var postIdMap = {};
    links.forEach(function(l) { postIdMap[l.post_id] = true; });
    (deptRef1.data || []).forEach(function(d) { if (d.post_id) postIdMap[d.post_id] = true; });
    (deptRef2.data || []).forEach(function(d) { if (d.post_id) postIdMap[d.post_id] = true; });
    var postIds = Object.keys(postIdMap);

    if (postIds.length > 0) {
      var postsResp = await sb.from('task_feed_posts').select('*').in('id', postIds);
      var posts = postsResp.data || [];
      var deptResp = await sb.from('task_feed_department_tasks').select('*').in('post_id', postIds).order('created_at', { ascending: true });
      var deptTasks = deptResp.data || [];
      var holdLogResp = await sb.from('production_hold_log').select('*').in('post_id', postIds).order('created_at', { ascending: true });
      var holdLogs = holdLogResp.data || [];

      for (var p = 0; p < posts.length; p++) {
        var post = posts[p];
        h += '<div style="margin-bottom:20px">';
        h += '<h3 style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px">&#128196; Task Feed Post: ' + esc(post.post_number || '') + '</h3>';
        h += '<div class="tl-card" style="margin-bottom:16px;border-left:3px solid var(--primary)">';
        h += '<div class="tl-card-head"><span class="tl-card-title">' + esc(post.template_name || 'Incident Post') + '</span><span class="tl-card-time">' + fmtDate(post.created_at) + '</span></div>';
        h += '<div class="tl-card-body">';
        h += '<div class="tl-card-field"><span class="tl-field-label">Created By</span><span class="tl-field-value">' + esc(post.created_by_name || 'N/A') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Facility</span><span class="tl-field-value">' + esc(post.facility_name || 'N/A') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Location</span><span class="tl-field-value">' + esc(post.location_name || post.room_name || 'N/A') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Status</span><span class="tl-field-value">' + fmtSnake(post.status) + ' (' + (post.completed_departments || 0) + '/' + (post.total_departments || 0) + ' depts)</span></div>';
        if (post.is_production_hold) {
          h += '<div class="tl-card-field"><span class="tl-field-label">&#9888;&#65039; Production Hold</span><span class="tl-field-value">Line: ' + esc(post.production_line || 'N/A') + ' | Hold Status: ' + fmtSnake(post.hold_status || 'active') + '</span></div>';
          if (post.hold_cleared_by_name) h += '<div class="tl-card-field"><span class="tl-field-label">Hold Cleared</span><span class="tl-field-value">' + esc(post.hold_cleared_by_name) + ' at ' + fmtDate(post.hold_cleared_at) + '</span></div>';
        }
        if (post.notes) h += '<div class="tl-card-field"><span class="tl-field-label">Notes</span><span class="tl-field-value">' + esc(post.notes) + '</span></div>';
        h += '</div></div>';

        var postDepts = deptTasks.filter(function(d) { return d.post_id === post.id; });
        if (postDepts.length > 0) {
          h += '<h4 style="font-size:14px;font-weight:600;color:var(--text);margin:12px 0 8px">&#127970; Department Responses (' + postDepts.length + ')</h4>';
          for (var d = 0; d < postDepts.length; d++) {
            var dept = postDepts[d];
            var deptStatus = dept.status || 'pending';
            h += '<div class="dept-card">';
            h += '<div class="dept-header"><span class="dept-name" style="color:var(--text)">' + esc(dept.department_name || dept.department_code || 'Unknown') + '</span>';
            h += '<span class="dept-status ' + deptStatus + '">' + fmtSnake(deptStatus) + '</span></div>';
            if (dept.completion_notes) h += '<div class="dept-detail"><strong>Notes:</strong> ' + esc(dept.completion_notes) + '</div>';
            if (dept.form_type) h += '<div class="dept-detail"><strong>Form:</strong> ' + fmtSnake(dept.form_type) + '</div>';
            if (dept.completed_by_name) h += '<div class="dept-detail"><strong>Completed by:</strong> ' + esc(dept.completed_by_name) + ' at ' + fmtDate(dept.completed_at) + '</div>';
            if (dept.signoff_by_name) h += '<div class="dept-sig">&#9989; Signed off by ' + esc(dept.signoff_by_name) + ' at ' + fmtDate(dept.signoff_at) + '</div>';
            if (dept.signature_stamp) h += '<div class="dept-sig">&#9997;&#65039; ' + esc(dept.signature_stamp) + '</div>';
            if (dept.started_by_name) h += '<div class="dept-detail" style="font-size:11px;color:var(--text3)">Started by ' + esc(dept.started_by_name) + ' at ' + fmtDate(dept.started_at) + '</div>';
            h += '</div>';
          }
        }

        var postHolds = holdLogs.filter(function(hl) { return hl.post_id === post.id; });
        if (postHolds.length > 0) {
          h += '<h4 style="font-size:14px;font-weight:600;color:var(--text);margin:12px 0 8px">&#128721; Production Hold Log (' + postHolds.length + ' entries)</h4>';
          h += '<div class="timeline">';
          for (var hl = 0; hl < postHolds.length; hl++) {
            var hold = postHolds[hl];
            var dotColor = hold.action === 'hold_initiated' ? 'red' : hold.action === 'hold_cleared' ? 'green' : 'blue';
            h += '<div class="tl-item"><div class="tl-dot ' + dotColor + '"></div><div class="tl-card">';
            h += '<div class="tl-card-head"><span class="tl-card-title">' + fmtSnake(hold.action || 'Action') + '</span><span class="tl-card-time">' + fmtDate(hold.created_at) + '</span></div>';
            h += '<div class="tl-card-body">';
            h += '<div class="tl-card-field"><span class="tl-field-label">By</span><span class="tl-field-value">' + esc(hold.action_by_name || 'N/A') + '</span></div>';
            h += '<div class="tl-card-field"><span class="tl-field-label">Department</span><span class="tl-field-value">' + esc(hold.department_name || hold.department_code || 'N/A') + '</span></div>';
            if (hold.reason) h += '<div class="tl-card-field"><span class="tl-field-label">Reason</span><span class="tl-field-value">' + esc(hold.reason) + '</span></div>';
            if (hold.production_line) h += '<div class="tl-card-field"><span class="tl-field-label">Line</span><span class="tl-field-value">' + esc(hold.production_line) + '</span></div>';
            if (hold.signature_stamp) h += '<div class="tl-card-field"><span class="tl-field-label">Signature</span><span class="tl-field-value" style="color:#059669">&#9989; ' + esc(hold.signature_stamp) + '</span></div>';
            h += '</div></div></div>';
          }
          h += '</div>';
        }
        h += '</div>';
      }
    } else {
      h += '<div style="color:var(--text3);font-size:13px;margin-bottom:16px">No linked Task Feed posts found for this NCR.</div>';
    }

    var holdTagResp = await sb.from('hold_tags').select('*').eq('ncr_id', ncr.id);
    var holdTags = holdTagResp.data || [];
    if (holdTags.length > 0) {
      h += '<h3 style="font-size:15px;font-weight:700;color:var(--text);margin:16px 0 12px">&#127991;&#65039; Hold Tags (' + holdTags.length + ')</h3>';
      for (var t = 0; t < holdTags.length; t++) {
        var tag = holdTags[t];
        h += '<div class="hold-tag-card">';
        h += '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-weight:700;color:var(--text)">' + esc(tag.hold_tag_number || 'Tag') + '</span>';
        h += '<span class="badge badge-' + (tag.status === 'released' ? 'closed' : tag.status === 'on_hold' ? 'open' : 'containment') + '">' + fmtSnake(tag.status) + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Product</span><span class="tl-field-value">' + esc(tag.product_name || 'N/A') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Lot</span><span class="tl-field-value">' + esc(tag.lot_number || 'N/A') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Quantity</span><span class="tl-field-value">' + (tag.quantity || 'N/A') + ' ' + esc(tag.unit_of_measure || '') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Location</span><span class="tl-field-value">' + esc(tag.location || 'N/A') + '</span></div>';
        h += '<div class="tl-card-field"><span class="tl-field-label">Held By</span><span class="tl-field-value">' + esc(tag.held_by || 'N/A') + ' at ' + fmtDate(tag.hold_date) + '</span></div>';
        if (tag.disposition) h += '<div class="tl-card-field"><span class="tl-field-label">Disposition</span><span class="tl-field-value">' + fmtSnake(tag.disposition) + (tag.disposition_reason ? ' \\u2014 ' + esc(tag.disposition_reason) : '') + '</span></div>';
        h += '</div>';
      }
    }

    if (postIds.length === 0 && holdTags.length === 0) {
      h = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">No connected records found. This NCR may have been created independently.</div>';
    }

  } catch(e) {
    console.error('Connected records error:', e);
    h = '<div style="color:var(--danger);font-size:13px">Error loading connected records: ' + esc(e.message || 'Unknown error') + '</div>';
  }

  container.innerHTML = h;
}

// ══════════════════════════════════════════════
// DOCUMENT CONTROL DASHBOARD
// ══════════════════════════════════════════════
async function renderDocumentDashboard(body) {
  body.innerHTML = '<div style="text-align:center;padding:60px"><span class="spinner"></span></div>';

  var sdsResp = await sb.from('sds_records').select('id, status, contains_allergens, primary_department, sds_master_number, signal_word').eq('organization_id', session.organization_id);
  var sdsData = sdsResp.data || [];
  var sdsActive = sdsData.filter(function(r) { return r.status === 'active'; }).length;
  var sdsExpired = sdsData.filter(function(r) { return r.status === 'expired'; }).length;
  var sdsAllergen = sdsData.filter(function(r) { return r.contains_allergens === true; }).length;
  var sdsDanger = sdsData.filter(function(r) { return r.signal_word && r.signal_word.toLowerCase() === 'danger'; }).length;

  var deptCounts = {};
  for (var i = 0; i < sdsData.length; i++) {
    var dept = sdsData[i].primary_department || 'Unassigned';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }

  var totalDocs = sdsData.length;
  document.getElementById('mainCount').textContent = 'SQF 2.2.1 \\u2022 ' + totalDocs + ' total documents';

  var h = '';
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';
  h += statCard(totalDocs, 'Total Docs', '#4A90A4');
  h += statCard(sdsData.length, 'SDS Sheets', '#10B981');
  h += statCard(0, 'SOPs', '#6B7280');
  h += statCard(0, 'Certifications', '#6B7280');
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">';
  h += statCard(sdsActive, 'Active', '#10B981');
  h += statCard(sdsExpired, 'Expired', '#EF4444');
  h += statCard(sdsAllergen, 'Allergen', '#DC2626');
  h += statCard(sdsDanger, 'Danger', '#F59E0B');
  h += '</div>';

  // Document Categories
  h += '<div style="border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px">';
  h += '<div style="padding:12px 16px;background:rgba(74,144,164,0.1);font-weight:700;font-size:13px;color:#4A90A4;border-bottom:1px solid var(--border)">Document Categories</div>';

  var categories = [
    {name:'SDS Sheets',count:sdsData.length,icon:'&#129514;',color:'#10B981',desc:'Safety Data Sheets — chemical registry, allergens, hazard info',nav:'sds_records'},
    {name:'SOPs',count:0,icon:'&#128203;',color:'#3B82F6',desc:'Standard Operating Procedures'},
    {name:'OPLs',count:0,icon:'&#128218;',color:'#8B5CF6',desc:'One Point Lessons — visual training aids'},
    {name:'Policies',count:0,icon:'&#128220;',color:'#F59E0B',desc:'Company policies and guidelines'},
    {name:'Work Instructions',count:0,icon:'&#128295;',color:'#06B6D4',desc:'Step-by-step task procedures'},
    {name:'Specifications',count:0,icon:'&#128200;',color:'#EC4899',desc:'Product and material specifications'},
    {name:'Certifications',count:0,icon:'&#127942;',color:'#10B981',desc:'Facility and personnel certifications'},
  ];

  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var countColor = cat.count > 0 ? cat.color : 'var(--text3)';
    var clickAttr = cat.nav ? ' data-nav="' + cat.nav + '"' : '';
    h += '<div' + clickAttr + ' style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);' + (cat.nav ? 'cursor:pointer' : '') + '">';
    h += '<span style="font-size:20px;margin-right:12px;width:28px;text-align:center">' + cat.icon + '</span>';
    h += '<div style="flex:1">';
    h += '<div style="font-weight:600;font-size:14px;color:var(--text1)">' + cat.name + '</div>';
    h += '<div style="font-size:11px;color:var(--text3);margin-top:1px">' + cat.desc + '</div>';
    h += '</div>';
    h += '<span style="font-weight:700;font-size:18px;color:' + countColor + ';margin-right:8px">' + cat.count + '</span>';
    if (cat.nav) h += '<span style="color:var(--text3);font-size:12px">&#9654;</span>';
    h += '</div>';
  }
  h += '</div>';

  // SDS by Department
  var deptKeys = Object.keys(deptCounts).sort();
  if (deptKeys.length > 0) {
    h += '<div style="border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px">';
    h += '<div style="padding:12px 16px;background:rgba(139,92,246,0.1);font-weight:700;font-size:13px;color:#8B5CF6;border-bottom:1px solid var(--border)">SDS by Department</div>';
    for (var di = 0; di < deptKeys.length; di++) {
      var dk = deptKeys[di];
      var dc = deptCounts[dk];
      var pct = Math.round((dc / sdsData.length) * 100);
      h += '<div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);gap:12px">';
      h += '<div style="flex:1;font-size:13px;font-weight:600;color:var(--text1);text-transform:capitalize">' + esc(dk) + '</div>';
      h += '<div style="width:120px;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:#8B5CF6;border-radius:3px"></div></div>';
      h += '<span style="font-weight:700;font-size:14px;color:var(--text1);min-width:28px;text-align:right">' + dc + '</span>';
      h += '</div>';
    }
    h += '</div>';
  }

  h += '<div style="border-radius:12px;border:1px solid var(--border);padding:16px;background:rgba(16,185,129,0.05)">';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:16px">&#9989;</span><span style="font-weight:700;font-size:13px;color:#10B981">SQF 2.2.1 \\u2014 Document Control</span></div>';
  h += '<div style="font-size:12px;color:var(--text2);line-height:1.5">All documents are centrally managed with version control, access tracking, and department-level organization. SDS documents include QR codes for instant access and are linked to allergen and hazard classification systems.</div>';
  h += '</div>';

  body.innerHTML = h;

  body.addEventListener('click', function(e) {
    var el = e.target.closest('[data-nav]');
    if (el) {
      var navKey = el.getAttribute('data-nav');
      var navEl = document.querySelector('[data-key="' + navKey + '"]');
      if (navEl) { navEl.closest('.nav-group').classList.add('open'); navEl.click(); }
    }
  });
}

function statCard(num, label, color) {
  return '<div style="border-radius:10px;border:1px solid var(--border);padding:16px;text-align:center;background:' + color + '0A">'
    + '<div style="font-size:28px;font-weight:800;color:' + color + '">' + num + '</div>'
    + '<div style="font-size:11px;font-weight:600;color:var(--text3);margin-top:2px">' + label + '</div>'
    + '</div>';
}

// ══════════════════════════════════════════════
// SDS BINDER REFERENCE
// ══════════════════════════════════════════════
function buildSdsBinderRef(department, masterNumber) {
  if (!masterNumber && masterNumber !== 0) return null;
  var deptMap = {'maintenance':'MAINT','production':'PROD','sanitation':'SAN','quality':'QUAL','safety':'SAFETY','warehouse':'WH','shipping':'SHIP','receiving':'REC'};
  var dept = department ? department.toLowerCase().trim() : '';
  var prefix = deptMap[dept] || (department ? department.toUpperCase().substring(0, 5) : 'SDS');
  return prefix + ' SDS #' + masterNumber;
}

// ══════════════════════════════════════════════
// SDS DOCUMENT LIST
// ══════════════════════════════════════════════
function renderSDSList(data) {
  var body = document.getElementById('mainBody');
  var h = '<input type="text" class="search-bar" placeholder="Search SDS documents..."/>';

  for (var i = 0; i < data.length; i++) {
    var rec = data[i];
    var name = rec.product_name || rec.sds_number || 'Untitled SDS';
    var mfg = rec.manufacturer || '';
    var status = rec.status || 'active';
    var statusColor = status === 'active' ? '#10B981' : status === 'expired' ? '#EF4444' : '#F59E0B';
    var hasAllergens = rec.contains_allergens === true;
    var signalWord = rec.signal_word && rec.signal_word !== 'none' && rec.signal_word !== 'N/A' ? rec.signal_word : '';
    var revDate = rec.revision_date ? new Date(rec.revision_date).toLocaleDateString() : '';

    var searchData = (name + ' ' + mfg + ' ' + (rec.cas_number || '') + ' ' + (rec.allergens || '') + ' ' + (rec.sds_number || '') + ' ' + (rec.primary_department || '') + ' ' + (buildSdsBinderRef(rec.primary_department, rec.sds_master_number) || '')).toLowerCase();

    h += '<div class="record-card" data-search="' + esc(searchData) + '">';
    h += '<div class="record-head" style="padding:14px 16px">';
    h += '<div style="flex:1">';
    var binderRef = buildSdsBinderRef(rec.primary_department, rec.sds_master_number);
    if (binderRef) h += '<div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:0.3px;margin-bottom:2px">' + esc(binderRef) + '</div>';
    h += '<h4 style="margin:0;font-size:15px">' + esc(name) + '</h4>';
    var subParts = [];
    if (rec.primary_department) subParts.push(rec.primary_department);
    if (rec.approved_by) subParts.push('Approved by: ' + rec.approved_by);
    if (subParts.length) h += '<div style="font-size:12px;color:var(--text3);margin-top:2px">' + esc(subParts.join(' \\u00B7 ')) + '</div>';
    h += '</div>';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    if (hasAllergens) h += '<span style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">ALLERGEN</span>';
    if (signalWord) h += '<span style="background:' + (signalWord.toLowerCase() === 'danger' ? '#FEE2E2' : '#FEF3C7') + ';color:' + (signalWord.toLowerCase() === 'danger' ? '#DC2626' : '#D97706') + ';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">' + esc(signalWord.toUpperCase()) + '</span>';
    h += '<span style="background:' + statusColor + '22;color:' + statusColor + ';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">' + esc(status.charAt(0).toUpperCase() + status.slice(1)) + '</span>';
    if (revDate) h += '<span class="rh-date">' + revDate + '</span>';
    h += '</div>';
    h += '<span class="rh-arrow">&#9654;</span></div>';
    h += '<div class="record-body" style="padding:0">' + renderSDSDetail(rec) + '</div>';
    h += '</div>';
  }

  body.innerHTML = h;
}

function renderSDSDetail(rec) {
  var h = '';
  var v = function(val) { return (val !== null && val !== undefined && val !== '' && val !== 'N/A') ? esc(String(val)) : null; };

  if (rec.file_url) {
    var pdfName = rec.file_url.split('/').pop() || 'SDS Document';
    var sdsLabel = buildSdsBinderRef(rec.primary_department, rec.sds_master_number) || rec.sds_number || 'SDS Document';
    h += '<div style="padding:14px 16px;border-bottom:2px solid var(--border);display:flex;align-items:center;gap:14px;background:rgba(59,130,246,0.06)">';
    h += '<img src="https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=' + encodeURIComponent(rec.file_url) + '" alt="QR" style="width:64px;height:64px;border-radius:6px;border:1px solid var(--border)" />';
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="font-weight:700;font-size:14px;color:var(--text1)">' + esc(sdsLabel) + '</div>';
    h += '<div style="font-size:11px;color:var(--text3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(decodeURIComponent(pdfName)) + '</div>';
    h += '</div>';
    h += '<a href="' + esc(rec.file_url) + '" target="_blank" rel="noopener" style="background:var(--accent);color:#fff;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap">View PDF</a>';
    h += '</div>';
  }

  h += '<div style="display:grid;grid-template-columns:1fr 1fr">';
  h += sdsCell('Product Name', rec.product_name);
  h += sdsCell('Binder Ref', buildSdsBinderRef(rec.primary_department, rec.sds_master_number));
  h += sdsCell('Vendor Revision', rec.sds_number);
  h += sdsCell('Manufacturer', rec.manufacturer);
  h += sdsCell('CAS Number', rec.cas_number);
  h += sdsCell('Department', rec.primary_department);
  h += sdsCell('Revision Date', rec.revision_date ? new Date(rec.revision_date).toLocaleDateString() : null);
  h += sdsCell('Expiration Date', rec.expiration_date ? new Date(rec.expiration_date).toLocaleDateString() : null);
  h += sdsCell('Status', rec.status);
  h += '</div>';

  // Hazard info
  var signalWord = rec.signal_word && rec.signal_word !== 'none' && rec.signal_word !== 'N/A' ? rec.signal_word : '';
  if (v(rec.ghs_classification) || v(rec.hazard_categories) || signalWord) {
    h += '<div style="padding:8px 12px;background:rgba(245,158,11,0.08);font-weight:700;font-size:12px;color:#F59E0B;letter-spacing:0.3px;border-bottom:1px solid var(--border)">HAZARD CLASSIFICATION</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr">';
    h += sdsCell('GHS Classification', rec.ghs_classification);
    h += sdsCell('Hazard Categories', rec.hazard_categories);
    h += sdsCell('Hazard Statements', rec.hazard_statements);
    h += sdsCell('Precautionary Statements', rec.precautionary_statements);
    h += '</div>';
    if (signalWord) {
      var swColor = signalWord.toLowerCase() === 'danger' ? '#DC2626' : '#D97706';
      h += '<div style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">';
      h += '<span style="font-weight:600;font-size:12px;color:var(--text2)">Signal Word:</span>';
      h += '<span style="font-weight:800;font-size:14px;color:' + swColor + ';letter-spacing:0.5px">' + esc(signalWord.toUpperCase()) + '</span>';
      h += '</div>';
    }
  }

  // Allergen section
  if (rec.contains_allergens === true || v(rec.allergens) || rec.allergen_isolation_required === true) {
    h += '<div style="padding:8px 12px;background:rgba(220,38,38,0.12);font-weight:700;font-size:12px;color:#DC2626;letter-spacing:0.3px;border-bottom:1px solid var(--border)">&#9888;&#65039; ALLERGEN INFORMATION</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr">';
    h += sdsCell('Contains Allergens', rec.contains_allergens ? 'Yes' : 'No', rec.contains_allergens ? '#DC2626' : null);
    h += sdsCell('Allergens', rec.allergens);
    h += sdsCell('Allergen Notes', rec.allergen_notes);
    h += sdsCell('Isolation Required', rec.allergen_isolation_required === true ? 'Yes' : rec.allergen_isolation_required === false ? 'No' : null, rec.allergen_isolation_required ? '#DC2626' : null);
    if (v(rec.allergen_isolation_notes)) h += sdsCell('Isolation Notes', rec.allergen_isolation_notes);
    h += '</div>';
  }

  // Storage & Handling
  var hasStorage = v(rec.storage_location) || v(rec.approved_storage_areas) || v(rec.restricted_areas) || v(rec.storage_requirements) || v(rec.handling_precautions);
  if (hasStorage) {
    h += '<div style="padding:8px 12px;background:rgba(139,92,246,0.08);font-weight:700;font-size:12px;color:#8B5CF6;letter-spacing:0.3px;border-bottom:1px solid var(--border)">STORAGE &amp; HANDLING</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr">';
    h += sdsCell('Storage Location', rec.storage_location);
    h += sdsCell('Approved Areas', rec.approved_storage_areas);
    h += sdsCell('Restricted Areas', rec.restricted_areas);
    if (v(rec.storage_requirements)) h += sdsCell('Storage Req.', rec.storage_requirements);
    if (v(rec.handling_precautions)) h += sdsCell('Handling', rec.handling_precautions);
    h += '</div>';
  }

  // PPE
  var ppeStr = '';
  if (rec.ppe_requirements && typeof rec.ppe_requirements === 'object') {
    var ppeKeys = Object.keys(rec.ppe_requirements);
    for (var pi = 0; pi < ppeKeys.length; pi++) { if (rec.ppe_requirements[ppeKeys[pi]]) { if (ppeStr) ppeStr += ', '; ppeStr += ppeKeys[pi].replace(/_/g,' ').replace(/\\b\\w/g, function(c){return c.toUpperCase();}); } }
  }
  if (ppeStr) {
    h += '<div style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;align-items:baseline;gap:8px">';
    h += '<span style="font-weight:600;font-size:12px;color:var(--text2);white-space:nowrap">PPE Required:</span>';
    h += '<span style="font-size:13px;color:var(--text1)">' + esc(ppeStr) + '</span>';
    h += '</div>';
  }

  // Notes
  if (v(rec.notes)) {
    h += '<div style="padding:10px 16px;border-bottom:1px solid var(--border);background:rgba(245,158,11,0.05)">';
    h += '<div style="font-weight:600;font-size:11px;color:var(--text3);margin-bottom:4px">NOTES</div>';
    h += '<div style="font-size:13px;color:var(--text1);line-height:1.4">' + esc(rec.notes) + '</div>';
    h += '</div>';
  }

  // Admin footer
  h += '<div style="padding:8px 16px;display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--text3)">';
  if (rec.approved_for_use === true) h += '<span>&#10003; Approved for Use</span>';
  if (rec.approved_by) h += '<span>Approved by: ' + esc(rec.approved_by) + '</span>';
  if (rec.reviewed_by) h += '<span>Reviewed by: ' + esc(rec.reviewed_by) + '</span>';
  if (rec.last_reviewed_date) h += '<span>Last Review: ' + new Date(rec.last_reviewed_date).toLocaleDateString() + '</span>';
  if (rec.next_review_date) h += '<span>Next Review: ' + new Date(rec.next_review_date).toLocaleDateString() + '</span>';
  if (rec.version) h += '<span>v' + esc(rec.version) + '</span>';
  h += '</div>';

  return h;
}

function sdsCell(label, val, highlight) {
  var display = (val !== null && val !== undefined && val !== '' && val !== 'N/A') ? esc(String(val)) : null;
  if (!display) return '';
  var style = highlight ? 'font-weight:700;color:' + highlight : 'color:var(--text1)';
  return '<div style="padding:6px 12px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)">'
    + '<div style="font-size:10px;font-weight:600;color:var(--text3);margin-bottom:1px">' + label + '</div>'
    + '<div style="font-size:13px;' + style + '">' + display + '</div>'
    + '</div>';
}

// ══════════════════════════════════════════════
// GENERIC FIELD RENDERER
// ══════════════════════════════════════════════
function renderFields(rec) {
  var h = '';
  var keys = Object.keys(rec);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = rec[k];
    if (HIDDEN_FIELDS.indexOf(k) >= 0) continue;
    var label = formatLabel(k);
    if (v === null || v === undefined || v === '') {
      h += '<div class="record-field"><div class="rf-label">' + esc(label) + '</div><div class="rf-value" style="color:var(--text3)">N/A</div></div>';
      continue;
    }
    var val = '';
    if (typeof v === 'boolean') val = v ? 'Yes' : 'No';
    else if (Array.isArray(v)) val = v.length > 0 ? v.join(', ') : '<span style="color:var(--text3)">N/A</span>';
    else if (typeof v === 'object') val = '<pre style="font-size:11px;white-space:pre-wrap;color:var(--text2)">' + esc(JSON.stringify(v, null, 2)) + '</pre>';
    else if (k.indexOf('date') >= 0 || k.indexOf('_at') >= 0) { try { val = new Date(v).toLocaleString(); } catch(e) { val = esc(String(v)); } }
    else { var sv = String(v); if (sv.indexOf('_') >= 0 && sv === sv.toLowerCase()) val = fmtSnake(sv); else val = esc(sv); }
    h += '<div class="record-field"><div class="rf-label">' + esc(label) + '</div><div class="rf-value">' + val + '</div></div>';
  }
  return h || '<div style="padding:12px;color:var(--text3)">No data</div>';
}

function formatLabel(k) {
  var map = {ncr_number:'NCR Number',ncr_type:'NCR Type',capa_required:'CAPA Required',sds_number:'SDS Number',wo_number:'Work Order Number',pm_frequency:'PM Frequency',created_at:'Created',updated_at:'Last Updated',closed_date:'Closed Date',closed_by:'Closed By',discovered_by:'Discovered By',discovered_date:'Discovered Date',product_name:'Product Name',lot_number:'Lot Number',customer_notified:'Customer Notified',containment_actions:'Containment Actions',originator_pin_verified:'E-Signature Verified',originator_name:'Originator Name',originator_signature_stamp:'Signature Stamp',originator_signed_at:'Signed At',originator_department_code:'Originator Department',originator_initials:'Originator Initials',originator_employee_id:'Originator Employee ID'};
  if (map[k]) return map[k];
  return k.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
}

// ══════════════════════════════════════════════
// SECURITY CONTROLS
// ══════════════════════════════════════════════
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
  for (var i = 0; i < sections.length; i++) { h += '<div class="security-section"><h3>' + sections[i].icon + ' ' + sections[i].title + '</h3><p>' + sections[i].text + '</p></div>'; }
  document.getElementById('mainBody').innerHTML = h;
}

// ── Exit ──
function exitPortal() {
  session = null; currentNCRData = null;
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
