# How to update the website

For officials and the secretariat. No technical knowledge needed. Everything is done from the
website's admin area: log in at **/login**, then use the tabs at the top of the admin page.

Every change shows on the website within seconds, and is recorded (who, what and when) in the
audit log. Nothing is deleted: photos and posts are hidden instead, and can be shown again.

## Who can do what

| Tab | Who sees it | What it is for |
|---|---|---|
| Overview | Chairman, Treasurer, administrators | Pledges and gifts so far |
| Causes | Administrators | The text, launch checklist, stage and photos of each cause |
| News and events | Administrators and the Secretary | Posting news and upcoming events |
| Photos and video | Administrators | The Chairman's video and the photos around the website |

## Change what a cause says, or tick off the launch checklist

1. **Causes** → **Edit** next to the cause.
2. Change the text. In "Why this matters", leave a blank line between paragraphs.
3. Under **Launch checklist**, tick each step when it is done (for example, when the registration
   certificate arrives). Use the arrows to reorder steps.
4. Press **Save changes**. The green message confirms it worked.

**Stage** controls how the cause appears. Keep the tuition block at "Preparing for launch" until
the Board of Management's Paybill is confirmed, then change it to "Live".

## Add photos to a cause

1. **Causes** → **Edit** → scroll to **Photos**.
2. **Choose file**, pick a photo, write a short caption, press **Upload photo**.
3. The first photo is the cover on the cause cards. Use **Make cover** to change it, or **Hide** to
   take a photo off the website.

Photos are shrunk on your device before upload, so even phone photos upload quickly.

## Post news or an event

1. **News and events** → **New post**.
2. Choose **News** or **Event**, write a title and a one or two sentence summary. For events, put
   the time and place in the summary.
3. Optional: a longer story (adds a "Read more" link) and a photo.
4. Choose **Publish** to show it now, or **Save as draft** to finish later. Press **Save**.

The three most recent published posts also show on the home page. To take a post down, edit it and
choose **Hide**.

## Add the Chairman's video

1. Upload the video to YouTube. Choose **Unlisted** if it should not appear in YouTube searches.
2. On YouTube press **Share** and copy the link.
3. **Photos and video** → paste the link → **Save video**. It appears on the home page.

## Fill the photo spaces around the website

**Photos and video** lists every photo space by page (Home, Who we are, Ways to give, Join,
Careers), with a note of what belongs in each. Upload a photo into any space; spaces without one
keep showing "Photo to come".

## Photos of students

Only use photos of students with the school's and parents' consent, and never name a student
supported by the Keep a Child in School fund.

## Giving someone a role (until the roles screen arrives)

A roles screen comes in a later milestone. Until then, an administrator does it once in Supabase:

1. Supabase → **Authentication** → **Users** → **Add user** → enter their email and a temporary
   password, tick **Auto Confirm User**. Send them the password privately and ask them to change it.
2. **SQL Editor** → run, with their email and the role (`secretary`, `treasurer`, `chair` or `admin`):

```sql
insert into public.role_assignments (person_id, role_id, notes)
select p.id, r.id, 'given by SQL'
from public.persons p
join auth.users u on u.id = p.user_id
join public.roles r on r.key = 'secretary'
where lower(u.email) = lower('their-email@example.com');
```

To end a role, set its end date instead of deleting it:

```sql
update public.role_assignments set ends_on = current_date
where person_id = (select p.id from public.persons p join auth.users u on u.id = p.user_id
                   where lower(u.email) = lower('their-email@example.com'))
  and role_id = (select id from public.roles where key = 'secretary') and ends_on is null;
```
