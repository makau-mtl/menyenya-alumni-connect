# How to update the website

For officials and the secretariat. No technical knowledge needed. Everything is done from the
website's admin area: log in at **/login**, open **My account → Open the admin area**, then use the tabs at the top.

Every change shows on the website within seconds, and is recorded (who, what and when) in the
audit log. Nothing is deleted: photos and posts are hidden instead, and can be shown again.

## Who can do what

Buttons that are hard to undo (Remove, End role, Merge, closing registration) ask you to confirm first. Remove never deletes; it only takes the item out of view, and the record is kept.

| Tab | Who sees it | What it is for |
|---|---|---|
| Overview | Chairman, Treasurer, administrators | Pledges and gifts so far |
| Members | Administrators | Registration switch, class invite links, who has registered |
| Duplicates | Administrators and verifiers | Possible duplicate records: merge or mark as different |
| Roles | Administrators | Give and end roles |
| Settings | Administrators | Member confirmation, rejoin window |
| Our people | Administrators | Leadership and secretariat positions on the Our people page |
| Sponsors and partners | Administrators | Enquiries from organisations, sponsor and partner logos, sponsorship options |
| Merchandise | Administrators, the Secretary and the Treasurer | Merchandise items and orders |
| Impact | Administrators, the Chairman, the Secretary and the Treasurer | Impact figures for each initiative |
| Reports | The Treasurer (financial), the Chairman (moral report), administrators | Annual reports on the Reports and accountability page |
| Alumni stories | Administrators, the Secretary and the Chairman | Review, publish and feature stories members share |
| The school | Administrators and the school liaison | The school's figures, results and priorities members see |
| Cases for support | Administrators, the Chairman, Welfare Coordinator, school liaison, Secretary | Cases members raise |
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

**Photos and video** lists every photo space by page (Home, Who we are, Our people, Ways to give, Corporate sponsorships, Strategic partnerships, Join,
Careers), with a note of what belongs in each. Upload a photo into any space; spaces without one
keep showing "Photo to come".

## Photos of students

Only use photos of students with the school's and parents' consent, and never name a student
supported by the Keep a Child in School fund.

## Members, registration and class links

**Members** tab (administrators):

- **Registration switch.** While it says *Closed*, the public sees "Registration opens soon"; administrators
  can still go through registration to test. Press **Open registration** for the soft launch.
- **Class invite links.** Choose a class (and optionally a name), press **Create link**, then **Copy link**
  and share it in the class WhatsApp group. It fills in the class and records who invited them. Switch a
  link off if it is shared too widely.
- **Registered members.** Filter by alumni or friends, status and region. Next of kin is never shown here.
- **Possible duplicates.** A count of records sharing a phone, an email, or a name in the same class.
  Nothing is merged automatically; checking them comes with verification in January.

## Who sees next of kin (welfare programme)

Only the member and the **Welfare Coordinator**. Administrators and the Secretary do not see it. The
coordinator's views are recorded with a reason. Members give it only when they join the welfare programme, once administrators switch the programme on.

## Giving someone a role

**Admin → Roles**: choose the person, the role and, for class reps and regional reps, the class or region.
They need a record first: members have one; an official who isn't a member should sign in once at /login.
To remove a role, press **End role** (the record is kept). You can't give yourself a role; another
administrator has to.

If the website is unavailable, the SQL editor still works: `select public.give_role('their-email', 'secretary', 'Their Name');`

## Confirming new members

**Admin → Settings**: switch "New members must be confirmed" on or off, and choose who confirms alumni and who
confirms friends. Class reps only see their own class; regional reps only their own region. Confirmers see a
**Confirm members** tab in their member area.

## Possible duplicates

**Admin → Duplicates** (administrators and verifiers): compare the two records, then either keep one and merge, or
mark them as different people. Merging moves gifts, pledges, payments and the login to the kept record; nothing is
deleted, and an administrator can undo a merge from the same page.

## Active and inactive members

Every member is **Active** or **Inactive**. Only active members can vote and take part in decisions.
- If member confirmation is switched on (Settings), a new member is inactive until confirmed. If it is off, members are active as soon as they register.
- While membership fees are off (as now), no payment is needed.
- Once fees are on, a member is active for each calendar year they pay for, and last year's payers stay active until 31 March. Members pay only for the year they want to be active; there are no arrears.
- On **Members**, the *Standing* column shows each member's standing; use *Active (can vote)* to get the voting list.

## Members who terminate

Members can terminate their membership from their profile. They can rejoin within the window set in
**Admin → Settings** (default 30 days). The Members list shows who has terminated, until when they can rejoin, and
whether they asked for their data to be deleted.

## The Our people page (leadership and secretariat)

Open the **Our people** tab.

1. Under **Add a position**, choose **Leadership (the board)** or **Secretariat**, and type the role as it should appear, for example *Chair* or *School Principal (ex officio)*.
2. Choose who holds it:
   - **An active member**: pick them from the list. Their photo, class, summary and LinkedIn come from their own profile, so ask them to complete it.
   - **Someone who isn't a member** (for example the principal): type the name, and optionally add a photo, a one-line summary and a LinkedIn link.
3. Optionally add the **official capacity**, e.g. "Serves in his official capacity as Principal of Menyenya SDA High School."
4. **Term of office**: choose *No fixed term*, or *Has a term* and set the start and end dates. Only signed-in members see term dates.
5. Choose whether to show it now, then **Add position**.

Use the arrows to change the order, **Edit** to change the holder after an election, **Hide** to take it off the page for a while, and **Remove** when the position no longer exists. Thirty days before a term ends, a **Terms ending** box appears at the top of the tab.

Holding a position means being shown publicly, so let people know before you add them. Members appear in the Members section only if they ticked "public profile", or hold a position.

## Sponsors, partners and enquiries

Open the **Sponsors and partners** tab.

- **Enquiries**: organisations that filled in the form on the Corporate sponsorships or Strategic partnerships page. Reply by email or phone, add a short note, and set it to *In progress* or *Closed*. Closed ones are hidden; *Show closed too* brings them back.
- **Add a sponsor or partner**: choose the type, type the name, add the website and a logo (a PNG with a transparent or white background looks best). Tick *Also show on the home page* for a logo strip there. Use the arrows to order them, **Hide** to take one off for a while, and **Remove** when they no longer support us. Nothing is deleted.
- **Options and areas**: the cards on each page. Corporate sponsorship options (e.g. *Friends of Menyenya*) and strategic partnership areas (e.g. *Mentorship and careers*). Write who it is for, a description and what they receive, one per line. Leave the amount blank until the leadership approves it; the page shows "Amount on request".

The wording on both pages is marked as a draft. Once the officials approve it, ask for the draft notice to be removed.

## Alumni merchandise

Open the **Merchandise** tab (administrators, the Secretary and the Treasurer).

- **Add an item**: name, price in shillings, a short description, and the choices separated by commas (e.g. *S, M, L, XL*, called *Size*; or *Navy, White*, called *Colour*). Leave the choices blank if there is only one kind. Add a square photo. Use the arrows to order items, **Hide** to take one off for a while, **Remove** when it is no longer sold. A new price affects new orders only.
- **Orders** arrive with a reference such as *MER-7K2QXP*. For each one:
  1. Call the buyer to confirm, then set **Confirmed**.
  2. When the payment shows on the Paybill statement with that reference as the account, set **Paid**.
  3. When the items are packed, set **Ready to collect**, and **Collected** when they are picked up. Use **Cancelled** if the order falls through.
  Add a note each time (e.g. "Paid 3,200, M-Pesa QJK…"). Collected and cancelled orders are hidden; *Show collected and cancelled too* brings them back.

## The admin workspace

The admin area now has its own menu on the left. Gold numbers show what is waiting. At the bottom, *Leave admin* takes you back to your account or the website. On a phone, open the menu with the button at the top left.

## The school's figures and priorities

Open **The school** (administrators and the school liaison).
- **Figures:** enter the number of students, students in need, students supported by the alumni and teachers, with the date. Each save is kept as history; members see the latest.
- **Academic performance:** one line per year (e.g. KCSE mean score 7.125, grade C+). Saving a year again corrects it.
- **Priorities:** add them, then use the arrows to put them in order. Members rate each from 1 to 5 and may comment. You see the average and the comments (without names) under each priority.

## Cases for support

Members raise cases from **My account → Raise a case for support** (a member in need, a needy student, a project or idea, or anything else). Who sees which: the Welfare Coordinator handles members in need, the school liaison needy students, the Secretary projects and other cases; administrators and the Chairman see all.

Open **Cases for support**, open a case (this is recorded), and reply. Tick *Internal note* for something only the team should see. Set the status: *Being reviewed*, *Replied* or *Closed*. The member sees replies on their dashboard. If the member ticked "may share", you may tell other members to rally support; otherwise keep it within the team.

## Memories

Members share photos straight away. Anyone can report one. Administrators see "Reported memories" in *Waiting for you*; open it, then **Hide** or **Show again**. Owners can remove their own. Nothing is deleted. Remind members not to share photos of today's students without the school's permission.

## Class WhatsApp groups

A class rep sees *Add your class WhatsApp group link* on their dashboard. Paste the group's invite link (it starts with https://chat.whatsapp.com/). Classmates then see a green *Class WhatsApp group* button. Administrators can set it for any class.


## Alumni stories

Members send stories from **Share a story** in their account. They appear in **Admin → Alumni stories** under *Waiting for review* (and in "Waiting for you" on your dashboard).

1. Open the story. Read it, check the facts, and tidy the title, summary and wording if needed. Leave a blank line between paragraphs.
2. **If it is about someone else**, contact them (the "How to reach" box), read them the story, then tick *agreed to this story being on the website* and note how they agreed (e.g. "By phone with the Secretary, 20 Oct"). The website will not publish it without this.
3. Press **Approve and publish**. It appears on the Alumni stories page straight away.
4. To put it on the home page, tick **Show on the home page** and save. Up to three stories show there.
5. To take a story down, press **Hide from the website**. To turn one down, press **Don't publish** and write the reason in the notes. Nothing is deleted.

## Annual reports

**Admin → Reports.** The Treasurer publishes financial reports; the Chairman publishes the moral report.

1. Under *Upload a report*, choose the kind and the year it covers, give it a clear title (e.g. "Financial statements for the year ended 31 December 2026") and a few plain-language lines of summary.
2. Choose the PDF (up to 15 MB) and press **Save as draft**. Press **Open PDF** to check it.
3. Press **Publish**. It appears on the Reports and accountability page straight away.
4. Found a mistake in the PDF? On the published report, press **Upload a new version**. When you publish it, the old one is kept and marked as an earlier version.
5. **Withdraw** takes a report off the website. Nothing is deleted.

For the Bursary Fund, the financial statements should show what was paid to the school, for how many students, and for which term or year.

## Bursary Fund figures

**Admin → The school** (administrators and the school liaison). When the school gives them, fill in *Fees for the year*, *Fees per term*, *Fees per year* and *Needy students admitted a year (average)*, then save. The Bursary Fund page shows them straight away; until then it says "to be confirmed". The process text (who qualifies, how students are chosen) is proposed wording; send changes to the developer.

## Impact figures and stories

- **Figures: Admin → Impact.** Choose the initiative, type the figure (e.g. "12" or "KES 384,000"), what it counts ("students on bursaries in 2027") and the date it is correct to. Keep figures in line with the annual reports. Use the arrows to order them, Hide to take one off for a while, Remove when it is out of date.
- **Stories: Admin → Alumni stories → Write an impact story.** Choose the initiative, say who it is about (for a student: first name and form only), write the story, and add a photo and a YouTube link if you have them. To use a video, first upload it to the association's YouTube channel ("Unlisted" is fine), then paste its link.
- On the next screen, record the agreement before publishing. **For a current student you need a parent or guardian and the school to agree, and a face is shown only with that agreement.** Then press **Approve and publish**.

## An initiative's video and photos

**Admin → Causes → choose the initiative.** Administrators only.

- **Video:** upload the film to the association's YouTube channel ("Unlisted" is fine), paste its link, say what it is (e.g. "Message from the Chairman", "Project video") and, if one person speaks, who (e.g. "Peter Ondieki, Class of 2012"). One video per initiative; 1 to 2 minutes is best, with subtitles. For a building project, the strongest film shows today's classrooms, a walk-through of the 3D design, the architect, the Chairman and an alumnus, and ends with a clear ask.
- **Photos:** for each photo choose what it shows: *The design* (drawings, 3D views, floor plans), *Today* (the need), *Progress*, *Impact* or *Other*. The first photo is the cover.
- **Ready to market:** the checklist at the top shows what is missing. A new initiative can't be set to Preparing, Live or Construction until it has a video and at least three photos.

## Streams and dormitories

**Admin → Settings → Streams and dormitories** (administrators). Type the names separated by commas and press Add. Fix spelling with Rename. Hide one that shouldn't be chosen any more; members who already chose it keep it. Members choose theirs under **My profile → My Menyenya**.
