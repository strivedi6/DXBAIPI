# Updating the Business Bay Team app

## Change the app (screens, options, text)
1. Edit the files in this folder (or ask Claude to make the change and send a new zip).
2. In `config.js`, raise `appVersion` (for example 1.0.0 → 1.1.0).
3. Netlify: open the site → **Deploys** → drag the whole folder onto the upload box.
   Use the same site every time, so the address and everyone's installed app stay the same.
4. Staff get the new version the next time they open the app. No reinstall needed.

## Change the backend (Code.gs in Apps Script)
1. Paste the new code into Apps Script and save.
2. **Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy.**
   Never use "New deployment" for an update: that creates a new link and the app stops working until `config.js` is changed.

## Change the app icon
Replace the four files in `icons/` with your design at the same sizes and names:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-maskable-512.png` (512×512, keep the logo inside the middle 80%: Android crops the edges)
- `apple-touch-icon.png` (180×180, no transparency)

Then upload the folder as above. Phones that already installed the app may keep the old icon until it is removed and added again (iPhone always needs this; Android usually updates by itself within a few days).

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `config.js`: name, version, backend link, push settings
- `sw.js`: offline support and push notifications
- `manifest.webmanifest`: how the app installs on Android and iPhone
- `_headers`: tells Netlify not to cache the app files, so updates show up quickly

## Version 1.3 features (where things live)
- **Bottom bar:** Home · HR · Offers · Profile. My posts, Birthdays, Special collections and Admin are inside Profile (only for people allowed to use them).
- **Sections:** every category is a section with its own colour and a swipeable row. Admin › App setup › Post categories sets the name, colour, type (Update, Offer, Newsletter, People) and which tab it shows in (HR tab, Offers tab, Home only).
- **People posts** (Employee of the Month, New Joiners, Promotions): HR enters the Employee ID and taps Find to fill in name and photo.
- **Birthdays:** Profile › Birthdays (HR and Admin). Upload a CSV with Employee ID, Name, Date of birth. Only day and month are stored. Notifications go out every day at 9:00 am once `setup` has been run in Apps Script.
- **Special collections** (e.g. Festive Season): Profile › Special collections (Marketing and Admin). Pick a colour and animation, then choose the collection when posting offers, notices or newsletters.
- **Newsletter style:** Regular, Special (pick a colour) or Festive (red with an animation by default). Special and festive newsletters open as a full page in that colour.

## Version 1.4 features
- **Bottom bar:** Home · HR · **Today's Special** (centre) · Offers · Profile. Today's Special shows today's birthdays, today's training, anything posted today, and offers that have "Show in Today's Special" turned on (only on the days in their Days field, e.g. "Every Friday", "Mon–Thu", "Weekends", "Daily").
- **Awards:** Admin › App setup › Post categories › open a People category (e.g. Employee of the Month) › Award titles. Each title (Front of the House, Heart of the House…) becomes a choice for HR and shows as the ribbon. People categories without titles (New Joiners, Promotions) show no ribbon. Add a new People category for any other award.
- **Learning & Development:** HR tab › calendar of trainings. HR adds each session with + (image, description, date, start/end time, venue, presenter by Employee ID or name). Everyone it's for gets a notification at 9:00 am on the day.
- **Admin:** Team access and App setup are now separate items in Profile.
- **Remove image / file:** every post form has a Remove button under the image and the attachment.
- **Special collections:** Admins can delete a collection (its posts stay in the app).
- **Desktop:** on a computer, the menu moves to the left and sections show as grids.

## Version 1.5 changes
- **Your birthday (Profile):** everyone can add their day and month. HR's date always wins; if they differ, HR sees "Needs checking" on the Birthdays page with a "Use their date" button. Dates added by colleagues stay when HR uploads with "Replace all".
- **Today's Special** shows only today: today's training, today's birthdays, and posts whose "Show in Today's Special on" date is today. Offers can also be set to repeat on the days they run.
- **Birthdays** show only on the HR tab and in Today's Special (no longer on Home).
- **Access requests:** HR and Admins get a notification when someone signs up. HR can approve (as Viewer) or decline from Profile › Access requests; roles stay with Admins.

## Version 1.6 changes
- **Opening the app** always starts on Today's Special. The centre button no longer shows a count.
- **Offer page:** Date and Time boxes (Date uses the offer's Date field, e.g. "24 December" or "Every Wednesday", or its Show from/Until dates). No "Valid until" line. Optional **Terms & Conditions** (one per line) shown in a fold-out section and in small print on the guest share image.
- **Edit from the post:** the pencil button on any post you're allowed to change (your own posts, or every post for Admins).
- **App theme:** Admin › App setup › App theme. Pick a season (Ramadan, Eid, UAE National Day, Festive, Diwali, Summer or Custom), adjust colours, greeting and animation, and optionally set From/Until dates. After Until, the app returns to the classic look by itself.

## Version 1.7 changes
- **Profile** looks like phone Settings: your card at the top opens **My profile** (photo, details, birthday, change PIN). Below: Notifications, Birthday, Add to Home Screen, then tools (My posts, Pop-ups, Birthdays, Special collections, Team access, App setup) and Sign out.
- **Bottom bar:** the active tab shows a solid icon.
- **Pop-ups** (Profile › Pop-ups, for Admin, HR and Marketing): title, message, optional image, colour, animation, optional button (opens a post or a web link), when it appears (0–60 seconds after opening), how often (once per person, once a day, every time), who sees it, and From/Until dates. Use **Preview** to see it before saving.
- **Dates typed as text** (e.g. "07 December") stay as typed; dates the sheet had already converted show as "7 December".

## Version 1.8 changes
- **Newsletter contents:** when creating or editing a newsletter, "Include in this newsletter" lists every live post by category. Tick the ones to show; they appear inside the newsletter grouped by category (e.g. Employee of the Month, Learning & Development, F&B Offers). Nothing is added unless ticked.
- **Full-width images:** a post's image now fills the top of the screen (newsletters, HR updates, notices, training), with Back and Edit on top of it.

## Version 1.9 (new design and features, same data)
**Install:** upload this folder to Netlify, then paste the new `Code.gs` into Apps Script and deploy a new version (Deploy › Manage deployments › Edit › New version). The first time the app talks to it, the backend adds the new **Attendance** tab by itself. Existing staff, posts, read records, PINs, categories, outlets and departments stay as they are. DXBAI, DXBPI and Cluster work exactly as before.

- **Look:** iOS-style floating glass bottom bar, smooth screen-to-screen transitions, soft press feedback, portrait only, no zoom.
- **Dark mode:** Profile › Appearance: Light, Dark or Automatic (follows the phone).
- **Haptics:** a light tick on button taps (iPhone and Android). Profile › Haptic feedback turns it off. Posts and cards scroll and swipe freely.
- **Images** are kept on the phone after the first view and preloaded after the feed loads, so posts open instantly.
- **Confetti** on Employee of the Month and Promotions (tile and full page).
- **Training:** Attend button, "Who's attending" photos and the full list. Attendees are saved in the Attendance tab.
- **Monthly Update tiles** show the day and date (e.g. Thu, Dec 14).
- **Search** people by first name, last name or Employee ID (Team access, Birthdays, and Find when posting a person or presenter).
- **Employee IDs:** a leading 0 is ignored (0104582 = 104582). Colleagues whose ID starts with 0 keep their PIN.
- **Pop-ups** blur and darken the screen behind.
- **App setup** (Admin) is now a Settings-style menu: Logo, Fonts, App theme, Sign-in image, Outlets, Departments, Post categories, Reset content.
  - **Logo:** shown on the sign-in screen (over the sign-in image or on navy) and in the desktop header.
  - **Fonts:** upload WOFF2/WOFF/TTF/OTF files to replace Hilton Serif and Hilton Sans for everyone. Remove to go back.
  - **Departments:** edit the list colleagues choose from when they create an account.
  - **Reset content:** permanently delete the posts of chosen categories, pop-ups, collections, the birthday list or team accounts (Admins are kept). Type RESET to confirm.

## Version 1.10
**Install:** paste the new Code.gs, then in Apps Script choose **setup** in the function list and press **Run** once (it adds the 10-minute check that sends attendance reports), then Deploy › Manage deployments › Edit › New version. Upload the changed files to GitHub, including the new `vendor` folder.
- **One device per person:** everyone except Admins can be signed in on one phone or computer at a time. Signing in elsewhere shows "You're already signed in on an iPhone…". Sign out first (Profile › Sign out). Lost or changed phone: Admin › Team access › open the person › **Sign out of all devices**. People who were signed in before this update are not blocked; their old sign-in simply expires.
- **Training check-in:** during the session (from 15 minutes before the start to 15 minutes after the end) colleagues tap **Check in now** and scan the QR code on the trainer's screen, or type the 6-digit code. The code changes every 30 seconds. The trainer (presenter), whoever posted the training, HR and Admin see **Show check-in code** and **Attendance report** on the training. When the session ends, the trainer and the poster get a notification to open the report and download it as a CSV file for Excel. Check-ins are saved in the Attendance tab.

## Version 1.11
**Install:** paste the new Code.gs and deploy a new version (Deploy › Manage deployments › Edit › New version). If you have not yet run **setup** for version 1.10, run it once: the same 10-minute check also ends leavers' access on time.
- **Leavers** (Profile › Leavers, for HR and Admin): find a colleague by name or Employee ID and set their **last working day**. Their access ends at **6:00 pm** that day (status becomes "Left" in the Staff tab and they are signed out). On their last day they see a thank-you message with sparkles, naming their hotel (both hotels for Cluster colleagues). HR can't set a date for themselves or for an Admin. "Give access back" (or Remove date) undoes it. Colleagues who have left no longer appear in birthdays.

## Version 1.26.0
**Install:** upload this folder to Netlify/GitHub, then paste the new `Code.gs` into Apps Script and deploy a new version (Deploy › Manage deployments › Edit › New version). The first time the app talks to it, the backend adds a new **Wishes** tab by itself — nothing to set up by hand. All existing data stays as it is.
- **Birthday wishes:** on a colleague's birthday tile there is now a small round button in the bottom-right corner with a 🎉. Tap it to pick 🎉, 🎊 or 🥳 and send the wish — no typing. The button then shows the emoji you sent, and changing it just updates your wish (the person is only notified the first time).
- **Your own birthday:** on your birthday your tile shows a round button with the **number of wishes** you've received. Tap it to see the list of who wished you and with which emoji. (HR and Admin can also see a person's list.)
- **Only the day and month** of birthdays are ever stored — never the year. Wishes reset each day.
- **Birthday tile** now shows the person's **position** (e.g. "Commercial Director") instead of the hotel code.
- **Profile photos:** when a colleague updates their photo it now shows everywhere for everyone — including on announcement posts (Employee of the Month, New Joiners, Promotions) — the next time the feed loads.

## Version 1.27.0
**Install:** upload this folder to Netlify/GitHub, then paste the new `Code.gs` into Apps Script and deploy a new version (Deploy › Manage deployments › Edit › New version). No new tab or setup step — all existing data stays as it is.
- **First-time setup:** the first time a colleague signs in, a welcome sheet invites them to add their **photo** and **birthday**. They can **Skip for now** and do it later.
- **"Complete your profile" reminder:** the Profile button shows a small number badge (on the bottom bar, the sidebar, and the top-right photo) counting what's still missing — photo, date of birth, first name, last name, department and job role. On the profile page the missing sections are highlighted in gold, and a banner lists what's left. The badge goes away once everything is filled in.
- **Edit your own details:** colleagues can now update their **first name, last name, department and job role** themselves on My profile. (Hotel/property is still changed by HR or Admin.)
- **HR & Admin can set a colleague's photo:** in Team access, open a staff member and tap **Add photo / Change photo** to upload one for them. It shows everywhere for everyone on the next refresh.
- **Desktop sidebar:** stays on permanently, and now has **Refresh** and **Log out** buttons at the bottom-left.
- **Footer** shows just the version number.

## Version 1.28.0
**Install:** upload this folder to Netlify/GitHub, then paste the new `Code.gs` into Apps Script and deploy a new version (Deploy › Manage deployments › Edit › New version). No setup step; existing files keep their current names until they're next changed.
- **Readable file names in Google Drive.** Uploaded media is now named by what it is, so you can see at a glance which "Team App Uploads" folder is live and which file is which:
  - **Profile photos:** `Full Name_Hotel Code` — e.g. `Georges Ghantous_DXBAI`.
  - **Post images & files:** renamed when the post is saved to `PostID_Post Name` (e.g. `PMVP4…_Taco Tuesday`), with `_menu` / `_attachment` for a post's menu or attached file and `_1`, `_2`… for extra images inside a newsletter or offer body.
  - **Special collections:** `CollectionID_Name` (banner and body images).
  - **Settings images:** `Sign-in image`, `App logo`, `Outlet logo - <outlet>`, `Attendance sheet logo`.
  - A colleague's profile photo reused on an Employee-of-the-Month / New Joiner post is **never** renamed — it keeps its `Name_Hotel Code` name.
- Only files in your current uploads folder are renamed; nothing already posted breaks. Existing files are renamed the next time that photo/post is saved.

## Version 1.29.0
**Install:** upload this folder, paste the new `Code.gs`, then in Apps Script choose **setup** in the function list and press **Run** once (this adds the monthly cleanup schedule), then Deploy › Manage deployments › Edit › New version.
- **No more photo pile-up.** Removing or replacing a photo (or deleting a post) leaves its old file in Drive, so unused files used to build up. Now a cleanup runs **on the 1st of each month at 3am** and moves any file in the uploads folder that is **no longer used anywhere in the app** to the Drive **Trash** (recoverable there for 30 days before Drive removes it).
  - "In use" means still linked from a staff photo, any post (image, menu, attachment or body image), a special collection, a pop-up, the sign-in image, a logo or an uploaded font.
  - Files uploaded in the **last 2 weeks are always kept**, so an image uploaded while a post is still being written is never removed before it's saved.
  - Only your **current** uploads folder is touched; files in an older/duplicate folder are left alone, and nothing already shown in the app breaks.
- **Run it on demand:** Admin › App setup › **Clean up unused files** does the same sweep immediately and tells you how many were moved.

## Version 1.29.1
- **Desktop sidebar now stays on every screen.** Opening a post, offer, newsletter, collection, training, the share screen or check-in used to hide the left sidebar on desktop — it now stays permanently, with the content sitting neatly beside it and the right section highlighted. (Front-end only; no Code.gs change — just upload the folder.)
