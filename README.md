# InternTrack — Internship Application Tracker

An English-first internship application tracker with optional Chinese (中文) translations. Designed for **one personal account across multiple computers**.

**Tech:** HTML + CSS + vanilla JavaScript frontend; Supabase PostgreSQL + Supabase Auth backend; can deploy to GitHub Pages / Vercel / Netlify.

## Language settings (EN / 中文)

- **English is the default** for first-time visitors. Use the **EN / 中文** switch on the login screen, dashboard or edit form.
- The selected language is remembered in the current browser using localStorage (`interntrack_language_v1`). Another browser defaults to English until you switch there.
- Both languages share the exact same application data, database schema and status values. Switching languages does **not** modify your existing Supabase records or account.
- Custom text you entered (company names, position names and notes) is **not automatically translated**.
- All UI text is defined in `i18n.js`. Edit that file to refine translations.

## Features

- **To Apply:** save jobs, track priority, deadline and notes.
- **Applied:** track submitted applications, HR responses, coding assessments, interviews, offers and rejections.
- New, edit, delete, search, filter by status, and one-click **Mark Applied**.
- Next action & due date, internship allowance, HR contacts, application links and resume version.
- Dashboard counters and due-within-7-days reminders (in-app only; no push notifications).
- Export all records to CSV for backups.
- Responsive desktop and mobile layout.
- Supabase email/password authentication and secure per-user database access (Row Level Security).
- **Demo Mode:** without Supabase credentials, you can try the app using browser localStorage. **This mode does not synchronize between computers.**

## 1. Preview it immediately

Open `index.html` in a browser (or serve with `python -m http.server 8000` and visit `http://localhost:8000`). Without Supabase configured, the interface clearly shows **Demo Mode**. A sample record for Theta Service Partner appears **only in demo mode**; it's not a confirmed/up-to-date live status. You can edit or remove it.

## 2. Set up your cloud database (needed for cross-PC use)

1. Sign up at <https://supabase.com> and create a project (choose a region near Malaysia if offered).
2. Open **SQL Editor** in Supabase; paste and run all of `schema.sql`.
3. Open the project's **Connect / Project Settings > API** page and copy the **Project URL** and **publishable key** (or legacy `anon` public key).
4. Open `config.js` and fill in:

```js
window.INTERNTRACK_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
};
```

**Never paste a Supabase `service_role` key, secret API key, database password or private access token into this client-side file.** The public publishable/anon key is intended for browser use with correct RLS policies.

5. Go to **Authentication > Providers > Email** and enable email/password sign-ins. Supabase typically requires email confirmation; if enabled, check your inbox after registration. During setup, configure **Authentication > URL Configuration** with your deployed website URL (and optional allowed redirect URLs) so confirmation links return to the correct site.
6. Publish the website as in step 3 below.
7. Open the deployed URL, choose **Create account**, confirm your email if prompted, then sign in. The header must show **Cloud Mode**. Sign in on another computer with the same email/password; refresh if a change does not appear immediately.

**Security:** `schema.sql` enables Row Level Security (RLS) and defines separate `SELECT`, `INSERT`, `UPDATE` and `DELETE` policies where `auth.uid() = user_id`. Without login, users cannot access application data. Only use this app with RLS enabled. Verify policies remain enabled if you modify the database later.

## 3. Deploy online (GitHub Pages — free static hosting)

1. Create a **new GitHub repository** (e.g. `interntrack`).
2. Upload these files into the repository root: `index.html`, `styles.css`, `i18n.js`, `app.js`, `config.js` and `README.md`. `schema.sql` can also live in the repo; it contains no secrets.
3. In repository **Settings → Pages**, choose `Deploy from a branch`, `main`, `/ (root)` and Save.
4. GitHub will show the published URL, usually `https://YOUR_USERNAME.github.io/interntrack/`.
5. Set this URL under **Supabase Authentication → URL Configuration → Site URL** (and, if needed, Redirect URLs). Make sure sign-up confirmation works on your domain.
6. Visit the live URL, register an account and add your first real application.

**Alternative:** deploy the same static files to Vercel or Netlify. No server process and no Node build are needed.

## 4. How to use it

- Add an opportunity in **To Apply**, with `Priority`, `Job URL`, `Application Deadline` and `Notes`.
- After actually submitting an application, click **Mark Applied**. This moves it to **Applied** and uses today's date (editable).
- Edit the row to change `Status` to `HR Contacted`, `Assessment`, `Interview`, `Offer`, etc.
- Add `Next Action` (e.g. “Java Assessment”) and `Next Due Date` to see upcoming items.
- Click **Export CSV** for a backup; the file covers both tabs.

**Reminder limitation:** “7 days due” is an in-app count, not an automated email/push reminder. Open the app to review tasks.

## 5. Files

```text
index.html    – App shell
styles.css    – UI/theme and responsive layout
i18n.js       – English/Chinese UI dictionaries and language preference
app.js        – Form, filtering, CRUD, auth and Supabase integration
config.js     – Public project URL and publishable/anon key (blank = demo)
schema.sql    – PostgreSQL database tables, RLS policies and indexes
README.md     – Setup and deployment instructions
```

## Common issues

- **Cloud Mode not showing:** `config.js` URL or key missing/invalid; deploy the updated file.
- **"Could not find table" / permission error:** run `schema.sql` in the SAME Supabase project; confirm RLS policies exist.
- **Login confirmation link leads to wrong domain:** set the correct Supabase Auth Site URL/Redirect URLs.
- **Can use it on one PC but not another:** verify you're using the deployed HTTPS URL and the same user account. Local Demo Mode does not sync.
- **No records on the new cloud account:** demo records are local only; they are not automatically migrated.
- **Server access?** The database is cloud-hosted by Supabase; hosting only serves your frontend files.

© Personal template. Adapt it for your internship applications.
