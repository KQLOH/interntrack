# InternTrack：跨电脑使用的设置说明

## 先试玩

- 打开 `demo.html`：直接浏览器试玩网页，里面有一条 Theta Service Partner 的**示例记录**。
- 可以新建、编辑、删除、从 `To Apply` 移到 `Applied`。
- **注意：演示模式的数据只存在这台电脑的浏览器，不会跨设备同步。**

## 要跨电脑同步（一次性设置）

**1. 注册 Supabase**

打开 https://supabase.com ，建立一个新 Project。

**2. 建立数据库**

进入 Supabase `SQL Editor`，把 `schema.sql` 全部复制进去并执行（Run）。这会创建 `applications` table，同时设定 RLS，保护你的个人申请记录。

**3. 将 Supabase 公共设置填入 `config.js`**

从 Supabase Project API 设置取得 Project URL 和 `publishable` / `anon` public key：

```js
window.INTERNTRACK_CONFIG = {
  supabaseUrl: "https://你的project.supabase.co",
  supabaseAnonKey: "你的public key"
};
```

**重要：绝对不要使用 service_role / secret key！** 浏览器项目只能使用 public publishable/anon key，并需要启用 RLS。

**4. 上传网站到 GitHub Pages**

在 GitHub 建立新 Repo，例如 `interntrack`；把 `index.html`、`styles.css`、`app.js`、`config.js` 等文件上传。到 Repo `Settings → Pages`，选择 `Deploy from a branch`、`main`、`/(root)`，发布网站。

**5. 配置 Supabase Email Authentication**

在 `Authentication → Providers → Email` 启用 Email/Password 登录，并在 `Authentication → URL Configuration` 设置你刚刚获得的网站 URL。注册时如果要求确认 Email，请先到邮箱点击确认链接。

**6. 开始使用**

打开公开的 **HTTPS 网站网址**，注册账号后登录。它会显示 **Cloud Mode**。以后你在任何电脑打开同一个网址、登录同一个账号，就可以看到相同的数据。若另一台电脑没有马上更新，按 `Refresh`。

## 常见问题

- 出现 `Demo Mode`：云端设置还没完成。
- 网页已部署却没有记录：之前试玩的数据在浏览器本地，不会自动转移到云端。请开始新增真实的记录。
- 登录后显示数据库错误：检查是否已在同一个 Supabase 项目执行 `schema.sql`。
- JavaScript / HTML / CSS 不需要装 Node，也不需要自行租服务器；GitHub Pages + Supabase 即可。
- 软件只在打开时显示 `7 天内待办`，**暂时不会自动发 Email 提醒**。

以后你要扩展成 React / Next.js 也可以。现在这个版本尽量简单，方便上传 GitHub 和修改代码。
