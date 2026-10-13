/* InternTrack: HR email applications (Gmail draft or OAuth Gmail API).
   Send is explicit, one recipient per request. No tokens or PDFs persisted. */
(function(){
  "use strict";
  var current=null, draftOpened=false, sending=false, accessToken="", expires=0;
  var scope="https://www.googleapis.com/auth/gmail.send";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
  var z=function(en,zh){return current&&current.lang==="zh"?zh:en;};
  var replaceTokens=function(s){
    return String(s||"").replace(/\[Company\]/gi,function(){return current.record.company||"";})
       .replace(/\[Position\]/gi,function(){return current.record.position||"";});
  };
  var validEmail=function(s){return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);};
  function fields(){
    var to=$("it-to").value.trim(),subject=replaceTokens($("it-subject").value).trim(),body=replaceTokens($("it-body").value).trim();
    if(!validEmail(to))throw Error(z("Enter a valid HR email.","请输入有效的 HR 邮箱。"));
    if(!subject||!body)throw Error(z("Subject and email body are required.","请填写邮件标题和正文。"));
    return {to:to,subject:subject,body:body};
  }
  function message(s,bad){
    var el=$("it-email-message");if(!el)return;
    el.textContent=s;el.style.display="block";el.className="it-email-msg"+(bad?" bad":"");
  }
  function close(){if(sending)return;var host=$("modal-root");if(host)host.innerHTML="";current=null;draftOpened=false;}
  function file(){
    var f=$("it-pdf").files[0];
    if(!f)throw Error(z("Select your resume PDF before sending.","直接发送前请先选择 Resume PDF。"));
    if((f.type!=="application/pdf"&&!/\.pdf$/i.test(f.name))||f.size<1||f.size>8*1024*1024)
      throw Error(z("PDF must be under 8 MB.","PDF 必须小于 8 MB。"));
    return f;
  }
  function openDraft(){
    var v=fields();
    var url="https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(v.to)+"&su="+encodeURIComponent(v.subject)+"&body="+encodeURIComponent(v.body);
    var tab=window.open(url,"_blank");
    if(!tab)throw Error(z("Gmail tab blocked. Allow pop-ups.","Gmail 弹窗被阻止，请允许此网站弹窗。"));
    try{tab.opener=null;}catch(_){}
    draftOpened=true;$("it-manual").disabled=false;
    message(z("Gmail draft opened. Attach the PDF and click Send there before confirming here.","Gmail 草稿已打开。请附上 PDF 并在 Gmail 点 Send，之后才回到这里确认。"),false);
  }
  async function markSent(details){
    try{
      await current.onSent(details);
      message(z("Tracker updated.","申请记录已更新。"),false);
      close();
    }catch(e){
      message(z("Email may have been sent, but tracker update failed. Do NOT resend. Update status manually. ","邮件可能已发送但更新 Tracker 失败。请勿重发，请手动更新申请状态。 ")+(e.message||e),true);
      $("it-api-send").disabled=true;$("it-manual").disabled=true;
    }
  }
  async function manualConfirm(){
    if(!draftOpened)return;
    var v=fields();
    if(!confirm(z("Did you attach your resume and click Send in Gmail?","你确定已经在 Gmail 附上 Resume 并点击 Send 了吗？")))return;
    await markSent({method:"manual_confirm",to:v.to,resume:null});
  }
  function token(){
    if(accessToken&&Date.now()<expires)return Promise.resolve(accessToken);
    var clientId=String(window.INTERNTRACK_CONFIG&&window.INTERNTRACK_CONFIG.googleClientId||"").trim();
    if(!clientId)throw Error(z("Add the Google OAuth Web Client ID (googleClientId) to config.js for direct sending. Gmail Draft requires no setup.","直接发送需要在 config.js 添加 Google OAuth Web Client ID (googleClientId)。草稿模式不需要设置。"));
    if(!window.google||!google.accounts||!google.accounts.oauth2)throw Error(z("Google authorization library has not loaded.","Google OAuth 组件未加载。"));
    return new Promise(function(resolve,reject){
      var client=google.accounts.oauth2.initTokenClient({
        client_id:clientId,scope:scope,
        callback:function(r){
          if(!r||r.error||!r.access_token){reject(Error((r&&r.error_description)||(r&&r.error)||"Authorization failed."));return;}
          accessToken=r.access_token;expires=Date.now()+Math.max(60,Number(r.expires_in||3600)-90)*1000;
          resolve(accessToken);
        },
        error_callback:function(e){reject(Error(e.message||e.type||"Google OAuth failed."));}
      });
      client.requestAccessToken({prompt:"consent"});
    });
  }
  function base64(bytes){
    var str="";for(var i=0;i<bytes.length;i+=8192)str+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
    return btoa(str);
  }
  function b64Utf8(s){return base64(new TextEncoder().encode(s));}
  function wrap(s){return (s.match(/.{1,76}/g)||[]).join("\r\n");}
  async function mime(v,pdf){
    var name=pdf.name.replace(/[\r\n"\\]/g,"_").replace(/[^\x20-\x7e]/g,"_").slice(0,100)||"Resume.pdf";
    var boundary="interntrack_"+crypto.randomUUID().replace(/-/g,"");
    var lines=[
      "To: "+v.to,"Subject: =?UTF-8?B?"+b64Utf8(v.subject)+"?=",
      "MIME-Version: 1.0","Content-Type: multipart/mixed; boundary=\""+boundary+"\"",
      "", "--"+boundary,"Content-Type: text/plain; charset=\"UTF-8\"","Content-Transfer-Encoding: base64","",
      wrap(b64Utf8(v.body)),"--"+boundary,
      "Content-Type: application/pdf; name=\""+name+"\"","Content-Transfer-Encoding: base64",
      "Content-Disposition: attachment; filename=\""+name+"\"","",
      wrap(base64(new Uint8Array(await pdf.arrayBuffer()))),"--"+boundary+"--",""
    ];
    return b64Utf8(lines.join("\r\n")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  async function sendWithGmail(){
    if(sending)return;
    var v=fields(),pdf=file();
    if(!confirm(z("Send now with the selected PDF?","确认发送这封含 PDF 附件的邮件吗？")+"\n\nTo: "+v.to+"\nSubject: "+v.subject+"\nResume: "+pdf.name))return;
    sending=true;var button=$("it-api-send");button.disabled=true;
    message(z("Connecting to Gmail / sending…","正在连接 Gmail / 发送中…"),false);
    var gmailId=null;
    try{
      var bearer=await token();
      var raw=await mime(v,pdf);
      var response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
        method:"POST",headers:{"Authorization":"Bearer "+bearer,"Content-Type":"application/json"},
        body:JSON.stringify({raw:raw})
      });
      var result=await response.json().catch(function(){return {};});
      if(!response.ok||!result.id)throw Error((result.error&&result.error.message)||"Gmail API HTTP "+response.status);
      gmailId=result.id;
      await markSent({method:"gmail_api",to:v.to,resume:pdf.name,messageId:gmailId});
    }catch(e){
      message((gmailId?z("Gmail sent the email, but the tracker failed. Do not resend. ","Gmail 已发送但 Tracker 更新失败，请勿重发。 "):"")+(e.message||e),true);
    }finally{sending=false;if(!gmailId){button.disabled=false;}}
  }
  function open(opts){
    if(!opts||!opts.record||typeof opts.onSent!=="function")return;
    current=opts;draftOpened=false;var r=opts.record,host=$("modal-root");if(!host)return;
    var subject="Application for "+(r.position||"Software Engineering Internship")+" (4 Jan – 23 May 2027) - Loh Kher Qin";
    var body="Dear Hiring Manager at [Company],\n\nMy name is Loh Kher Qin, a Year 3 Software Engineering student at TAR UMT (CGPA 3.477). I am applying for the [Position] position at [Company].\n\nDuring my previous internship at Sky Motor Digital, I worked with Laravel, PHP, RESTful APIs and debugging. I have also developed Java/JSP applications and am currently working on an AI/OCR-based timetable project.\n\nMy university internship period is 4 January 2027 to 23 May 2027. My resume is attached for your consideration.\n\nThank you for your time.\n\nKind regards,\nLoh Kher Qin";
    host.innerHTML='<div class="overlay" id="it-email-overlay"><section class="modal it-email-dialog" role="dialog" aria-modal="true" aria-labelledby="it-email-title">'+
      '<header class="modal-head"><div><h2 id="it-email-title" class="modal-title">✉ '+esc(z("Apply by Email","邮件申请"))+'</h2><p class="modal-sub">'+esc(r.company)+' · '+esc(r.position)+'</p></div><button type="button" class="icon-close" id="it-close" aria-label="Close">×</button></header>'+
      '<p class="it-email-help">'+esc(z("For HR email applications only, not company/job-board forms. Review before sending. One email at a time.","只适用于有 HR 邮箱的申请，不会代填招聘网站表单。每次发送前请检查。"))+'</p>'+
      '<div class="field"><label for="it-to">HR Email</label><input type="email" id="it-to" value="'+esc(r.contact_email||"")+'" placeholder="hr@company.com"></div>'+
      '<div class="field"><label for="it-subject">'+esc(z("Subject","主题"))+'</label><input id="it-subject" value="'+esc(subject)+'"></div>'+
      '<div class="field"><label for="it-body">'+esc(z("Email content","邮件正文"))+'</label><textarea id="it-body" rows="10">'+esc(body)+'</textarea><small>[Company] · [Position]</small></div>'+
      '<div class="field"><label for="it-pdf">'+esc(z("Resume PDF (optional for draft, required for direct send)","Resume PDF（草稿可稍后附上，直接发送必须选择）"))+'</label><input type="file" id="it-pdf" accept=".pdf,application/pdf"><small>'+esc(z("Maximum 8 MB. The file is not stored in Supabase.","最大 8 MB，不会存入 Supabase。"))+'</small></div>'+
      '<div class="it-email-methods"><div><h3>1 · Gmail Draft</h3><p>'+esc(z("Gmail opens a draft. Add the PDF manually and click Send in Gmail.","自动打开 Gmail 草稿；请手动附 PDF 并发送。"))+'</p><button class="btn primary" id="it-draft">'+esc(z("Open Gmail Draft","打开 Gmail 草稿"))+'</button><button class="btn" id="it-manual" disabled>'+esc(z("I have sent this email","我已发送邮件"))+'</button></div>'+
      '<div><h3>2 · Gmail API</h3><p>'+esc(z("Google OAuth required. Select your PDF, then explicitly confirm sending.","需要 Google OAuth。选择 PDF，再确认后直接发送。"))+'</p><button class="btn" id="it-connect">'+esc(z("Connect Gmail","连接 Gmail"))+'</button><button class="btn primary" id="it-api-send">'+esc(z("Review & Send PDF","确认并发送 PDF"))+'</button></div></div>'+
      '<p id="it-email-message" class="it-email-msg" style="display:none" role="status"></p>'+
      '<footer class="modal-actions"><button class="btn" id="it-cancel">'+esc(z("Cancel","取消"))+'</button></footer></section></div>';
    $("it-close").addEventListener("click",close);
    $("it-cancel").addEventListener("click",close);
    $("it-draft").addEventListener("click",function(){try{openDraft();}catch(e){message(e.message||e,true);}});
    $("it-manual").addEventListener("click",function(){manualConfirm().catch(function(e){message(e.message||e,true);});});
    $("it-connect").addEventListener("click",function(){token().then(function(){message(z("Gmail connected.","Gmail 已连接。"),false);}).catch(function(e){message(e.message||e,true);});});
    $("it-api-send").addEventListener("click",function(){sendWithGmail().catch(function(e){message(e.message||e,true);});});
    $("it-to").focus();
  }
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&current)close();});
  window.IT_EMAIL={open:open};
})();