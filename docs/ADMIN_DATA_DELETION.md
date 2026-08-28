# Admin Data Deletion Guide

This guide describes the deletion operations currently implemented in the DJ Freight Portal. Deletion is intentionally split between normal record deletion, notification cleanup, and a full system reset.

## Important Safety Rules

- Take a database backup before deleting production data.
- Verify the environment and database name before running any destructive request.
- A successful response means the server accepted the operation; verify the affected records afterward.
- The full reset cannot be undone from the portal.
- Do not expose admin passwords or bearer/session credentials in scripts, logs, tickets, or documentation.

## Deletion Operations

| Operation                  | Endpoint                       | Who can run it                     | What it deletes                                                                                                             |
| -------------------------- | ------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Delete one notification    | `POST /api/notifications`      | Authenticated user                 | One notification belonging to the signed-in user                                                                            |
| Clear own notifications    | `POST /api/notifications`      | Authenticated user                 | All notifications belonging to the signed-in user                                                                           |
| Retention cleanup          | `POST /api/admin/cleanup`      | `admin` or `owner`                 | Read notifications older than 24 hours, unread notifications older than 2 weeks, and login/session logs older than 2 months |
| Delete one business record | Resource `DELETE` endpoint     | Depends on resource and data scope | One lead, customer, follow-up, invoice, team, user, or carrier                                                              |
| Full system reset          | `POST /api/admin/reset-system` | `admin` only                       | Every MongoDB collection except `users`                                                                                     |

## Notification Deletion

Notification actions are sent as JSON to `POST /api/notifications`.

### Delete one notification

```http
POST /api/notifications
Content-Type: application/json

{"action":"delete","id":"NOTIFICATION_ID"}
```

The notification must belong to the signed-in user.

### Clear all notifications for the signed-in user

```http
POST /api/notifications
Content-Type: application/json

{"action":"clear_all"}
```

This does not clear notifications for other users.

### Mark notifications read

Marking a notification read records `readAt`. It does not delete it immediately.

```http
POST /api/notifications
Content-Type: application/json

{"action":"mark_read","id":"NOTIFICATION_ID"}
```

Omit `id` to mark all notifications for the signed-in user as read.

## Admin Retention Cleanup

Use this for routine maintenance. It is not a full delete command.

```http
POST /api/admin/cleanup
```

Example with a session cookie:

```bash
curl -X POST https://PORTAL_HOST/api/admin/cleanup \
  -H "Cookie: SESSION_COOKIE=SESSION_VALUE"
```

The response reports separate counts for read notifications, unread notifications, session logs, and the grand total. The operation is available to `admin` and `owner` roles.

There is also a notification action named `cleanup_old`:

```http
POST /api/notifications
Content-Type: application/json

{"action":"cleanup_old"}
```

This invokes the same system-wide old-notification cleanup. It is not limited to the signed-in user, so it should be treated as an administrative maintenance operation even though it is routed through the notifications endpoint.

## Deleting Individual Entries

Normal record deletion requires the record ID in the JSON body. Examples:

```http
DELETE /api/leads
Content-Type: application/json

{"leadId":"LEAD_ID"}
```

```http
DELETE /api/customers
Content-Type: application/json

{"customerId":"CUSTOMER_ID"}
```

```http
DELETE /api/followups
Content-Type: application/json

{"followUpId":"FOLLOW_UP_ID"}
```

```http
DELETE /api/invoices
Content-Type: application/json

{"invoiceId":"INVOICE_ID"}
```

Other supported individual delete requests use the same pattern:

- `DELETE /api/carriers` with `carrierId` (soft-deletes by setting `deletedAt`)
- `DELETE /api/teams` with `teamId`
- `DELETE /api/users` with `userId`

Authorization and scope checks are applied by each resource. A user cannot delete their own account, and an admin cannot delete the owner account. Deleting an invoice restores its linked loads to `delivered`; deleting a team unassigns its members; deleting a load also removes related pending approval records.

## Full System Reset: Delete Everything Except Users

**Use only for a deliberate, confirmed environment reset. This deletes all documents from every MongoDB collection except `users`.** That includes notifications, leads, customers, loads, quotes, invoices, approvals, teams, carriers, commissions, activity logs, audit logs, login history, and any other collections present in the database.

The endpoint is:

```http
POST /api/admin/reset-system
```

The request must contain the current admin password and the exact confirmation string `RESET`:

```bash
curl -X POST https://PORTAL_HOST/api/admin/reset-system \
  -H "Content-Type: application/json" \
  -H "Cookie: SESSION_COOKIE=SESSION_VALUE" \
  --data '{"password":"ADMIN_PASSWORD","confirmation":"RESET"}'
```

Requirements enforced by the server:

1. The signed-in user must have the `admin` role. The `owner` role is not accepted by this endpoint.
2. The supplied password must match that admin account.
3. `confirmation` must equal `RESET` exactly.
4. The `users` collection is skipped; all other collections are emptied with `deleteMany({})`.

The server then emits a critical system-reset notification to administrators. Because the reset removes the existing notifications first, a new reset alert may be created immediately afterward.

## Verification Checklist

After any deletion:

1. Check the API response and deleted ID/count.
2. Refresh the relevant portal view.
3. Query the database using counts or the deleted record ID.
4. Review the audit log where the individual operation records one.
5. Confirm that the expected user accounts still exist after a full reset.

## What This Guide Does Not Provide

There is no general-purpose API that accepts an arbitrary collection name from an HTTP request. The full-delete behavior is deliberately fixed inside `/api/admin/reset-system`; do not add a collection-name parameter without adding an allowlist, authorization checks, confirmation safeguards, and audit logging.
