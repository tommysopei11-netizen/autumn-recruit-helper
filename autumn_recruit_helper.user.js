// ==UserScript==
// @name         秋招助手 v4 - 自动筛岗投递导航
// @namespace    https://chatgpt.com/
// @version      4.2.0
// @description  按个人嵌入式/自动化简历自动筛选岗位与公司，自动识别并记录手动投递/应聘记录，安全导航到申请页；支持拖动、收起和自动更新。
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

  const VERSION = '4.2.0';
  const K = {
    profile: 'ar_profile_v4',
    settings: 'ar_settings_v4',
    records: 'ar_records_v4',
    ui: 'ar_ui_v4',
    hosts: 'ar_hosts_v4',
    last: 'ar_last_matches_v4',
    autoApplyUntil: 'ar_auto_apply_until_v4',
    pendingApply: 'ar_pending_apply_v42'
  };

  const PROFILE_DEFAULT = {
    name:'', phone:'', email:'', school:'', major:'自动化', degree:'本科', graduation:'2027', city:'',
    skills:'C/C++、STM32F1、STM32G4、FreeRTOS、GPIO、Timer、PWM、ADC、DMA、编码器、看门狗、UART、I2C、SPI、CAN/FDCAN、RS485、PID、差速运动控制、IMU、状态机、环形队列、Keil、CubeMX、Git、CMake、示波器、软硬件联调',
    resumeEmbedded:'嵌入式软件工程师版',
    resumeSemiconductor:'半导体版',
    resumeSOE:'国企/央企技术岗版'
  };

  const SETTINGS_DEFAULT = {
    minKeep:68,
    minOpen:76,
    maxTabs:5,
    hideLow:true,
    autoEnterApply:true,
    autoRecordManualApply:true,
    autoImportHistory:true,
    preferredCompanies:'',
    blockedCompanies:'',
    targetCities:'',
    boostKeywords:'嵌入式软件,固件,STM32,MCU,FreeRTOS,CAN,FDCAN,电机控制,机器人,底盘,运动控制,驱动开发,自动化控制,设备控制软件',
    avoidKeywords:'销售,运营,前端开发,Java后端,产品经理,客服,人力资源,行政'
  };

  const MODEL = {
    direct:['嵌入式软件','嵌入式开发','嵌入式工程师','固件工程师','firmware engineer','mcu工程师','单片机工程师','机器人底层','机器人嵌入式','底层软件','运动控制','控制软件','电机控制','驱动开发工程师','embedded software'],
    related:['自动化软件','自动化工程师','设备控制软件','设备软件','电气控制','控制工程师','软件工程师','电子软件','系统控制','智能硬件','芯片应用','应用开发工程师'],
    mismatch:['销售','运营','产品经理','人力资源','行政','客服','采购','财务','法务','市场营销','java后端','前端开发','web前端','ui设计','视觉设计','新媒体','商务拓展'],
    skills:[['stm32',12],['mcu',9],['freertos',10],['rtos',8],['fdcan',9],['can',8],['c语言',8],['c/c++',8],['c++',5],['uart',4],['usart',4],['i2c',4],['iic',4],['spi',4],['rs485',4],['dma',4],['adc',3],['pwm',4],['编码器',5],['pid',7],['电机',7],['运动控制',8],['机器人',8],['imu',5],['状态机',5],['环形队列',4],['看门狗',3],['bus-off',4],['软硬件联调',6],['示波器',4],['keil',3],['cubemx',3],['git',2],['cmake',2]],
    industries:[['机器人',10],['工业自动化',10],['智能制造',8],['工业控制',10],['汽车电子',8],['智能汽车',7],['新能源',6],['电力',6],['能源',5],['半导体设备',9],['半导体',6],['芯片',5],['仪器仪表',8],['医疗设备',6],['无人机',8],['智能硬件',8],['电机',7],['伺服',9]],
    gaps:[['fpga',10],['verilog',14],['vhdl',14],['模拟ic',20],['数字ic设计',20],['版图',22],['芯片后端',20],['射频',18],['工艺工程师',15],['器件工程师',15],['autosar',10],['linux内核',9],['linux驱动',7],['device driver',7]],
    badCompany:['人力资源服务','劳务派遣','猎头','外包服务','人才服务','招聘服务']
  };

  const ADAPTERS = [
    {hosts:['zhipin.com'], cards:['.job-card-wrapper','.job-card-box','.search-job-result li'], title:['.job-name','.job-card-left .job-name','h1'], company:['.company-name','.company-info .company-name'], jd:['.job-sec-text','.job-detail']},
    {hosts:['zhaopin.com'], cards:['.joblist-box__item','.positionlist__item','.job-list-item','.job-card'], title:['.job-detail__name','.job-name','h1'], company:['.company__title','.company-name'], jd:['.job-detail__content','.job-description','.position-detail']},
    {hosts:['nowcoder.com'], cards:['.job-card','.job-item','.position-item'], title:['.job-detail-title','.position-title','.job-title','h1'], company:['.company-name','.company-title'], jd:['.job-detail-content','.position-content','.job-description']},
    {hosts:['iguopin.com'], cards:['.job-item','.position-item','.job-card','.job-list li'], title:['.job-name','.position-name','.job-title','h1'], company:['.company-name','.corp-name','.enterprise-name'], jd:['.job-detail','.job-description','.position-detail']},
    {hosts:['51job.com'], cards:['.joblist-item','.job-item','.job-card','.joblist .e'], title:['.job_name','.job-name','.job-title','h1'], company:['.cname','.company-name','.company_name'], jd:['.job_msg','.job-description','.job-detail']}
  ];

  const COMPANY_ALIASES = [
    {re:/\bCVTE\b|视源股份|广州视源电子/i, name:'视源股份（CVTE）'},
    {re:/\bHUAWEI\b|华为招聘|华为技术/i, name:'华为'},
    {re:/中兴通讯|ZTE/i, name:'中兴通讯'},
    {re:/海康威视|HIKVISION/i, name:'海康威视'},
    {re:/大华股份|DAHUA/i, name:'大华股份'},
    {re:/汇川技术|INOVANCE/i, name:'汇川技术'},
    {re:/中芯国际|SMIC/i, name:'中芯国际'},
    {re:/比亚迪|BYD/i, name:'比亚迪'}
  ];

  const $ = (s,r=document) => { try{return r.querySelector(s);}catch(_){return null;} };
  const $$ = (s,r=document) => { try{return [...r.querySelectorAll(s)];}catch(_){return [];} };
  const norm = s => String(s||'').replace(/\s+/g,' ').trim();
  const low = s => norm(s).toLowerCase();
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const split = s => String(s||'').split(/[,，;；\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  const get = (k,d) => { try{const v=GM_getValue(k,null);return v==null?d:v;}catch(_){return d;} };
  const set = (k,v) => { try{GM_setValue(k,v);}catch(_){} };
  const profile = () => ({...PROFILE_DEFAULT,...(get(K.profile,{})||{})});
  const settings = () => ({...SETTINGS_DEFAULT,...(get(K.settings,{})||{})});
  const records = () => {
    const v=get(K.records,[]);
    return Array.isArray(v)?v:[];
  };
  const host = () => location.hostname.toLowerCase();
  const adapter = () => ADAPTERS.find(a=>a.hosts.some(h=>host().includes(h)))||null;
  const nowText = () => new Date().toLocaleString('zh-CN',{hour12:false});

  function isRecruitPage(){
    const h=host(), enabled=get(K.hosts,[]);
    if(['zhipin.com','zhaopin.com','nowcoder.com','iguopin.com','51job.com','liepin.com','lagou.com','ncss.cn'].some(x=>h.includes(x))) return true;
    if(/campus|career|recruit|job|jobs|hr|talent/.test(h)) return true;
    if(Array.isArray(enabled)&&enabled.includes(h)) return true;
    const t=(document.body?.innerText||'').slice(0,30000);
    return /(岗位职责|任职要求|职位描述|招聘职位|投递简历|立即申请|校园招聘|应聘记录|投递记录|申请记录|Job Description|Responsibilities|Requirements)/i.test(t);
  }

  function isHistoryPage(){
    const t=(document.body?.innerText||'').slice(0,50000);
    return /(应聘记录|投递记录|申请记录|我的申请|应聘进度|投递进度|申请进度)/i.test(t) &&
           /(投递简历|已投递|志愿|申请|应聘|筛选|笔试|面试|录用)/i.test(t);
  }

  function detailPage(){
    const t=(document.body?.innerText||'').slice(0,30000);
    const cues=(t.match(/岗位职责|任职要求|职位描述|工作职责|Job Description|Responsibilities|Requirements/gi)||[]).length;
    return cues>=1 && (!!$('h1') || /立即投递|投递简历|立即申请|申请职位|Apply Now/i.test(t));
  }

  function firstText(selectors,root=document,max=160){
    for(const s of selectors||[]){
      const e=$(s,root),t=norm(e?.innerText||e?.textContent||'');
      if(t&&t.length<=max)return t;
    }
    return '';
  }

  function inferCompany(root=document){
    const fromCard=firstText([
      '.company-name','.company-title','.company__title','.cname',
      '[class*="company-name"]','[class*="companyName"]','[class*="corp-name"]',
      '[class*="enterprise-name"]','[class*="company_title"]'
    ],root,120);
    if(fromCard && !/个人中心|校园招聘|社会招聘|招聘官网|应聘记录/i.test(fromCard)) return fromCard;

    const source=[
      document.title,
      host(),
      norm($('header')?.innerText||'').slice(0,800),
      norm($('[class*="logo"]')?.innerText||''),
      norm(document.body?.innerText||'').slice(0,2000)
    ].join(' ');
    for(const a of COMPANY_ALIASES){
      if(a.re.test(source)) return a.name;
    }

    let title=norm(document.title)
      .replace(/[-_|｜].*$/,'')
      .replace(/校园招聘|社会招聘|招聘官网|招聘|个人中心|应聘记录|投递记录|申请记录/gi,'')
      .trim();
    if(title && title.length>=2 && title.length<=40 && !/登录|注册|首页/.test(title)) return title;
    return '未识别公司';
  }

  function jobInfo(root=document){
    const a=adapter();
    let title=firstText(a?.title||[],root)||
      firstText(['[class*="job-title"]','[class*="job-name"]','[class*="position-name"]','[class*="position-title"]','h1'],root);
    let company=firstText(a?.company||[],root)||inferCompany(root);
    if(!title) title=norm(document.title.split(/[-_|]/)[0]);
    return {title:title||'未识别岗位',company:company||'未识别公司',url:location.href};
  }

  function jdText(){
    const a=adapter(); let best='';
    for(const s of [...(a?.jd||[]),'[class*="job-description"]','[class*="job-detail"]','[class*="position-detail"]','main','article']){
      for(const e of $$(s)){
        const t=norm(e.innerText||'');
        if(t.length>best.length&&t.length<30000)best=t;
      }
    }
    return best.length>100?best:norm(document.body?.innerText||'').slice(0,18000);
  }

  function cardInfo(card){
    const title=firstText([
      '.job-name','.job-title','.position-name','.position-title',
      '[class*="job-name"]','[class*="jobName"]','[class*="position-name"]',
      '[class*="positionName"]','[class*="job-title"]'
    ],card)||norm($('a',card)?.innerText||'');
    const company=firstText([
      '.company-name','.company-title','[class*="company-name"]',
      '[class*="companyName"]','[class*="corp-name"]','[class*="enterprise-name"]'
    ],card)||inferCompany(card);
    const links=$$('a[href]',card).map(a=>{
      try{const u=new URL(a.getAttribute('href'),location.href);return {u,a};}catch(_){return null;}
    }).filter(Boolean);
    const preferred=links.find(x=>/(job|position|career|recruit|detail|zpgeek)/i.test(x.u.pathname+x.u.search)&&!/company|corp|enterprise/i.test(x.u.pathname));
    return {title,company,url:(preferred||links[0])?.u?.toString()||''};
  }

  function analyze(text,title='',company=''){
    const t=low(`${title} ${company} ${text}`),tt=low(title||text),s=settings();
    let score=8; const hits=[],gaps=[],risks=[],reasons=[];
    if(MODEL.direct.some(k=>tt.includes(k))){score+=46;reasons.push('目标岗位高度匹配');}
    else if(MODEL.related.some(k=>tt.includes(k))){score+=31;reasons.push('相关技术岗位');}
    else if(/嵌入式|固件|firmware|mcu|单片机|运动控制|机器人|控制软件|驱动开发/i.test(t))score+=34;
    else if(/软件工程师|研发工程师|自动化工程师|控制工程师/i.test(tt))score+=18;

    const mm=MODEL.mismatch.filter(k=>tt.includes(k)||t.includes(k));
    if(mm.length){score-=75;risks.push(`岗位方向不符：${mm.slice(0,2).join('/')}`);}
    if(/博士(及以上)?|博士学历/.test(t)){score-=65;risks.push('博士学历门槛');}
    if(/硕士及以上|研究生及以上|硕士学历|研究生学历/.test(t)&&!/本科及以上/.test(t)){score-=48;risks.push('硕士/研究生硬门槛');}
    const exp=t.match(/(\d+)\s*(?:年|年以上|年及以上)(?:工作)?经验/);
    if(exp&&+exp[1]>=3){score-=52;risks.push(`${exp[0]}，偏社招`);}
    else if(exp&&+exp[1]>=2){score-=30;risks.push(`${exp[0]}，应届匹配较差`);}
    if(/社会招聘|社招岗位|非应届/.test(t)){score-=45;risks.push('偏社招');}
    if(/2027届|27届|应届生|校园招聘|校招/.test(t)){score+=10;hits.push('应届/校招');}
    if(/本科及以上|本科以上|本科/.test(t)){score+=5;hits.push('本科学历可投');}
    if(/自动化|电气工程|电子信息|计算机|控制工程|机械电子/.test(t)){score+=4;hits.push('专业相关');}
    if(/英语六级|cet-?6|六级/.test(t)){score+=3;hits.push('CET-6');}

    let ss=0;
    for(const [kw,p] of MODEL.skills){
      if(t.includes(kw)){ss+=p;if(hits.length<12)hits.push(kw==='freertos'?'FreeRTOS':kw);}
    }
    score+=Math.min(38,ss);

    let ind=0;
    for(const [kw,p] of MODEL.industries){
      if(t.includes(kw)){ind+=p;if(hits.length<12)hits.push(kw);}
    }
    score+=Math.min(15,ind);

    for(const [kw,p] of MODEL.gaps){
      if(t.includes(kw)){score-=p;gaps.push(kw);}
    }
    for(const kw of MODEL.badCompany){
      if(t.includes(kw)){score-=25;risks.push(`公司属性需注意：${kw}`);}
    }

    const preferred=split(s.preferredCompanies),blocked=split(s.blockedCompanies),
          boost=split(s.boostKeywords),avoid=split(s.avoidKeywords),cities=split(s.targetCities);
    if(preferred.some(k=>low(company).includes(k))){score+=12;reasons.push('目标公司');}
    if(blocked.some(k=>low(company).includes(k))){score-=50;risks.push('公司黑名单');}
    score+=Math.min(10,boost.filter(k=>t.includes(k)).length*2);
    score-=Math.min(35,avoid.filter(k=>t.includes(k)).length*8);
    if(cities.some(k=>t.includes(k)))score+=4;

    score=Math.max(0,Math.min(100,Math.round(score)));
    const hard=score<45||risks.some(x=>/岗位方向不符|博士学历|硕士\/研究生硬门槛|偏社招|公司黑名单/.test(x));
    const grade=score>=86?'S':score>=74?'A':score>=60?'B':'C';
    const direction=/半导体|芯片|ic\b|soc|asic/i.test(t)&&!/机器人|运动控制|stm32|mcu/i.test(t)
      ?'半导体相关':(/能源|电力|国企|央企|研究所/i.test(t)?'国企/自动化':'嵌入式软件');
    const p=profile(),resume=direction==='半导体相关'?p.resumeSemiconductor:(direction==='国企/自动化'?p.resumeSOE:p.resumeEmbedded);
    return {score,grade,hits:[...new Set(hits)],gaps:[...new Set(gaps)],risks:[...new Set(risks)],reasons,direction,resume,hard};
  }

  function upsertRecord(data,{silent=false}={}){
    if(!data?.title || /未识别岗位|应聘记录|投递记录|申请记录/.test(data.title)) return false;
    const company=data.company||inferCompany();
    const title=norm(data.title);
    const key=`${company}|${title}`.toLowerCase();
    const arr=records(),idx=arr.findIndex(x=>x.key===key);
    const old=idx>=0?arr[idx]:{};
    const item={
      ...old,
      key,
      company,
      title,
      status:data.status||old.status||'已投递',
      score:data.score??old.score??'',
      grade:data.grade||old.grade||'',
      direction:data.direction||old.direction||'',
      resume:data.resume||old.resume||'',
      date:data.date||old.date||nowText(),
      source:data.source||old.source||'自动识别',
      url:data.url||old.url||location.href,
      updatedAt:nowText()
    };
    if(idx>=0)arr[idx]=item; else arr.unshift(item);
    set(K.records,arr);
    if(!silent)toast(`已记录：${company} · ${title}`);
    return true;
  }

  function saveCurrentRecord(status='已投递',source='手动标记'){
    const i=jobInfo(),q=analyze(jdText(),i.title,i.company);
    return upsertRecord({...i,...q,status,date:nowText(),source});
  }

  function extractDate(text){
    const m=String(text||'').match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?/);
    return m?m[0].replace(/[年/.]/g,'-').replace('月','-').replace('日',''):'';
  }

  function extractStatus(text){
    const rules=[
      ['Offer',/offer|录用|已录取/i],
      ['终面',/终面|三面/],
      ['二面',/二面/],
      ['一面',/一面|初面/],
      ['面试',/面试/],
      ['笔试',/笔试|测评/],
      ['已投递',/已投递|投递简历|申请成功|投递成功|提交成功|第\s*\d+\s*志愿/]
    ];
    for(const [s,r] of rules)if(r.test(text))return s;
    return '已投递';
  }

  function candidateHistoryBlocks(){
    const selectors=[
      '[class*="apply-record"]','[class*="application-record"]','[class*="record-item"]',
      '[class*="apply-item"]','[class*="application-item"]','[class*="resume-item"]',
      '[class*="job-item"]','[class*="position-item"]','[class*="record-card"]',
      '.ant-card','.el-card','li'
    ];
    const setv=new Set();
    for(const s of selectors){
      for(const e of $$(s)){
        const t=norm(e.innerText||'');
        if(t.length<15||t.length>1800)continue;
        if(!/(投递简历|已投递|志愿|申请|应聘|笔试|面试|录用)/i.test(t))continue;
        if(!/(工程师|开发|软件|硬件|算法|测试|技术|嵌入式|固件|研发|控制|实习|管培|岗位|职位)/i.test(t))continue;
        setv.add(e);
      }
    }
    return [...setv];
  }

  function extractHistoryTitle(block){
    const t=firstText([
      '.job-name','.job-title','.position-name','.position-title',
      '[class*="job-name"]','[class*="jobName"]','[class*="job-title"]',
      '[class*="position-name"]','[class*="positionName"]','[class*="position-title"]',
      'h1','h2','h3','h4','strong'
    ],block,100);
    if(t && /(工程师|开发|软件|硬件|算法|测试|技术|嵌入式|固件|研发|控制|实习|管培)/i.test(t))return t;

    const lines=(block.innerText||'').split(/\n+/).map(norm).filter(Boolean);
    return lines.find(x=>x.length<=80&&/(工程师|开发|软件|硬件|算法|测试|技术|嵌入式|固件|研发|控制|实习|管培)/i.test(x))||'';
  }

  function scanHistory({silent=false}={}){
    if(!isHistoryPage() || !settings().autoImportHistory)return {found:0,imported:0};
    const blocks=candidateHistoryBlocks();
    let found=0,imported=0;
    const defaultCompany=inferCompany();

    for(const b of blocks){
      const text=norm(b.innerText||'');
      const title=extractHistoryTitle(b);
      if(!title)continue;
      found++;
      const company=inferCompany(b)||defaultCompany;
      const date=extractDate(text)||nowText();
      const status=extractStatus(text);
      const q=analyze(text,title,company);
      const ok=upsertRecord({
        company,title,status,date,
        score:q.score,grade:q.grade,direction:q.direction,resume:q.resume,
        source:'应聘记录页自动识别',url:location.href
      },{silent:true});
      if(ok)imported++;
    }

    renderHistoryPanel({found,imported,total:records().length});
    if(!silent && found)toast(`已识别 ${found} 条应聘记录`);
    return {found,imported};
  }

  function manualApplyClickWatcher(){
    document.addEventListener('click',e=>{
      if(!settings().autoRecordManualApply)return;
      const el=e.target?.closest?.('button,a,[role="button"],input[type="submit"]');
      if(!el)return;
      const txt=norm(el.innerText||el.value||el.getAttribute('aria-label')||'');
      if(!txt)return;

      const finalLike=/确认投递|提交申请|提交简历|发送简历|确认申请|立即投递|投递简历|立即申请|申请职位|我要应聘|立即应聘/i;
      const exclude=/查看|取消|撤回|重新投递|修改简历|投递记录|应聘记录/i;
      if(!finalLike.test(txt)||exclude.test(txt))return;

      const i=jobInfo(),q=analyze(jdText(),i.title,i.company);
      const pending={
        company:i.company,title:i.title,url:i.url,
        score:q.score,grade:q.grade,direction:q.direction,resume:q.resume,
        clickedText:txt,time:Date.now()
      };
      set(K.pendingApply,pending);

      setTimeout(()=>confirmPendingApply(),1300);
      setTimeout(()=>confirmPendingApply(),3500);
    },true);
  }

  function confirmPendingApply(){
    const p=get(K.pendingApply,null);
    if(!p||Date.now()-p.time>15000)return;
    const t=norm(document.body?.innerText||'').slice(0,60000);
    const success=/(投递成功|申请成功|提交成功|简历投递成功|已成功投递|已投递|应聘记录|投递记录|申请记录)/i.test(t) || isHistoryPage();
    if(!success)return;
    upsertRecord({...p,status:'已投递',date:nowText(),source:'手动投递自动识别'});
    set(K.pendingApply,null);
  }

  function cards(){
    const a=adapter(),sels=[...(a?.cards||[]),'[class*="job-card"]','[class*="job-item"]','[class*="position-item"]','[class*="position-card"]'];
    const setv=new Set();
    for(const s of sels){
      for(const e of $$(s)){
        const t=norm(e.innerText||'');
        if(t.length>=18&&t.length<2200&&/(工程师|开发|软件|硬件|嵌入式|固件|研发|控制|岗位|职位|实习)/i.test(t))setv.add(e);
      }
    }
    return [...setv];
  }

  function uiState(kind){
    const all=get(K.ui,{}),h=host();
    return all?.[h]?.[kind]||{};
  }

  function saveUi(kind,patch){
    const all=get(K.ui,{}),h=host();
    all[h]=all[h]||{};
    all[h][kind]={...(all[h][kind]||{}),...patch};
    set(K.ui,all);
  }

  function applyPos(box,p){
    if(!p||p.left==null)return;
    box.style.left=`${Math.max(0,+p.left)}px`;
    box.style.top=`${Math.max(0,+p.top)}px`;
    box.style.right='auto';
  }

  function drag(box,handle,kind){
    if(!box||!handle)return;
    handle.style.cursor='move';
    let on=false,sx=0,sy=0,ox=0,oy=0;
    handle.onmousedown=e=>{
      if(e.target.closest('button,input,select,textarea'))return;
      on=true;
      const r=box.getBoundingClientRect();
      sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top;
      box.style.left=ox+'px';box.style.top=oy+'px';box.style.right='auto';
      document.body.style.userSelect='none';
      e.preventDefault();
    };
    window.addEventListener('mousemove',e=>{
      if(!on)return;
      const l=Math.min(Math.max(0,ox+e.clientX-sx),Math.max(0,innerWidth-box.offsetWidth));
      const t=Math.min(Math.max(0,oy+e.clientY-sy),Math.max(0,innerHeight-box.offsetHeight));
      box.style.left=l+'px';box.style.top=t+'px';
    });
    window.addEventListener('mouseup',()=>{
      if(!on)return;
      on=false;document.body.style.userSelect='';
      const r=box.getBoundingClientRect();
      saveUi(kind,{pos:{left:r.left,top:r.top}});
    });
  }

  const bstyle=(dark=false)=>`border:0;border-radius:7px;padding:8px 9px;font-size:12px;cursor:pointer;${dark?'background:#111;color:#fff':'background:#f1f3f5;color:#222'}`;

  function toast(msg){
    let e=$('#ar-toast');
    if(!e){
      e=document.createElement('div');e.id='ar-toast';
      Object.assign(e.style,{position:'fixed',left:'50%',bottom:'28px',transform:'translateX(-50%)',background:'#111',color:'#fff',padding:'10px 14px',borderRadius:'8px',zIndex:2147483647,fontSize:'13px',boxShadow:'0 5px 20px rgba(0,0,0,.25)'});
      document.body.appendChild(e);
    }
    e.textContent=msg;e.style.display='block';
    clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2300);
  }

  let SHOW_ALL=false;
  function scan(){
    if(detailPage()||isHistoryPage())return;
    const s=settings(),matched=[];let hidden=0,scanned=0;
    for(const card of cards()){
      const ci=cardInfo(card),q=analyze(norm(card.innerText||''),ci.title,ci.company);scanned++;
      card.dataset.arScore=q.score;card.dataset.arUrl=ci.url;card.dataset.arGrade=q.grade;
      $('.ar-badge',card)?.remove();$('.ar-reason',card)?.remove();
      if(getComputedStyle(card).position==='static')card.style.position='relative';
      const badge=document.createElement('span');
      badge.className='ar-badge';badge.textContent=`${q.grade} ${q.score}`;
      Object.assign(badge.style,{position:'absolute',right:'6px',top:'6px',zIndex:999,background:q.grade==='S'?'#137333':q.grade==='A'?'#315efb':q.grade==='B'?'#b06000':'#777',color:'#fff',fontSize:'11px',fontWeight:'700',padding:'5px 7px',borderRadius:'999px',pointerEvents:'none'});
      card.appendChild(badge);

      if(q.score>=s.minKeep&&!q.hard){
        card.style.display='';card.style.outline=q.grade==='S'?'2px solid rgba(19,115,51,.5)':'1px solid rgba(49,94,251,.3)';
        const r=document.createElement('div');r.className='ar-reason';
        r.textContent=`简历匹配：${q.hits.slice(0,6).join(' / ')||'相关技术岗'}${q.gaps.length?' ｜ 弱项：'+q.gaps.slice(0,3).join('/'):''}`;
        Object.assign(r.style,{marginTop:'6px',fontSize:'11px',padding:'5px 7px',borderRadius:'6px',background:'#f1f8f3',color:'#245c31'});
        card.appendChild(r);
        if(ci.url)matched.push({...ci,...q});
      }else{
        card.style.outline='';
        if(s.hideLow&&!SHOW_ALL){card.style.display='none';card.dataset.arHidden='1';hidden++;}
        else{card.style.display='';card.dataset.arHidden='';}
      }
    }
    matched.sort((a,b)=>b.score-a.score);
    set(K.last,matched.slice(0,50));
    renderList({scanned,hidden,matched});
  }

  function renderList(r){
    if(detailPage()||isHistoryPage())return;
    let root=$('#ar-list');
    if(!root){root=document.createElement('div');root.id='ar-list';document.body.appendChild(root);}
    const u=uiState('list'),s=settings();

    if(u.collapsed){
      root.innerHTML=`<div id="ar-list-box" style="position:fixed;right:18px;top:100px;z-index:2147483645;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:9px 11px;display:flex;gap:9px;align-items:center;font-family:Arial,'Microsoft YaHei'"><span id="ar-list-drag"><b>秋招筛岗</b> <small style="color:#137333">${r.matched.length}个</small></span><button id="ar-expand" style="${bstyle()};padding:5px 8px">展开</button></div>`;
      const box=$('#ar-list-box');applyPos(box,u.pos);drag(box,$('#ar-list-drag'),'list');
      $('#ar-expand').onclick=()=>{saveUi('list',{collapsed:false});renderList(r);};
      return;
    }

    root.innerHTML=`<div id="ar-list-box" style="position:fixed;right:18px;top:100px;width:310px;z-index:2147483645;background:#fff;color:#222;border:1px solid #ddd;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:13px;font-family:Arial,'Microsoft YaHei'">
      <div id="ar-list-drag" style="display:flex;justify-content:space-between;align-items:center"><b>秋招自动筛岗 v${VERSION}</b><button id="ar-collapse" style="${bstyle()};padding:5px 8px">收起</button></div>
      <div style="margin-top:9px;font-size:12px;line-height:1.7">扫描：<b>${r.scanned}</b> 个 ｜ 符合 ≥${s.minKeep}：<b style="color:#137333">${r.matched.length}</b> 个<br>${s.hideLow&&!SHOW_ALL?`已隐藏：<b>${r.hidden}</b> 个低匹配岗位`:'当前显示全部岗位'}</div>
      <div style="margin-top:7px;padding:7px;background:#f5f7fa;border-radius:7px;font-size:11px">优先：嵌入式 / 固件 / STM32 / MCU / FreeRTOS / CAN/FDCAN / 机器人底层 / 运动控制</div>
      <button id="ar-open" style="${bstyle(true)};width:100%;margin-top:9px">打开前 ${Math.min(s.maxTabs,r.matched.length)} 个高匹配岗位</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px">
        <button id="ar-all" style="${bstyle()}">${SHOW_ALL?'隐藏低匹配':'显示全部岗位'}</button>
        <button id="ar-rescan" style="${bstyle()}">重新扫描</button>
        <button id="ar-setting" style="${bstyle()}">筛选设置</button>
        <button id="ar-board" style="${bstyle()}">投递看板</button>
      </div>
      <div style="font-size:10px;color:#999;margin-top:8px">不会点击“确认投递/提交申请/发送简历”。顶部可拖动。</div>
    </div>`;
    const box=$('#ar-list-box');applyPos(box,u.pos);drag(box,$('#ar-list-drag'),'list');
    $('#ar-collapse').onclick=()=>{const rr=box.getBoundingClientRect();saveUi('list',{collapsed:true,pos:{left:rr.left,top:rr.top}});renderList(r);};
    $('#ar-open').onclick=()=>openMatches(r.matched);
    $('#ar-all').onclick=()=>{SHOW_ALL=!SHOW_ALL;scan();};
    $('#ar-rescan').onclick=scan;
    $('#ar-setting').onclick=editSettings;
    $('#ar-board').onclick=viewRecords;
  }

  function renderHistoryPanel(r){
    $('#ar-list')?.remove();$('#ar-detail')?.remove();
    let root=$('#ar-history');
    if(!root){root=document.createElement('div');root.id='ar-history';document.body.appendChild(root);}
    const u=uiState('history');
    if(u.collapsed){
      root.innerHTML=`<div id="ar-history-box" style="position:fixed;right:18px;top:100px;z-index:2147483645;background:#fff;border:1px solid #ddd;border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:9px 11px;display:flex;gap:9px;align-items:center;font-family:Arial,'Microsoft YaHei'"><span id="ar-history-drag"><b>投递记录</b> <small style="color:#137333">${r.total}条</small></span><button id="ar-history-expand" style="${bstyle()};padding:5px 8px">展开</button></div>`;
      const box=$('#ar-history-box');applyPos(box,u.pos);drag(box,$('#ar-history-drag'),'history');
      $('#ar-history-expand').onclick=()=>{saveUi('history',{collapsed:false});renderHistoryPanel(r);};
      return;
    }
    root.innerHTML=`<div id="ar-history-box" style="position:fixed;right:18px;top:100px;width:290px;z-index:2147483645;background:#fff;color:#222;border:1px solid #ddd;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:13px;font-family:Arial,'Microsoft YaHei'">
      <div id="ar-history-drag" style="display:flex;justify-content:space-between;align-items:center"><b>投递记录自动同步</b><button id="ar-history-collapse" style="${bstyle()};padding:5px 8px">收起</button></div>
      <div style="margin-top:9px;font-size:12px;line-height:1.7">
        本页识别：<b>${r.found}</b> 条<br>
        本地累计：<b style="color:#137333">${r.total}</b> 条
      </div>
      <div style="margin-top:7px;padding:7px;background:#f1f8f3;border-radius:7px;font-size:11px;color:#245c31">像“应聘记录/投递记录”这种页面会自动识别公司、岗位、日期和状态并写入本地记录。</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px">
        <button id="ar-history-scan" style="${bstyle(true)}">重新同步</button>
        <button id="ar-history-board" style="${bstyle()}">投递看板</button>
      </div>
    </div>`;
    const box=$('#ar-history-box');applyPos(box,u.pos);drag(box,$('#ar-history-drag'),'history');
    $('#ar-history-collapse').onclick=()=>{const rr=box.getBoundingClientRect();saveUi('history',{collapsed:true,pos:{left:rr.left,top:rr.top}});renderHistoryPanel(r);};
    $('#ar-history-scan').onclick=()=>scanHistory();
    $('#ar-history-board').onclick=viewRecords;
  }

  function openMatches(list){
    const s=settings(),arr=(list?.length?list:get(K.last,[])).filter(x=>x.url&&x.score>=s.minOpen).slice(0,s.maxTabs);
    if(!arr.length)return toast(`没有达到自动打开阈值 ≥${s.minOpen} 的岗位`);
    if(s.autoEnterApply)set(K.autoApplyUntil,Date.now()+5*60*1000);
    arr.forEach((x,i)=>setTimeout(()=>{
      try{GM_openInTab(x.url,{active:i===0,insert:true,setParent:true});}
      catch(_){window.open(x.url,'_blank');}
    },i*220));
    toast(`已打开 ${arr.length} 个高匹配岗位`);
  }

  function safeApply(){
    const ok=/^(投递简历|去投递|申请职位|立即申请|申请岗位|我要应聘|立即应聘|去申请|apply|apply now)$/i;
    for(const a of $$('a[href]')){
      const t=norm(a.innerText||'');
      if(!ok.test(t))continue;
      const h=a.getAttribute('href')||'';
      if(!h||/^javascript:|^#/.test(h))continue;
      try{return new URL(h,location.href).toString();}catch(_){}
    }
    return '';
  }

  function gotoApply(manual=false){
    const info=jobInfo(),q=analyze(jdText(),info.title,info.company),s=settings();
    if(!manual&&q.score<s.minOpen)return;
    const u=safeApply();
    if(u){location.assign(u);return;}
    const btn=$$('button,[role="button"],a').find(e=>
      /投递简历|立即投递|申请职位|立即申请|申请岗位|我要应聘|立即应聘|去申请|apply now/i.test(norm(e.innerText||'')) &&
      !/确认投递|提交申请|提交简历|发送简历|确认申请/i.test(norm(e.innerText||''))
    );
    if(btn){
      btn.style.outline='3px solid #137333';btn.style.outlineOffset='3px';
      btn.scrollIntoView({behavior:'smooth',block:'center'});
      toast('已定位投递按钮；该按钮可能直接触发动作，因此没有自动点击');
    }else toast('未识别到申请入口，可能需要先登录');
  }

  function copyJD(){
    const i=jobInfo(),q=analyze(jdText(),i.title,i.company);
    const txt=`请结合我的嵌入式/自动化秋招简历分析岗位：
公司：${i.company}
岗位：${i.title}
脚本匹配：${q.grade} ${q.score}/100
方向：${q.direction}
推荐简历：${q.resume}
命中：${q.hits.join(' / ')}
风险：${q.risks.join(' / ')||'无'}
技能缺口：${q.gaps.join(' / ')||'无'}

JD：
${jdText()}

请判断是否值得投、匹配度、简历强化点、缺口和最可能的面试问题。`;
    try{GM_setClipboard(txt,'text');}catch(_){navigator.clipboard?.writeText(txt);}
    toast('已复制 JD 分析文本');
  }

  function fill(){
    const p=profile();let n=0;
    for(const e of $$('input:not([type=hidden]):not([type=file]):not([type=password]),textarea,select')){
      if(e.disabled||e.readOnly)continue;
      const ctx=low([e.name,e.id,e.placeholder,e.getAttribute('aria-label'),norm(e.parentElement?.innerText||'')].filter(Boolean).join(' '));
      let v='';
      if(/姓名|真实姓名/.test(ctx))v=p.name;
      else if(/手机号|手机号码|联系电话|phone|mobile/.test(ctx))v=p.phone;
      else if(/邮箱|email|e-mail/.test(ctx))v=p.email;
      else if(/学校|毕业院校|院校|university/.test(ctx))v=p.school;
      else if(/专业|major/.test(ctx))v=p.major;
      else if(/学历|degree|education/.test(ctx))v=p.degree;
      else if(/毕业年份|毕业时间|graduation/.test(ctx))v=p.graduation;
      else if(/城市|city/.test(ctx))v=p.city;
      else if(/技能|skills/.test(ctx))v=p.skills;
      if(!v)continue;
      try{
        if(e.tagName==='SELECT'){
          const o=[...e.options].find(o=>norm(o.textContent).includes(v));
          if(!o)continue;e.value=o.value;
        }else e.value=v;
        e.dispatchEvent(new Event('input',{bubbles:true}));
        e.dispatchEvent(new Event('change',{bubbles:true}));
        n++;
      }catch(_){}
    }
    toast(`已填写 ${n} 个字段，请检查后再提交`);
  }

  function renderDetail(){
    if(!detailPage())return;
    $('#ar-list')?.remove();$('#ar-history')?.remove();
    let root=$('#ar-detail');
    if(!root){root=document.createElement('div');root.id='ar-detail';document.body.appendChild(root);}
    const u=uiState('detail'),i=jobInfo(),q=analyze(jdText(),i.title,i.company);
    const rec=records().find(x=>x.key===`${i.company}|${i.title}`.toLowerCase());

    if(u.collapsed){
      root.innerHTML=`<div id="ar-detail-box" style="position:fixed;right:18px;top:110px;z-index:2147483645;background:#111;color:#fff;border-radius:999px;padding:9px 12px;box-shadow:0 6px 20px rgba(0,0,0,.2);display:flex;gap:8px;align-items:center"><span id="ar-detail-drag">秋招 ${q.grade} ${q.score}</span><button id="ar-detail-expand" style="border:0;border-radius:999px;padding:4px 7px;cursor:pointer">展开</button></div>`;
      const box=$('#ar-detail-box');applyPos(box,u.pos);drag(box,$('#ar-detail-drag'),'detail');
      $('#ar-detail-expand').onclick=()=>{saveUi('detail',{collapsed:false});renderDetail();};
      return;
    }

    root.innerHTML=`<div id="ar-detail-box" style="position:fixed;right:18px;top:110px;width:310px;z-index:2147483645;background:#fff;color:#222;border:1px solid #ddd;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:13px;font-family:Arial,'Microsoft YaHei'">
      <div id="ar-detail-drag" style="display:flex;justify-content:space-between;align-items:center"><b>秋招助手 v${VERSION}</b><button id="ar-detail-collapse" style="${bstyle()};padding:5px 8px">收起</button></div>
      <div style="margin-top:8px;font-size:12px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(i.company)} · ${esc(i.title)}</div>
      <div style="font-size:28px;font-weight:750;margin-top:7px;color:${q.score>=86?'#137333':q.score>=74?'#315efb':q.score>=60?'#b06000':'#b3261e'}">${q.grade} ${q.score}</div>
      <div style="font-size:12px;line-height:1.6">方向：<b>${esc(q.direction)}</b><br>推荐：<b>${esc(q.resume)}</b></div>
      <div style="font-size:11px;color:#666;margin-top:6px">命中：${esc(q.hits.slice(0,7).join(' / ')||'暂无')}${q.gaps.length?'<br>缺口：'+esc(q.gaps.join(' / ')):''}</div>
      ${q.risks.length?`<div style="margin-top:7px;padding:7px;background:#fff1f0;border-radius:7px;font-size:11px;color:#b3261e">⚠ ${esc(q.risks.join(' / '))}</div>`:''}
      ${rec?`<div style="margin-top:6px;font-size:11px;background:#f1f8f3;padding:6px;border-radius:6px;color:#245c31">已记录：${esc(rec.status)} · ${esc(rec.date)}<br>${esc(rec.source||'')}</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px">
        <button id="ar-apply" style="${bstyle(true)}">打开申请/投递页</button>
        <button id="ar-copy" style="${bstyle()}">复制JD给ChatGPT</button>
        <button id="ar-fill" style="${bstyle()}">自动填写</button>
        <button id="ar-applied" style="${bstyle()}">✅ 已投递</button>
        <button id="ar-board" style="${bstyle()}">投递看板</button>
        <button id="ar-setting" style="${bstyle()}">筛选设置</button>
      </div>
      <div style="font-size:10px;color:#999;margin-top:8px">你自己点击网站的最终投递按钮后，脚本会尝试自动确认并记录。</div>
    </div>`;

    const box=$('#ar-detail-box');applyPos(box,u.pos);drag(box,$('#ar-detail-drag'),'detail');
    $('#ar-detail-collapse').onclick=()=>{const rr=box.getBoundingClientRect();saveUi('detail',{collapsed:true,pos:{left:rr.left,top:rr.top}});renderDetail();};
    $('#ar-apply').onclick=()=>gotoApply(true);
    $('#ar-copy').onclick=copyJD;
    $('#ar-fill').onclick=fill;
    $('#ar-applied').onclick=()=>saveCurrentRecord('已投递','手动标记');
    $('#ar-board').onclick=viewRecords;
    $('#ar-setting').onclick=editSettings;
  }

  function modal(title,body,onReady){
    $('#ar-modal')?.remove();
    const w=document.createElement('div');w.id='ar-modal';
    w.innerHTML=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:2147483646"></div>
    <div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(860px,94vw);max-height:86vh;overflow:auto;background:#fff;z-index:2147483647;border-radius:12px;padding:18px;font-family:Arial,'Microsoft YaHei';color:#222">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">${esc(title)}</b><button id="ar-x" style="${bstyle()}">关闭</button></div>
      <div style="margin-top:10px">${body}</div>
    </div>`;
    document.body.appendChild(w);
    $('#ar-x',w).onclick=()=>w.remove();
    w.firstElementChild.onclick=()=>w.remove();
    onReady?.(w);
  }

  function viewRecords(){
    const a=records();
    const counts={};
    for(const x of a)counts[x.status]=(counts[x.status]||0)+1;
    const rows=a.slice(0,300).map((x,i)=>`<tr data-i="${i}">
      <td>${esc(x.company)}</td><td>${esc(x.title)}</td><td>${esc(x.status)}</td>
      <td>${esc(x.grade||'')} ${esc(x.score??'')}</td><td>${esc(x.date||'')}</td>
      <td>${esc(x.source||'')}</td><td><a href="${esc(x.url||'#')}" target="_blank">打开</a></td>
    </tr>`).join('');
    modal('秋招投递看板',`
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;margin-bottom:10px">
        <span style="padding:6px 9px;background:#f1f8f3;border-radius:999px">总计 ${a.length}</span>
        ${Object.entries(counts).map(([k,v])=>`<span style="padding:6px 9px;background:#f5f7fa;border-radius:999px">${esc(k)} ${v}</span>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input id="ar-search-record" placeholder="搜索公司 / 岗位" style="flex:1;height:34px;box-sizing:border-box;padding:0 8px">
        <button id="ar-export-record" style="${bstyle()}">导出 CSV</button>
        <button id="ar-clear-record" style="${bstyle()}">清空全部</button>
      </div>
      <div style="max-height:58vh;overflow:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr><th>公司</th><th>岗位</th><th>状态</th><th>匹配</th><th>投递日期</th><th>来源</th><th>链接</th></tr></thead>
          <tbody id="ar-record-body">${rows||'<tr><td colspan="7">暂无记录</td></tr>'}</tbody>
        </table>
      </div>`,w=>{
        $$('th,td',w).forEach(e=>{e.style.border='1px solid #ddd';e.style.padding='6px';e.style.textAlign='left';});
        $('#ar-search-record',w).oninput=e=>{
          const q=low(e.target.value);
          $$('tbody tr',w).forEach(tr=>tr.style.display=!q||low(tr.innerText).includes(q)?'':'none');
        };
        $('#ar-export-record',w).onclick=exportCSV;
        $('#ar-clear-record',w).onclick=()=>{
          if(confirm('确定清空全部投递记录吗？此操作不可撤销。')){
            set(K.records,[]);w.remove();toast('投递记录已清空');
          }
        };
      });
  }

  function editSettings(){
    const s=settings();
    modal('自动筛岗与投递记录设置',`
      <label>列表保留最低分</label><input id="s1" type="number" value="${s.minKeep}" style="width:100%;height:32px">
      <label style="display:block;margin-top:8px">自动打开最低分</label><input id="s2" type="number" value="${s.minOpen}" style="width:100%;height:32px">
      <label style="display:block;margin-top:8px">每次最多打开</label><input id="s3" type="number" value="${s.maxTabs}" style="width:100%;height:32px">
      <label style="display:block;margin-top:8px">目标公司（逗号分隔）</label><input id="s4" value="${esc(s.preferredCompanies)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:8px">公司黑名单</label><input id="s5" value="${esc(s.blockedCompanies)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:9px"><input id="s6" type="checkbox" ${s.hideLow?'checked':''}> 自动隐藏低匹配岗位</label>
      <label style="display:block;margin-top:6px"><input id="s7" type="checkbox" ${s.autoEnterApply?'checked':''}> 高匹配岗位打开后自动进入明确的申请链接</label>
      <label style="display:block;margin-top:6px"><input id="s8" type="checkbox" ${s.autoRecordManualApply?'checked':''}> 自动识别我手动点击的投递/提交动作</label>
      <label style="display:block;margin-top:6px"><input id="s9" type="checkbox" ${s.autoImportHistory?'checked':''}> 自动扫描“应聘记录/投递记录”页面</label>
      <button id="ss" style="${bstyle(true)};width:100%;margin-top:12px">保存</button>`,w=>{
        $('#ss',w).onclick=()=>{
          const n={...settings(),
            minKeep:Math.max(0,Math.min(100,+$('#s1',w).value||68)),
            minOpen:Math.max(0,Math.min(100,+$('#s2',w).value||76)),
            maxTabs:Math.max(1,Math.min(12,+$('#s3',w).value||5)),
            preferredCompanies:$('#s4',w).value.trim(),
            blockedCompanies:$('#s5',w).value.trim(),
            hideLow:$('#s6',w).checked,
            autoEnterApply:$('#s7',w).checked,
            autoRecordManualApply:$('#s8',w).checked,
            autoImportHistory:$('#s9',w).checked
          };
          set(K.settings,n);w.remove();route();toast('设置已保存');
        };
      });
  }

  function editProfile(){
    const p=profile();
    modal('个人资料（仅保存在本机 Tampermonkey）',`
      <label>姓名</label><input id="p1" value="${esc(p.name)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:7px">手机</label><input id="p2" value="${esc(p.phone)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:7px">邮箱</label><input id="p3" value="${esc(p.email)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:7px">学校</label><input id="p4" value="${esc(p.school)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:7px">专业</label><input id="p5" value="${esc(p.major)}" style="width:100%;height:32px">
      <label style="display:block;margin-top:7px">目标城市</label><input id="p6" value="${esc(p.city)}" style="width:100%;height:32px">
      <button id="ps" style="${bstyle(true)};width:100%;margin-top:12px">保存</button>`,w=>{
        $('#ps',w).onclick=()=>{
          set(K.profile,{...profile(),name:$('#p1',w).value.trim(),phone:$('#p2',w).value.trim(),email:$('#p3',w).value.trim(),school:$('#p4',w).value.trim(),major:$('#p5',w).value.trim(),city:$('#p6',w).value.trim()});
          w.remove();toast('个人资料已保存到本机');
        };
      });
  }

  function exportCSV(){
    const a=records();
    if(!a.length)return toast('暂无投递记录');
    const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const rows=[
      ['公司','岗位','状态','分数','等级','方向','简历','投递日期','记录来源','链接'],
      ...a.map(x=>[x.company,x.title,x.status,x.score,x.grade,x.direction,x.resume,x.date,x.source,x.url])
    ];
    const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const u=URL.createObjectURL(blob),ael=document.createElement('a');
    ael.href=u;ael.download='秋招投递记录.csv';ael.click();URL.revokeObjectURL(u);
  }

  function enableHost(){
    const a=get(K.hosts,[]),h=host();
    set(K.hosts,[...new Set([...(Array.isArray(a)?a:[]),h])]);
    toast('已启用当前网站，刷新后生效');
  }

  function maybeAutoApply(){
    if(Date.now()>+get(K.autoApplyUntil,0)||!detailPage())return;
    setTimeout(()=>gotoApply(false),1200);
  }

  function route(){
    $('#ar-list')?.remove();$('#ar-detail')?.remove();$('#ar-history')?.remove();
    if(isHistoryPage()){
      const r=scanHistory({silent:true});
      if(!r.found)renderHistoryPanel({found:0,imported:0,total:records().length});
    }else if(detailPage()){
      renderDetail();confirmPendingApply();maybeAutoApply();
    }else{
      scan();confirmPendingApply();
    }
  }

  function schedule(){
    clearTimeout(schedule.t);
    schedule.t=setTimeout(route,420);
  }

  try{
    GM_registerMenuCommand('秋招助手：启用当前网站',enableHost);
    GM_registerMenuCommand('秋招助手：自动筛选岗位',scan);
    GM_registerMenuCommand('秋招助手：打开高匹配岗位',()=>openMatches(get(K.last,[])));
    GM_registerMenuCommand('秋招助手：扫描当前应聘记录页',()=>scanHistory());
    GM_registerMenuCommand('秋招助手：投递看板',viewRecords);
    GM_registerMenuCommand('秋招助手：筛选与记录设置',editSettings);
    GM_registerMenuCommand('秋招助手：个人资料',editProfile);
    GM_registerMenuCommand('秋招助手：导出投递记录',exportCSV);
  }catch(_){}

  if(isRecruitPage()){
    manualApplyClickWatcher();
    setTimeout(route,550);
    let last=location.href;
    setInterval(()=>{
      if(location.href!==last){
        last=location.href;
        setTimeout(route,750);
      }else{
        confirmPendingApply();
      }
    },1000);
    try{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}catch(_){}
  }
})();
