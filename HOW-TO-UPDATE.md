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

## Version 1.30.0
- **Face ID / Touch ID unlock.** Profile › **Face ID / Touch ID** (shown only on phones that support it) lets a colleague unlock the app with the phone's own Face ID, Touch ID or fingerprint instead of typing their PIN each time. After they sign in once with Employee ID + PIN, reopening the app (or returning to it after 2 minutes away) shows a lock screen asking for the phone's native unlock. "Use PIN instead" always works as a fallback. It's a quick lock on that one phone over the saved sign-in — it doesn't change anything on the server, and it's set per device, so each colleague turns it on for their own phone.
- Front-end only; no Code.gs change — just upload the folder. Works on the installed app over HTTPS (it won't appear on browsers or devices without a fingerprint/face sensor).

## Version 1.30.1
- **Face ID options explained in the app.** The in-app Face ID / Touch ID toggle stays optional (off by default). A new tappable tip under the settings — "Want the app to open with Face ID?" — explains the two ways to unlock:
  1. **The phone's own lock (recommended on iPhone):** touch and hold the app icon on the Home Screen › **Require Face ID**. This opens the app straight into Face ID with no passkey and no extra step (iOS 18+). On Android, use the phone's per-app lock in Settings.
  2. **The in-app toggle:** quick, but on iPhone it saves a passkey and shows a "Use Passkey" step before Face ID.
- Front-end only; no Code.gs change.

## Version 1.30.2
- **Correction to the Face ID guidance.** iPhone's "Require Face ID" app lock is only available for App Store apps, not for a Home-Screen web app (web clip) like this one — so that route isn't available. The in-app **Face ID / Touch ID** toggle is the only way to use Face ID on the installed app; on iPhone it runs through a one-tap "Use Passkey" step and then Face ID. The in-app help tip now explains this accurately. (A true system-style Face ID lock would require shipping the app as a native app — a separate project.)

## Version 1.31.0
- **Biometric login removed.** The Face ID / Touch ID in-app lock and its settings are gone. Signing in with Employee ID + PIN keeps you **logged in until you sign out** (Profile › Sign out), as before.
- **Birthday tile gets attention.** The wish button now **pulses** and its emoji **cycles** (🎉 🎊 🥳) to catch the eye, and the **whole tile is tappable** — tap anywhere on a colleague's birthday card to pick an emoji and send your wish (tap your own card to see who wished you).
- **Dark mode = iOS native.** The dark theme now uses Apple's neutral system grays (true-black background, #1C1C1E cards) instead of the blue tint.
- **Toggles match iOS.** Switches are now the exact iOS size (51×31) with the standard knob and off-state colour.
- Front-end only; no Code.gs change — just upload the folder.

## Version 1.31.1
- **Fixed the blurred/cut strip at the top of full-image pages (newsletters, notices, festive pages).** The hero image used to run under the iPhone status bar, so iOS blurred the top of it (hiding part of the title). The image now starts just below the status bar, with the page colour filling the strip above it — so the status bar sits over a solid colour, edge-to-edge, and the whole image stays sharp and fully visible. Front-end only; no Code.gs change.

## Version 2.0.0 — new design ("Glasshouse")
**Install:** upload this whole folder to GitHub (it has one new file, `glass.css`). No Code.gs change, no setup step — all data, posts and settings stay as they are.

The whole app has a new look, built from the ground up around frosted glass over a soft, atmospheric background:
- **Light mode = Sand:** warm stone background with soft daylight, a diagonal light beam and low sage and brass glows. **Dark mode = Forest:** deep sage-green night with the same glass.
- **Glass everywhere:** cards, tiles, settings, fields, the top bar and the floating bottom bar are frosted glass with a fine light edge. Buttons are rounded pills (deep olive in light mode, soft sage in dark mode).
- **Sign in:** the sign-in image now fills the whole screen, with the app name (or the logo from App setup) in the middle and a glass sign-in panel at the bottom.
- **Home:** a large greeting with a one-line summary of what's happening today, a swipeable **featured** row (urgent notices first, then the newest posts with a picture) and a row of round **shortcuts** to every section that has something in it (Birthdays, HR Updates, Employee of the Month, Learning & Development, F&B Offers…) plus All updates.
- **Today's Special:** the quote of the day is now a "Daily inspiration" card.
- **Offers:** the picture fills the top of the screen and the details rise over it as a glass sheet, with Date / Time / Where in one row and the price next to "Share with guest" at the bottom.
- **Other posts** (HR updates, notices, newsletters, training) open the same way: picture on top, glass sheet below.
- **Tags** are glass pills with a coloured dot in the category colour; profile and settings icons are soft tinted circles.
- **Seasonal themes still work** (Admin › App setup › App theme): the season's main, accent and background colours now tint the atmosphere, buttons and glows.
- **Guest share images are unchanged** — they keep the Hilton look guests already receive.
- Where the design lives: `glass.css` (loaded after `styles.css`). To go back to the 1.x look, remove the `glass.css` line from `index.html`.

## Version 2.0.1
Front-end only; no Code.gs change — just upload the folder.
- **Smooth page changes:** opening a post no longer shows the old page through the new one; the new page slides in cleanly over it.
- **No gap at the bottom:** pulling past the end of a page no longer shows a different-coloured band.
- **Home is simpler:** the "things happening today" line and the large featured slider are gone. Urgent and pinned notices show at the top as before.
- **Menu button (☰) at the top left** of Home, HR, Today's Special and Offers, in place of the logo. It opens a glass side menu with the logo, your profile, every section that has something in it (with counts: Birthdays today, HR Updates, Employee of the Month, F&B Offers…), quick links (Today's Special, All updates, Special collections, Profile), and Refresh / Sign out. Close it by tapping outside, ×, or swiping it to the left.

## Version 2.0.2
Front-end only; no Code.gs change — just upload the folder.
- **Matching corners everywhere:** every button, picture, icon circle and field now sits the same distance from each edge of its card, and the card's corner is exactly the inner corner plus that distance. Pills follow the curve of the card around them: forms, the sign-in panel, pop-ups, the birthday wish card, profile and settings groups, the side menu, the bottom bar, offer tiles and training cards.
- All buttons are one height (52 px), so their rounded ends always match.

## Version 2.0.3
Front-end only; no Code.gs change — just upload the folder.
- **Special collections and special newsletters:** the animation (snow, sparkle, confetti…) shows again, over the whole page. The red fade under the picture is gone; the page opens like every other page (picture on top, glass sheet below).
- **Offer tiles are white on every background** (light mode, dark mode and coloured collection pages) for better reading. Tiles are square, with the picture in 16:9 running edge to edge across the top. The price sits on the picture.
- **Offer lists** (See all, All updates) use the same white card, with the picture flush to the left edge.

## Version 2.0.4
Front-end only; no Code.gs change — just upload the folder.
- **Side menu links work** (sections, quick links, profile, Refresh, Sign out).
- **Back / Edit buttons on pictures** are near-white with dark icons, visible on any photo.
- **Bottom action bar** (Share with guest, Acknowledge, Share this achievement, Publish and other form buttons) is now fixed to the bottom of the screen on phones with a frosted background; the page scrolls underneath it.
- **Offer tile shadows** are no longer cut off in the swipe rows.
- **Special collections / special newsletters:** the animation runs behind the content again; the section below the picture is a clean solid block with rounded corners (no fade).
- **Daily inspiration** is smaller and sits straight on the page (no card).
- **Offers:** the hotel name/code pill under the offer name is removed (offer page and offer lists).

## Version 2.0.5
Front-end only; no Code.gs change — just upload the folder.
- **Profile cards** (Profile page and side menu) use the same rounded corners as every other card.
- **Daily quote** shows just the quote, in quotation marks, small and in italic (no "Daily inspiration" label).
- **Swipe back from the left edge** on iPhone (and Android's back gesture): the phone's own swipe animation is used, and the app no longer plays a second slide afterwards, so there is no flicker. The back button still slides as before.

## Version 2.0.6
Front-end only; no Code.gs change — just upload the folder.
- **No bottom bar flash** when a post opens: the bar no longer appears for a moment on detail pages.
- **Light/dark switch everywhere:** after changing the look (in Appearance, or when the phone switches by itself), swiping back no longer shows earlier pages in the old colours. The back history is quietly rebuilt, so back now goes to the first page you opened.
- **Solid text panel** under the picture on offers, posts, newsletters and special collections; the picture no longer shows through.
- **Special collections:** the animation runs over the picture and the coloured panel, behind the text and cards.
- **Pull down to refresh** moves the whole page (picture and text together) and always lets go: if the connection is slow, it stops waiting after 12 seconds.

## Version 2.0.7
Front-end only; no Code.gs change — just upload the folder.
- **Choose your colour:** Profile › Appearance › Colour — Sage (default), Navy, Plum, Terracotta, Teal or Graphite. Each has a light version and a deep dark version (like Sage and Forest). Saved on each phone. A seasonal theme set by Admin still takes over while it's on.
- **Living background:** soft lights drift very slowly behind every page, and the sign-in picture moves gently. It's subtle, doesn't move any content, and stops if the phone has "Reduce Motion" turned on.
- **Pull to refresh, rebuilt:** the page no longer moves; a small glass circle with the spinner drops down from the top while it refreshes. Tested: refreshing twice in a row works, the page scrolls normally afterwards, and nothing stays stuck.
- **Bottom button bar** (Share with guest, Acknowledge, Publish…) slides up smoothly when a page opens.

## Version 2.0.8
Front-end only; no Code.gs change.
- **Living background is now visible:** the soft lights behind every page drift a little further and faster (one slow cycle every ~18 seconds) and gently brighten and dim. Content never moves. The sign-in picture zooms slowly (20 seconds) with a soft light passing over it. All of it stops when "Reduce Motion" is on.
- **Bottom button bar slides up after the page has arrived** (it used to slide up at the same time as the page slid in, so it was hard to notice).
- Removed two old zip files from the site folder (not used by the app).

## Version 2.0.9
Front-end only; no Code.gs change.
- **Tile text uses the body font:** titles and names on every tile and card (offers, updates, people, birthdays, training, newsletters, special collections, offer lists) now use the body font (Hilton Sans) in a semi-bold, smaller size. The heading font (Hilton Serif) stays for page titles and section headings.

## Version 2.0.10
Front-end only; no Code.gs change.
- **Background is still again:** the drifting lights are removed (they could pop in suddenly). In their place are soft, blurred leaf shapes behind every page — static, never moving. They follow light and dark mode and your Colour choice. The sign-in picture keeps its slow zoom; the moving light over it is removed.

## Version 2.0.11
Front-end only; no Code.gs change.
- **Tile pictures are 4:3 everywhere** (offer tiles, update tiles, offer lists). Tiles grow to fit their text.
- **Bottom button bar rises the same way on every page** (as on the people/award page). On long pages it used to sit out of sight during the slide and then jump in.
- **Side menu:** scrolls smoothly on its own (pull-to-refresh no longer interferes), no longer closes when you swipe left (close with × or by tapping outside), straight right edge (no rounded corners), and haptic ticks on its buttons. List rows tick when the list fits on screen without scrolling (a tick layer would stop a scrolling finger).
- **Back keeps your place:** going back returns to where you were scrolled on the previous page.
- **Today's Special › Today's offers / Also today:** a "See all" link opens the full list, with the hotel filter (All · DXBAI · DXBPI · Cluster). The same filter, now with **Cluster** (posts for both hotels), is on Home, HR and Offers for Cluster colleagues.

## Version 2.0.12
Front-end only; no Code.gs change.
- **Top bar like iPhone Settings:** when you scroll, the bar turns to frosted glass with a fine line under it, and the page title appears small and centred between the buttons. Pages whose title sits in the bar (Appearance, F&B Offers, All updates…) show it centred the same way.
- **Section notes:** every section has a short line under its heading saying what's inside (e.g. "News, policies and reminders from HR. Some need your acknowledgement."). The note is chosen from the section's type and name (offers, people/awards, new joiners, training, newsletters, notices, HR updates), plus Birthdays, Training today, Today's offers and Also today. Profile has short notes under its groups too.

## Version 2.0.13
**Install:** the front end updates by itself. For job titles on New Joiners / award tiles, paste the new `Code.gs` into Apps Script and deploy a new version (Deploy › Manage deployments › Edit › New version). No new tab or setup step.
- **Job title on people tiles:** New Joiners and award tiles show the colleague's job title, then their department, taken live from their profile (needs the new Code.gs). "Find" in the post form now fills "Job title, Department".
- **Offers › See all:** two-column grid of the same tiles, pictures 4:3.
- **Title in the bar on every page:** special collections, Today's offers and other pages show their title in the frosted bar when you scroll. Pages that open with a big picture (offers, posts, newsletters, collections) get a frosted bar with Back, the title and Edit once the picture has scrolled away.
- **Page changes keep the background still:** only the content slides and fades.
- **Side menu like the Claude app:** the page slides to the right and the menu is revealed underneath. Tap the page, or drag it back to the left, to close. No close button.
- **Hotel filter:** Cluster (everything) · DXBAI · DXBPI. No separate "All".
- **Shadows are never cut** by scrolling rows or the side menu.
- **Training tiles:** the date column is the same size on every tile, with a fine divider and no separate background.
- **Profile** has the same top bar as Home, HR, Today and Offers (menu, search, photo).

## Version 2.0.14
Front-end only; no Code.gs change.
- **Today's Special › Today's offers › See all:** the same two-column grid of offer tiles as Offers › See all (pictures 4:3, no gaps above or below the picture).
- **Offer rows in All updates (search):** the picture fills the full height of the row; every row is the same tidy height.
- **Offer tiles in the grid:** the date/time line can wrap to two lines instead of being cut off.
- QA pass across every screen in light and dark (sign in, Home, HR, Today, Offers, Profile, side menu, offer/post/person/training/newsletter pages, special collection, sections, search, My profile, compose, Appearance, Birthdays, My posts, App setup, Quote of the day): no errors. Pull to refresh, back-to-same-scroll-position and the bottom bar rise re-tested.
