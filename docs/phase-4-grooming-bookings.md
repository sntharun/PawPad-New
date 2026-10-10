# Phase 4 — grooming slot bookings

Customers now pick a real, free grooming time at checkout. Every booking is
saved on the Pawpad server and added to the **info@pawpad.in calendar**. The
customer gets a confirmation email from info@pawpad.in, and info@ gets a copy.

## How it works

| Rule | Setting |
|---|---|
| Start times | 11:00, 12:00, 13:00, 16:00, 17:00, 18:00, 19:00. Saturday and Sunday also 10:00 |
| Closed | Thursdays |
| 7 PM slot | Only services without a haircut or clipping. Never for: Dog Grooming Long Hair with haircut, Cat Hair Cut, Puppy Grooming Long Hair, Matted Dogs, Hygiene Clip |
| One booking per start time | Enforced by the database, even if two people book the same second |
| Several pets | Each pet picks its own time |
| How far ahead | From today up to 30 days. Today's times can be booked online until 1 hour before they start (`booking_same_day_notice_minutes` in config.php, optional) |
| Payment | At the studio |
| Boarding and courses | Still enquiries (no slot). Boarding dates can be requested up to 3 months ahead |

A time is shown as free only when it is not booked, not blocked in the admin
panel, and **there is no event at that time in the info@ calendar**. So if Leena
adds anything to that calendar on her phone (a vet visit, a day off), that time
disappears from the website within about a minute.

If the calendar can't be reached, the website doesn't guess. It says "Online
booking is not available right now. Please WhatsApp us on +91 91484 43330"
until the calendar works again.

---

## Step 1 — Update the server

Follow [Updating the Pawpad server](updating-the-server.md) (Update from Remote →
Deploy HEAD Commit). The new booking tables are created by themselves.

## Step 2 — Add the info@ password to config.php

> Type the password **only** in cPanel. Never in a chat, email or GitHub.

1. In cPanel, open **File Manager** and go to `public_html/api.pawpad.in`.
2. Right-click `config.php` → **Edit** → **Edit**.
3. Just above the line that says `'session_hours'`, add these lines. Copy them
   exactly, then type the info@ mailbox password between the empty quotes:

   ```php
   'info_email'    => 'info@pawpad.in',
   'info_password' => '',
   'caldav_calendar_url' => 'https://cpcalendars.pawpad.in:2080/calendars/info@pawpad.in/calendar',
   ```

4. Click **Save Changes**.
5. Check: open **https://api.pawpad.in/index.php?action=health**. You should see
   `"bookingEmail":true` and `"calendar":true`.

If you don't know the info@ password: cPanel → **Email Accounts** → **Manage**
next to `info@pawpad.in` → set a new one. Then update it on every phone or
computer that reads info@ mail.

## Step 3 — Check the calendar address

1. In cPanel, search for **Calendars and Contacts** and open
   **Calendars and Contacts Configuration**.
2. Choose the account `info@pawpad.in`.
3. Look at the **Calendar** address (under "Directly configure your calendar
   and contacts"). If it is different from
   `https://cpcalendars.pawpad.in:2080/calendars/info@pawpad.in/calendar`,
   copy it into `caldav_calendar_url` in `config.php`.

If cPanel says info@ has no calendar yet, open **Calendars and Contacts
Management**, choose `info@pawpad.in` and create a calendar called `calendar`.

## Step 4 — Test it

1. Open **https://api.pawpad.in/index.php?action=booking_availability**.
   You should see a list of dates with free times.
2. On the website, add a grooming service to the cart, go through checkout with
   your own email address and pick a time.
3. You should see **Booking Confirmed**, receive an email from info@pawpad.in,
   and see the booking in the info@ calendar (Step 5 puts it on your phone).
4. In the admin panel open **Grooming Bookings**, go to that day and click
   **Cancel booking**. The time becomes free again and the calendar event
   disappears.

---

## Using the admin panel

Open the admin panel → **Grooming Bookings**.

- **Choose a day** with the date box, **← Previous day** / **Next day →**, or
  a button under "Coming days with bookings".
- Each start time shows **Free**, **Booked** (with pet, service, customer and
  phone), **Blocked**, or **Calendar event**.
- **Cancel booking** frees the slot and removes it from the calendar. Please
  tell the customer yourself (their phone number is shown).
- **Block** a single free time, or **Block whole day** (e.g. a holiday). A day
  with bookings can't be blocked until those bookings are cancelled.
- **Unblock** / **Unblock whole day** opens it again.

Adding an event to the info@ calendar on the phone also blocks that time. This
is often the quickest way to close a slot.

---

## Step 5 — See every booking on Leena's phone

You add the **info@pawpad.in** calendar to the phone once. After that, each new
booking appears by itself, usually within a few minutes.

You need: the info@ password, the server `cpcalendars.pawpad.in` and the port `2080`.

### iPhone

1. Open **Settings** → **Calendar** → **Accounts** → **Add Account**.
2. Tap **Other** → **Add CalDAV Account**.
3. Fill in:
   - **Server:** `cpcalendars.pawpad.in:2080`
   - **User Name:** `info@pawpad.in`
   - **Password:** the info@ password
   - **Description:** `Pawpad bookings`
4. Tap **Next**, wait for the ticks, then tap **Save**.
5. Open the **Calendar** app → **Calendars** (bottom) and make sure
   **Pawpad bookings** is ticked.
6. For alerts: **Settings** → **Calendar** → **Default Alert Times** →
   **Events** → e.g. "30 minutes before".

If step 4 says "Cannot connect using SSL", check the server says `:2080` at the end.

### Android (Samsung, Pixel, etc.)

Android needs a small free app to read cPanel calendars. We recommend **DAVx⁵**.

1. Install **DAVx⁵** from the Google Play Store (a small one-time price), or
   free from F-Droid.
2. Open DAVx⁵ → tap **+** (add account).
3. Choose **Login with URL and user name**:
   - **Base URL:** `https://cpcalendars.pawpad.in:2080`
   - **User name:** `info@pawpad.in`
   - **Password:** the info@ password
4. Tap **Login**. When asked for "Contact group method", keep the default and
   tap **Create account**.
5. Open the **CalDAV** tab and switch on the calendar (tick it).
6. Allow DAVx⁵ to access calendars when Android asks, and turn off battery
   optimisation for DAVx⁵ if it asks (so it keeps syncing).
7. Open **Google Calendar** or **Samsung Calendar** → menu → make sure the
   `info@pawpad.in` calendar is switched on.

New bookings appear after the next sync. DAVx⁵ syncs every few hours by
default; to see them faster, open DAVx⁵ → the account → ⋮ → **Settings** →
**Sync interval** → "Every 15 minutes".

### Adding your own events

Anything you add to this calendar on the phone blocks that time on the website:
a day off, a vet visit, a private client. Just make sure you add it to the
**info@pawpad.in** calendar (Pawpad bookings), not your personal one.
