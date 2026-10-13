/* InternTrack Email Apply: bilingual, reviewed Gmail drafts + optional Gmail API sending.
 * No Gmail access tokens, resume PDFs, or passwords are stored in Supabase/localStorage.
 * Each send requires explicit user interaction; it never sends in bulk. */
(() => {
  'use strict';
  const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
  const MAX_PDF_BYTES = 8 * 1024 * 1024;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {
    en: {
      title:'Apply by Email', sub:'Preview the email and resume before sending it to this company.',
      to:'HR email address', subject:'Email subject', body:'Email body', pdf:'Resume attachment (PDF)',
      fileHint:'Select the PDF you want to send (up to 8 MB). This file stays in your browser until you send.',
      draft:'Open Gmail Draft', draftHelp:'Gmail will open with the recipient and message filled in. Attach your resume there and click Send yourself.',
      manualConfirm:'I have sent this email', manualCheck:'Confirm only after you have attached the resume and clicked Send in Gmail. This updates the tracker; it cannot verify Gmail delivery.',
      cloud:'Send with Gmail API (PDF attached)', cloudHelp:'Send directly from the Google account you authorize, with the selected PDF automatically attached. Requires a Google Cloud OAuth Client ID.',
      connect:'Connect Gmail', connected:'Gmail authorized for this browser session', send:'Review & Send PDF', close:'Cancel',
      sent:'Gmail confirmed the send and returned a message ID.', local:'Email marked as sent after your confirmation.',
      sentNoUpdate:'Gmail confirmed sending, but the tracker could not be updated. Do not resend the email. Update the application manually.',
      ready:'Ready to send?', confirmSend:'Send this application email now, including the selected resume PDF? Check the recipient and attachment first.',
      confirmManual:'Did you attach the PDF and actually click Send in Gmail? This will move the application to Applied.',
      noHR:'Enter a valid HR email address before continuing.',
      required:'Please enter a subject and an email body.',
      noPdf:'Select a resume PDF before using the Gmail API send option.',
      badPdf:'Please select a PDF smaller than 8 MB.',
      noClient:'For direct sending, add googleClientId to your existing config.js (public OAuth Web Client ID only). Gmail Draft works without setup.',
      notReady:'Google Identity Services has not loaded. Check your connection or use Gmail Draft.',
      oauthError:'Google authorization failed or was cancelled.',
      popup:'A browser pop-up opened for Google consent. Please choose the correct sending account.',
      sending:'Sending…', afterDraft:'Gmail draft opened. The application is still not marked as sent.',
      draftBlocked:'Gmail tab was blocked. Please allow pop-ups for this website and try again.',
      whatChanged:'The existing application is updated only after Gmail API confirms send or you explicitly confirm the manual send.',
      onlyEmail:'This applies via HR email only. For CareeReX, JobStreet, or company application forms, use their official application page.',
      warning:'One company at a time, after review. No automatic bulk sending.',
      replace:'Replace tokens: [Company] and [Position] in the subject/body. You can edit all text.',
      oauthTip:'Gmail API setup is optional. Until configured, use Open Gmail Draft and attach the PDF manually.'
    },
    zh: {
      title:'邮件申请',sub:'发送前先确认公司邮箱、邮件内容和 Resume。',
      to:'HR 邮箱',subject:'邮件主题',body:'邮件正文',pdf:'Resume 附件（PDF）',
      fileHint:'选择要投递的 PDF（不超过 8 MB）。在点击发送前，文件只保留在此浏览器中。',
      draft:'打开 Gmail 草稿',draftHelp:'会打开 Gmail，并填好收件人及正文。你必须自行附上 Resume、确认并点击发送。',
      manualConfirm:'我已经发送邮件',manualCheck:'只有在 Gmail 里确实附上 PDF、点击 Send 后才确认。系统不能独立验证 Gmail 草稿是否已发送。',
      cloud:'Gmail API 直接发送（自动附上 PDF）',cloudHelp:'从你授权的 Google 账号直接发送邮件及所选 PDF。需要设置 Google Cloud OAuth Client ID。',
      connect:'连接 Gmail',connected:'Gmail 已在此浏览器会话授权',send:'确认并发送 PDF',close:'取消',
      sent:'Gmail 已确认发送，并返回邮件 ID。',local:'已根据你的确认更新为已发送。',
      sentNoUpdate:'Gmail 已确认发送，但 Tracker 更新失败。请勿重复发送；请手动更新申请状态。',
      ready:'确认发送？',confirmSend:'现在是否要发送这封申请邮件（含所选 Resume PDF）？请再次检查收件人和附件。',
      confirmManual:'你是否已在 Gmail 附上 PDF 并点击 Send？确认后将记录移到 Applied。',
      noHR:'请填写有效的 HR 邮箱。',required:'请填写邮件主题和正文。',noPdf:'使用 Gmail API 发送前，请先选择 Resume PDF。',
      badPdf:'请使用小于 8 MB 的 PDF 文件。',
      noClient:'要直接发送，请在原来的 config.js 加入 googleClientId（公开的 OAuth Web Client ID，非 Secret）。无需配置也可用 Gmail 草稿。',
      notReady:'Google 登录组件未加载，请检查网络或先用 Gmail 草稿。',oauthError:'Google 授权失败或取消。',
      popup:'Google 授权窗口已打开，请确认选择正确的 Gmail 发件账号。',sending:'发送中…',
      afterDraft:'Gmail 草稿已打开；申请还没有自动标记为已发送。',draftBlocked:'Gmail 标签页被拦截，请允许网站弹窗再重试。',
      whatChanged:'只有 Gmail API 确认发送，或你手动确认已发送后，才会更新申请记录。',
      onlyEmail:'这里只处理有 HR 邮箱的申请。CareeReX、JobStreet 等平台应通过官方网站申请。',
      warning:'每次只发一间公司，先检查再确认；没有自动群发。',
      replace:'主题和正文可使用 [Company]、[Position] 占位符，也可自由修改。',
      oauthTip:'Google API 配置是可选的。配置前可打开 Gmail 草稿，并手动添加 PDF。'
    }
  };
  let token = null;
  let tokenExpires = 0;
  let active = null;
  let draftOpened = false;
  let sending = false;

  const host=()=>document.getElementById('modal-root');
  const msg=(key)=> labels[active?.lang==='zh'?'zh':'en'][key];
  const currentField=id=>document.getElementById(id);
  const validEmail=v=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(v||'').trim());
  const replaceTokens=(str,r)=>String(str||'')
    .replace(/\[Company\]/gi,()=>r.company||'')
    .replace(/\[Position\]/gi,()=>r.position||'');
  const defaultSubject=r=>`Application for ${r.position||'Software Engineering Internship'} (4 Jan – 23 May 2027) - Loh Kher Qin`;
  const defaultBody=r=>`Dear Hiring Manager at [Company],\n\nMy name is Loh Kher Qin, a Year 3 Software Engineering student at TAR UMT (CGPA 3.477). I am writing to apply for the [Position] position at [Company].\n\nDuring my previous internship at Sky Motor Digital Sdn Bhd, I worked with Laravel, PHP, JavaScript, RESTful API integration and debugging. I also have academic project experience with Java/JSP development and an ongoing AI/OCR-based timetable extraction project.\n\nMy university internship period is 4 January 2027 to 23 May 2027. I have attached my resume for your consideration.\n\nThank you for your time. I would welcome the opportunity to discuss my application.\n\nKind regards,\nLoh Kher Qin\nkqloh123@gmail.com`;

  function getDraftFields(){
    const to=currentField('email-to')?.value.trim()||'';
    const subject=replaceTokens(currentField('email-subject')?.value,active.record).trim();
    const body=replaceTokens(currentField('email-body')?.value,active.record).trim();
    if(!validEmail(to))throw Error(msg('noHR'));
    if(!subject||!body)throw Error(msg('required'));
    if(/[\r\n]/.test(to))throw Error(msg('noHR'));
    return {to,subject,body};
  }
  function uiError(err){const p=currentField('email-alert');if(p){p.hidden=false;p.textContent=err?.message||String(err);p.classList.add('bad');}}
  function uiInfo(text){const p=currentField('email-alert');if(p){p.hidden=false;p.textContent=text;p.classList.remove('bad');}}
  function close(){if(sending)return;if(host())host().innerHTML='';active=null;draftOpened=false;}
  function markConnected(){const s=currentField('gmail-connection');if(s)s.textContent=token&&Date.now()<tokenExpires?msg('connected'):msg('oauthTip');}
  function verifyPdf(){
    const f=currentField('email-pdf')?.files?.[0];
    if(!f)throw Error(msg('noPdf'));
    if(!/\.pdf$/i.test(f.name) && f.type!=='application/pdf')throw Error(msg('badPdf'));
    if(f.size<=0||f.size>MAX_PDF_BYTES)throw Error(msg('badPdf'));
    return f;
  }
  function getAccessToken(){
    if(token&&Date.now()<tokenExpires)return Promise.resolve(token);
    const clientId=String(window.INTERNTRACK_CONFIG?.googleClientId||'').trim();
    if(!clientId)throw Error(msg('noClient'));
    if(!window.google?.accounts?.oauth2)throw Error(msg('notReady'));
    return new Promise((resolve,reject)=>{
      const client=google.accounts.oauth2.initTokenClient({
        client_id:clientId,
        scope:GOOGLE_SCOPE,
        callback:r=>{
          if(r?.error||!r?.access_token){reject(Error(r?.error_description||r?.error||msg('oauthError')));return;}
          token=r.access_token;
          tokenExpires=Date.now()+Math.max(60,Number(r.expires_in||3600)-90)*1000;
          markConnected();resolve(token);
        },
        error_callback:err=>reject(Error(err?.message||err?.type||msg('oauthError')))
      });
      // Must be triggered from user's click so the OAuth popup is permitted.
      client.requestAccessToken({prompt:'consent'});
    });
  }
  function utf8Base64(str){const bytes=new TextEncoder().encode(str);let binary='';for(let i=0;i<bytes.length;i+=8192){binary+=String.fromCharCode(...bytes.subarray(i,i+8192));}return btoa(binary);}
  function base64Wrap(b64){return b64.match(/.{1,76}/g)?.join('\r\n')||'';}
  function binaryBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192){binary+=String.fromCharCode(...bytes.subarray(i,i+8192));}return btoa(binary);}
  async function buildRawEmail({to,subject,body},file){
    const fileName=String(file.name).replace(/[\r\n"\\]/g,'_').replace(/[^\x20-\x7E]/g,'_').slice(0,120)||'Resume.pdf';
    const boundary='interntrack_'+crypto.randomUUID().replace(/-/g,'');
    const content=[
      `To: ${to}`,
      `Subject: =?UTF-8?B?${utf8Base64(subject)}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      base64Wrap(utf8Base64(body)),
      `--${boundary}`,
      `Content-Type: application/pdf; name="${fileName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${fileName}"`,
      '',
      base64Wrap(binaryBase64(new Uint8Array(await file.arrayBuffer()))),
      `--${boundary}--`,
      ''
    ].join('\r\n');
    // Gmail uses base64url for the full RFC-compliant MIME message.
    return utf8Base64(content).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  async function updateTracker(details,confirmedSend){
    try{
      await active.onSent(details);
      uiInfo(confirmedSend?msg('sent'):msg('local'));
      // The parent dashboard can re-render after saveRecord; don't re-open this modal.
      setTimeout(close,500);
    }catch(err){
      uiError(Error(msg('sentNoUpdate')+' '+(err?.message||'')));
      const btn=currentField('gmail-send');if(btn)btn.disabled=true;
      const manual=currentField('manual-confirm');if(manual)manual.disabled=true;
    }
  }
  async function openDraft(){
    const v=getDraftFields();
    const url='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(v.to)+'&su='+encodeURIComponent(v.subject)+'&body='+encodeURIComponent(v.body);
    const opened=window.open(url,'_blank');
    try{if(opened)opened.opener=null;}catch{/* Gmail is cross-origin. */}
    if(!opened){uiError(Error(msg('draftBlocked')));return;}
    draftOpened=true;
    currentField('manual-confirm').disabled=false;
    uiInfo(msg('afterDraft'));
  }
  async function manualConfirm(){
    if(!draftOpened)return;
    const fields=getDraftFields();
    if(!confirm(msg('confirmManual')))return;
    await updateTracker({method:'manual_confirm',to:fields.to,resume:null},false);
  }
  async function connectGoogle(){
    await getAccessToken();
    uiInfo(msg('connected'));
  }
  async function sendDirect(){
    if(sending)return;
    const fields=getDraftFields();
    const pdf=verifyPdf();
    if(!confirm(`${msg('confirmSend')}\n\nTo: ${fields.to}\nSubject: ${fields.subject}\nPDF: ${pdf.name}`))return;
    // No automatic sending on page load; this function requires an explicit click and confirmation.
    const btn=currentField('gmail-send');
    sending=true;
    if(btn){btn.disabled=true;btn.textContent=msg('sending');}
    let gmailSentId='';
    try{
      const accessToken=await getAccessToken();
      const raw=await buildRawEmail(fields,pdf);
      const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
        method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({raw})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.id)throw Error(result?.error?.message||`Gmail API error HTTP ${response.status}`);
      gmailSentId=result.id;
      await updateTracker({method:'gmail_api',to:fields.to,resume:pdf.name,messageId:gmailSentId},true);
    }catch(err){
      if(!gmailSentId){uiError(err);}
      else uiError(Error(msg('sentNoUpdate')+' '+(err?.message||'')));
    }finally{
      sending=false;
      if(btn&&!gmailSentId){btn.disabled=false;btn.textContent=msg('send');}
    }
  }
  function open(options){
    if(!options?.record||typeof options.onSent!=='function')throw Error('Missing application record.');
    close(); active=options;
    const L=labels[options.lang==='zh'?'zh':'en'];
    const r=options.record;
    const h=host();if(!h)throw Error('Modal host not found.');
    h.innerHTML=`<div class="overlay" id="email-overlay"><section class="modal email-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="email-title">
      <header class="modal-head"><div><h2 id="email-title" class="modal-title">✉ ${escapeHtml(L.title)}</h2><p class="modal-sub">${escapeHtml(L.sub)}</p><p class="email-company-label">${escapeHtml(r.company)} · ${escapeHtml(r.position)}</p></div><button class="icon-close" id="email-close" type="button" aria-label="${escapeHtml(L.close)}">×</button></header>
      <p class="email-hint">${escapeHtml(L.onlyEmail)}</p>
      <div class="field"><label for="email-to">${escapeHtml(L.to)}</label><input type="email" id="email-to" required placeholder="hr@company.com" value="${escapeHtml(r.contact_email||'')}" /></div>
      <div class="field"><label for="email-subject">${escapeHtml(L.subject)}</label><input id="email-subject" value="${escapeHtml(defaultSubject(r))}" maxlength="280" /></div>
      <div class="field"><label for="email-body">${escapeHtml(L.body)}</label><textarea id="email-body" rows="11">${escapeHtml(defaultBody(r))}</textarea><small>${escapeHtml(L.replace)}</small></div>
      <div class="field"><label for="email-pdf">${escapeHtml(L.pdf)}</label><input id="email-pdf" type="file" accept="application/pdf,.pdf" /><small>${escapeHtml(L.fileHint)}</small></div>
      <div class="email-options-grid">
        <section class="email-option"><h3>1 · ${escapeHtml(L.draft)}</h3><p>${escapeHtml(L.draftHelp)}</p><button class="btn primary" type="button" id="open-gmail-draft">${escapeHtml(L.draft)} ↗</button><button class="btn" type="button" id="manual-confirm" disabled>${escapeHtml(L.manualConfirm)}</button><small>${escapeHtml(L.manualCheck)}</small></section>
        <section class="email-option"><h3>2 · ${escapeHtml(L.cloud)}</h3><p>${escapeHtml(L.cloudHelp)}</p><button class="btn" type="button" id="gmail-connect">${escapeHtml(L.connect)}</button><small id="gmail-connection">${escapeHtml(L.oauthTip)}</small><button class="btn primary" type="button" id="gmail-send">${escapeHtml(L.send)}</button></section>
      </div>
      <p class="email-warning">${escapeHtml(L.warning)}</p><p id="email-alert" class="email-alert" hidden role="status"></p>
      <footer class="modal-actions"><button class="btn" type="button" id="email-cancel">${escapeHtml(L.close)}</button></footer>
    </section></div>`;
    currentField('email-close').addEventListener('click',close);
    currentField('email-cancel').addEventListener('click',close);
    currentField('open-gmail-draft').addEventListener('click',()=>{try{openDraft();}catch(err){uiError(err);}});
    currentField('manual-confirm').addEventListener('click',()=>{manualConfirm().catch(uiError);});
    currentField('gmail-connect').addEventListener('click',()=>{connectGoogle().catch(uiError);});
    currentField('gmail-send').addEventListener('click',()=>{sendDirect().catch(uiError);});
    markConnected();
    currentField('email-to').focus();
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)close();});
  document.addEventListener('click',e=>{
    if(sending && e.target?.classList?.contains('overlay'))e.stopImmediatePropagation();
  },true);
  window.IT_EMAIL = {open};
})();
