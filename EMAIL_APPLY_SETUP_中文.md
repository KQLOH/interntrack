# InternTrack 邮件申请功能 — English + 中文

这个版本在原有 **InternTrack → To Apply / Applied** 公司卡片里加入了 `✉ Apply by Email`。

## 0. 安全更新已经部署的网站

1. **备份** 你原来的 `InternTrack` 项目。
2. 用更新包里的 `index.html`、`app.js`、`styles.css` 覆盖原文件，并新增 `email-apply.js`。
3. **不要覆盖已有的 `config.js`**（里面是你自己的 Supabase Project URL / Publishable Key）。
4. 不需要再次运行 `schema.sql`，现有 Supabase applications 数据表完全沿用。
5. VS Code Live Server 刷新测试。确认没问题后 Git Commit、Push；GitHub Pages 会重新部署。

## 1. 不用 Google Cloud 也能使用：Open Gmail Draft

1. 在 To Apply 点击想投递的公司右边 `✉ Apply by Email`。
2. 输入 HR Email，修改邮件 Subject / Body。支持 `[Company]` 与 `[Position]`，程序会正确替换这两个占位符。
3. 点击 **Open Gmail Draft**。网站会打开 Gmail 的新邮件窗口，并填好收件人、标题、正文。
4. **在 Gmail 里自己附上 Resume PDF**，检查收件人和内容，并点击 Gmail 的 Send。
5. 真正发出之后，回到 InternTrack，点击 **I have sent this email**，再确认；记录才会移动到 Applied。

> 注意：Gmail Compose URL 不能自动把本机 PDF 添加到附件，打开草稿也不代表发送成功。此模式不会静默发送邮件。

## 2. 真正从网页发送带 PDF 附件：Google OAuth + Gmail API

功能已写进 `email-apply.js`，需要你自己配置 Google Cloud：

1. 打开 https://console.cloud.google.com/ ，建立项目（例如 `interntrack-gmail`）。
2. 到 **APIs & Services → Library**，搜索 **Gmail API** 并 Enable。
3. 到 **Google Auth Platform / OAuth consent screen**：设置应用名称、邮件。个人测试选择 **External → Testing**，把你自己会用于发信的 Gmail 加到 **Test users**。
4. 设置 scope `https://www.googleapis.com/auth/gmail.send`（只申请发送邮件的权限）。
5. 到 **Clients / Credentials → Create OAuth client ID**，类型 **Web application**。
6. **Authorized JavaScript origins**（只填 origin，没有 /interntrack/ 路径）：
   - `https://kqloh.github.io`
   - 如果本地测试使用 VS Code Live Server：`http://127.0.0.1:5500`，或你的实际本地端口。
   - 本项目使用 Google Identity Services token popup 模式，不需要填写 OAuth callback redirect URI。
7. 复制 **OAuth Web Client ID**（形式：`...apps.googleusercontent.com`），**不要复制 Client Secret**。
8. 打开你已经配置了 Supabase 的 `config.js`，只在对象末尾加一个公开字段（注意上一个字段之后要有逗号）：

```js
window.INTERNTRACK_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",    // 保留你自己的值
  supabaseAnonKey: "YOUR_SUPABASE_PUBLISHABLE_KEY",  // 保留你自己的值
  googleClientId: "YOUR_OAUTH_WEB_CLIENT_ID.apps.googleusercontent.com"
};
```

9. 重新打开网站，进入公司卡片的 **Apply by Email**，输入 HR Email、确认 Subject / Body，选择 PDF（最多 8 MB）。
10. 点击 **Connect Gmail** 并在 Google 窗口授权正确的 Gmail 账号。
11. 点击 **Review & Send PDF**，仔细核对弹出的 **Email / Subject / Resume 文件名**，确认后才会调用 Gmail API 真正发信。
12. Gmail API 返回 Message ID 后，InternTrack 才尝试更新 Supabase 状态并记录发送时间、收件邮箱和文件名。

### Gmail API 的限制与建议

- 这个功能适合 **你自己账号、自愿申请、一次一间公司**，不实现自动批量群发。
- Google Auth Testing 模式只能由已添加的 **Test users** 授权。正式对所有用户开放 Gmail 权限可能需要 Google OAuth 应用审核；部分 Gmail scope 的合规要求可能更严格。
- 这是浏览器内的 OAuth Token Model：不储存 access token；仅在当前会话内短暂使用。正式面向外部用户的产品，建议升级为更成熟的服务端 OAuth Authorization Code + PKCE 架构。
- `googleClientId` 是公开标识，不是密码。**不要把 Google Client Secret、Supabase Secret/Service Role Key 或数据库密码放入网站代码。**
- Resume PDF 每次从你电脑选择，程序不上传/保存到 Supabase 或其他储存空间；API 发送时会把它作为邮件附件发给指定收件人。
- 如果 Gmail 确认发送但 Supabase 更新失败，App 会提醒你 **不要重复发送**，而是手动更新 Tracker。

## 3. 记录和 Supabase

- **Open Gmail Draft**：只打开草稿；无更改；手动确认已发出后将状态改为 Applied。
- **Gmail API**：只有 Gmail 返回成功的 Message ID 才更新 Applied；记录附在 Notes 里。
- 如果该条本来就在 Applied（例如 HR follow-up），则不会重置现有 Assessment / Interview 状态，而是在 Notes 里新增邮件日志。
- `applications` 表本身不需要修改 SQL，依然受之前的 Supabase RLS 保护。

## 4. 第三方网站申请说明

本功能只适用于公司公开招聘的 **HR Email / Career Email**；不能代替企业自己的职位网页、CareeReX / JobStreet / LinkedIn 的表单申请流程，也不会自动填写网站、绕过验证码或帮你批量提交。这类申请仍应使用官网流程，并在 InternTrack 记录。

## 5. 各种错误排查

| 提示/问题 | 处理方式 |
|---|---|
| `googleClientId` missing | `config.js` 还没加 Google OAuth Client ID；继续用 Draft 模式也可以 |
| `origin_mismatch` | 检查 Authorized JavaScript origins 是否包含 `https://kqloh.github.io`（不要写 `/interntrack/`） |
| `access_denied` / app not verified | 检查 OAuth consent 是否 Testing、你的 Gmail 是否列在 Test users |
| `Gmail API has not been used` / 403 | 检查 Gmail API 已在 Google Cloud Project 启用，OAuth scope 已配置 |
| OAuth popup blocked | 允许网站弹窗，确认不是隐私扩展阻止 Google OAuth |
| 收不到邮件 | 去 Gmail Sent 检查发送记录；若 API 已返回 Message ID，不要盲目重试 |
| Login works but no data | 检查 Supabase `applications` 表、RLS 和 `config.js`，与 Gmail OAuth 是不同的账号授权 |

## 6. 和原版 InternshipSystem.html 的关系

你上传的原版只打开 Gmail 草稿且保存进 LocalStorage。它的 `subject.replace(/[Company]/gi, companyName)` 写法还会意外替换正文中的普通字母。新版只替换准确的 `[Company]` / `[Position]` 标记，并整合到已有 InternTrack / Supabase 工作流程。
