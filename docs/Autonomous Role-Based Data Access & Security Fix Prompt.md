# Autonomous Role-Based Data Access & Security Fix

Analyze the entire project/codebase and **autonomously fix the existing access-control, hierarchy, permissions, and data-visibility system**.

Do not ask me to manually identify files, endpoints, roles, permissions, or security gaps. Inspect the project yourself, understand how the current system works, and implement the changes throughout the application.

Use the existing architecture, models, authentication system, database structure, UI, API routes, and business logic wherever practical. **Do not redesign unrelated functionality or change business behavior unnecessarily.**

## Core Security Principle

The system must become **backend-enforced and data-isolated by default**.

A user must never be able to access another user's private/business data simply because an API endpoint is unfiltered or because the frontend happens to hide a page.

Frontend restrictions are not security.

Every API endpoint that returns, creates, updates, deletes, assigns, exports, searches, or aggregates business data must enforce the appropriate access scope on the server.

Direct API calls, manipulated requests, modified IDs, query parameters, or bypassing the frontend must not allow users to escape their permitted scope.

---

## Required Access Hierarchy

Implement the following logical hierarchy based on the roles that actually exist in the project.

### Owner / Admin / Ops Manager

These are organization-level roles.

They can:

- See organization-wide business data.
- Search/filter organization-wide records.
- Manage users according to their management authority.
- Manage teams according to their existing authority.
- Access organization-wide operational/financial information permitted by the application.
- Perform administrative actions appropriate to their role.

However, **do not allow a lower-level administrator to create or promote another user above their own authority**.

For example:

- Ops Manager must not be able to create/promote someone to Owner/Admin if that exceeds their authority.
- Admin must not be able to arbitrarily create another Owner unless the existing business rules explicitly allow it.
- A user's new role must be validated against the actor's authority, not merely the user's current role.

Preserve the highest-level Owner authority appropriately.

---

## Team Manager

A Team Manager must be **strictly team-scoped** for team-owned operational data.

They can see:

- Their own data.
- Data belonging to members of their assigned team.
- Team-level dashboards/KPIs.
- Team approval requests.
- Team activity where logically appropriate.
- Users belonging to the team they manage.

They must **not** see:

- Other teams' private operational records.
- Other teams' customers/leads/quotes/follow-ups/loads.
- Other teams' commissions or financial information unless explicitly required by an organization-level responsibility.
- Organization-wide user data.
- Private records belonging to users outside their team.

If a Team Manager has no team, return an appropriate empty/teamless result rather than falling back to organization-wide visibility.

Team filtering must happen at the **database query level**, not after fetching all records.

---

## Agent

An Agent must be **strictly self-scoped**.

An Agent can see only records that belong to, are assigned to, or are owned by that Agent.

For example:

- Their leads.
- Their customers.
- Their quotes.
- Their follow-ups.
- Their loads.
- Their own approvals.
- Their own activity.
- Their own commissions.
- Their own relevant dashboard information.
- Their own profile/account information.

They must **not** be able to see another agent's records.

They must not be able to discover another user's records by:

- Changing an ID in the URL.
- Changing `agentId`.
- Changing `ownerId`.
- Adding query parameters.
- Calling an API directly.
- Searching with another user's name/email.
- Guessing MongoDB ObjectIds.
- Manipulating request bodies.
- Calling endpoints hidden from the frontend.

---

## Trainee

Apply the same privacy principle as Agent unless the existing business logic explicitly requires a narrower permission set.

A trainee should only see their own permitted records and should not gain access to another user's business data.

Preserve the existing approval workflow for trainee actions where appropriate.

Do not accidentally give trainees write access merely because an endpoint is authenticated.

---

## Lead Agent

Inspect the current implementation and determine the intended relationship between Lead Agent, Team Manager, and team members.

Where Lead Agent is team-oriented, enforce the same fundamental principle:

**Lead Agent can only see data belonging to their permitted team scope, plus their own data.**

Do not leave Lead Agent with accidental organization-wide visibility simply because an endpoint currently uses an empty MongoDB filter.

Keep any special approval authority that the current business logic genuinely requires, but enforce team boundaries.

---

## Accounting

Accounting should be restricted to the financial/accounting data it actually needs.

Do not allow Accounting to see unrelated operational/private records merely because the API is authenticated.

For financial data:

- Determine what Accounting legitimately needs.
- Allow the required accounting functionality.
- Prevent access to unrelated users' private operational information.
- Do not expose unrestricted invoices or commissions simply because the endpoint exists.

Preserve existing accounting workflows.

---

# Data Ownership Rules

Establish a consistent concept of **record ownership**.

For every business entity, identify its relevant ownership/assignment relationship.

Examples include:

- Lead → owner/assigned agent
- Customer → assigned agent
- Quote → assigned agent
- Follow-up → assigned user
- Load → assigned agent
- Commission → associated agent
- Invoice → determine its responsible/associated user or business entity
- Approval → requester + team
- Activity → user
- User → self/team
- Team → manager + members

Do not blindly invent ownership fields.

First inspect the existing models and handlers and determine the correct ownership relationship already represented in the database.

If a model lacks the information required to enforce secure ownership, make the **smallest appropriate schema change** necessary.

---

# Universal Scope Rule

Implement a centralized authorization/data-scope strategy rather than continuing to duplicate unrelated role checks throughout every endpoint.

Conceptually:

```text
Owner/Admin/Ops Manager
    → organization scope

Team Manager / Team-oriented manager
    → own team scope

Agent / Trainee
    → own-record scope

Accounting
    → accounting scope
```

The exact implementation should follow the project's architecture.

Create reusable backend helpers/middleware/query-scope utilities where appropriate.

For example, the system should be able to determine something equivalent to:

```text
getDataScope(user, resource)
```

and consistently produce the correct database filter.

Do not fetch organization-wide data and filter it in JavaScript afterward.

**Apply authorization before the database query.**

---

# Read Security

Audit every GET/list/search/detail endpoint.

For every endpoint ask:

1. Who is allowed to access this endpoint?
2. Which records can that role access?
3. Is the MongoDB query actually restricted?
4. Can a user change an ID and retrieve someone else's record?
5. Can query parameters bypass the intended scope?
6. Does population of related documents expose additional private information?
7. Are aggregate/KPI queries scoped correctly?
8. Are counts and statistics also scoped?
9. Are exports/downloads scoped?
10. Are search/autocomplete endpoints scoped?

Fix every issue found.

A user's ability to access a list must never imply access to another user's private records.

---

# Write Security

Audit every POST endpoint.

Before creating a record:

- Determine the authenticated user.
- Determine the permitted ownership/team.
- Prevent users from assigning records to unauthorized users.
- Prevent agents from creating records on behalf of another agent unless explicitly allowed.
- Prevent lower-level users from assigning records to higher-level users or unrelated teams.
- Validate ownership server-side.

Never trust:

```text
req.body.agentId
req.body.ownerId
req.body.teamId
```

without authorization validation.

---

# Update Security

Audit every PATCH/PUT endpoint.

Never authorize an update only because the user knows the record ID.

For every update:

1. Load the target record securely.
2. Determine its owner/team.
3. Determine whether the actor can modify it.
4. Validate any ownership/team/agent changes.
5. Validate any role changes.
6. Validate any privilege changes.
7. Apply the update only if authorized.

An Agent must not be able to take ownership of another Agent's record simply by sending:

```json
{
  "agentId": "another-user-id"
}
```

Likewise, users must not be able to move records into another team unless their role explicitly permits it.

---

# Delete Security

Audit every DELETE endpoint.

Deletion must follow the same ownership hierarchy.

Examples:

- Agent → own records only.
- Team Manager → their team's records where permitted.
- Ops/Admin/Owner → organization-level authority according to role.
- Accounting → only resources they are explicitly responsible for.

Do not rely on frontend buttons being hidden.

---

# User Management Security

This area requires special attention.

Fix the existing privilege-escalation risk.

When changing:

- role
- status
- team
- commission
- permissions
- ownership
- temporary-password state

validate both:

```text
actor's authority
+
requested new state
```

Do not only validate the target user's current role.

A lower-level manager must never be able to promote someone beyond their own authority.

Also prevent users from:

- changing their own role,
- granting themselves additional permissions,
- moving themselves into an unauthorized team,
- changing another user's role beyond their authority,
- creating unauthorized administrators,
- creating another owner,
- bypassing restrictions through PATCH payloads.

---

# Team Security

Audit the complete team system.

A team manager should only have access to the team they manage.

Ensure:

- Team membership is correctly enforced.
- Users cannot arbitrarily change their own `teamId`.
- Agents cannot assign themselves to another team.
- Team managers cannot access other teams.
- Team GET endpoints do not expose the entire organization directory to ordinary users.
- User email/status/role information is only returned where legitimately required.
- Team membership changes are authorization-checked.
- Removing a user from a team updates all relevant relationships consistently.

---

# Financial Data Security

Treat financial information as sensitive.

Audit:

- commissions
- invoices
- rates
- margins
- customer rates
- carrier costs
- payouts
- financial dashboards
- financial reports
- aggregate financial APIs

Do not assume that hiding a financial page from navigation protects the data.

An Agent must not be able to call an endpoint directly and retrieve another Agent's commission, invoice, rate, or margin information.

Team Managers should only receive financial information for their permitted team scope where the business functionality requires it.

Organization-level roles can receive organization-wide financial information where appropriate.

---

# Dashboard & KPI Security

Audit every dashboard calculation.

A dashboard is not secure merely because the page is role-specific.

Every:

- count
- total
- revenue
- margin
- commission
- load count
- lead count
- customer count
- KPI
- chart
- aggregation

must use the same authorization scope as the underlying records.

For example:

```text
Agent dashboard
→ only Agent's records

Team Manager dashboard
→ only Team Manager + team members

Ops/Admin/Owner dashboard
→ organization-wide
```

Do not allow aggregation pipelines to accidentally bypass record-level filters.

---

# Approval Security

Preserve the existing approval architecture but make its permissions consistent.

Verify:

- Who can submit an approval.
- Who can view it.
- Who can comment.
- Who can approve.
- Who can reject.
- Who can request changes.
- Which team the approval belongs to.
- Whether an approver actually has authority over that team/record.

An approval request must not become a side channel for accessing another team's data.

Also reconcile inconsistent approver definitions between dedicated approval endpoints and the generic approval engine.

Use one authoritative authorization rule where practical.

---

# Notifications & Activity

Ensure users only receive information appropriate to their scope.

Notifications should not expose private record information to unauthorized users.

Activity logs should follow:

```text
Agent/Trainee → own activity

Team Manager → own team activity

Org-level management → organization activity
```

Do not give Team Managers global activity visibility merely because they are managers.

---

# API-Level Security

Perform a complete audit of every registered API route.

Do not assume that because a route is absent from the navigation it is protected.

Test routes directly.

Look specifically for patterns such as:

```ts
Model.find()
Model.find({})
Model.findById(id)
Model.findOne({ _id: id })
```

where an authorization filter should exist.

Also inspect:

- aggregation pipelines
- `populate()`
- search endpoints
- count endpoints
- statistics
- exports
- bulk operations
- nested resources
- detail pages
- approval endpoints
- assignment endpoints

---

# Frontend

Keep the existing frontend design and behavior wherever possible.

Frontend role restrictions should remain useful for UX, but they must mirror backend authorization.

Do not treat frontend `can()` checks as the security boundary.

After fixing backend authorization:

- hide inaccessible navigation items,
- hide unauthorized actions,
- disable unauthorized controls,
- handle 401/403 responses cleanly,
- ensure role preview/simulation cannot bypass backend authorization.

If "Preview as role" exists, make sure it remains purely a UI/testing feature and cannot modify the actual backend authorization identity.

---

# Authentication & Session

Preserve the existing authentication/session architecture unless changes are required for security.

Ensure:

- inactive/suspended/locked users cannot continue accessing APIs,
- role changes take effect appropriately,
- team changes take effect appropriately,
- revoked/deactivated users cannot continue accessing data,
- temporary-password restrictions are enforced server-side if the business requirement indicates they should be.

Do not introduce client-only authorization for security-sensitive operations.

---

# Important: Do Not Break Existing Business Logic

Do not blindly replace every role check.

First understand the project.

Preserve legitimate differences such as:

- approval workflows,
- accounting responsibilities,
- administrator capabilities,
- team management,
- load booking,
- carrier workflows,
- commission processing,
- audit access.

The objective is:

**Fix access boundaries without destroying legitimate business permissions.**

---

# Autonomous Investigation Requirements

Before making changes:

1. Inspect all role definitions.
2. Inspect all user/team models.
3. Inspect authentication/session handling.
4. Inspect every API route.
5. Inspect every relevant model.
6. Inspect frontend capability definitions.
7. Inspect dashboards/KPI calculations.
8. Inspect approval workflows.
9. Identify ownership fields.
10. Identify every existing authorization mechanism.
11. Identify contradictions between frontend and backend.
12. Identify dead/legacy authorization code.
13. Identify endpoints that are currently unprotected.
14. Build an internal understanding of the complete access graph.

Then implement the fixes.

Do not stop after fixing the obvious endpoints listed in existing documentation.

**Search the entire codebase for equivalent vulnerabilities.**

---

# Security Invariants

After implementation, the following must always be true:

### Agent

```text
Agent A cannot see Agent B's private records.
Agent A cannot modify Agent B's records.
Agent A cannot delete Agent B's records.
Agent A cannot access Agent B's financial information.
Agent A cannot access another team's data.
```

### Team Manager

```text
Team Manager A can see Team A.
Team Manager A cannot see Team B.
Team Manager A can manage permitted Team A records.
Team Manager A cannot manipulate Team B records.
```

### Organization Management

```text
Owner/Admin/Ops Manager can see organization-wide data
within their legitimate permissions.
```

### Privilege

```text
No user can grant themselves or another user
authority greater than the actor is allowed to grant.
```

### API

```text
No frontend bypass can defeat backend authorization.
```

### Database

```text
Unauthorized records should never be fetched
from the database merely to filter them later.
```

---

# Testing & Verification

After implementing the changes, do not assume the system is secure.

Create or run comprehensive authorization tests.

At minimum test combinations of:

```text
Owner
Admin
Ops Manager
Team Manager
Lead Agent
Agent A
Agent B
Trainee
Accounting
```

and:

```text
Team A
Team B
No team
```

Test:

- GET list
- GET detail
- POST
- PATCH
- DELETE
- search
- filters
- aggregation
- dashboard
- KPI
- approvals
- team management
- user management
- assignment/reassignment
- financial data
- activity logs
- notifications

Especially test malicious behavior:

```text
Agent A requesting Agent B's ID
Agent A changing agentId to Agent B
Agent A changing ownerId
Agent A changing teamId
Agent A changing role
Agent A calling hidden API routes
Agent A manipulating query parameters
Team Manager A requesting Team B records
Ops Manager attempting to create Owner
Admin attempting unauthorized privilege escalation
```

Every unauthorized request must return an appropriate `401` or `403`, or an appropriately scoped empty/not-found response where that is safer and consistent with the application's behavior.

---

# Final Requirements

When finished:

1. Fix the implementation directly.
2. Do not merely document the problems.
3. Do not leave known high-impact access vulnerabilities unresolved.
4. Keep unrelated functionality unchanged.
5. Keep the existing design/theme/UI intact unless a UI change is required to reflect corrected permissions.
6. Remove or consolidate obsolete authorization logic where appropriate.
7. Ensure backend authorization is the source of truth.
8. Ensure database queries are scope-aware.
9. Ensure role changes cannot create privilege escalation.
10. Ensure team boundaries are enforced everywhere.
11. Ensure agents are strictly isolated from one another.
12. Ensure organization-level roles retain legitimate organization-wide access.
13. Ensure accounting only receives appropriate financial/accounting access.
14. Ensure approval and dashboard logic follows the same access model.
15. Run the project's available tests/build/type-check/lint commands after the changes.
16. Fix any regressions introduced by the security changes.

Finally, provide a concise implementation summary containing:

- What was changed.
- Which access rules are now enforced.
- Which files/modules were modified.
- Any schema changes.
- Any remaining limitations that genuinely cannot be solved from the current architecture.
- Test/verification results.

**Do not ask me to make the authorization decisions for you. Analyze the existing project and make the logically safest implementation consistent with the rules above.**