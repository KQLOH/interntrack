# Update an existing InternTrack installation (English default + 中文 toggle)

**If you already connected Supabase, DO NOT replace your existing `config.js`.**

In VS Code, close the InternTrack page and **back up your project folder** first.

Copy these **three** files from the new release into your existing project (overwrite the old ones):

- `index.html`
- `app.js`
- `styles.css`

Then add this **new** file:

- `i18n.js`

Leave **`config.js` and `schema.sql` unchanged**. Your existing Supabase Project URL, public publishable key, account, `applications` records, RLS policies and email login are unaffected. **Do not run schema.sql again just for language changes.**

If you host with GitHub Pages, commit and push the changed files, including the new `i18n.js`, then hard-refresh your browser (Ctrl+Shift+R).

## What changed

- First visit starts in English; click **EN / 中文** to switch instantly.
- The language switch is on the login screen, dashboard and edit form.
- All navigation, statuses, form labels, empty states, confirmations, toast messages and error messages that the site controls are translated.
- Selected language persists **per browser** in localStorage under `interntrack_language_v1`.
- Existing user-written descriptions and notes are not translated or modified.
- `demo.html` is updated for offline preview. It is not required for the live Supabase site.

### Important reminder

If your current `config.js` is already connected to Supabase, **keep it**. The `config.js` included in the full downloadable project is intentionally blank, for security. Do not post passwords or service-role/secret keys in public GitHub repositories.
