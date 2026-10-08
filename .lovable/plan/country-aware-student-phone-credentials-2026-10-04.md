# Country-aware student phone credentials

## What will change
- Replace the single phone field in **Create login details** with a searchable country selector and local phone-number field.
- Automatically apply the selected country’s international dialing code and show the complete number before account creation.
- Validate the number for the selected country in the form and repeat validation securely on the server.
- Store and return the canonical international number so the same value works for student sign-in.
- Keep the form compact and touch-friendly on mobile screens.

## Technical details
- Use `libphonenumber-js` country metadata for country codes, formatting, parsing, and validation.
- Send both the selected ISO country and entered national number to the existing protected account-creation function.
- Preserve the existing phone-derived login identity scheme by converting valid numbers to E.164 before creating the student account.
- Verify the admin form on desktop and mobile, then confirm the project build is clean.
