# InternTrack Resume Storage (Optional)

The Email Apply feature **only prepares a Gmail draft**, it never sends automatically. A standard Gmail URL cannot attach a PDF automatically.

To save one default resume per signed-in user, run the SQL in `resume-storage.sql` in your **Supabase SQL Editor**, once. It creates a **private** Supabase Storage bucket called `resumes` and RLS policies restricting files to the signed-in user's own UUID folder.

Then refresh InternTrack and use **Save Resume** in the toolbar to choose a PDF (max 8 MB). This uploads to the private key `<your-user-id>/resume.pdf`, replacing the previous default resume.

When preparing an email, click **Download saved resume**, then **Open Gmail Draft**. Gmail fills the address, subject, and content. Attach the downloaded PDF and click **Send** manually. Only afterward select **I already sent the email** to update the tracker.

The resume remains private, not a public URL. Never upload private email OAuth credentials to GitHub. You do **not** need Google OAuth to use these features.

## Company Details

Click a company name/details area to open its full record. On desktop, hovering the card highlights it. The popup offers Edit, Prepare Gmail, and Job Link. Keyboard: focus the card and press Enter or Space.

## Important

Do not run `schema.sql` again to implement this feature. Existing application records and login continue to use the same Supabase database.

If your project already has a bucket or policy of these exact names, check before rerunning the SQL. Storage SQL should be reviewed in your own Supabase dashboard.