-- Create a private resume bucket and per-user policies in Supabase SQL Editor.
-- Files are stored at <auth.uid()>/resume.pdf and cannot be listed or downloaded by another user.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('resumes','resumes',false,8388608,array['application/pdf'])
on conflict (id) do update set
  public=false,
  file_size_limit=8388608,
  allowed_mime_types=array['application/pdf'];

create policy "interntrack_resume_select" on storage.objects for select to authenticated
using (bucket_id='resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "interntrack_resume_insert" on storage.objects for insert to authenticated
with check (bucket_id='resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "interntrack_resume_update" on storage.objects for update to authenticated
using (bucket_id='resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id='resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
