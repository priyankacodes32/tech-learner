# Complete academy administration

## Admin experience
- Add a shared mobile-friendly admin layout with navigation for Overview, Courses, Categories, Users, and Inbox.
- Keep the overview focused on live totals, recent inquiries, and shortcuts into each management page.
- Use dedicated pages so every workflow remains clear and compact on phones.

## Categories and courses
- Add secure database records for categories and courses.
- Build full create, view, edit, and delete controls for categories and courses.
- Manage core course details: title, category, description, video URL, duration, price, and published status.
- Prevent deletion of a category while courses still use it, with a clear message.

## Students and access
- Extend student records with an active/disabled state while keeping roles in the separate roles table.
- Build a user page to create students, edit their phone login, reset passwords, and disable or reactivate access.
- Add course assignment switches for each student; assigned published courses will appear in that student's dashboard.
- Preserve the current sample dashboard as a fallback when a student has no stored assignments yet.

## Inquiry inbox
- Move inquiries to a dedicated inbox page.
- Add filtering and actions to mark inquiries New, Read, or Resolved.
- Keep inquiry data protected so only verified administrators can view or update it.

## Country flags
- Replace font-dependent flag emoji with bundled country flag graphics, so flags render reliably beside every calling code.

## Security and validation
- Validate every admin form in the browser and again on the server.
- Require an authenticated administrator for all management actions.
- Add row-level access rules: administrators manage academy records, while students can only read their own assignments and published assigned courses.
- Disable accounts instead of deleting them, preserving assignments and academy records.

## Verification
- Test create/edit/delete flows, inquiry status changes, account disabling, and course assignment toggles.
- Verify assigned courses appear for the correct student.
- Check the admin experience and country selector at desktop and mobile sizes, then confirm a clean build.