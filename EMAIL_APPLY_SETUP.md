# Email Apply — Setup / 邮件申请设置

The feature is available through **Apply by Email** on each company card in InternTrack.

## Safe first option: Gmail draft
1. Enter a real HR email address.
2. Review and edit the subject and content.
3. Choose **Open Gmail Draft**.
4. Attach your Resume PDF inside Gmail, then click **Send**.
5. Return to InternTrack, choose **I have sent this email**. Only then will the record move to **Applied**.

Opening Gmail does **not** send an email or change the application status.

## Optional: Gmail API (PDF attached automatically)
1. Open https://console.cloud.google.com/ and create a Google Cloud project.
2. Enable the **Gmail API**.
3. Configure OAuth consent in **Google Auth Platform**, set the app to *Testing*, add your sending Gmail account as a test user, and configure Gmail send scope `https://www.googleapis.com/auth/gmail.send`.
4. Create an **OAuth Client ID** of type **Web application**.
5. Add **Authorized JavaScript origin**: `https://kqloh.github.io` (no `/interntrack/` path); add your exact local Live Server origin only if testing locally.
6. In your **existing** `config.js`, add the public Google **Web Client ID**, preserving your Supabase config:

```js
window.INTERNTRACK_CONFIG = {
  supabaseUrl: "YOUR_EXISTING_SUPABASE_PROJECT_URL",
  supabaseAnonKey: "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY",
  googleClientId: "YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID.apps.googleusercontent.com"
};
```

**Never add a Google Client Secret, Supabase secret/service role key or database password.**

7. On a company card, click **Apply by Email**, check address and text, choose a PDF (up to 8 MB), connect to Gmail, then click **Review & Send PDF** and confirm in the dialogue.
8. Only a successful Gmail API response with a message ID can mark the email as sent automatically. If Gmail sends but Supabase update fails, **do not send it twice**; fix the tracker record manually.

## 中文提示
- 这不是自动海投工具，每次只为一家公司申请，必须人工确认邮件和收件人。
- Gmail Draft 方式不自动添加 PDF，也不等于已发送。
- Gmail API 是可选配置，授权后可添加 PDF 附件并发出。
- 原有 Supabase 数据表、账号和 RLS 不需要修改。
- 通过招聘网站（CareeReX / JobStreet / LinkedIn）的表单申请仍需要在官方网站完成。
