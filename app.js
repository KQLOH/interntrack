/* InternTrack — no build tools needed. Open index.html for a local demo.
   Configure config.js + schema.sql to enable Supabase cloud sync and accounts. */
(() => {
  "use strict";
  const CONFIG = window.INTERNTRACK_CONFIG || {};
  const CLOUD = Boolean(/^https:\/\//i.test(CONFIG.supabaseUrl || "") && (CONFIG.supabaseAnonKey || "").trim());
  const DEMO_KEY = "interntrack_demo_v1";
  const el = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const I18N = window.IT_I18N;
  const t = key => I18N.t(key);
  const statusOptions = {
    to_apply: ['saved', 'researching', 'preparing', 'ready'],
    applied: ['applied', 'hr_contacted', 'assessment', 'interview', 'offer', 'rejected', 'withdrawn']
  };
  const statusStyles = {saved:'gray', researching:'blue', preparing:'orange',ready:'green',applied:'blue',hr_contacted:'purple',assessment:'orange',interview:'purple',offer:'green',rejected:'red',withdrawn:'gray'};
  const priorities = ['high','medium','low'];
  const modes = ['on_site','hybrid','remote'];
  const langSwitch = () => `<div class="language-switch" role="group" aria-label="${escapeHtml(t('common.language'))}"><button type="button" data-language="en" aria-pressed="${I18N.get()==='en'}" class="${I18N.get()==='en'?'selected':''}">EN</button><span aria-hidden="true">/</span><button type="button" data-language="zh" aria-pressed="${I18N.get()==='zh'}" class="${I18N.get()==='zh'?'selected':''}">中文</button></div>`;
  const example = [{
    id:'example-theta',stage:'applied',status:'assessment',priority:'high',company:'Theta Service Partner Sdn Bhd',
    position:'Software Engineer Intern',location:'Kuala Lumpur',work_mode:'hybrid',job_url:'',platform:'TARUMT CareeReX',resume_version:'',
    applied_date:null,deadline:'2026-10-30',next_action:'Java programming assessment (30 minutes)',next_action_date:'2026-10-14',
    allowance_min:1200,allowance_max:1500,contact_name:'Reiko (HR)',contact_email:'',
    notes:t('example.notes'),created_at:'2026-10-12T00:00:00Z'
  }];
  const state = {stage:'to_apply',records:[],user:null,sb:null,modal:null,authMode:'signin',cloud:CLOUD,search:'',filter:'all',loading:false};
  let toastTimer;

  function toast(msg,bad=false) {
    const root=el('toast');
    if (!root) return;
    root.innerHTML=`<div class="toast ${bad?'bad':''}">${escapeHtml(msg)}</div>`;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>root.innerHTML='',3800);
  }
  function logo(){return `<div class="logo"><span class="logo-symbol">↗</span><div><div class="logo-name">InternTrack</div><small class="logo-tagline">${t('brand.tagline')}</small></div></div>`;}
  function toISO(d){const pad=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
  const todayISO=()=>toISO(new Date());
  function fmtDate(s){if(!s)return '—';const [y,m,d]=String(s).split('-').map(Number);if(!y||!m||!d)return String(s);return new Date(y,m-1,d).toLocaleDateString(I18N.get()==='zh'?'zh-CN':'en-MY',{day:'numeric',month:'short',year:'numeric'});}
  const statusLabel=key=>{const label=t('status.'+key);return label==='status.'+key?key:label;};
  const safeUrl=v=>{let u=String(v||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;try{const parsed=new URL(u);return ['https:','http:'].includes(parsed.protocol)?parsed.href:'';}catch{return '';}};
  const daysUntil=date=>Math.round((new Date(`${date}T12:00:00`).getTime()-new Date(`${todayISO()}T12:00:00`).getTime())/86400000);
  const active=r=>!['offer','rejected','withdrawn'].includes(r.status);
  const dueDate=r=>r.next_action_date||r.deadline||'';
  function getStats(){
    return {toApply:state.records.filter(r=>r.stage==='to_apply').length,
      applied:state.records.filter(r=>r.stage==='applied').length,
      inProgress:state.records.filter(r=>r.stage==='applied'&&!['applied','offer','rejected','withdrawn'].includes(r.status)).length,
      due:state.records.filter(r=>active(r)&&dueDate(r)&&daysUntil(dueDate(r))>=0&&daysUntil(dueDate(r))<=7).length};
  }
  function loadDemo() {
    try{
      const existing=localStorage.getItem(DEMO_KEY);
      if(existing!==null)return JSON.parse(existing)||[];
      localStorage.setItem(DEMO_KEY,JSON.stringify(example));
    }catch{ /* Demo still renders if local storage is restricted. */ }
    return [...example];
  }
  function saveDemo(){try{localStorage.setItem(DEMO_KEY,JSON.stringify(state.records));}catch{toast(t('error.demoSave'),true);}}
  function renderAuth(){
    const signup=state.authMode==='signup';
    el('app').innerHTML=`<div class="auth-page"><section class="auth-card">
      <div class="auth-header">${logo()}${langSwitch()}</div>
      <h1 class="auth-title">${escapeHtml(t(signup?'auth.create':'auth.welcome'))}</h1>
      <p class="auth-sub">${escapeHtml(t(signup?'auth.createSub':'auth.welcomeSub'))}</p>
      <form id="auth-form"><div class="field"><label for="auth-email">${escapeHtml(t('common.email'))}</label><input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com" required /></div>
      <div class="field"><label for="auth-password">${escapeHtml(t('common.password'))}</label><input id="auth-password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="6" required placeholder="••••••••" /></div>
      <button class="btn primary" type="submit">${escapeHtml(t(signup?'common.signUp':'common.signIn'))} →</button></form>
      <div class="auth-alt">${escapeHtml(t(signup?'auth.haveAccount':'auth.noAccount'))} <button type="button" data-action="switch-auth">${escapeHtml(t(signup?'common.signIn':'common.signUp'))}</button></div>
      <p class="auth-alt">${escapeHtml(t('auth.footer'))}</p></section></div>`;
  }
  function renderApp(){
    const st=getStats();
    const applied=state.stage==='applied';
    el('app').innerHTML=`<div class="layout"><aside class="sidebar">
      ${logo()}
      <nav class="nav" aria-label="Navigation"><button type="button" class="nav-btn ${!applied?'active':''}" data-stage="to_apply">☆ &nbsp; ${escapeHtml(t('nav.toApply'))} <b>${st.toApply}</b></button>
      <button type="button" class="nav-btn ${applied?'active':''}" data-stage="applied">✓ &nbsp; ${escapeHtml(t('nav.applied'))} <b>${st.applied}</b></button></nav>
      <div class="sidebar-note"><strong>${t(state.cloud?'sidebar.cloud':'sidebar.demo')}</strong>${escapeHtml(t(state.cloud?'sidebar.cloudDesc':'sidebar.demoDesc'))}</div>
      <div class="sidebar-footer">2027 Internship Tracker · v2.0</div>
      </aside><main class="main">
        <header class="topbar"><div><div class="eyebrow">${t('page.eyebrow')}</div><h1 class="page-title">${escapeHtml(t(applied?'page.appliedTitle':'page.toApplyTitle'))}</h1><p class="subtitle">${escapeHtml(t(applied?'page.appliedSub':'page.toApplySub'))}</p></div>
        <div class="top-actions">${langSwitch()}<button type="button" class="btn" data-action="resume-upload">📄 ${I18N.get()==='zh'?'保存 Resume':'Save Resume'}</button><button type="button" class="btn" data-action="export">${t('action.export')}</button><button type="button" class="btn" data-action="reload">${t('action.refresh')}</button>${state.cloud?`<button type="button" class="btn" data-action="logout">${t('action.signout')}</button>`:''}<button type="button" class="btn primary" data-action="new">${t('action.add')}</button></div></header>
        <div class="mode-banner ${state.cloud?'cloud':''}"><span>${state.cloud?'●':'⚠'}</span><div><b>${t(state.cloud?'banner.cloudTitle':'banner.demoTitle')}</b> ${state.cloud?escapeHtml(state.user?.email||'')+' · '+escapeHtml(t('banner.cloudDesc')):escapeHtml(t('banner.demoDesc'))}</div></div>
        <div class="stats"><div class="stat"><div class="stat-label">${t('stat.toApply')}</div><div class="stat-num">${st.toApply}</div><div class="stat-footer">${t('nav.toApply')}</div></div>
          <div class="stat"><div class="stat-label">${t('stat.applied')}</div><div class="stat-num">${st.applied}</div><div class="stat-footer">${t('stat.applications')}</div></div>
          <div class="stat"><div class="stat-label">${t('stat.inProgress')}</div><div class="stat-num">${st.inProgress}</div><div class="stat-footer">${t('stat.pipelineFooter')}</div></div>
          <div class="stat"><div class="stat-label">${t('stat.due')}</div><div class="stat-num">${st.due}</div><div class="stat-footer">${t('stat.upcoming')}</div></div></div>
        <section class="panel"><div class="panel-head"><div><div class="panel-title">${t(applied?'panel.pipeline':'panel.saved')}</div><div class="panel-subtitle">${t(applied?'panel.pipelineSub':'panel.savedSub')}</div></div>
          <div class="filters"><input class="control search" id="search" placeholder="${escapeHtml(t('panel.search'))}" value="${escapeHtml(state.search)}" aria-label="${escapeHtml(t('panel.searchAria'))}" />
          <select class="control" id="filter" aria-label="${escapeHtml(t('panel.filterAria'))}"><option value="all">${t('panel.allStatus')}</option>${statusOptions[state.stage].map(key=>`<option value="${key}" ${state.filter===key?'selected':''}>${escapeHtml(statusLabel(key))}</option>`).join('')}</select></div></div>
          <div class="company-list" id="company-list"></div>
        </section></main></div><div id="modal-root"></div>`;
    renderCards();
  }
  function recordCard(r){
    const chips=`<span class="chip ${statusStyles[r.status]||'gray'}">${escapeHtml(statusLabel(r.status))}</span><span class="chip ${r.priority==='high'?'orange':'gray'}">${escapeHtml(t('priority.'+r.priority))}</span>${r.work_mode?`<span class="chip gray">${escapeHtml(t('mode.'+r.work_mode))}</span>`:''}`;
    const when=dueDate(r);
    const due=when?daysUntil(when):null;
    const urgent=due!==null&&active(r)&&due<=3;
    const meta=`<span>📍 ${escapeHtml(r.location||t('record.noLocation'))}</span><span>📅 ${t(r.stage==='applied'?'record.appliedDate':'record.deadline')} <strong>${escapeHtml(fmtDate(r.stage==='applied'?r.applied_date:r.deadline))}</strong></span>${when?`<span style="${urgent?'color:#bd4355;font-weight:800':''}">⏰ ${t('record.nextDate')} ${escapeHtml(fmtDate(when))}${due!==null&&due<0?' ('+t('record.overdue')+')':''}</span>`:''}`;
    const url=safeUrl(r.job_url);
    return `<article class="company-card" data-company-id="${escapeHtml(r.id)}"><div class="company-main" role="button" tabindex="0" aria-label="${escapeHtml(I18N.get()==='zh'?'查看公司详情':'View company details')}"><div class="company-header"><div class="company-name">${escapeHtml(r.company)}</div>${chips}</div><p class="company-role">${escapeHtml(r.position)}${r.next_action?' · '+t('record.next')+' '+escapeHtml(r.next_action):''}</p><div class="company-meta">${meta}</div></div>
      <div class="company-actions">${url?`<a class="btn small soft" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${t('action.job')}</a>`:''}<button class="btn small soft" type="button" data-action="email-apply" data-id="${escapeHtml(r.id)}">✉ ${escapeHtml(I18N.get()==='zh'?'邮件申请':'Apply by Email')}</button>${r.stage==='to_apply'?`<button class="btn small primary" type="button" data-action="move" data-id="${escapeHtml(r.id)}">${t('action.markApplied')}</button>`:''}<button class="btn small" type="button" data-action="edit" data-id="${escapeHtml(r.id)}">${t('action.edit')}</button><button class="btn small danger" type="button" data-action="delete" data-id="${escapeHtml(r.id)}">${t('action.delete')}</button></div></article>`;
  }
  function renderCards(){
    const holder=el('company-list');if(!holder)return;
    const q=state.search.toLocaleLowerCase().trim();
    let rows=state.records.filter(r=>r.stage===state.stage && (state.filter==='all'||r.status===state.filter) && (!q||[r.company,r.position,r.location,r.notes,r.platform,r.next_action].some(v=>String(v||'').toLocaleLowerCase().includes(q))));
    rows=rows.sort((a,b)=>{
      const ad=dueDate(a),bd=dueDate(b);
      if(ad&&bd&&ad!==bd)return ad.localeCompare(bd);
      if(ad&&!bd)return -1;if(bd&&!ad)return 1;
      return (b.created_at||'').localeCompare(a.created_at||'');
    });
    const filtering=q||state.filter!=='all';
    holder.innerHTML=rows.length?rows.map(recordCard).join(''):`<div class="empty"><div class="empty-icon">${state.stage==='to_apply'?'☆':'✓'}</div><h3>${t(filtering?'record.emptyFilteredTitle':'record.emptyTitle')}</h3><p>${t(filtering?'record.emptyFilteredSub':'record.emptySub')}</p>${filtering?'':`<button class="btn primary" data-action="new">${t('action.add')}</button>`}</div>`;
  }
  const field=(name,label,value='',type='text',extra='')=>`<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><input id="f-${name}" name="${name}" type="${type}" value="${escapeHtml(value??'')}" ${extra}/></div>`;
  function select(name,label,options,value){return `<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><select id="f-${name}" name="${name}">${options.map(o=>`<option value="${escapeHtml(o[0])}" ${String(value||'')===o[0]?'selected':''}>${escapeHtml(o[1])}</option>`).join('')}</select></div>`;}
  const optStatus=(stage,status)=>statusOptions[stage].map(key=>`<option value="${key}" ${status===key?'selected':''}>${escapeHtml(statusLabel(key))}</option>`).join('');
  const stageOptions=()=>[['to_apply',t('nav.toApply')],['applied',t('nav.applied')]];
  const priorityOptions=()=>priorities.map(k=>[k,t('priority.'+k)]);
  const modeOptions=()=>[['',t('common.noValue')],...modes.map(k=>[k,t('mode.'+k)])];
  function detailItem(label,value){return '<div class="detail-item"><dt>'+escapeHtml(label)+'</dt><dd>'+escapeHtml(value==null||value===''?'—':String(value))+'</dd></div>';}
  function showDetails(id){
    const r=state.records.find(x=>String(x.id)===String(id));if(!r)return;
    const zh=I18N.get()==='zh', say=(en,cn)=>zh?cn:en;
    state.modal={kind:'details',id:r.id};
    const link=safeUrl(r.job_url);
    el('modal-root').innerHTML=`<div class="overlay" data-action="close-overlay"><section class="modal details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-title">
       <header class="modal-head"><div><h2 id="details-title" class="modal-title">${escapeHtml(r.company)}</h2><p class="modal-sub">${escapeHtml(r.position)}</p></div><button type="button" class="icon-close" data-action="close" aria-label="Close">×</button></header>
       <div class="details-grid">
       ${detailItem(say('Stage','分类'),r.stage==='to_apply'?t('nav.toApply'):t('nav.applied'))}
       ${detailItem(say('Status','进度'),statusLabel(r.status))}
       ${detailItem(say('Priority','优先级'),t('priority.'+r.priority))}
       ${detailItem(say('Location','地点'),r.location)}
       ${detailItem(say('Work mode','工作方式'),r.work_mode?t('mode.'+r.work_mode):'')}
       ${detailItem(say('Platform','投递平台'),r.platform)}
       ${detailItem(say('Applied date','投递日期'),fmtDate(r.applied_date))}
       ${detailItem(say('Application deadline','申请截止日期'),fmtDate(r.deadline))}
       ${detailItem(say('Next action','下一步'),r.next_action)}
       ${detailItem(say('Next due date','下一步截止日期'),fmtDate(r.next_action_date))}
       ${detailItem(say('Allowance (RM)','津贴 (RM)'),[r.allowance_min,r.allowance_max].filter(v=>v!=null&&v!=='').join(' – '))}
       ${detailItem(say('HR contact','HR 联系人'),r.contact_name)}
       ${detailItem(say('HR email','HR 邮箱'),r.contact_email)}
       ${detailItem(say('Resume version','Resume 版本'),r.resume_version)}
       </div>
       <div class="detail-notes"><strong>${say('Notes','备注')}</strong><p>${escapeHtml(r.notes||'—')}</p></div>
       <footer class="modal-actions">${link?`<a class="btn" target="_blank" rel="noopener noreferrer" href="${escapeHtml(link)}">${say('Open job listing','打开职位链接')} ↗</a>`:''}<button class="btn primary" type="button" data-action="detail-email" data-id="${escapeHtml(r.id)}">✉ ${say('Prepare Gmail','准备 Gmail')}</button><button class="btn" type="button" data-action="edit" data-id="${escapeHtml(r.id)}">${say('Edit','编辑')}</button><button class="btn" type="button" data-action="close">${say('Close','关闭')}</button></footer>
       </section></div>`;
  }
  async function uploadResume(){
    if(!state.cloud||!state.sb||!state.user){toast(I18N.get()==='zh'?'请先连接 Supabase 并登录。':'Sign in with Supabase first.',true);return;}
    const input=document.createElement('input');input.type='file';input.accept='.pdf,application/pdf';
    input.addEventListener('change',async ()=>{
      const pdf=input.files?.[0];if(!pdf)return;
      if((pdf.type!=='application/pdf'&&!/\.pdf$/i.test(pdf.name))||pdf.size>8*1024*1024||pdf.size===0){toast('Please select a PDF under 8 MB.',true);return;}
      if(!confirm((I18N.get()==='zh'?'私密保存此 Resume 供自己下载？':'Save this resume PDF privately for your account?')+'\n'+pdf.name))return;
      try{
        const path=state.user.id+'/resume.pdf';
        const {error}=await state.sb.storage.from('resumes').upload(path,pdf,{contentType:'application/pdf',upsert:true});
        if(error)throw error;
        toast(I18N.get()==='zh'?'Resume 已保存到私人云端 Storage。':'Resume saved to private cloud storage.');
      }catch(e){toast((e.message||String(e))+' — See RESUME_STORAGE_SETUP.md',true);}
    });
    input.click();
  }
  async function downloadResume(){
    if(!state.cloud||!state.sb||!state.user)throw Error('Supabase login required.');
    const {data,error}=await state.sb.storage.from('resumes').download(state.user.id+'/resume.pdf');
    if(error)throw error;
    const url=URL.createObjectURL(data);
    const a=document.createElement('a');a.href=url;a.download='Loh_Kher_Qin_Resume.pdf';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function openModal(id,draft){
    const current=state.records.find(r=>r.id===id)||{};
    const record=draft?{...current,...draft}:current;
    const newItem=!id;
    const stage=record.stage||state.stage;
    const status=record.status|| (stage==='to_apply'?'saved':'applied');
    state.modal={id:id||null};
    el('modal-root').innerHTML=`<div class="overlay" data-action="close-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><h2 class="modal-title" id="modal-title">${t(newItem?'form.newTitle':'form.editTitle')}</h2><p class="modal-sub">${t('form.subtitle')}</p></div><div class="modal-header-actions">${langSwitch()}<button class="icon-close" aria-label="${t('form.close')}" type="button" data-action="close">×</button></div></header>
       <form id="record-form"><div class="section-label">${t('form.basic')}</div><div class="formgrid">
         ${field('company',t('form.company'),record.company,'text','required maxlength="160"')}
         ${field('position',t('form.position'),record.position,'text','required maxlength="160"')}
         ${select('stage',t('form.stage'),stageOptions(),stage)}
         <div class="field"><label for="f-status">${t('form.status')}</label><select id="f-status" name="status">${optStatus(stage,status)}</select></div>
         ${select('priority',t('form.priority'),priorityOptions(),record.priority||'medium')}
         ${field('location',t('form.location'),record.location,'text','placeholder="Kuala Lumpur"')}
         ${select('work_mode',t('form.mode'),modeOptions(),record.work_mode)}
         ${field('platform',t('form.platform'),record.platform,'text','placeholder="CareeReX / LinkedIn / JobStreet"')}
         <div class="field full">${field('job_url',t('form.jobUrl'),record.job_url,'url','placeholder="https://..."').replace('<div class="field">','').replace('</div>','')}</div>
       </div><div class="section-label">${t('form.dates')}</div><div class="formgrid">
         ${field('applied_date',t('form.appliedDate'),record.applied_date,'date')}
         ${field('deadline',t('form.deadline'),record.deadline,'date')}
         ${field('next_action',t('form.nextAction'),record.next_action,'text',`placeholder="${escapeHtml(t('form.nextPh'))}"`)}
         ${field('next_action_date',t('form.nextDue'),record.next_action_date,'date')}
       </div><div class="section-label">${t('form.details')}</div><div class="formgrid">
         ${field('allowance_min',t('form.allowanceMin'),record.allowance_min,'number','min="0"')}
         ${field('allowance_max',t('form.allowanceMax'),record.allowance_max,'number','min="0"')}
         ${field('resume_version',t('form.resume'),record.resume_version,'text','placeholder="Resume_v3.pdf"')}
         ${field('contact_name',t('form.contact'),record.contact_name)}
         <div class="field full">${field('contact_email',t('form.contactEmail'),record.contact_email,'email').replace('<div class="field">','').replace('</div>','')}</div>
         <div class="field full"><label for="f-notes">${t('form.notes')}</label><textarea id="f-notes" name="notes" placeholder="${escapeHtml(t('form.notesPh'))}">${escapeHtml(record.notes)}</textarea></div>
       </div><footer class="modal-actions"><button type="button" class="btn" data-action="close">${t('common.cancel')}</button><button type="submit" class="btn primary">${t(newItem?'common.add':'common.save')}</button></footer></form></section></div>`;
    el('f-company').focus();
  }
  function closeModal(){state.modal=null;const host=el('modal-root');if(host)host.innerHTML='';}
  const normalizeField=(form,name)=>String(form.get(name)||'').trim();
  function parseForm(form){
    const f=new FormData(form);const stage=normalizeField(f,'stage');const status=normalizeField(f,'status');
    if(!statusOptions[stage]?.includes(status))throw Error(t('error.badStatus'));
    const value={stage,status,priority:normalizeField(f,'priority'),company:normalizeField(f,'company'),position:normalizeField(f,'position'),
      location:normalizeField(f,'location')||null,work_mode:normalizeField(f,'work_mode')||null,job_url:normalizeField(f,'job_url')||null,
      platform:normalizeField(f,'platform')||null,resume_version:normalizeField(f,'resume_version')||null,
      applied_date:normalizeField(f,'applied_date')||null,deadline:normalizeField(f,'deadline')||null,
      next_action:normalizeField(f,'next_action')||null,next_action_date:normalizeField(f,'next_action_date')||null,
      allowance_min:normalizeField(f,'allowance_min')===''?null:Number(normalizeField(f,'allowance_min')),
      allowance_max:normalizeField(f,'allowance_max')===''?null:Number(normalizeField(f,'allowance_max')),
      contact_name:normalizeField(f,'contact_name')||null,contact_email:normalizeField(f,'contact_email')||null,notes:normalizeField(f,'notes')||null};
    if(!value.company||!value.position)throw Error(t('error.companyPosition'));
    if(value.allowance_min!==null && value.allowance_max!==null && value.allowance_min>value.allowance_max)throw Error(t('error.allowance'));
    if(value.job_url && !safeUrl(value.job_url))throw Error(t('error.badUrl'));
    return value;
  }
  async function saveRecord(value,id){
    if(state.cloud){
      const query=state.sb.from('applications');
      const {error}=id?await query.update(value).eq('id',id):await query.insert({...value,user_id:state.user.id});
      if(error)throw Error(error.message);
      await loadCloudRecords();
    }else{
      if(id){state.records=state.records.map(r=>r.id===id?{...r,...value,updated_at:new Date().toISOString()}:r);}
      else state.records=[{...value,id:(globalThis.crypto?.randomUUID?.()||String(Date.now())),created_at:new Date().toISOString()},...state.records];
      saveDemo();renderApp();
    }
  }
  async function removeRecord(id){
    if(!confirm(t('confirm.delete')))return;
    if(state.cloud){const {error}=await state.sb.from('applications').delete().eq('id',id);if(error)throw Error(error.message);await loadCloudRecords();}
    else{state.records=state.records.filter(r=>r.id!==id);saveDemo();renderApp();}
    toast(t('notice.deleted'));
  }
  async function markApplied(id){
    if(!confirm(t('confirm.markApplied')))return;
    const r=state.records.find(x=>x.id===id);if(!r)return;
    await saveRecord({stage:'applied',status:'applied',applied_date:r.applied_date||todayISO()},id);
    state.stage='applied';state.filter='all';state.search='';renderApp();toast(t('notice.markApplied'));
  }
  const csvColumns=[['stage','Tab'],['company','Company'],['position','Position'],['status','Status'],['priority','Priority'],['location','Location'],['work_mode','Work Mode'],['platform','Platform'],['job_url','Job URL'],['applied_date','Applied Date'],['deadline','Deadline'],['next_action','Next Action'],['next_action_date','Next Due Date'],['resume_version','Resume Version'],['allowance_min','Allowance Min (RM)'],['allowance_max','Allowance Max (RM)'],['contact_name','HR Contact'],['contact_email','HR Email'],['notes','Notes']];
  function downloadCsv(){
    const safeCell=s=>{let v=String(s??'');if(/^[\s]*[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
    const rows=[csvColumns.map(c=>c[1]),...state.records.map(r=>csvColumns.map(c=>r[c[0]]??''))];
    const str='\ufeff'+rows.map(row=>row.map(safeCell).join(',')).join('\r\n');
    const blob=new Blob([str],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`interntrack_backup_${todayISO()}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);toast(t('notice.csv'));
  }
  async function loadCloudRecords(){
    if(!state.sb||!state.user)return;
    const {data,error}=await state.sb.from('applications').select('*').eq('user_id',state.user.id).order('created_at',{ascending:false});
    if(error){renderApp();const main=document.querySelector('.main');if(main)main.insertAdjacentHTML('afterbegin',`<div class="error-panel">${t('error.dbPrefix')} ${escapeHtml(error.message)}. ${t('error.dbSuffix')}</div>`);throw Error(error.message);}
    state.records=data||[];renderApp();
  }
  async function signIn(form){
    const email=el('auth-email')?.value?.trim();const password=el('auth-password')?.value||'';
    if(!email||password.length<6){toast(t('error.authForm'),true);return;}
    let result;
    if(state.authMode==='signup')result=await state.sb.auth.signUp({email,password});
    else result=await state.sb.auth.signInWithPassword({email,password});
    if(result.error)throw Error(result.error.message);
    if(state.authMode==='signup'&&!result.data.session)toast(t('notice.signUp'));
    else toast(t('notice.signIn'));
  }
  async function handleAction(button){
    const action=button.dataset.action;const id=button.dataset.id;
    if(action==='switch-auth'){state.authMode=state.authMode==='signin'?'signup':'signin';renderAuth();return;}
    if(action==='close'){closeModal();return;}
    if(action==='new'){openModal();return;}
    if(action==='edit'){openModal(id);return;}
    if(action==='resume-upload'){await uploadResume();return;}
    if(action==='detail-email'){closeModal();return handleAction({dataset:{action:'email-apply',id}});}
    if(action==='email-apply'){
      const record=state.records.find(r=>String(r.id)===String(id));
      if(!record)throw Error('Application not found.');
      if(!window.IT_EMAIL)throw Error('Email Apply module not loaded.');
      window.IT_EMAIL.open({record,lang:I18N.get(),cloud:state.cloud,onDownloadResume:downloadResume,onSent:async details=>{
        const stamp=new Date().toLocaleString('en-MY');
        const log='['+stamp+'] Email manually confirmed sent'+
          ' to '+details.to+' (Resume: '+(details.resume||'attached manually')+
          (details.messageId?', Gmail ID: '+details.messageId:'')+').';
        const changes={contact_email:details.to,notes:[record.notes,log].filter(Boolean).join('\n')};
        if(record.stage==='to_apply'){
          Object.assign(changes,{stage:'applied',status:'applied',applied_date:todayISO()});
        }
        await saveRecord(changes,record.id);
        if(record.stage==='to_apply'){state.stage='applied';state.filter='all';state.search='';renderApp();}
        toast(I18N.get()==='zh'?'已确认发送，Tracker 已更新。':'Sent confirmed; tracker updated.');
      }});
      return;
    }
    if(action==='delete')return removeRecord(id);
    if(action==='move')return markApplied(id);
    if(action==='export'){downloadCsv();return;}
    if(action==='reload'){if(state.cloud){await loadCloudRecords();toast(t('notice.cloudRefresh'));}else{state.records=loadDemo();renderApp();toast(t('notice.demoRefresh'));}return;}
    if(action==='logout'){const {error}=await state.sb.auth.signOut();if(error)throw Error(error.message);state.user=null;state.records=[];renderAuth();toast(t('notice.signedOut'));return;}
  }
  document.addEventListener('click',async(e)=>{
    if(e.target.classList?.contains('overlay')){closeModal();return;}
    const langButton=e.target.closest('[data-language]');
    if(langButton){
      const requested=langButton.dataset.language;
      if(requested===I18N.get())return;
      const modalDraft=state.modal&&el('record-form')?Object.fromEntries(new FormData(el('record-form')).entries()):null;
      const editId=state.modal?.id||null;
      const authEmail=el('auth-email')?.value;
      const authPassword=el('auth-password')?.value;
      I18N.set(requested);
      if(state.cloud&&!state.user){renderAuth();if(authEmail)el('auth-email').value=authEmail;if(authPassword)el('auth-password').value=authPassword;}
      else{renderApp();if(modalDraft)openModal(editId,modalDraft);}
      return;
    }
    const btn=e.target.closest('[data-action]');if(btn){try{await handleAction(btn);}catch(err){toast(err.message||String(err),true);}return;}
    const tab=e.target.closest('[data-stage]');if(tab){state.stage=tab.dataset.stage;state.filter='all';state.search='';renderApp();return;}
    const card=e.target.closest('.company-main');if(card){showDetails(card.closest('[data-company-id]')?.dataset.companyId);return;}
  });
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target?.matches('.company-main')){e.preventDefault();showDetails(e.target.closest('[data-company-id]')?.dataset.companyId);}});
  document.addEventListener('input',e=>{if(e.target?.id==='search'){state.search=e.target.value;renderCards();}});
  document.addEventListener('change',e=>{
    if(e.target?.id==='filter'){state.filter=e.target.value;renderCards();}
    if(e.target?.id==='f-stage'){
      const stage=e.target.value;
      el('f-status').innerHTML=optStatus(stage,stage==='applied'?'applied':'saved');
    }
  });
  document.addEventListener('submit',async e=>{
    if(!['auth-form','record-form'].includes(e.target?.id))return;
    e.preventDefault();const submit=e.target.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    try{
      if(e.target.id==='auth-form')await signIn(e.target);
      else {const record=parseForm(e.target);await saveRecord(record,state.modal?.id);closeModal();toast(t('notice.saved'));}
    }catch(err){toast(err.message||t('error.operation'),true);}
    finally{if(submit?.isConnected)submit.disabled=false;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal)closeModal();});
  async function boot(){
    if(!state.cloud){state.records=loadDemo();renderApp();return;}
    try{
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
      state.sb=createClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      state.sb.auth.onAuthStateChange((event,session)=>{
        const previous=state.user?.id||null;
        state.user=session?.user||null;
        if(!state.user){state.records=[];renderAuth();}
        else if(previous!==state.user.id){setTimeout(()=>loadCloudRecords().catch(err=>toast(err.message,true)),0);}
      });
      const {data,error}=await state.sb.auth.getSession();
      if(error)throw Error(error.message);
      state.user=data.session?.user||null;
      if(state.user)await loadCloudRecords();else renderAuth();
    }catch(err){el('app').innerHTML=`<div class="auth-page"><div class="auth-card"><h2>${t('error.cloudTitle')}</h2><p>${escapeHtml(err.message||String(err))}</p><p>${t('error.cloudDesc')}</p></div></div>`;}
  }
  boot();
})();
