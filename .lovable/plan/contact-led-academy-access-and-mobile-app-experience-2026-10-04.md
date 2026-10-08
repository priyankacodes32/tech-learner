# Contact-led academy access and mobile app experience

## What will change
- Remove the public course catalog and all Google sign-in controls from the landing page.
- Make “Enter the academy” open a dedicated `/contact` page with either phone or email plus a required message.
- Store each contact request securely in Lovable Cloud and show the inbox inside the protected admin dashboard.
- Change student sign-in to phone number and password only, with no public registration; credentials remain admin-provided.
- Preserve role-based routing after sign-in: administrators go to `/admin/dashboard`, students go to `/dashboard`.
- Refine the landing page, contact page, sign-in dialog, student dashboard, and admin dashboard for a compact mobile-app feel while retaining responsive desktop layouts.

## Security and data handling
- Validate phone numbers, emails, and message length before submission and again on the server.
- Allow public visitors to submit requests, but only database-verified administrators can read or update them.
- Keep role checks server-backed and retain the protected route guard.

## Technical details
- Add a `contact_requests` table with explicit grants, row-level security, timestamps, contact type/value, message, and request status.
- Add public submission and protected admin inbox server functions with Zod validation.
- Update the landing metadata and add unique metadata for the new contact page.
- Verify submission, admin visibility, phone login behavior, and mobile layouts at phone and desktop sizes.
