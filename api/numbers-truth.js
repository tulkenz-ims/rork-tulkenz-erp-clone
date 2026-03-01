// api/numbers-truth.js
// Vercel Serverless Function — TulKenz OPS "The Numbers Truth" ROI Calculator
// Public-facing — no authentication required
// URL: /api/numbers-truth

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(getHTML());
};

function getHTML() {
  var html = [];
  html.push('<!DOCTYPE html>');
  html.push('<html lang="en"><head>');
  html.push('<meta charset="utf-8"/>');
  html.push('<meta name="viewport" content="width=device-width,initial-scale=1"/>');
  html.push('<title>TulKenz OPS — The Numbers Truth</title>');
  html.push('<meta name="description" content="Interactive ROI calculator for food manufacturing operations. See the real cost of paper-based operations and software fragmentation."/>');
  html.push('<link rel="preconnect" href="https://fonts.googleapis.com"/>');
  html.push('<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>');
  html.push('<style>');
  html.push(getCSS());
  html.push('</style></head><body>');
  html.push('<div id="app"></div>');
  html.push('<scr' + 'ipt>');
  html.push(getJS());
  html.push('</scr' + 'ipt>');
  html.push('</body></html>');
  return html.join('\n');
}

function getCSS() {
  return [
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{min-height:100vh;background:#0a0a14;color:#fff;font-family:"Outfit",sans-serif}',
    '@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}',
    '@keyframes pulseGlow{0%,100%{box-shadow:0 0 20px rgba(232,197,71,0.1)}50%{box-shadow:0 0 40px rgba(232,197,71,0.25)}}',
    'input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}',
    'input[type=number]{-moz-appearance:textfield}',
    '::-webkit-scrollbar{width:6px}',
    '::-webkit-scrollbar-track{background:#0a0a14}',
    '::-webkit-scrollbar-thumb{background:rgba(232,197,71,0.2);border-radius:3px}',
    '.ni{width:100%;padding:9px 10px;background:#0a0a14;border:1px solid rgba(232,197,71,0.25);border-radius:6px;color:#fff;font-size:16px;font-family:"JetBrains Mono",monospace;outline:none;box-sizing:border-box}',
    '.ni:focus{border-color:rgba(232,197,71,0.5)}',
    '.ni-sm{font-size:13px;padding:6px 8px}',
    '.ni-dollar{padding-left:24px}',
    '.ni-dollar-sm{padding-left:22px}',
    '.lb{display:block;color:#777799;font-size:10px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}',
    '.topbar{background:rgba(10,10,20,0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(232,197,71,0.15);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:1000}',
    '.dashboard{background:rgba(15,15,26,0.98);border-bottom:2px solid #e8c547;padding:12px 16px;position:sticky;top:56px;z-index:999}',
    '.dash-inner{max-width:960px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}',
    '.cat-card{background:#0f0f1a;border:1px solid rgba(232,197,71,0.12);border-radius:12px;padding:14px 16px;cursor:pointer;transition:all 0.25s}',
    '.cat-card.active{background:#1a1a2e;border-color:#e8c547;box-shadow:0 0 24px rgba(232,197,71,0.08)}',
    '.cat-detail{margin-top:12px;display:none}',
    '.cat-card.active .cat-detail{display:block}',
    '.comp-card{background:#0f0f1a;border:1px solid rgba(255,136,68,0.12);border-radius:10px;padding:12px 14px}',
    '.comp-list{display:none;flex-direction:column;gap:6px;margin-bottom:16px}',
    '.comp-list.show{display:flex}',
    '.feat-box{background:#0f0f1a;border-radius:12px;padding:16px}',
    '.yr-btn{flex:1;padding:10px 4px;border-radius:6px;border:1px solid rgba(78,205,196,0.15);background:transparent;color:#666688;font-size:14px;font-weight:700;cursor:pointer;font-family:"JetBrains Mono",monospace}',
    '.yr-btn.active{border:2px solid #4ecdc4;background:rgba(78,205,196,0.12);color:#4ecdc4}',
    '.mode-btn{flex:1;padding:12px;border-radius:8px;border:1px solid rgba(78,205,196,0.15);background:transparent;color:#666688;font-size:14px;font-weight:700;cursor:pointer;font-family:"Outfit",sans-serif;transition:all 0.2s}',
    '.mode-btn.active{border:2px solid #4ecdc4;background:rgba(78,205,196,0.12);color:#4ecdc4}',
    '.src-btn{padding:10px 28px;background:transparent;border:1px solid rgba(232,197,71,0.3);border-radius:8px;color:#e8c547;font-size:13px;font-weight:600;cursor:pointer;font-family:"Outfit",sans-serif;transition:all 0.2s}',
    '.src-btn:hover{background:rgba(232,197,71,0.08)}',
    '@media(max-width:640px){.dash-inner{gap:4px}.topbar{padding:0 12px}}',
  ].join('\n');
}

function getJS() {
  return `
// ═══════════════════════════ DATA ═══════════════════════════════
var CATS = [
  {id:"formCreation",title:"Paper Form Completion",sub:"Time employees spend filling out paper forms across all departments",icon:"📋",stat:"Workers spend 3.2 hrs/week just searching for information; 9 of 10 first searches fail (Slite, 2025)",fields:[{key:"employees",label:"Employees filling out forms",dflt:30},{key:"minPerDay",label:"Avg minutes/day per person",dflt:20},{key:"rate",label:"Avg hourly rate ($)",dflt:16,dollar:true}],calc:function(d){return{wh:(d.employees*d.minPerDay*5)/60,rate:d.rate}}},
  {id:"reviewLayers",title:"Multi-Layer Review Process",sub:"Each document passes through 2-3 reviewers before final approval",icon:"🔍",stat:"Employees spend 60% of their day on 'work about work' (Asana, 10,000+ workers surveyed)",fields:[{key:"reviewers",label:"People involved in reviews",dflt:4},{key:"hrsPerWeek",label:"Avg hrs/week each on reviews",dflt:12},{key:"rate",label:"Avg hourly rate ($)",dflt:30,dollar:true}],calc:function(d){return{wh:d.reviewers*d.hrsPerWeek,rate:d.rate}}},
  {id:"dataTransfer",title:"Paper → Spreadsheet Double Entry",sub:"Retyping paper form data into Excel for tracking and reporting",icon:"📊",stat:"Without verification, error rates reach 4% — that's 4 errors per 100 entries (DocuClipper, 2025)",fields:[{key:"people",label:"People doing data re-entry",dflt:3},{key:"hrsPerWeek",label:"Hrs/week each on re-entry",dflt:12},{key:"rate",label:"Avg hourly rate ($)",dflt:20,dollar:true}],calc:function(d){return{wh:d.people*d.hrsPerWeek,rate:d.rate}}},
  {id:"dataErrors",title:"Data Transfer Errors & Corrections",sub:"Catching, investigating, and correcting manual transcription mistakes",icon:"⚠️",stat:"Two-phase paper-to-system entry: ~40% of records contain at least one error (Beamex, 2025)",fields:[{key:"errorsPerWeek",label:"Errors caught/week",dflt:8},{key:"minToFix",label:"Min to investigate & fix each",dflt:30},{key:"rate",label:"Avg cost/hr involved",dflt:28,dollar:true}],calc:function(d){return{wh:(d.errorsPerWeek*d.minToFix)/60,rate:d.rate}}},
  {id:"kickbacks",title:"Incomplete Form Kickbacks",sub:"Documents returned for missing fields, signatures, or corrections",icon:"🔄",stat:"Cost of poor quality: 15-20% of sales revenue in manufacturing (ASQ / ASME)",fields:[{key:"formsPerWeek",label:"Forms kicked back/week",dflt:15},{key:"minPerForm",label:"Min to track down & fix",dflt:20},{key:"rate",label:"Avg cost/hr involved",dflt:22,dollar:true}],calc:function(d){return{wh:(d.formsPerWeek*d.minPerForm)/60,rate:d.rate}}},
  {id:"crossDept",title:"Cross-Department Coordination",sub:"Supervisors & managers chasing information between siloed departments",icon:"📡",stat:"88% of the workweek spent communicating — much of it searching, chasing, re-explaining (Grammarly / Harris Poll, 2024)",fields:[{key:"people",label:"Supervisors / managers affected",dflt:5},{key:"hrsPerWeek",label:"Hrs/week each chasing info",dflt:8},{key:"rate",label:"Avg hourly rate ($)",dflt:28,dollar:true}],calc:function(d){return{wh:d.people*d.hrsPerWeek,rate:d.rate}}},
  {id:"filing",title:"Document Filing, Storage & Retrieval",sub:"Organizing binders, searching for records, preparing for audits",icon:"🗄️",stat:"59 minutes/day lost searching for information across apps (Qatalog / Cornell, 2024)",fields:[{key:"hrsPerWeek",label:"Total hrs/week across staff",dflt:15},{key:"rate",label:"Avg hourly rate ($)",dflt:20,dollar:true}],calc:function(d){return{wh:d.hrsPerWeek,rate:d.rate}}},
  {id:"auditPrep",title:"Audit Preparation",sub:"Gathering records, organizing documentation, pre-audit scramble",icon:"📚",stat:"BRCGS/SQF: 6-12 months initial prep; annual re-audits need weeks of document gathering (BRCGS.com)",fields:[{key:"auditsPerYear",label:"Major audits/year",dflt:3},{key:"prepDays",label:"Days prep per audit",dflt:8},{key:"people",label:"People involved",dflt:3},{key:"rate",label:"Avg hourly rate ($)",dflt:28,dollar:true}],calc:function(d){return{wh:(d.auditsPerYear*d.prepDays*8*d.people)/52,rate:d.rate}}}
];

var COMPS = [
  {id:"cmms",name:"CMMS",ex:"Limble / UpKeep / MaintainX",setup:15000,mpu:135,users:5,covers:"Work orders, PMs, assets, parts tracking"},
  {id:"quality",name:"Quality Management",ex:"MasterControl / ETQ",setup:50000,mpu:500,users:8,covers:"NCRs, CAPAs, document control, holds"},
  {id:"safety",name:"Safety Management",ex:"SafetyCulture / iAuditor",setup:10000,mpu:49,users:10,covers:"Inspections, incidents, permits, LOTO"},
  {id:"compliance",name:"Compliance / Audit Mgmt",ex:"ETQ / Qualio / Intelex",setup:25000,mpu:100,users:8,covers:"SQF, FDA FSMA, audit tracking, CARs"},
  {id:"docs",name:"Document / SDS Management",ex:"Chemwatch / VelocityEHS",setup:8000,mpu:25,users:15,covers:"SDS library, SOPs, OPLs, QR access"},
  {id:"comms",name:"Ops Communication",ex:"GroupMe / Slack / Teams (ops use)",setup:0,mpu:12,users:30,covers:"Shift handoff, issue reporting, coordination"},
  {id:"inspect",name:"Inspection Management",ex:"SafetyCulture / MaintainX",setup:5000,mpu:24,users:10,covers:"Pre-op inspections, checklists, sign-offs"}
];

var SOURCES = [
  {cat:"Time Lost to Searching & 'Work About Work'",items:[
    {name:"Slite — Enterprise Search Survey Report (2025)",points:["Average worker spends 3.2 hours per week just searching for information — 166+ hours/year lost per employee","9 out of 10 first searches fail; 81% of people interrupt colleagues for help finding info","Organizations see a 45.5% hit to productivity from poor search","For a team of 50: 8,320 hours lost per year — equivalent to 4 full-time employees doing nothing"],url:"slite.com/en/learn/enterprise-search-survey-findings"},
    {name:"Asana — Anatomy of Work Index (10,000+ workers surveyed)",points:["Employees spend 60% of their day on 'work about work' — not the skilled job they were hired to do","Only 27% of time goes to actual skilled work; 13% to strategic planning","Employees use 10+ apps per day, switching ~25 times daily","U.S. workers miss over one-third of deadlines each week"],url:"asana.com/resources/work-isnt-working"}
  ]},
  {cat:"Communication Overload",items:[
    {name:"Grammarly / Harris Poll — State of Business Communication (2024)",points:["Knowledge workers spend 88% of their workweek communicating across channels","Workers spend nearly 19 hours/week on written communication alone","HR teams report 47 hours/week just on communication — more than a standard workweek","Miscommunication costs U.S. businesses an estimated $1.2 trillion per year"],url:"grammarly.com/business/learn/introducing-2024-state-of-business-communication"}
  ]},
  {cat:"App Switching & Context Loss",items:[
    {name:"Qatalog / Cornell University (2024)",points:["Employees spend 59 minutes per day searching for information across different apps","Takes an average of 9.5 minutes to regain productive focus after switching apps","6 out of 10 workers say it's difficult to keep track of information across apps"],url:"conclude.io/blog/context-switching-is-killing-your-productivity"}
  ]},
  {cat:"Manual Data Entry Error Rates",items:[
    {name:"DocuClipper — '67 Data Entry Statistics' (2025)",points:["Human data entry accuracy ranges from 96% to 99%","Without verification, error rates reach as high as 4%","Automation reduces manual data entry work by 80%","Automated systems: 99.96-99.99% accuracy vs. human 96-99%"],url:"docuclipper.com/blog/data-entry-statistics"},
    {name:"Beamex — 'Manual Data Entry Errors' (2025)",points:["Base error rate in manual data entry: approximately 1%","With two-phase entry (paper → system): ~40% of records contain at least one error","In a facility performing 10,000 annual records with double-entry, statistically 4,000 will have errors"],url:"blog.beamex.com/manual-data-entry-errors"}
  ]},
  {cat:"Cost of Poor Quality in Manufacturing",items:[
    {name:"ASQ — American Society for Quality",points:["Cost of poor quality in manufacturing: 15% to 20% of sales revenue on average","Range extends from 5% to 35% depending on product complexity","Organizations managing quality costs effectively see 9% increase in sales, 26% increase in profitability"],url:"asq.org/quality-resources/cost-of-quality"}
  ]},
  {cat:"Food Safety Audit Preparation",items:[
    {name:"BRCGS — Official Standard (Issue 9)",points:["First-time BRCGS certification: 6 to 12 months to prepare","Must maintain minimum 90 days of complete, consistent records before audit","BRCGS requires minimum 4 internal audits per year","34% of manufacturers fail due to poor preparation, not poor practices"],url:"brcgs.com/our-standards/food-safety/help-and-guidance"}
  ]}
];

// ═══════════════════════════ STATE ═══════════════════════════════
var catData = {};
CATS.forEach(function(c){var d={};c.fields.forEach(function(f){d[f.key]=f.dflt;});catData[c.id]=d;});

var compData = {};
COMPS.forEach(function(c){compData[c.id]={setup:c.setup,mpu:c.mpu,users:c.users};});

var terms = {mode:"term",setupFee:150000,years:2,monthlyAfter:3500,lifetimePrice:500000};
var activeCard = null;
var showComp = false;
var currentView = "calculator";

// ═══════════════════════════ CALCS ═══════════════════════════════
function calc(){
  var pH=0,pC=0;
  CATS.forEach(function(c){var r=c.calc(catData[c.id]);pH+=r.wh*52;pC+=r.wh*r.rate*52;});
  var pSaved=pC*0.80,pHrsSaved=pH*0.80,fte=(pHrsSaved/2080).toFixed(1);
  var cSetup=0,cMo=0;
  COMPS.forEach(function(c){var d=compData[c.id];cSetup+=d.setup;cMo+=d.mpu*d.users;});
  var cAnnual=cMo*12;
  var isLife=terms.mode==="lifetime";
  var yrs=isLife?10:terms.years;
  var tkCost=isLife?terms.lifetimePrice:terms.setupFee;
  var theirCost=cSetup+cAnnual*yrs+pC*yrs;
  var netPosition=theirCost-tkCost;
  var roiPercent=tkCost>0?Math.round((netPosition/tkCost)*100):0;
  var estErrors=Math.round(catData.formCreation.employees*5*52*0.04);
  return{pH:pH,pC:pC,pSaved:pSaved,pHrsSaved:pHrsSaved,fte:fte,cSetup:cSetup,cMo:cMo,cAnnual:cAnnual,isLife:isLife,yrs:yrs,tkCost:tkCost,theirCost:theirCost,netPosition:netPosition,roiPercent:roiPercent,estErrors:estErrors};
}

function fmt(n){return Math.round(n).toLocaleString();}

// ═══════════════════════════ ANIMATED NUMBERS ════════════════════
var anims={};
function animTo(el,target){
  var id=el.id;if(!id)return;
  if(anims[id])cancelAnimationFrame(anims[id]);
  var start=parseFloat(el.dataset.val)||0;
  var t0=performance.now();
  function tick(now){
    var p=Math.min((now-t0)/500,1);
    var e=1-Math.pow(1-p,3);
    var v=start+(target-start)*e;
    el.dataset.val=v;
    el.textContent=(el.dataset.prefix||"")+fmt(v)+(el.dataset.suffix||"");
    if(p<1)anims[id]=requestAnimationFrame(tick);
  }
  anims[id]=requestAnimationFrame(tick);
}

// ═══════════════════════════ RENDER ══════════════════════════════
function render(){
  if(currentView==="sources"){renderSources();return;}
  var c=calc();
  var app=document.getElementById("app");

  var h='';
  // TOP BAR
  h+='<div class="topbar"><div style="display:flex;align-items:center;gap:10px"><div style="width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;letter-spacing:0.5px">TKO</div><div><span style="font-size:15px;font-weight:700;line-height:1.1"><span style="color:#fff">Tul</span><span style="color:#a855f7">Kenz</span><span style="color:#fff"> OPS</span></span><div style="font-size:8px;color:#777799;letter-spacing:1.5px;text-transform:uppercase">The Numbers Truth</div></div></div><div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:#4ecdc4;animation:pulseGlow 2s infinite"></div><span style="font-size:11px;color:#4ecdc4;font-weight:600">LIVE — All numbers adjustable</span></div></div>';

  // STICKY DASHBOARD
  h+='<div class="dashboard"><div class="dash-inner">';
  h+='<div style="text-align:center;flex:1 1 auto"><div style="color:#ff6b6b;font-size:10px;font-weight:600;margin-bottom:2px">Paper Waste / Year</div><div id="d_pC" data-prefix="$" data-val="0" style="color:#ff6b6b;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">$0</div></div>';
  h+='<div style="color:rgba(232,197,71,0.3);font-size:16px">+</div>';
  h+='<div style="text-align:center;flex:1 1 auto"><div style="color:#ff8844;font-size:10px;font-weight:600;margin-bottom:2px">Software Stack / Year</div><div id="d_cA" data-prefix="$" data-val="0" style="color:#ff8844;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">$0</div></div>';
  h+='<div style="color:rgba(232,197,71,0.3);font-size:16px">vs</div>';
  h+='<div style="text-align:center;flex:1 1 auto"><div style="color:#4ecdc4;font-size:10px;font-weight:600;margin-bottom:2px">TulKenz Investment</div><div id="d_tk" data-prefix="$" data-val="0" style="color:#4ecdc4;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">$0</div></div>';
  h+='<div style="color:rgba(232,197,71,0.3);font-size:16px">=</div>';
  h+='<div style="text-align:center;flex:1 1 auto"><div id="d_roi" style="color:#e8c547;font-size:10px;font-weight:600;margin-bottom:2px">0% ROI</div><div id="d_net" data-prefix="$" data-val="0" style="color:#e8c547;font-size:20px;font-weight:800;font-family:JetBrains Mono,monospace">$0</div><div style="color:#7777aa;font-size:9px" id="d_yrlabel">2-year net position</div></div>';
  h+='</div></div>';

  h+='<div style="max-width:960px;margin:0 auto;padding:28px 16px 60px">';

  // ═══════ SECTION 1: PAPER ═══════
  h+=sectionHead("1","The Hidden Cost of Paper Operations","Industry-sourced estimates — adjust every number to match your facility","#ff6b6b");
  h+='<div style="background:linear-gradient(135deg,rgba(255,107,107,0.06),rgba(232,197,71,0.06));border:1px solid rgba(255,107,107,0.15);border-radius:12px;padding:14px;margin-bottom:16px">';
  h+='<div style="font-size:10px;font-weight:700;color:#ff6b6b;margin-bottom:10px;text-transform:uppercase;letter-spacing:1.5px;text-align:center">Typical Paper-Based Process Flow</div>';
  h+='<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;font-size:11px;margin-bottom:8px">';
  ["📋 Fill form","🔍 Review","📑 Approve","📊 Re-enter Excel","🗄️ File copy"].forEach(function(s,i){
    h+='<span style="display:flex;align-items:center;gap:4px"><span style="background:'+(i>=3?"rgba(255,107,107,0.10)":"#1a1a2e")+';padding:4px 7px;border-radius:4px;color:'+(i>=3?"#ff8888":"#ccc")+'">'+s+'</span>'+(i<4?'<span style="color:#e8c547;font-size:9px">→</span>':'')+'</span>';
  });
  h+='</div><div style="text-align:center"><span style="display:inline-block;background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.25);border-radius:5px;padding:4px 12px;font-size:11px;color:#4ecdc4">✨ Digital: Submit → auto-validated → auto-filed → instantly reportable</span></div></div>';

  // Category cards
  h+='<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">';
  CATS.forEach(function(cat){
    var d=catData[cat.id];var r=cat.calc(d);var ac=r.wh*r.rate*52;var ah=r.wh*52;
    var isAct=activeCard===cat.id;
    h+='<div class="cat-card'+(isAct?' active':'')+'" data-cat="'+cat.id+'">';
    h+='<div style="display:flex;justify-content:space-between;align-items:flex-start">';
    h+='<div style="flex:1;min-width:0"><div style="font-size:14px;margin-bottom:2px"><span style="margin-right:6px">'+cat.icon+'</span><span style="color:#e8c547;font-weight:700">'+cat.title+'</span></div><div style="color:#777799;font-size:11px">'+cat.sub+'</div></div>';
    h+='<div style="text-align:right;min-width:100px;flex-shrink:0"><div style="color:#ff6b6b;font-size:16px;font-weight:800;font-family:JetBrains Mono,monospace">$'+fmt(ac)+'</div><div style="color:#777799;font-size:10px">'+fmt(ah)+' hrs/yr</div></div>';
    h+='</div>';
    h+='<div class="cat-detail">';
    h+='<div style="background:rgba(232,197,71,0.06);border-radius:6px;padding:6px 10px;margin-bottom:12px;font-size:11px;color:#aaaa88;font-style:italic">'+cat.stat+'</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:10px">';
    cat.fields.forEach(function(f){
      h+='<div style="flex:1 1 90px;min-width:80px"><label class="lb">'+f.label+'</label>';
      h+='<div style="position:relative">';
      if(f.dollar)h+='<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#e8c547;font-family:JetBrains Mono,monospace;font-size:12px">$</span>';
      h+='<input type="number" class="ni ni-sm'+(f.dollar?' ni-dollar-sm':'')+'" value="'+d[f.key]+'" data-cat="'+cat.id+'" data-field="'+f.key+'" /></div></div>';
    });
    h+='</div></div></div>';
  });
  h+='</div>';

  // Paper summary
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
  h+=summaryBox(c.pC,"#ff6b6b","Annual Paper Cost",true);
  h+=summaryBox(c.pSaved,"#4ecdc4","80% Recoverable",true);
  h+='<div style="background:#e8c54711;border:1px solid #e8c54733;border-radius:10px;padding:14px 10px;text-align:center"><div style="color:#e8c547;font-size:22px;font-weight:800;font-family:JetBrains Mono,monospace">'+c.fte+'</div><div style="color:#e8c547;font-size:9px;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px">FTE Equivalent</div></div>';
  h+='</div></div>';

  // ═══════ SECTION 2: COMPETITOR STACK ═══════
  h+='<div style="margin-bottom:48px">';
  h+=sectionHead("2","What They'd Pay to Cobble It Together","Only counting systems TulKenz OPS directly replaces — not finance, HR, payroll, or production MES","#ff8844");
  // Duct tape quote
  h+='<div style="background:linear-gradient(135deg,rgba(78,205,196,0.08),rgba(168,85,247,0.06));border:1px solid rgba(78,205,196,0.3);border-radius:12px;padding:20px;margin-bottom:16px;text-align:center"><div style="font-size:17px;font-weight:700;color:#ccdddd;line-height:1.6;font-style:italic">"If you took all of these other software stacks and <span style="color:#4ecdc4;text-decoration:underline;text-decoration-style:wavy">duct-taped them together</span>, they still wouldn\\'t <span style="color:#3b82f6">flow</span>, <span style="color:#4ecdc4">report</span>, <span style="color:#a855f7">integrate</span>, or <span style="color:#3b82f6">stack</span> the way this does."</div><div style="font-size:11px;color:#666688;margin-top:8px">7 separate vendors. 7 logins. Zero integration. Zero Task Feed. Zero Auditor Portal. Zero room status. Zero line sensors.</div></div>';
  // Toggle
  h+='<button id="compToggle" style="width:100%;padding:10px;background:rgba(255,136,68,0.06);border:1px solid rgba(255,136,68,0.2);border-radius:8px;color:#ff8844;font-size:12px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;margin-bottom:12px;text-align:left">'+(showComp?'▼ Hide':'▶ Show')+' individual vendor costs — 7 separate systems (tap to adjust)</button>';
  h+='<div class="comp-list'+(showComp?' show':'')+'" id="compList">';
  COMPS.forEach(function(comp){
    var d=compData[comp.id];
    h+='<div class="comp-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><div style="font-size:13px;font-weight:600;color:#ff8844">'+comp.name+'</div><div style="font-size:10px;color:#666688">'+comp.ex+' — '+comp.covers+'</div></div><div style="color:#ff6b6b;font-size:14px;font-weight:700;font-family:JetBrains Mono,monospace">$'+fmt(d.mpu*d.users*12)+'/yr</div></div>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
    h+='<div style="flex:1 1 80px"><label class="lb">Setup</label><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#e8c547;font-family:JetBrains Mono,monospace;font-size:12px">$</span><input type="number" class="ni ni-sm ni-dollar-sm" value="'+d.setup+'" data-comp="'+comp.id+'" data-field="setup" /></div></div>';
    h+='<div style="flex:1 1 80px"><label class="lb">$/User/Mo</label><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#e8c547;font-family:JetBrains Mono,monospace;font-size:12px">$</span><input type="number" class="ni ni-sm ni-dollar-sm" value="'+d.mpu+'" data-comp="'+comp.id+'" data-field="mpu" /></div></div>';
    h+='<div style="flex:1 1 60px"><label class="lb">Users</label><input type="number" class="ni ni-sm" value="'+d.users+'" data-comp="'+comp.id+'" data-field="users" /></div>';
    h+='</div></div>';
  });
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">';
  h+=summaryBox(c.cSetup,"#ff8844","Total Setup (7 vendors)",true);
  h+='<div style="background:rgba(255,136,68,0.07);border:1px solid rgba(255,136,68,0.2);border-radius:10px;padding:14px 10px;text-align:center"><div id="s_cMo" data-prefix="$" data-val="0" style="color:#ff8844;font-size:20px;font-weight:800;font-family:JetBrains Mono,monospace">$0</div><div style="color:#ff8844;font-size:9px;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px">Monthly Software</div></div>';
  h+=summaryBox(c.cAnnual,"#ff8844","Annual Total",true);
  h+='</div></div>';

  // ═══════ SECTION 3: UNIQUE FEATURES ═══════
  h+='<div style="margin-bottom:48px">';
  h+=sectionHead("3","What No Competitor Has — At Any Price","These features don\\'t exist anywhere else. They\\'re built in. 100% customizable — built with you, built for you.","#a855f7");
  // Task Feed
  h+='<div style="background:linear-gradient(135deg,#0f1828 0%,#12121f 100%);border:1px solid rgba(59,130,246,0.4);border-radius:16px;padding:24px 20px;margin-bottom:12px;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3b82f6,#e8c547,#4ecdc4,#3b82f6);background-size:200% 100%;animation:shimmer 3s linear infinite"></div>';
  h+='<div style="font-size:10px;letter-spacing:3px;color:#3b82f6;text-transform:uppercase;font-weight:700;margin-bottom:8px">★ Flagship Feature — Nothing Like It Exists</div>';
  h+='<div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:8px;line-height:1.2">The Task Feed</div>';
  h+='<div style="font-size:15px;color:#b0c4de;line-height:1.8;margin-bottom:16px">A broken glove is found on the production floor. The employee posts the issue to the Task Feed and radios Quality. Quality confirms. The moment that post is created, <strong style="color:#e8c547">the Task Feed automatically dispatches work orders to Sanitation, Maintenance, Safety, and Production — simultaneously</strong>. No phone calls. No chasing people down. No "did someone tell Sanitation?" Every department manager checks their Task Feed inbox. If the line stops, <strong style="color:#ff6b6b">every department responds to the call</strong>.</div>';
  h+='<div style="font-size:14px;color:#93b5e0;line-height:1.8;margin-bottom:16px">Quality finds all pieces of the glove. Sanitation cleans the room. Safety documents the incident. Maintenance inspects the equipment. Each department fills out their forms — all linked back to <strong style="color:#3b82f6">that one original Task Feed post</strong>. The department tags at the bottom go from red to green one by one. <strong style="color:#4ecdc4">The line doesn\\'t resume until Quality signs off on Equipment Hygiene.</strong> That\\'s customizable — you decide which department has final sign-off authority.</div>';
  h+='<div style="font-size:14px;color:#8fafc8;line-height:1.7;margin-bottom:16px;background:rgba(59,130,246,0.08);border-radius:8px;padding:12px">Every single instance that occurs inside a production area is <strong style="color:#e8c547">automatically tracked in the Daily Room Hygiene Report</strong>. Nothing gets missed. Nothing gets lost. The room\\'s history builds itself.</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  ["Employee posts issue → auto-dispatches WOs to all relevant departments","Department tags track status — red (pending) → green (complete)","Every form, WO, and sign-off links back to the original post","Line resumes only when designated sign-off authority clears it","Daily Room Hygiene Report auto-tracks every production area instance","Radios stay — Task Feed handles the system, not the communication","Template-driven — 100% customizable per workflow type","Complete audit trail — who, what, when, why, linked to everything"].forEach(function(t){h+='<div style="font-size:11px;color:#8fafc8;padding:5px 8px;background:rgba(59,130,246,0.08);border-radius:5px">◆ '+t+'</div>';});
  h+='</div></div>';

  // Auditor Portal
  h+='<div style="background:linear-gradient(135deg,#0f1a1a 0%,#12121f 100%);border:1px solid rgba(78,205,196,0.4);border-radius:16px;padding:24px 20px;margin-bottom:12px;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#4ecdc4,#e8c547,#4ecdc4);background-size:200% 100%;animation:shimmer 3s linear infinite"></div>';
  h+='<div style="font-size:10px;letter-spacing:3px;color:#4ecdc4;text-transform:uppercase;font-weight:700;margin-bottom:8px">★ Industry First — No One Else Has This</div>';
  h+='<div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:8px;line-height:1.2">The Auditor Portal</div>';
  h+='<div style="font-size:15px;color:#bbdddd;line-height:1.8;margin-bottom:16px">Your SQF auditor walks in. You hand them a tablet — or send them an <strong style="color:#e8c547">authenticated session link for remote access</strong>. That link is specific to that auditor, with <strong style="color:#4ecdc4">token revocation and expiration</strong> built in. They have read-only access to every record they need — work orders, CAPAs, training logs, sanitation verification, SDS documents, inspection history — all searchable, all timestamped, all linked. <strong style="color:#4ecdc4">The auditor is impressed before they ask their first question.</strong></div>';
  h+='<div style="font-size:14px;color:#aacccc;line-height:1.8;margin-bottom:16px">Remember the last audit? One person with Limble access, switching users, the audit room waiting while someone searched for a PM record? <strong style="color:#ff6b6b">That never happens again.</strong> Full audit tracking — including <strong style="color:#e8c547">countdown to next audit</strong> — and full search across every audit-specific module. The portal is role-gated, session-controlled, and provides zero ability to edit. Just verify.</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  ["Authenticated session link — unique per auditor, remote or on-site","Token revocation & expiration — access ends when you say it ends","Read-only across all modules — auditors verify, never edit","Full search across audit-specific records from one screen","Linked records — tap a CAPA, see the NCR, the WO, the Task Feed post","Countdown to next audit — always know where you stand","Supports SQF, BRCGS, FDA FSMA, OSHA, ESG, and custom audit types","Complete audit session tracking — what they viewed, when, how long"].forEach(function(t){h+='<div style="font-size:11px;color:#88bbbb;padding:5px 8px;background:rgba(78,205,196,0.08);border-radius:5px">◆ '+t+'</div>';});
  h+='</div></div>';

  // Other unique features
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  [{icon:"🚨",title:"Emergency Protocols & Alert Systems",color:"#ff6b6b",desc:"Fire drill headcount, chemical spill response, lockdown procedures — instant accountability with facility check-in/check-out verification and automated department alerts",features:["Facility check-in / check-out tracking (not individual location)","Automated emergency alert cascades to all departments","Instant headcount verification — who is checked in right now","Post-incident documentation auto-generated from the event"]},{icon:"🔴",title:"Room Status Light Boards",color:"#ff8844",desc:"Physical light indicators outside every production room — visible from the floor. Everyone knows the status before they walk in.",features:["LOTO lockout — red, do not enter","Wet clean in progress — amber, restricted access","Operating / cleared for production — green","Synced with Task Feed and CMMS in real time"]},{icon:"📡",title:"Line Sensors & Equipment Downtime",color:"#a855f7",desc:"Connected sensors detect equipment stops, measure downtime, and auto-generate maintenance requests — no one fills out a form",features:["Automatic downtime detection by sensor","Equipment stop → auto-creates Task Feed alert","MTBF / MTTR tracked from actual sensor data","OEE visibility without manual data collection"]},{icon:"🧹",title:"Dedicated Sanitation System",color:"#4ecdc4",desc:"Not a checkbox on an inspection form. A full system — master schedules, chemical tracking, pre-op/post-op verification, CIP, consumable inventory",features:["Master sanitation schedule with shift-level detail","Chemical usage tracking tied to SDS library","Pre-op / post-op verification with sign-offs","Consumable inventory (mops, gloves, chemicals)"]}].forEach(function(f){
    h+='<div class="feat-box" style="border:1px solid '+f.color+'33"><div style="font-size:20px;margin-bottom:6px">'+f.icon+'</div><div style="font-size:14px;font-weight:700;color:'+f.color+';margin-bottom:4px">'+f.title+'</div><div style="font-size:11px;color:#9999bb;line-height:1.5;margin-bottom:10px">'+f.desc+'</div>';
    f.features.forEach(function(ft){h+='<div style="font-size:10px;color:#777799;padding:2px 0">• '+ft+'</div>';});
    h+='</div>';
  });
  h+='</div>';
  h+='<div style="margin-top:12px;background:linear-gradient(135deg,rgba(232,197,71,0.06),rgba(168,85,247,0.06));border:1px solid rgba(232,197,71,0.2);border-radius:10px;padding:16px;text-align:center"><div style="font-size:18px;font-weight:800;color:#e8c547;margin-bottom:4px">100% Customizable</div><div style="font-size:13px;color:#aaaacc">Every workflow, every template, every form, every approval chain — built with you, built for you.</div></div>';
  h+='</div>';

  // ═══════ SECTION 4: THE NUMBERS ═══════
  h+='<div style="margin-bottom:48px">';
  h+=sectionHead("4","The Numbers","Adjust the investment, the timeframe, the ongoing terms — see the real position","#4ecdc4");
  h+='<div style="background:#0f0f1a;border:1px solid rgba(78,205,196,0.25);border-radius:16px;padding:24px 20px">';
  // Mode toggle
  h+='<div style="display:flex;gap:8px;margin-bottom:24px">';
  h+='<button class="mode-btn'+(terms.mode==="term"?" active":"")+'" data-mode="term">Term-Based</button>';
  h+='<button class="mode-btn'+(terms.mode==="lifetime"?" active":"")+'" data-mode="lifetime">Lifetime Access</button>';
  h+='</div>';

  if(c.isLife){
    h+='<div><div style="margin-bottom:20px"><div style="font-size:15px;font-weight:700;color:#4ecdc4;margin-bottom:4px">Lifetime Platform Access</div><div style="font-size:12px;color:#666688;margin-bottom:10px">One investment. No monthly fees. Ever. Full platform, unlimited users, lifetime support, all future updates and modules.</div><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#e8c547;font-family:JetBrains Mono,monospace;font-size:14px">$</span><input type="number" class="ni ni-dollar" value="'+terms.lifetimePrice+'" id="lifetimePrice" /></div></div>';
    h+='<div style="background:rgba(78,205,196,0.06);border-radius:10px;padding:14px"><div style="font-size:12px;font-weight:700;color:#4ecdc4;margin-bottom:8px">Lifetime Includes:</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">';
    ["Full platform — every module, every feature","Unlimited users — no per-seat fees, ever","Historical data migration & digitization","System integration & process consulting","Staff training — all departments, all shifts","Lifetime support — direct, not a ticket queue","All updates, new features, new modules — forever","Priority input on roadmap & feature direction","Line sensors, light boards, emergency systems","Auditor Portal access for every audit, every year"].forEach(function(i){h+='<div style="font-size:11px;color:#88cccc;padding:3px 0">✓ '+i+'</div>';});
    h+='</div></div></div>';
  } else {
    h+='<div><div style="margin-bottom:20px"><div style="font-size:15px;font-weight:700;color:#4ecdc4;margin-bottom:4px">Setup & Implementation</div><div style="font-size:12px;color:#666688;margin-bottom:10px">Full digital transformation: historical data migration, integration, process consulting, training, and platform access for the included years.</div><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#e8c547;font-family:JetBrains Mono,monospace;font-size:14px">$</span><input type="number" class="ni ni-dollar" value="'+terms.setupFee+'" id="setupFee" /></div></div>';
    h+='<div style="margin-bottom:20px"><div style="font-size:15px;font-weight:700;color:#4ecdc4;margin-bottom:4px">Years Included</div><div style="font-size:12px;color:#666688;margin-bottom:10px">Full platform access included in the investment for this many years. No monthly fees during this period.</div><div style="display:flex;gap:6px">';
    for(var y=1;y<=10;y++){h+='<button class="yr-btn'+(terms.years===y?' active':'')+'" data-yr="'+y+'">'+y+'</button>';}
    h+='</div></div>';
    h+='<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><div style="font-size:15px;font-weight:700;color:#4ecdc4">After Year '+terms.years+' — Monthly</div><div style="font-size:12px;color:#666688">Ongoing access, if agreed upon. Renegotiated at renewal.</div></div><div style="background:rgba(78,205,196,0.08);border-radius:6px;padding:6px 12px"><div style="color:#4ecdc4;font-size:14px;font-weight:700;font-family:JetBrains Mono,monospace">$'+(terms.monthlyAfter*12).toLocaleString()+'/yr</div></div></div><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#e8c547;font-family:JetBrains Mono,monospace;font-size:14px">$</span><input type="number" class="ni ni-dollar" value="'+terms.monthlyAfter+'" id="monthlyAfter" /></div></div>';
    h+='<div style="background:rgba(78,205,196,0.06);border-radius:10px;padding:14px"><div style="font-size:12px;font-weight:700;color:#4ecdc4;margin-bottom:8px">Included in the '+terms.years+'-Year Investment:</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">';
    ["Full platform — every module, every feature","Unlimited users — no per-seat fees","Historical data migration & digitization","System integration & process consulting","Staff training — all departments, all shifts",terms.years+" years of support included","All updates & new features during term","Priority input on roadmap & features","Line sensors, light boards, emergency systems","Auditor Portal access for every audit"].forEach(function(i){h+='<div style="font-size:11px;color:#88cccc;padding:3px 0">✓ '+i+'</div>';});
    h+='</div></div></div>';
  }
  h+='</div></div>';

  // ═══════ SECTION 5: THE FULL PICTURE ═══════
  h+='<div>';
  h+=sectionHead("5","The Full Picture","Paper savings + software consolidation + TulKenz investment = real net position","#e8c547");
  h+='<div style="background:linear-gradient(135deg,rgba(78,205,196,0.06),rgba(232,197,71,0.06));border:2px solid #e8c547;border-radius:16px;padding:24px 16px;margin-bottom:16px">';
  h+='<div style="font-size:10px;letter-spacing:3px;color:#e8c547;text-transform:uppercase;font-weight:600;margin-bottom:16px;text-align:center">'+(c.isLife?"10":c.yrs)+'-Year Side-by-Side</div>';
  // Side by side
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
  h+='<div style="background:rgba(255,107,107,0.08);border-radius:12px;padding:16px;text-align:center"><div style="color:#ff6b6b;font-size:11px;font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.8px">Their Current Path ('+(c.isLife?"10":c.yrs)+' Yrs)</div><div style="margin-bottom:8px"><div style="color:#ff6b6b;font-size:12px">Paper operations waste</div><div style="color:#ff6b6b;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">$'+fmt(c.pC*c.yrs)+'</div></div><div style="margin-bottom:8px"><div style="color:#ff8844;font-size:12px">7 software vendors</div><div style="color:#ff8844;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">$'+fmt(c.cSetup+c.cAnnual*c.yrs)+'</div></div><div style="border-top:1px solid rgba(255,107,107,0.2);padding-top:10px"><div style="color:#ff6b6b;font-size:10px">Combined Spend</div><div style="color:#ff6b6b;font-size:26px;font-weight:800;font-family:JetBrains Mono,monospace">$'+fmt(c.theirCost)+'</div></div></div>';
  h+='<div style="background:rgba(78,205,196,0.08);border-radius:12px;padding:16px;text-align:center"><div style="color:#4ecdc4;font-size:11px;font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.8px">TulKenz OPS ('+(c.isLife?"Lifetime":c.yrs+"-Year")+')</div><div style="margin-bottom:8px"><div style="color:#4ecdc4;font-size:12px">'+(c.isLife?"One investment — lifetime access":"Setup + "+c.yrs+" years included")+'</div><div style="color:#4ecdc4;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">$'+fmt(c.tkCost)+'</div></div><div style="margin-bottom:8px"><div style="color:#88cccc;font-size:12px">Paper waste eliminated</div><div style="color:#88cccc;font-size:18px;font-weight:800;font-family:JetBrains Mono,monospace">-80%</div></div><div style="border-top:1px solid rgba(78,205,196,0.2);padding-top:10px"><div style="color:#4ecdc4;font-size:10px">Total Investment</div><div style="color:#4ecdc4;font-size:26px;font-weight:800;font-family:JetBrains Mono,monospace">$'+fmt(c.tkCost)+'</div></div></div>';
  h+='</div>';

  // Big number
  h+='<div style="background:rgba(0,0,0,0.35);border-radius:14px;padding:24px;text-align:center;animation:pulseGlow 3s infinite">';
  h+='<div style="font-size:10px;letter-spacing:4px;color:#e8c547;text-transform:uppercase;font-weight:600;margin-bottom:10px">'+(c.isLife?"10":c.yrs)+'-Year Net Financial Position</div>';
  h+='<div id="bigNet" data-prefix="$" data-val="0" style="font-size:52px;font-weight:800;font-family:JetBrains Mono,monospace;color:#e8c547;line-height:1">$0</div>';
  h+='<div style="color:#e8c547;font-size:14px;font-weight:600;margin-top:6px">'+c.roiPercent+'% Return on Investment</div>';
  h+='<div style="color:#7777aa;font-size:12px;margin-top:4px">'+fmt(c.pHrsSaved*c.yrs)+' hours redirected to productive work</div>';
  h+='<div style="display:flex;justify-content:center;gap:28px;margin-top:16px;flex-wrap:wrap">';
  [[c.fte,"FTE Equiv / Year"],["~"+c.estErrors,"Errors Eliminated / Year"],["1","System Instead of 7+"],[c.isLife?"∞":c.yrs+" yr","Support Included"]].forEach(function(a){h+='<div style="text-align:center"><div style="color:#e8c547;font-size:18px;font-weight:700;font-family:JetBrains Mono,monospace">'+a[0]+'</div><div style="color:#666688;font-size:10px">'+a[1]+'</div></div>';});
  h+='</div></div>';

  // 10-year projection (term mode only)
  if(!c.isLife){
    h+='<div style="margin-top:12px;background:rgba(232,197,71,0.04);border-radius:10px;padding:16px">';
    h+='<div style="font-size:11px;color:#9999aa;margin-bottom:10px;text-align:center">Year-by-year through 10 years — if everything stays the same (no inflation):</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">';
    for(var yi=1;yi<=10;yi++){
      var inTerm=yi<=terms.years;
      var theirAtYr=c.cSetup+c.cAnnual*yi+c.pC*yi;
      var tkAtYr=inTerm?terms.setupFee:terms.setupFee+(yi-terms.years)*terms.monthlyAfter*12;
      var netAtYr=theirAtYr-tkAtYr;
      h+='<div style="background:'+(inTerm?"rgba(78,205,196,0.06)":"rgba(232,197,71,0.04)")+';border:'+(inTerm?"1px solid rgba(78,205,196,0.2)":"1px solid rgba(232,197,71,0.1)")+';border-radius:8px;padding:8px 4px;text-align:center">';
      h+='<div style="color:'+(inTerm?"#4ecdc4":"#777799")+';font-size:9px;font-weight:600;margin-bottom:4px">YEAR '+yi+(inTerm?" ✓":"")+'</div>';
      h+='<div style="color:#ff6b6b;font-size:10px;font-family:JetBrains Mono,monospace">$'+fmt(theirAtYr)+'</div>';
      h+='<div style="color:#666688;font-size:8px">them</div>';
      h+='<div style="color:#4ecdc4;font-size:10px;font-family:JetBrains Mono,monospace;margin-top:2px">$'+fmt(tkAtYr)+'</div>';
      h+='<div style="color:#666688;font-size:8px">you</div>';
      h+='<div style="border-top:1px solid '+(inTerm?"rgba(78,205,196,0.15)":"rgba(232,197,71,0.15)")+';margin-top:4px;padding-top:4px"><div style="color:#e8c547;font-size:11px;font-weight:700;font-family:JetBrains Mono,monospace">$'+fmt(netAtYr)+'</div><div style="color:#666688;font-size:8px">saved</div></div></div>';
    }
    h+='</div></div>';
  }
  h+='</div>';

  // Reallocation
  h+='<div style="background:rgba(78,205,196,0.05);border:1px solid rgba(78,205,196,0.15);border-radius:12px;padding:16px;margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#4ecdc4;margin-bottom:10px">✨ Where the Savings Get Redirected</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  ["Production optimization","Process improvement","Proactive compliance","Staff development & training","Waste reduction programs","Faster audit readiness","Root cause analysis","Preventive maintenance expansion"].forEach(function(i){h+='<div style="background:rgba(78,205,196,0.06);border-radius:6px;padding:6px 10px;font-size:12px;color:#88cccc">→ '+i+'</div>';});
  h+='</div></div>';

  // Disclaimer
  h+='<div style="padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-bottom:16px"><div style="color:#555566;font-size:10px;line-height:1.6;text-align:center">Paper operations estimates based on published industry research. Competitor pricing from published rates & industry averages. All figures adjustable. These represent potential outcomes, not guarantees.</div></div>';

  // View Sources button
  h+='<div style="text-align:center;margin-bottom:24px"><button class="src-btn" id="viewSources">📊 View Research Sources</button></div>';

  // Footer
  h+='<div style="text-align:center"><p style="color:#e8c547;font-size:16px;font-weight:700;font-style:italic;line-height:1.5;margin-bottom:8px">"The goal isn\\'t fewer people.<br/>It\\'s more time for the work that matters."</p><div style="color:#555566;font-size:11px"><span style="color:#fff">Tul</span><span style="color:#a855f7">Kenz</span><span style="color:#fff"> OPS</span><span style="color:#555566"> — Built for Manufacturing</span></div></div>';
  h+='</div></div>';

  app.innerHTML=h;
  updateAnimatedNumbers();
  bindEvents();
}

function renderSources(){
  var app=document.getElementById("app");
  var h='';
  h+='<div class="topbar"><div style="display:flex;align-items:center;gap:10px"><div style="width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,#a855f7,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;letter-spacing:0.5px">TKO</div><div><span style="font-size:15px;font-weight:700;line-height:1.1"><span style="color:#fff">Tul</span><span style="color:#a855f7">Kenz</span><span style="color:#fff"> OPS</span></span><div style="font-size:8px;color:#777799;letter-spacing:1.5px;text-transform:uppercase">Research Sources</div></div></div><button id="backToCalc" style="padding:8px 18px;background:transparent;border:1px solid #e8c547;border-radius:6px;color:#e8c547;font-size:12px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif">← Back to Calculator</button></div>';
  h+='<div style="max-width:800px;margin:0 auto;padding:32px 16px 60px">';
  h+='<div style="text-align:center;margin-bottom:32px"><h1 style="font-size:24px;font-weight:800;margin-bottom:6px">Industry Research Sources</h1><p style="color:#7777aa;font-size:13px">Every number in the calculator is backed by published, peer-reviewed, or industry-standard research.</p><p style="color:#555566;font-size:11px;margin-top:4px">All sources 2024-2025 unless noted as ongoing industry benchmarks.</p></div>';
  SOURCES.forEach(function(section){
    h+='<div style="margin-bottom:28px"><div style="font-size:14px;font-weight:700;color:#e8c547;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(232,197,71,0.15)">'+section.cat+'</div>';
    section.items.forEach(function(src){
      h+='<div style="background:#0f0f1a;border:1px solid rgba(232,197,71,0.1);border-radius:10px;padding:14px 16px;margin-bottom:8px"><div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:8px">'+src.name+'</div>';
      src.points.forEach(function(p){h+='<div style="font-size:12px;color:#aaaacc;padding:3px 0 3px 12px;line-height:1.5;border-left:2px solid rgba(232,197,71,0.15)">'+p+'</div>';});
      h+='<div style="font-size:10px;color:#555577;margin-top:8px">Source: '+src.url+'</div></div>';
    });
    h+='</div>';
  });
  h+='<div style="text-align:center;margin-top:24px;font-size:11px;color:#555566">Compiled by <span style="color:#fff">Tul</span><span style="color:#a855f7">Kenz</span> LLC — 2026 • All rights reserved</div>';
  h+='</div>';
  app.innerHTML=h;
  document.getElementById("backToCalc").addEventListener("click",function(){currentView="calculator";render();window.scrollTo(0,0);});
}

function updateAnimatedNumbers(){
  var c=calc();
  var els=[["d_pC",c.pC],["d_cA",c.cAnnual],["d_tk",c.tkCost],["d_net",c.netPosition],["s_cMo",c.cMo],["bigNet",c.netPosition]];
  els.forEach(function(a){var el=document.getElementById(a[0]);if(el)animTo(el,a[1]);});
  var roi=document.getElementById("d_roi");if(roi)roi.textContent=c.roiPercent+"% ROI";
  var yrl=document.getElementById("d_yrlabel");if(yrl)yrl.textContent=(c.isLife?"10":c.yrs)+"-year net position";
}

function sectionHead(num,title,sub,color){
  return '<div style="margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid '+color+'33"><div style="display:flex;align-items:center;gap:12px;margin-bottom:4px"><div style="width:32px;height:32px;border-radius:8px;background:'+color+'18;border:1px solid '+color+'44;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:'+color+';font-family:JetBrains Mono,monospace">'+num+'</div><h2 style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px">'+title+'</h2></div><div style="color:#7777aa;font-size:12px;padding-left:44px">'+sub+'</div></div>';
}

function summaryBox(val,color,label,dollar){
  return '<div style="background:'+color+'11;border:1px solid '+color+'33;border-radius:10px;padding:14px 10px;text-align:center"><div style="color:'+color+';font-size:22px;font-weight:800;font-family:JetBrains Mono,monospace">'+(dollar?"$":"")+fmt(val)+'</div><div style="color:'+color+';font-size:9px;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px">'+label+'</div></div>';
}

// ═══════════════════════════ EVENTS ═════════════════════════════
function bindEvents(){
  // Category card clicks
  document.querySelectorAll(".cat-card").forEach(function(el){
    el.addEventListener("click",function(e){
      if(e.target.tagName==="INPUT")return;
      var id=el.dataset.cat;
      activeCard=activeCard===id?null:id;
      render();
    });
  });

  // Category field inputs
  document.querySelectorAll("[data-cat][data-field]").forEach(function(el){
    el.addEventListener("input",function(){
      catData[el.dataset.cat][el.dataset.field]=Math.max(0,Number(el.value));
      updateAnimatedNumbers();
      // Update the card's cost display without full re-render
    });
    el.addEventListener("click",function(e){e.stopPropagation();});
  });

  // Competitor field inputs
  document.querySelectorAll("[data-comp][data-field]").forEach(function(el){
    el.addEventListener("input",function(){
      compData[el.dataset.comp][el.dataset.field]=Math.max(0,Number(el.value));
      updateAnimatedNumbers();
    });
    el.addEventListener("click",function(e){e.stopPropagation();});
  });

  // Competitor toggle
  var ct=document.getElementById("compToggle");
  if(ct)ct.addEventListener("click",function(){showComp=!showComp;render();});

  // Mode toggle
  document.querySelectorAll("[data-mode]").forEach(function(el){
    el.addEventListener("click",function(){terms.mode=el.dataset.mode;render();});
  });

  // Year buttons
  document.querySelectorAll("[data-yr]").forEach(function(el){
    el.addEventListener("click",function(){terms.years=parseInt(el.dataset.yr);render();});
  });

  // Term inputs
  var sf=document.getElementById("setupFee");
  if(sf)sf.addEventListener("input",function(){terms.setupFee=Math.max(0,Number(sf.value));updateAnimatedNumbers();});
  var ma=document.getElementById("monthlyAfter");
  if(ma)ma.addEventListener("input",function(){terms.monthlyAfter=Math.max(0,Number(ma.value));updateAnimatedNumbers();});
  var lp=document.getElementById("lifetimePrice");
  if(lp)lp.addEventListener("input",function(){terms.lifetimePrice=Math.max(0,Number(lp.value));updateAnimatedNumbers();});

  // Sources button
  var vs=document.getElementById("viewSources");
  if(vs)vs.addEventListener("click",function(){currentView="sources";render();window.scrollTo(0,0);});
}

// ═══════════════════════════ INIT ═══════════════════════════════
render();
`;
}
