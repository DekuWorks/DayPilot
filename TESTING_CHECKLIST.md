# Booking Flow Testing Checklist

## Step 2: Test End-to-End Booking Flow

### Prerequisites

- [ ] Logged in as a user with premium subscription (or booking links enabled)
- [ ] Supabase Edge Functions deployed
- [ ] Resend API configured with secrets

### Test 1: Create Booking Link

1. [ ] Navigate to `/app/booking-links`
2. [ ] Click "Create Booking Link"
3. [ ] Fill in:
   - Title: "Test Consultation"
   - Description: "30-minute consultation"
   - Duration: 30 minutes
   - Timezone: Your timezone
4. [ ] Click "Save"
5. [ ] Verify booking link appears in list
6. [ ] Copy the booking link slug/URL

### Test 2: Set Availability

1. [ ] Open the booking link you just created
2. [ ] Go to "Availability" section
3. [ ] Set availability rules:
   - Monday-Friday: 9:00 AM - 5:00 PM
   - Or set specific days
4. [ ] Save availability
5. [ ] Verify rules are saved

### Test 3: Book Through Public Page

1. [ ] Open booking link in incognito/private window (or different browser)
2. [ ] Navigate to: `/book/[your-slug]`
3. [ ] Verify:
   - [ ] Booking link title and description display
   - [ ] Calendar shows available dates
   - [ ] Available time slots appear for selected date
4. [ ] Select a date
5. [ ] Select a time slot
6. [ ] Fill out booking form:
   - Name: "Test Booker"
   - Email: Your test email
   - Phone (optional)
   - Notes (optional)
7. [ ] Click "Book Appointment"
8. [ ] Verify:
   - [ ] Loading state shows
   - [ ] Redirects to confirmation page
   - [ ] No errors in console

### Test 4: Verify Booking Confirmation Page

1. [ ] On confirmation page, verify:
   - [ ] Success message displays
   - [ ] Booking details are correct (date, time, duration)
   - [ ] "Download .ics File" button works
   - [ ] "Book Another" button works
   - [ ] "Done" button navigates home

### Test 5: Verify Event Creation

1. [ ] Log back in as the booking link owner
2. [ ] Navigate to Calendar page (`/app/calendar`)
3. [ ] Verify:
   - [ ] Event appears on calendar
   - [ ] Event title: "Booking: Test Booker" or booking link title
   - [ ] Event time matches booking time
   - [ ] Event description includes booker info

### Test 6: Verify Email Sent

1. [ ] Check email inbox (the email used in booking form)
2. [ ] Verify:
   - [ ] Booking confirmation email received
   - [ ] Email contains correct booking details
   - [ ] "Add to Calendar" link works (if included)
   - [ ] Email is from correct sender (Resend configured email)

### Test 7: Verify Booking in Database

1. [ ] Check Supabase dashboard → `bookings` table
2. [ ] Verify:
   - [ ] New booking record exists
   - [ ] `status` = 'confirmed'
   - [ ] `confirmation_token` is set
   - [ ] `event_id` is linked (if event was created)

### Test 8: Verify Event in Database

1. [ ] Check Supabase dashboard → `events` table
2. [ ] Verify:
   - [ ] Event was created automatically (by trigger)
   - [ ] Event `calendar_id` matches owner's default calendar
   - [ ] Event times match booking times

### Common Issues to Watch For

- [ ] Booking link not found (check slug is correct)
- [ ] No available time slots (check availability rules)
- [ ] Event not created (check database trigger is active)
- [ ] Email not sent (check Edge Function logs, Resend secrets)
- [ ] Confirmation page shows "Booking Not Found" (check booking ID in URL)

### Success Criteria

✅ All tests pass
✅ Booking flow works end-to-end
✅ Event created automatically
✅ Email sent successfully
✅ Confirmation page displays correctly
