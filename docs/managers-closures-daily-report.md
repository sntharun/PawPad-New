# Managers, studio closures and the daily report

This update adds three things to the admin panel:

1. A new **Manager** role for front-desk staff.
2. **Studio Closures**: close the studio for some dates, either all day or only at some times.
3. **Today's Closing**: the day's bookings with status and payment, walk-ins, and a **daily report email**.

Every rule below is checked **on the server** (api.pawpad.in), not only by
hiding buttons. If a Manager tries a blocked action another way, the server
answers "Not allowed".

---

## Step 1 — Update the server (once)

1. Merge the pull request on GitHub.
2. Update the server the usual way (cPanel → **Terminal**, paste the deploy
   block, look for **DEPLOY OK**). See [Updating the Pawpad server](updating-the-server.md).
3. Open **https://api.pawpad.in/index.php?action=health**. It should show
   `"ok":true`.

**You do not need to create anything in the database.** On the first visit
after the update, the server creates four new tables by itself:
`course_payments`, `closures`, `booking_closing` and `daily_reports`. It also
adds two columns to `bookings`. Nothing new goes in `config.php`: the daily
report is sent from info@pawpad.in with the password that is already there.

---

## Who can do what

| | Owner | Administrator | Manager |
|---|:-:|:-:|:-:|
| Upcoming Grooming, Grooming Bookings | ✓ | ✓ | ✓ |
| Cancel or reschedule a booking | ✓ | ✓ | ✓ |
| Block / unblock a time or a whole day, Tidy calendar | ✓ | ✓ | — |
| Studio Closures | ✓ | ✓ | — |
| Course Applications: see, add notes, schedule interview (with email) | ✓ | ✓ | ✓ |
| Approve, decline or reopen an application (after the interview) | ✓ | ✓ | — |
| Record a course payment, then mark **Enrolled** (only after Approved) | ✓ | ✓ | ✓ |
| Delete candidates, remove a payment | ✓ | ✓ | — |
| Today's Closing, walk-ins, send the daily report | ✓ | ✓ | ✓ |
| Daily Reports (all sent reports) | ✓ | ✓ | — |
| Website Content, Media, Dashboard, Backups | ✓ | ✓ | — |
| Add or remove team members | ✓ | — | — |
| Change own password | ✓ | ✓ | ✓ |

The person's role is shown at the top right of the admin panel ("Signed in as Manager").

Every action is written in the history with the person's email: cancel and
reschedule in the booking's history; interview, payment and enrolment in the
application's **Staff Notes & Admissions Log**.

---

## How the owner adds a Manager

1. Sign in to the admin panel as the **Owner**.
2. Click **Settings & Backups** in the left menu.
3. Under **Authorized Administrator Team**:
   - type the person's email,
   - type a **starting password** (at least 10 characters),
   - in the drop-down, choose **Manager (bookings, applications, daily closing)**,
   - click **Add Team Member**.
4. Give the person the starting password **in person** (not by WhatsApp or email).
5. When they sign in, they should open **My Account** and change the password.

To remove a person, click **Remove** next to their email. They are signed out
straight away. Only the Owner can add or remove people.

---

## The admissions steps

| Step | Who | What happens |
|---|---|---|
| 1. New application | — | Status **Pending Review** |
| 2. Schedule the interview | Manager, Admin or Owner | Choose the date and time, click **Schedule & Send Invite**. The candidate gets the invitation, and every Owner and Administrator gets a short email: "Interview scheduled: name, course, date/time, scheduled by …". Status **Interview Scheduled** (a Manager sees **Pending Admin Approval**) |
| 3. Approve or decline | Owner or Administrator only | After the interview, click **Approve & Send Confirmation** (the candidate gets the approval email) or **Decline** (you are asked whether to send a polite decline email) |
| 4. Payment | Manager, Admin or Owner | Only after **Approved**: under **Payments**, fill in the amount, date, mode (UPI / Cash / Card / Bank transfer) and reference, then **Record Payment** |
| 5. Enrol | Manager, Admin or Owner | **Confirm Enrolled** works only when the application is Approved **and** a payment is recorded |

The server checks every step, so a step can't be skipped from another device or
tool. Every step is written in the **Staff Notes & Admissions Log** with who did
it and when. Deleting a candidate stays with the Owner and Administrators.

The number next to **Course Applications** in the left menu shows what is
waiting for you: interviews waiting for approval (Owner/Administrator), or
approved candidates waiting for payment (Manager).

If a payment was typed wrongly, an Owner or Administrator can click **Remove**
next to it and record it again.

---

## Studio Closures (Owner and Administrator)

Use this for holidays, training days or a closed afternoon. **Block whole day**
still works as before for single days.

1. Click **Studio Closures** in the left menu.
2. Choose **From** and **To** (both days are included).
3. Keep **All day** ticked, or untick it and tick only the times to close
   (10:00 exists only on Saturday and Sunday).
4. Optionally type a reason, e.g. "Diwali holiday".
5. Click **Check bookings & continue**. The panel lists every booking already
   made inside the closure. **These bookings are not cancelled.** Call the
   customers, or reschedule/cancel them under Grooming Bookings.
6. Click **Save closure**.

The closed times disappear from the booking page straight away, and the closure
appears in the info@ calendar ("Studio closed: …").

To re-open, find it under **Upcoming closures** and click **Remove (re-open)**.
The times become bookable again and the calendar event is deleted.

---

## Today's Closing (every evening)

1. Click **Today's Closing**. It shows today's bookings in time order
   (use **← Previous day** to finish an earlier day).
2. For each booking choose:
   - **Status**: Completed / No-show / Cancelled,
   - **Amount**: filled in with the service price; change it if needed,
   - **Payment mode**: UPI / Cash / Card / Bank transfer / Not paid,
   - optionally a **Reference** and a short **Note**.

   Everything saves by itself ("Saved ✓" appears on the right).
3. **Walk-in or phone booking**: click **+ Add walk-in / phone booking**. The
   day's studio slots are shown with their state (Free, Booked, Blocked…); tap
   a free one, or type another time. Fill in the name, phone, pet, service,
   amount and payment mode, then **Add booking**. If that time is free, it is taken on the website and added to
   the info@ calendar. If it isn't free, the booking is only recorded.
4. Course payments recorded that day (under Course Applications) are listed at
   the bottom and included in the report.
5. Click **Send daily report**. A preview opens.
   - If some bookings have no status yet, they are listed in red. Click
     **Back to closing** and fill them in, or click **Send anyway**.
   - Click **Send report**. It is emailed from info@pawpad.in to every Owner
     and Administrator (not to Managers).

The email shows the date and who sent it, the table of bookings, totals
(completed / no-shows / cancelled, total collected, total per payment mode,
the Not-paid list), the day's course payments, and three admissions lists:
applications waiting for Admin approval, interviews on the next day (name,
course, time) and candidates enrolled that day (with the payment received).

**Made a mistake after sending?** Correct it on Today's Closing and click
**Send daily report** again. The new email is marked **"Corrected report"**.

## Daily Reports (Owner and Administrator)

Click **Daily Reports** to see every report that was sent: the day, when, by
whom, and whether it was a correction. Click **View** to read it.

---

## If something doesn't work

| What you see | What to do |
|---|---|
| "Not allowed: a Manager cannot do this." | That action is for the Owner or an Administrator |
| "Record the payment first…" | Record the payment under Payments, then enrol |
| "The report could not be emailed…" | Check the health page: `"bookingEmail":true` means the info@ password in config.php is right |
| A closure doesn't show in the phone calendar | Pull down to refresh the calendar app; the slots are closed on the website either way |
| Anything else | Send me a screenshot of the message, but **never** of `config.php` |

---

## Boarding Requests (Owner, Administrator and Manager)

Every boarding stay ordered at the website checkout is saved under **Boarding
Requests**, and the customer (with a copy to info@) gets an email with the
reference, e.g. **BRD-0001**. Nothing is booked until you confirm it.

1. Click **Boarding Requests**. New requests are at the top.
2. Contact the customer, then choose a status: **Confirmed**, **Declined**,
   **Completed** or **Cancelled**, add a short note if useful, and click **Save**.
   Every change is written in the request's history with your email.

**Overnight stays** are priced per dog, per night. In the cart, the quantity is
the number of **dogs**. At checkout the customer picks a **check-in** and a
**check-out** date (from today up to 3 months ahead, never on a Thursday). Each dog is
listed once, and the email and the request show both dates and the number of
nights.

**Up to 3 dogs per night.** Only **Confirmed** stays count. A night that already
has 3 confirmed dogs can't be requested on the website. If you confirm a request
that would put a 4th dog on any night, the panel refuses and names the night:
change the dates with the customer, or decline it. The card at the top of
Boarding Requests lists the full nights. To change the limit, set
`'boarding_dogs_per_night' => 3` in config.php on the server.

In **Website Content CMS → Boarding**, tick **"Needs a trial day first"** on any
stay that requires a trial day. Customers who haven't done one are charged the
Trial Day package's price, per dog. **Untick it** (and click Save Live Changes)
to stop asking about a trial day and stop adding the fee. Also update the
Boarding page texts that say a trial day is mandatory.

## Footer (all pages)

**Website Content CMS → Footer (all pages)** changes the dark footer on every
page at once: headline, text, button, hours, address, phone, email, social
links, logo and the copyright line.

## Courses: Know More pages, testimonials and the enquiry form

In **Website Content CMS → Courses & Academy**, each course card has a
**Know More page (click to edit)** box. It already holds the page's current
text: change the title, intro, sections and bullet points there. Write
`**words**` between two stars to make them bold. No file upload is needed.

- The **Apply Now** button on the Know More page always opens that course's own
  application form. It can't be changed in the CMS.
- Changing a course's **code** also changes it in the course title, on the
  Know More page and on the application form.
- A course added with **+ Add** gets its own Know More page automatically.
- **Student Testimonials** and **Course Enquiry Form (bottom of the page)**
  are further down the same screen.

Prices changed under **Studio Setup** or **Courses** are saved with every new
application, and a price typed as `32,000` or `Rs 32000` is shown as `₹32,000`.
An application keeps the price the candidate saw when applying. If the price
has changed since, the application also shows **"Website price now: …"** next
to it.
