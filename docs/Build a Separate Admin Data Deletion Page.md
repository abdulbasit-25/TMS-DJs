# Build a Separate Admin Data Deletion Page

Create a **dedicated Data Deletion / Data Management page** in the existing DJ Freight Portal.

This must be a **separate admin-only page** for bulk deletion and system-wide cleanup. **Do not remove, replace, or break any of the existing individual deletion functionality or notification deletion options.** Keep all previous deletion options working exactly as they currently do.

## 1. Access Control — CRITICAL

The entire page must be accessible **only to users with the `admin` role**.

Requirements:

- Check the authenticated user's role on the frontend.
- Enforce authorization again on the backend/API.
- Non-admin users must not be able to access or execute these operations by manually calling the API.
- Do not rely only on hiding the page/button in the UI.
- Return `403 Forbidden` for unauthorized deletion requests.
- The `owner` role should NOT automatically receive access unless the existing application's authorization rules explicitly define the owner as an admin-equivalent. For this deletion page, use the existing `admin` role requirement.

## 2. Create a Separate Page

Create something similar to:

`/admin/data-deletion`

or follow the existing application's routing convention.

Suggested page title:

**Data Deletion & System Cleanup**

Subtitle:

**Manage bulk deletion of portal data. These operations are destructive and cannot be undone.**

Use the existing application's:

- Layout
- Authentication system
- Admin navigation
- UI components
- Modal/dialog components
- Buttons
- Cards
- Toast/notification system
- Icons
- Typography
- Color system
- Responsive behavior

Do not introduce a completely different design language.

---

# 3. Keep Existing Deletion Features

Do NOT replace the existing deletion endpoints.

Existing functionality such as:

- Delete individual lead
- Delete individual customer
- Delete individual follow-up
- Delete individual invoice
- Delete individual team
- Delete individual carrier
- Delete individual user
- Delete individual notification
- Clear user's notifications
- Existing admin cleanup
- Existing reset-system functionality

must continue working.

The new page should provide a **centralized interface for bulk deletion**, while the existing deletion features remain available elsewhere in the application.

---

# 4. Deletion Dashboard

Build the page using separate deletion cards/sections.

Example:

### Notifications

**Delete all notifications**

Description:

> Permanently delete notifications from the system.

Button:

`Delete All Notifications`

---

### Leads

**Delete all leads**

Description:

> Permanently delete all lead records.

Button:

`Delete All Leads`

---

### Customers

**Delete all customers**

Description:

> Permanently delete all customer records.

Button:

`Delete All Customers`

---

### Follow-ups

**Delete all follow-ups**

Button:

`Delete All Follow-ups`

---

### Invoices

**Delete all invoices**

Button:

`Delete All Invoices`

---

### Loads

**Delete all loads**

Button:

`Delete All Loads`

---

### Quotes

**Delete all quotes**

Button:

`Delete All Quotes`

---

### Approvals

**Delete all approvals**

Button:

`Delete All Approvals`

---

### Teams

**Delete all teams**

Button:

`Delete All Teams`

---

### Carriers

If carriers currently use soft deletion, respect the existing application's behavior.

Clearly indicate whether this operation:

- permanently deletes carriers, or
- soft-deletes carriers using `deletedAt`.

Do not silently change existing carrier deletion semantics.

---

### Activity / Audit Data

Add separate options where supported by the existing backend:

- Delete activity logs
- Delete audit logs
- Delete login history
- Delete session logs

Do not create fake endpoints. Only connect buttons to endpoints that actually exist or implement the required backend functionality properly.

---

# 5. DELETE ALL USERS — SPECIAL RULE

Add a prominent section:

## Delete All Users

This operation must delete **all normal users EXCEPT the currently protected admin account(s)**.

### VERY IMPORTANT

The admin account must NEVER be deleted by this operation.

The backend must determine which account(s) are protected.

Do NOT rely only on the frontend filtering users.

The server must explicitly exclude admin users from the deletion query.

For example, conceptually:

```js
deleteMany({
  role: { $ne: "admin" }
})
```

However, adapt this to the existing user schema and authorization implementation.

### Before implementing this:

Inspect the existing user model/schema and determine exactly how roles are represented.

Possible existing structures may include:

```js
role: "admin"
```

or:

```js
roles: ["admin"]
```

or another existing authorization structure.

**Use the project's actual schema rather than assuming one.**

### Required behavior

If the database contains:

```text
Admin
User A
User B
User C
User D
```

after:

**Delete All Users**

the result should be:

```text
Admin
```

Only the protected admin account(s) remain.

### Additional protection

The endpoint must:

- Require authentication
- Require `admin` role
- Reject non-admin requests with `403`
- Never delete the executing admin account
- Never delete protected admin accounts
- Return the number of users deleted
- Return the number of protected users
- Create an audit entry

---

# 6. Individual Bulk Deletion Confirmation

Every destructive operation must require confirmation.

Do NOT immediately execute deletion when the user clicks a delete button.

Use a reusable confirmation modal.

Example:

**Delete All Leads?**

> This will permanently delete all lead records from the database.

Show:

```text
Records affected: 124
```

Then require the administrator to type:

```text
DELETE
```

before enabling the final button.

Button:

`Cancel`

`Delete Permanently`

---

# 7. Extra Confirmation for Critical Operations

For:

- Delete All Users
- Delete Everything
- Full System Reset

use a stronger confirmation.

Example:

```text
Type DELETE ALL USERS to continue.
```

For a complete system reset:

```text
Type RESET to continue.
```

Do not allow copy/paste if the existing UI/security requirements specifically prohibit it; otherwise normal clipboard behavior is acceptable.

---

# 8. Delete Everything

Create a separate, highly prominent section at the bottom:

# Danger Zone

Description:

> These operations can permanently remove large amounts of system data. Verify the environment before continuing.

Add:

### Delete Everything Except Admin Users

This operation should remove all supported application data while preserving the admin user account(s).

Conceptually:

```text
Users:
    Delete normal users
    Preserve admin users

Notifications:
    Delete all

Leads:
    Delete all

Customers:
    Delete all

Loads:
    Delete all

Quotes:
    Delete all

Invoices:
    Delete all

Approvals:
    Delete all

Teams:
    Delete all

Carriers:
    Delete all / follow existing deletion semantics

Commissions:
    Delete all

Activity logs:
    Delete all

Audit logs:
    Delete all

Login history:
    Delete all

Other application collections:
    Follow an explicit backend allowlist
```

### IMPORTANT

Do NOT implement this by accepting an arbitrary MongoDB collection name from the frontend.

Use a server-side explicit allowlist of collections/resources that are safe to reset.

Never allow:

```text
POST /api/admin/delete?collection=<anything>
```

or similar arbitrary collection deletion.

---

# 9. Full Reset Protection

If the existing:

```text
POST /api/admin/reset-system
```

endpoint already exists, do not blindly duplicate its implementation.

Instead:

1. Inspect the existing endpoint.
2. Reuse it if its behavior matches the new requirements.
3. If it currently preserves `users` entirely but the new requirement is to preserve only admins, create/update the backend behavior carefully.
4. Do not break existing consumers of the endpoint.
5. Keep backward compatibility where practical.

The UI should clearly distinguish:

### Delete Everything Except Users

from:

### Delete Everything Except Admins

because these have different behavior.

---

# 10. Show Counts Before Deletion

Where practical, fetch/display current record counts.

Example:

```text
Notifications       1,245
Leads                 342
Customers             128
Loads                 516
Invoices               74
Teams                  12
Carriers               31
Users                  48
Admin Users             1
```

This lets the administrator understand the impact before deleting.

For the user deletion section:

```text
Total Users: 48
Protected Admins: 1
Users That Will Be Deleted: 47
```

This is especially important for **Delete All Users**.

---

# 11. Preview / Dry Run

If possible, implement a preview before destructive operations.

For example:

```text
Deletion Preview

Users
Total: 48
Protected admins: 1
Will delete: 47

Leads
Will delete: 342

Customers
Will delete: 128

Invoices
Will delete: 74
```

Do not perform any deletion during preview.

---

# 12. Backend Requirements

Create proper admin-only bulk deletion APIs following the existing API architecture.

Do not put database deletion logic directly in the frontend.

Each endpoint must:

1. Authenticate the request.
2. Verify the user's role.
3. Validate the request.
4. Perform the deletion.
5. Return a clear result.
6. Record an audit event.
7. Handle database errors safely.

Example response:

```json
{
  "success": true,
  "deletedCount": 342
}
```

For users:

```json
{
  "success": true,
  "deletedCount": 47,
  "protectedCount": 1
}
```

For a system reset:

```json
{
  "success": true,
  "deleted": {
    "notifications": 1245,
    "leads": 342,
    "customers": 128,
    "loads": 516,
    "invoices": 74
  },
  "protected": {
    "users": 1
  }
}
```

Use the project's existing response format if one already exists.

---

# 13. Audit Logging

Every bulk deletion must be logged.

Record:

```text
admin user ID
operation
timestamp
affected resource
deleted count
environment if available
success/failure
request ID if available
```

Never log:

- passwords
- session cookies
- JWTs
- bearer tokens
- sensitive authentication credentials

Example:

```json
{
  "action": "BULK_DELETE_LEADS",
  "performedBy": "admin-id",
  "deletedCount": 342,
  "timestamp": "..."
}
```

---

# 14. Error Handling

If an operation fails:

- Do not show a fake success message.
- Display the actual safe error.
- Do not expose database internals.
- Refresh counts after successful deletion.
- Keep the page usable.

Example:

```text
✓ 342 leads deleted successfully.
```

or:

```text
Failed to delete leads.
Please try again or check the server logs.
```

---

# 15. Loading States

During deletion:

- Disable the destructive button.
- Show a loading indicator.
- Prevent duplicate requests.
- Do not allow the user to submit the same deletion multiple times.

Example:

```text
Deleting Leads...
```

After completion:

```text
Deleted 342 leads
```

---

# 16. UI Structure

Use a clean hierarchy:

```text
Data Deletion & System Cleanup
│
├── Overview / Record Counts
│
├── Notifications
│
├── Business Data
│   ├── Leads
│   ├── Customers
│   ├── Follow-ups
│   ├── Loads
│   ├── Quotes
│   └── Invoices
│
├── Organization
│   ├── Teams
│   ├── Carriers
│   └── Commissions
│
├── System Data
│   ├── Approvals
│   ├── Activity Logs
│   ├── Audit Logs
│   └── Login History
│
├── Users
│   └── Delete All Users Except Admin
│
└── DANGER ZONE
    └── Delete Everything Except Admin Users
```

Use reusable components such as:

```text
DeletionCard
DeletionConfirmationModal
DeletionSummary
RecordCount
DangerZone
BulkDeletionButton
DeletionResult
```

Avoid duplicating the same confirmation-modal logic for every resource.

---

# 17. Important Implementation Rules

Before writing code:

1. Inspect the existing authentication implementation.
2. Inspect the user model and role structure.
3. Inspect all existing deletion endpoints.
4. Inspect the existing notification cleanup logic.
5. Inspect the existing `/api/admin/reset-system` implementation.
6. Reuse existing utilities and middleware.
7. Follow existing API naming conventions.
8. Follow existing UI/component conventions.
9. Do not create duplicate authentication systems.
10. Do not create duplicate database models.

Do not assume endpoint names, schema fields, or role fields. Use what already exists in the project.

---

# 18. Final Acceptance Criteria

The implementation is complete only when:

- [ ] A separate Admin Data Deletion page exists.
- [ ] Only admins can access it.
- [ ] Backend APIs also enforce admin authorization.
- [ ] Existing individual deletion features continue working.
- [ ] Bulk deletion options exist for supported resources.
- [ ] Delete All Users deletes normal users but preserves admin users.
- [ ] The executing admin cannot accidentally delete themselves.
- [ ] Protected admin accounts are enforced server-side.
- [ ] Every destructive action requires confirmation.
- [ ] Critical operations require typed confirmation.
- [ ] Counts are displayed before deletion where possible.
- [ ] Loading states prevent duplicate requests.
- [ ] Successful deletion returns affected counts.
- [ ] Failed deletion displays an appropriate error.
- [ ] Bulk deletion actions are audit logged.
- [ ] No passwords/tokens/session credentials are logged.
- [ ] Full-system deletion uses a server-side collection/resource allowlist.
- [ ] No arbitrary collection-name deletion endpoint is introduced.
- [ ] The UI is responsive and consistent with the existing portal.
- [ ] No existing functionality is broken.

**Most important:** The `Delete All Users` operation must preserve admin users **server-side**, and the `Delete Everything` operation must have explicit safeguards against accidentally destroying protected accounts or unrelated system collections.