/* InternTrack Gmail compose helper: NEVER sends email automatically. */
(function(){
 "use strict";
 let opened=false,active=null;
 const $=id=>document.getElementById(id);
 const txt=(en,zh)=>active?.lang==="zh"?zh:en;
 const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const substitute=s=>String(s||"").replace(/\[Company\]/gi,()=>active.record.company||"").replace(/\[Position\]/gi,()=>active.record.position||"");
 const validEmail=s=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);
 const message=(s,error=false)=>{
   const target=$("it-email-message");
   if(target){target.hidden=false;target.textContent=s;target.className="it-email-msg"+(error?" bad":"");}
 };
 function values(){
   const to=$("it-to").value.trim(),subject=substitute($("it-subject").value).trim(),body=substitute($("it-body").value).trim();
   if(!validEmail(to))throw Error(txt("Please enter a valid HR email address.","请输入有效的 HR 邮箱。"));
   if(!subject||!body)throw Error(txt("Please complete the subject and email content.","请填写邮件主题和正文。"));
   return {to,subject,body};
 }
 function close(){ if($("modal-root"))$("modal-root").innerHTML=""; active=null;opened=false;}
 function gmailDraft(){
   const v=values();
   const url="https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(v.to)+"&su="+encodeURIComponent(v.subject)+"&body="+encodeURIComponent(v.body);
   const tab=window.open(url,"_blank","noopener,noreferrer");
   if(!tab){message(txt("Your browser might have blocked the Gmail tab. Allow pop-ups and retry.","浏览器可能阻止了 Gmail 弹窗。请允许弹窗并重试。"),true);return;}
   opened=true;
   $("it-sent").disabled=false;
   message(txt("Gmail draft opened. Attach your resume PDF and click Send in Gmail, then return here to confirm.","Gmail 草稿已打开。请在 Gmail 附上 Resume PDF 并点击 Send，再返回这里确认。"));
 }
 async function confirmSent(){
   if(!opened)return;
   const v=values();
   if(!confirm(txt("Have you actually clicked Send in Gmail, including the resume PDF?","你确定已经在 Gmail 附上 Resume PDF 并点击 Send 了吗？")))return;
   $("it-sent").disabled=true;
   try{
     await active.onSent({to:v.to,method:"manual_confirm",resume:"attached in Gmail"});
     close();
   }catch(e){
     $("it-sent").disabled=false;
     message(txt("Tracker update failed. If Gmail already sent, do not send again. ","Tracker 更新失败。如果 Gmail 已发送，请不要重复发送。")+(e?.message||String(e)),true);
   }
 }
 async function downloadResume(){
   if(!active?.onDownloadResume)return;
   const btn=$("it-download"); btn.disabled=true;
   try{await active.onDownloadResume();message(txt("Resume downloaded. Attach it to your Gmail draft.","Resume 已下载。请在 Gmail 草稿附加文件。"));}
   catch(e){message((e?.message||String(e))+" — "+txt("Set up the private Supabase resume bucket first.","请先设置 Supabase 私人 Resume Storage。"),true);}
   finally{if(btn?.isConnected)btn.disabled=false;}
 }
 function open(opts){
   if(!opts?.record||typeof opts.onSent!=="function")return;
   active=opts;opened=false;
   const r=opts.record,holder=$("modal-root");if(!holder)return;
   const subject="Application for [Position] (4 Jan – 23 May 2027) - Loh Kher Qin";
   const body="Dear Hiring Manager at [Company],\n\nI am Loh Kher Qin, a Year 3 Software Engineering student at TAR UMT (CGPA 3.477), and I would like to apply for the [Position] opportunity at [Company].\n\nDuring my previous IT internship, I developed web modules using Laravel, PHP and RESTful APIs, and gained practical experience in debugging. I have also worked on Java/JSP projects and am currently developing an AI/OCR academic scheduling system.\n\nMy official university internship period is 4 January 2027 to 23 May 2027. Please find my resume attached for your consideration.\n\nThank you for your time. I look forward to hearing from you.\n\nKind regards,\nLoh Kher Qin";
   holder.innerHTML='<div class="overlay" id="it-email-overlay"><section class="modal it-email-dialog" role="dialog" aria-modal="true" aria-labelledby="it-email-title">'+
      '<header class="modal-head"><div><h2 id="it-email-title" class="modal-title">✉ '+h(txt("Prepare Gmail Application","准备 Gmail 申请邮件"))+'</h2><p class="modal-sub">'+h(r.company)+' · '+h(r.position)+'</p></div><button class="icon-close" id="it-close" type="button" aria-label="Close">×</button></header>'+
      '<p class="it-email-help">'+h(txt("This prepares a Gmail draft only. Nothing is sent without your action. [Company] and [Position] are replaced automatically.","此功能只准备 Gmail 草稿，不会自动发送。[Company] 和 [Position] 会自动替换。"))+'</p>'+
      '<div class="field"><label for="it-to">HR Email</label><input type="email" id="it-to" value="'+h(r.contact_email||"")+'" placeholder="hr@company.com" autocomplete="email"></div>'+
      '<div class="field"><label for="it-subject">'+h(txt("Subject","邮件主题"))+'</label><input id="it-subject" value="'+h(subject)+'"></div>'+
      '<div class="field"><label for="it-body">'+h(txt("Email content","邮件正文"))+'</label><textarea id="it-body" rows="11">'+h(body)+'</textarea><small>[Company] · [Position]</small></div>'+
      '<div class="it-email-methods"><div><h3>'+h(txt("Resume PDF","简历 PDF"))+'</h3><p>'+h(txt("Save your PDF privately in InternTrack and download it here when needed. A Gmail compose URL cannot attach files automatically.","可先把 PDF 私密储存在 InternTrack，需要时在这里下载。普通 Gmail 链接无法自动添加附件。"))+'</p><button class="btn" id="it-download" type="button"'+(opts.cloud?"":" disabled")+'>'+h(txt("Download saved resume","下载已保存的 Resume"))+'</button></div>'+
      '<div><h3>Gmail</h3><p>'+h(txt("Gmail will open with the recipient, subject and message filled in. Attach your PDF and click Send yourself.","打开 Gmail 时会自动填写收件人、主题和正文。请自行添加附件并点击发送。"))+'</p><button class="btn primary" id="it-draft" type="button">'+h(txt("Open Gmail Draft ↗","打开 Gmail 草稿 ↗"))+'</button><button class="btn" id="it-sent" type="button" disabled>'+h(txt("I already sent the email","我已发送这封邮件"))+'</button></div></div>'+
      '<p id="it-email-message" class="it-email-msg" hidden role="status"></p>'+
      '<footer class="modal-actions"><button class="btn" type="button" id="it-cancel">'+h(txt("Close","关闭"))+'</button></footer></section></div>';
   $("it-close").addEventListener("click",close);
   $("it-cancel").addEventListener("click",close);
   $("it-draft").addEventListener("click",()=>{try{gmailDraft();}catch(e){message(e.message||String(e),true);}});
   $("it-sent").addEventListener("click",()=>{confirmSent().catch(e=>message(e.message||String(e),true));});
   $("it-download").addEventListener("click",()=>downloadResume());
   $("it-to").focus();
 }
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&active)close();});
 window.IT_EMAIL={open};
})();