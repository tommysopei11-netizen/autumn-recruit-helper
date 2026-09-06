// ==UserScript==
// @name         秋招助手 v4 - 自动筛岗投递导航
// @namespace    https://chatgpt.com/
// @version      4.2.1
// @description  自动筛选匹配岗位，识别手动投递，并从应聘/投递记录页面自动同步公司、岗位、日期和状态。
// @author       ChatGPT
// @match        https://*/*
// @run-at       document-idle
// @homepageURL  https://github.com/tommysopei11-netizen/autumn-recruit-helper
// @supportURL   https://github.com/tommysopei11-netizen/autumn-recruit-helper/issues
// @updateURL    https://raw.githubusercontent.com/tommysopei11-netizen/autumn-recruit-helper/main/autumn_recruit_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/tommysopei11-netizen/autumn-recruit-helper/main/autumn_recruit_helper.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// ==/UserScript==

(() => {
'use strict';
const VERSION='4.2.1';
const K={profile:'ar_profile_v4',settings:'ar_settings_v4',records:'ar_records_v4',ui:'ar_ui_v4',hosts:'ar_hosts_v4',pending:'ar_pending_apply_v421'};
const DEF={minKeep:68,minOpen:76,maxTabs:5,hideLow:true,autoRecordManualApply:true,autoImportHistory:true};
const $=(s,r=document)=>{try{return r.querySelector(s)}catch(_){return null}};
const $$=(s,r=document)=>{try{return [...r.querySelectorAll(s)]}catch(_){return[]}};
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const low=s=>norm(s).toLowerCase();
const get=(k,d)=>{try{const v=GM_getValue(k,null);return v==null?d:v}catch(_){return d}};
const set=(k,v)=>{try{GM_setValue(k,v)}catch(_){}};
const settings=()=>({...DEF,...(get(K.settings,{})||{})});
const records=()=>{const v=get(K.records,[]);return Array.isArray(v)?v:[]};
const now=()=>new Date().toLocaleString('zh-CN',{hour12:false});
const btnStyle=(dark=false)=>`border:0;border-radius:7px;padding:8px 9px;font-size:12px;cursor:pointer;${dark?'background:#111;color:#fff':'background:#f1f3f5;color:#222'}`;

const COMPANY=[
  [/\bECOFLOW\b|正浩创新|深圳市正浩创新科技/i,'正浩创新（EcoFlow）'],
  [/\bCVTE\b|视源股份|广州视源电子/i,'视源股份（CVTE）'],
  [/\bHUAWEI\b|华为技术|华为招聘/i,'华为'],
  [/中兴通讯|\bZTE\b/i,'中兴通讯'],
  [/海康威视|HIKVISION/i,'海康威视'],
  [/汇川技术|INOVANCE/i,'汇川技术'],
  [/中芯国际|\bSMIC\b/i,'中芯国际'],
  [/比亚迪|\bBYD\b/i,'比亚迪']
];

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){
  let e=$('#ar-toast');
  if(!e){e=document.createElement('div');e.id='ar-toast';Object.assign(e.style,{position:'fixed',left:'50%',bottom:'28px',transform:'translateX(-50%)',background:'#111',color:'#fff',padding:'10px 14px',borderRadius:'8px',zIndex:2147483647,fontSize:'13px'});document.body.appendChild(e)}
  e.textContent=msg;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2200)
}
function isRecruit(){
  const h=location.hostname.toLowerCase(),t=(document.body?.innerText||'').slice(0,40000),extra=get(K.hosts,[]);
  return /campus|career|recruit|job|jobs|hr|talent/.test(h)||['zhipin.com','zhaopin.com','nowcoder.com','iguopin.com','51job.com','liepin.com'].some(x=>h.includes(x))||(Array.isArray(extra)&&extra.includes(h))||/(岗位职责|任职要求|投递简历|应聘记录|投递记录|申请记录|校园招聘)/.test(t)
}
function isHistory(){
  const t=(document.body?.innerText||'').slice(0,60000);
  return /(应聘记录|投递记录|申请记录|我的申请|应聘进度|投递进度|申请进度)/.test(t)&&/(投递简历|已投递|志愿|申请|应聘|笔试|面试|录用)/.test(t)
}
function isDetail(){
  const t=(document.body?.innerText||'').slice(0,40000);
  return /(岗位职责|任职要求|职位描述|工作职责)/.test(t)&&/(投递简历|立即投递|立即申请|申请职位|应聘)/.test(t)
}
function inferCompany(root=document){
  for(const s of ['.company-name','.company-title','[class*="company-name"]','[class*="companyName"]','[class*="corp-name"]','[class*="enterprise-name"]']){
    const v=norm($(s,root)?.innerText||'');if(v&&v.length<100&&!/招聘|应聘记录|个人中心/.test(v))return v
  }
  const source=[document.title,location.hostname,norm($('header')?.innerText||''),norm(document.body?.innerText||'').slice(0,2500)].join(' ');
  for(const [re,name] of COMPANY)if(re.test(source))return name;
  const t=norm(document.title).replace(/[-_|｜].*$/,'').replace(/校园招聘|社会招聘|招聘官网|招聘|个人中心|应聘记录|投递记录|申请记录/gi,'').trim();
  return t&&t.length<40?t:'未识别公司'
}
function inferTitle(root=document){
  for(const s of ['.job-name','.job-title','.position-name','.position-title','[class*="job-name"]','[class*="jobName"]','[class*="job-title"]','[class*="position-name"]','[class*="positionName"]','h1','h2','h3','h4','strong']){
    const v=norm($(s,root)?.innerText||'');if(v&&v.length<100&&/(工程师|开发|软件|硬件|算法|测试|技术|嵌入式|固件|研发|控制|实习|管培)/.test(v))return v
  }
  const lines=(root.innerText||'').split(/\n+/).map(norm).filter(Boolean);
  return lines.find(v=>v.length<90&&/(工程师|开发|软件|硬件|算法|测试|技术|嵌入式|固件|研发|控制|实习|管培)/.test(v))||''
}
function score(text,title=''){
  const t=low(`${title} ${text}`);let s=10;
  const strong=['嵌入式','固件','stm32','mcu','freertos','rtos','fdcan','can','uart','i2c','spi','rs485','pid','电机','运动控制','机器人','imu','自动化','控制软件','设备软件'];
  for(const k of strong)if(t.includes(k))s+=k==='嵌入式'||k==='stm32'||k==='freertos'?9:4;
  if(/2027届|27届|应届|校园招聘|校招/.test(t))s+=10;
  if(/本科及以上|本科/.test(t))s+=5;
  if(/销售|运营|产品经理|人力资源|行政|java后端|前端开发/.test(t))s-=55;
  if(/硕士及以上|研究生及以上|博士/.test(t)&&!/本科及以上/.test(t))s-=40;
  if(/fpga|verilog|模拟ic|版图|射频|工艺工程师/.test(t))s-=12;
  s=Math.max(0,Math.min(100,s));
  return {score:s,grade:s>=86?'S':s>=74?'A':s>=60?'B':'C'}
}
function upsert(x,silent=false){
  if(!x.title||/未识别岗位|应聘记录|投递记录|申请记录/.test(x.title))return false;
  const company=x.company||inferCompany(),title=norm(x.title),key=`${company}|${title}`.toLowerCase();
  const a=records(),i=a.findIndex(r=>r.key===key),old=i>=0?a[i]:{};
  const item={...old,...x,key,company,title,status:x.status||old.status||'已投递',date:x.date||old.date||now(),source:x.source||old.source||'自动识别',url:x.url||old.url||location.href,updatedAt:now()};
  if(i>=0)a[i]=item;else a.unshift(item);set(K.records,a);if(!silent)toast(`已记录：${company} · ${title}`);return true
}
function extractDate(t){const m=String(t||'').match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?/);return m?m[0].replace(/[年/.]/g,'-').replace('月','-').replace('日',''):''}
function statusFrom(t){
  if(/offer|录用|已录取/i.test(t))return'Offer';if(/终面|三面/.test(t))return'终面';if(/二面/.test(t))return'二面';if(/一面|初面/.test(t))return'一面';if(/面试/.test(t))return'面试';if(/笔试|测评/.test(t))return'笔试';return'已投递'
}
function historyBlocks(){
  const out=new Set();
  const valid=e=>{const t=norm(e?.innerText||'');return t.length>=12&&t.length<=2200&&/(投递简历|已投递|志愿|申请|应聘|笔试|面试|录用)/.test(t)&&/(工程师|开发|软件|硬件|算法|测试|技术|嵌入式|固件|研发|控制|实习|管培)/.test(t)};
  for(const s of ['[class*="apply-record"]','[class*="record-item"]','[class*="apply-item"]','[class*="application-item"]','[class*="job-item"]','[class*="position-item"]','[class*="record-card"]','.ant-card','.el-card','li'])for(const e of $$(s))if(valid(e))out.add(e);

  for(const marker of $$('div,span,p,a,button,td')){
    const mt=norm(marker.innerText||marker.textContent||'');
    if(!mt||mt.length>45||!/(投递简历|已投递|投递成功|申请成功|第\s*\d+\s*志愿)/.test(mt))continue;
    let p=marker;
    for(let d=0;d<8&&p&&p!==document.body;d++,p=p.parentElement){
      const pt=norm(p.innerText||'');if(pt.length>2600)break;
      if(valid(p)&&extractDate(pt)){out.add(p);break}
    }
  }
  for(const e of $$('div,section,article')){
    const t=norm(e.innerText||'');if(t.length<20||t.length>1600)continue;
    if(extractDate(t)&&/(投递简历|已投递|志愿|申请|应聘)/.test(t)&&inferTitle(e))out.add(e)
  }
  const arr=[...out].sort((a,b)=>norm(a.innerText||'').length-norm(b.innerText||'').length),chosen=[];
  for(const e of arr)if(!chosen.some(c=>e.contains(c)))chosen.push(e);
  return chosen
}
function scanHistory(showToast=false){
  if(!isHistory()||!settings().autoImportHistory)return{found:0};
  const company=inferCompany();let found=0;
  for(const b of historyBlocks()){
    const t=norm(b.innerText||''),title=inferTitle(b);if(!title)continue;
    found++;const q=score(t,title);
    upsert({company,title,status:statusFrom(t),date:extractDate(t)||now(),score:q.score,grade:q.grade,source:'应聘记录页自动识别',url:location.href},true)
  }
  renderHistory(found);if(showToast)toast(found?`已识别 ${found} 条应聘记录`:'仍未识别到记录');return{found}
}
function watchManual(){
  document.addEventListener('click',e=>{
    if(!settings().autoRecordManualApply)return;
    const el=e.target?.closest?.('button,a,[role="button"],input[type="submit"]');if(!el)return;
    const txt=norm(el.innerText||el.value||'');if(!/确认投递|提交申请|提交简历|发送简历|确认申请|立即投递|投递简历|立即申请|申请职位|我要应聘|立即应聘/.test(txt)||/查看|取消|撤回|投递记录|应聘记录/.test(txt))return;
    const title=inferTitle(document),company=inferCompany(),q=score(document.body?.innerText||'',title);
    set(K.pending,{title,company,score:q.score,grade:q.grade,time:Date.now(),url:location.href});
    setTimeout(confirmManual,1200);setTimeout(confirmManual,3500)
  },true)
}
function confirmManual(){
  const p=get(K.pending,null);if(!p||Date.now()-p.time>15000)return;
  const t=norm(document.body?.innerText||'').slice(0,60000);
  if(!/(投递成功|申请成功|提交成功|已成功投递|已投递|应聘记录|投递记录|申请记录)/.test(t)&&!isHistory())return;
  upsert({...p,status:'已投递',date:now(),source:'手动投递自动识别'});set(K.pending,null)
}
function jobCards(){
  const out=new Set();
  for(const s of ['.job-card-wrapper','.job-card-box','.joblist-box__item','.job-card','.job-item','.position-item','[class*="job-card"]','[class*="job-item"]','[class*="position-item"]'])for(const e of $$(s)){const t=norm(e.innerText||'');if(t.length>15&&t.length<2200&&inferTitle(e))out.add(e)}
  return[...out]
}
function scanJobs(){
  if(isHistory()||isDetail())return;
  const st=settings(),good=[];let hidden=0;
  for(const c of jobCards()){
    const title=inferTitle(c),company=inferCompany(c),t=norm(c.innerText||''),q=score(t,title);
    $('.ar-badge',c)?.remove();if(getComputedStyle(c).position==='static')c.style.position='relative';
    const b=document.createElement('span');b.className='ar-badge';b.textContent=`${q.grade} ${q.score}`;Object.assign(b.style,{position:'absolute',right:'6px',top:'6px',zIndex:999,background:q.grade==='S'?'#137333':q.grade==='A'?'#315efb':q.grade==='B'?'#b06000':'#777',color:'#fff',fontSize:'11px',fontWeight:'700',padding:'5px 7px',borderRadius:'999px'});c.appendChild(b);
    const a=$('a[href]',c);let url='';try{url=a?new URL(a.getAttribute('href'),location.href).toString():''}catch(_){}
    if(q.score>=st.minKeep){c.style.display='';good.push({title,company,url,...q})}else if(st.hideLow){c.style.display='none';hidden++}
  }
  renderList(good,hidden)
}
function ui(kind){const all=get(K.ui,{}),h=location.hostname;return all?.[h]?.[kind]||{}}
function saveUi(kind,p){const all=get(K.ui,{}),h=location.hostname;all[h]=all[h]||{};all[h][kind]={...(all[h][kind]||{}),...p};set(K.ui,all)}
function drag(box,handle,kind){if(!box||!handle)return;handle.style.cursor='move';let on=false,sx,sy,ox,oy;handle.onmousedown=e=>{if(e.target.closest('button'))return;on=true;const r=box.getBoundingClientRect();sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top;box.style.left=ox+'px';box.style.top=oy+'px';box.style.right='auto';e.preventDefault()};window.addEventListener('mousemove',e=>{if(!on)return;box.style.left=Math.max(0,ox+e.clientX-sx)+'px';box.style.top=Math.max(0,oy+e.clientY-sy)+'px'});window.addEventListener('mouseup',()=>{if(!on)return;on=false;const r=box.getBoundingClientRect();saveUi(kind,{pos:{left:r.left,top:r.top}})})}
function applyPos(box,p){if(p?.left!=null){box.style.left=p.left+'px';box.style.top=p.top+'px';box.style.right='auto'}}
function renderHistory(found){
  $('#ar-list')?.remove();let root=$('#ar-history');if(!root){root=document.createElement('div');root.id='ar-history';document.body.appendChild(root)}
  const u=ui('history'),total=records().length;
  root.innerHTML=`<div id="ar-history-box" style="position:fixed;right:18px;top:100px;width:290px;z-index:2147483645;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 8px 28px #0003;padding:13px;font-family:Arial,'Microsoft YaHei'"><div id="ar-handle" style="display:flex;justify-content:space-between"><b>投递记录自动同步 v${VERSION}</b><button id="ar-collapse" style="${btnStyle()};padding:5px 8px">${u.collapsed?'展开':'收起'}</button></div>${u.collapsed?'':`<div style="margin-top:9px;font-size:12px;line-height:1.7">本页识别：<b>${found}</b> 条<br>本地累计：<b style="color:#137333">${total}</b> 条</div><div style="margin-top:7px;padding:7px;background:#f1f8f3;border-radius:7px;font-size:11px">已加入无 class 岗位卡兜底识别，支持 EcoFlow 这类“岗位 + 投递简历 + 日期”页面。</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px"><button id="ar-resync" style="${btnStyle(true)}">重新同步</button><button id="ar-board" style="${btnStyle()}">投递看板</button></div>`}</div>`;
  const box=$('#ar-history-box');applyPos(box,u.pos);drag(box,$('#ar-handle'),'history');
  $('#ar-collapse').onclick=()=>{saveUi('history',{collapsed:!u.collapsed});renderHistory(found)};
  if(!u.collapsed){$('#ar-resync').onclick=()=>scanHistory(true);$('#ar-board').onclick=viewRecords}
}
function renderList(good,hidden){
  if(isHistory()||isDetail())return;let root=$('#ar-list');if(!root){root=document.createElement('div');root.id='ar-list';document.body.appendChild(root)}
  root.innerHTML=`<div style="position:fixed;right:18px;top:100px;width:285px;z-index:2147483645;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 8px 28px #0003;padding:13px;font-family:Arial,'Microsoft YaHei'"><b>秋招自动筛岗 v${VERSION}</b><div style="margin-top:8px;font-size:12px">高匹配：<b style="color:#137333">${good.length}</b> 个 ｜ 隐藏：${hidden} 个</div><button id="ar-open" style="${btnStyle(true)};width:100%;margin-top:8px">打开高匹配岗位</button><button id="ar-board" style="${btnStyle()};width:100%;margin-top:6px">投递看板</button></div>`;
  $('#ar-open').onclick=()=>good.filter(x=>x.url&&x.score>=settings().minOpen).slice(0,settings().maxTabs).forEach((x,i)=>setTimeout(()=>{try{GM_openInTab(x.url,{active:i===0})}catch(_){window.open(x.url,'_blank')}},i*200));
  $('#ar-board').onclick=viewRecords
}
function viewRecords(){
  const a=records(),rows=a.map(x=>`<tr><td>${esc(x.company)}</td><td>${esc(x.title)}</td><td>${esc(x.status)}</td><td>${esc(x.grade||'')} ${esc(x.score??'')}</td><td>${esc(x.date||'')}</td><td>${esc(x.source||'')}</td></tr>`).join('');
  let m=$('#ar-modal');m?.remove();m=document.createElement('div');m.id='ar-modal';m.innerHTML=`<div style="position:fixed;inset:0;background:#0006;z-index:2147483646"></div><div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(850px,94vw);max-height:85vh;overflow:auto;background:#fff;z-index:2147483647;border-radius:12px;padding:18px"><div style="display:flex;justify-content:space-between"><b>投递看板（${a.length}）</b><button id="ar-x" style="${btnStyle()}">关闭</button></div><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px"><thead><tr><th>公司</th><th>岗位</th><th>状态</th><th>匹配</th><th>日期</th><th>来源</th></tr></thead><tbody>${rows||'<tr><td colspan="6">暂无记录</td></tr>'}</tbody></table></div>`;document.body.appendChild(m);$$('th,td',m).forEach(e=>{e.style.border='1px solid #ddd';e.style.padding='6px'});$('#ar-x',m).onclick=()=>m.remove();m.firstElementChild.onclick=()=>m.remove()
}
function enableHost(){const h=location.hostname,a=get(K.hosts,[]);set(K.hosts,[...new Set([...(Array.isArray(a)?a:[]),h])]);toast('已启用当前网站')}
function route(){$('#ar-list')?.remove();$('#ar-history')?.remove();if(isHistory())scanHistory();else scanJobs();confirmManual()}
try{GM_registerMenuCommand('秋招助手：启用当前网站',enableHost);GM_registerMenuCommand('秋招助手：同步当前应聘记录',()=>scanHistory(true));GM_registerMenuCommand('秋招助手：投递看板',viewRecords)}catch(_){}
if(isRecruit()){watchManual();setTimeout(route,500);let last=location.href;setInterval(()=>{if(location.href!==last){last=location.href;setTimeout(route,600)}else confirmManual()},1000);try{new MutationObserver(()=>{clearTimeout(route.t);route.t=setTimeout(route,400)}).observe(document.body,{childList:true,subtree:true})}catch(_){}}
})();
