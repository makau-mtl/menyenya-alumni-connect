# How to update the website

For officials and the secretariat. No technical knowledge needed. Everything is done from the
website's admin area: log in at **/login**, open **My account → Open the admin area**, then use the tabs at the top.

Every change shows on the website within seconds, and is recorded (who, what and when) in the
audit log. Nothing is deleted: photos and posts are hidden instead, and can be shown again.

## Who can do what

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

