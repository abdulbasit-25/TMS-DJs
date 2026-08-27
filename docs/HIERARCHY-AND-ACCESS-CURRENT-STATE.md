# Hierarchy, Roles, Permissions & Data Visibility — Current Implementation

**Scope:** Factual snapshot of what is implemented in this codebase (React 19 + TanStack Start + MongoDB/Mongoose). No redesign is proposed. Every claim is traceable to a file/function listed inline. Anything not determinable from code is explicitly marked.

Analysis date: 2026-08-27 · Default branch: `main`

---

## 1. Roles That Actually Exist

### 1.1 Role values (backend source of truth)

`src/models/user.ts:58-71` — the User model enum (only roles that can be persisted):

```
owner | admin | ops_manager | team_manager | leadagent | agent | trainee | accounting
```

Default role on create: `"agent"`.

The frontend type adds one extra value — `suspended` (`src/lib/roles.ts:1-10`). It **cannot be stored** via the User model, but two places still test for it:
- `src/api/auth/login.ts:41` — `if (user.role === "suspended") return 403`
- `src/components/app-shell.tsx:218` — full lockout screen when the session role is `suspended`

Suspension in practice is done via the **status** field (§7), so `role === "suspended"` is legacy/defensive dead logic today.

### 1.2 Where roles are defined

| Artifact | File |
|---|---|
| Persistable role enum | `src/models/user.ts:4-12, 58-71` |
| Frontend role list incl. `suspended` | `src/lib/roles.ts:1-34` |
| Capability matrix per role | `src/lib/roles.ts:60-201` |
| Role ordering array (for promotion/demotion UX) | `src/api/users/index.ts:19-27` |

### 1.3 How roles are stored

A plain string field `user.role` on the User document. There is **no permission table, no permission collection, no capability storage in the database** — capabilities are computed from the hardcoded matrix at request time.

### 1.4 Do roles have hierarchy levels?

No numeric levels and no hierarchy field exist on users. Two implicit mechanisms stand in:

1. **Hardcoded role lists** everywhere in handlers (e.g. `["owner","admin","ops_manager"]`), and
2. **`canManageUser()`** — `src/api/users/index.ts:43-48`:

```ts
if (actorRole === "owner") return true;
if (actorRole === "admin") return targetRole !== "owner";
if (actorRole === "ops_manager") return !["owner", "admin"].includes(targetRole);
return false;
```

3. **Notification-side ordering** only: `ROLE_ORDER` (`src/api/users/index.ts:19-27`) is used to label a role change as "promoted" vs "demoted" (`users/index.ts:557-566`). `leadagent` is absent from `ROLE_ORDER`, so any change involving it defaults to index −1 handling.

### 1.5 Implicit / elevated permissions outside normal roles

- The role switcher ("Preview as role") is client-side-only for admin/owner (`src/components/app-shell.tsx:417, 642`; override state `src/lib/auth-context.tsx:43,175,219`) — it never changes backend authorization.
- Approval-gating classes are defined independently of roles in each module: `ROLES_THAT_NEED_APPROVAL = ["agent","trainee"]` and `ROLES_THAT_CAN_APPROVE = ["owner","admin","ops_manager","team_manager","leadagent"]` (`src/api/approvals.ts:27-34`, duplicated in `src/api/leads/list.ts:11-18`).
- Accounting sees commissions/invoices via explicit role checks (`requireRole(user, ["admin","accounting"])`, `src/api/commissions/list.ts:89,224`).

---

## 2. Authentication & Session Mechanics (context needed for access)

All API routes are registered in one table: `src/api/index.ts:44-104`, dispatched by `handleApiRequest` → `src/server.ts:46`. Every `/api/*` path goes through this table; anything unregistered 404s.

- **Tokens:** access JWT, 15 min, cookie `accessToken` (`src/lib/auth.ts:33-37`); refresh JWT, 7 days, cookie scoped to `/api/auth/refresh` (`auth.ts:39-43`).
- **Session load:** every request re-reads the user from MongoDB (`loadSessionUser`, `src/lib/auth.ts:45-68`). If `user.status !== "active"` the session resolves to `null`. Consequences:
  - Deactivating/suspending/locking a user takes effect on their *next* API call (no cached sessions).
  - Status enforcement is **automatic for every authenticated endpoint**, even ones without explicit checks.
- **Helpers:** `requireAuth` (401) `src/lib/auth.ts:100-107`; `hasRole` (`:109`); `requireRole(list)` throws 403 (`:113-121`).
- Password hashing bcrypt cost 12 on save pre-hook (`src/models/user.ts:115-120`).
- Login blocks any status other than `active` with 403 "Account is not active" (`src/api/auth/login.ts:38-40`).
- Temporary passwords: `isTemporaryPassword` flag set by admin creation/reset (`src/api/users/index.ts:236-237, 404-409`). A forced change-password modal appears in the UI shell (`src/routes/_app.tsx:73-121`). **Cannot be determined from the current implementation:** no server-side block was found preventing other API calls while a temporary password remains unchanged.
- `/api/auth/change-password` verifies current password and requires auth (`src/api/auth/change-password.ts:8`).
- Profile read/update is self-scoped (`src/api/profile.ts:11`).

### What every active user can reach regardless of role

Any authenticated, active user can call: profile GET/PATCH, session GET, change-password POST, notifications GET/POST (strictly recipient-scoped), activity clock-in/out/log POST, dashboard GET (per-role payload), followups GET (scoped), teams GET (**org-wide — see gap §8**), carriers GET (org-wide), leads/customers/quotes/loads GET where the module capability applies, approvals GET (scoped), invoices GET (**unscoped — see gap**), commissions GET (**unrestricted — see gap**).

---

## 3. Per-Module Access & Visibility (traced from handlers)

General visibility pattern used across list endpoints:

```ts
const scope =
  user.role === "agent" || user.role === "trainee"
    ? { <ownershipField>: new mongoose.Types.ObjectId(user.id) }
    : {};   // everyone else (incl. team_manager / leadagent) gets org-wide
```

Applied at:
- Leads — `{ ownerId: self }` (`src/api/leads/list.ts:365-368`)
- Customers — `{ agentId: self }` (`src/api/customers/list.ts:514-516`)
- Quotes — `{ agentId: self }` (`src/api/quotes/list.ts:381-383`)
- Follow-ups — `{ assignedTo: self }` (`src/api/followups/list.ts:236-238`)
- Loads — **none** (`Load.find()` unfiltered, `src/api/loads/list.ts:1380-1381`)
- Carriers — none, only soft-delete filter (`src/api/carriers/list.ts:410-421`)
- Invoices — none (`Invoice.find()`, `src/api/invoices.ts:53-66`)
- Commissions GET — none (`Commission.find(filter)`, filter built only from query params, `src/api/commissions/list.ts:406-410`)

> Note: **team scoping does NOT exist on main list queries** for `team_manager`/`leadagent` anywhere except approval-request sub-feeds. Team hierarchy surfaces only in: dashboards, the generic approvals feed, quote approval endpoint, user listing, and KPI generation (§3.13–§3.15).

### Module table (discovered modules)

| Module / area | Who can access page/API | What they see | Create | Edit | Delete | Reassign / special | Evidence |
|---|---|---|---|---|---|---|---|
| **Dashboard** | all roles (payload differs) | owner/admin/org-wide financials+ops; ops_manager/org-wide; team_manager/**team memberIds only**; leadagent/team; agent/self; trainee/self (subset); accounting/finance KPIs | – | – | – | – | role switch `src/api/dashboard.ts:622-651`; team filtering via `resolveTeamMembers` → `agentFilter {agentId:$in:memberIds}` (computeTeamManager, same file) |
| **Leads** | all roles | agent/trainee own; all others org-wide | agent/trainee→ApprovalRequest pending; others direct | requester-owned or admin/ops_manager/team_manager | ownerId or admin/ops_manager (**not** team_manager/leadagent) | editor may set any new `ownerId`; logs `ReassignmentHistory` | scope `leads/list.ts:365`; edit gate `:110-117`; delete gate `:69-75`; reassignment `:163-172` |
| **Customers** | all roles | agent/trainee own; others org-wide (+approval feed scoped) | agent/trainee→approval; others direct | owner-agentId or admin/ops_manager | owner-agentId or admin/ops_manager | – | scope `customers/list.ts:514`; edit `:178-184`; delete `:70-74` |
| **Quotes** | all roles | agent/trainee own; others org-wide | agent/trainee→approval; others direct | owner-agentId or admin/ops_manager | *(via module PATCH/approval)* | dedicated approve endpoint `POST /api/quotes/:id/approve`: requireRole **admin, ops_manager, team_manager**; team_manager restricted to quotes whose `agentId` sits in a team they manage (`Team.findOne({managerId:self, memberIds:quote.agentId})`) | gates `quotes/list.ts:141-142`; approve `src/api/quotes/approve.ts:20-49` |
| **Carriers** | all roles | org-wide (soft-delete filtered) | trainee blocked; others: direct write path w/ approval branch for submission flow | review/status changes need `approval_actions` cap or manager roles | handler includes DELETE branch | comment/review extra-gated | trainee 403 `carriers/list.ts:297-300`; role branch `:106`; approval-actions guard `:187,241` |
| **Loads** | all roles have `loads` cap | **everyone sees ALL loads**; only the pending-approval feed is role-scoped (agent/trainee own; tm/la own-team; admins all) | needs `booking_actions` cap → excludes trainee/accounting | same cap; agent/trainee edits diverted into ApprovalRequest; admin/ops/tm/la save directly | same cap; deleting a *pending-only* load additionally limited to original requester or `[admin, ops_manager, owner, team_manager]` | agent reassignment happens through PATCH `agentId` (part of body), gated only by booking_actions; sends assigned/unassigned notifications | caps `loads/list.ts:230-235, 613-617, 1310-1314, 1372-1376`; delete manager check `:1334-1343`; approval diversion `:308, 783` |
| **Follow-ups** | all roles | agent/trainee own (assignedTo=self); others org-wide | assigner auto = self; manager? creator passes leadId | assignee or admin/ops_manager/team_manager | same | completing allowed only by assignee even if admin (`followups/list.ts:171`) | scope `:236-238`; gates `:152-155, 222-225` |
| **Approvals (generic)** | all roles read (scoped); action per role | agent/trainee: own requests; team_manager/leadagent: own + team's; owner/admin/ops_manager: all | anyone may submit via POST | only original requester can `update`; add_comment open to participants via handler visibility | n/a | approve/reject/request_changes require `ROLES_THAT_CAN_APPROVE`; team_manager/leadagent must match `approvalRequest.teamId === user.teamId`; approved changes applied directly to target collections | filters `approvals.ts:41-60`; approver gating `:210-228`; apply logic `applyApprovalChanges :385-451` |
| **Invoices** | any authenticated active user via API | **org-wide** (`Invoice.find()`, also returns full customers + user names) | any authenticated user | any authenticated user | any authenticated user | – | no role/cap check found in entire file (`src/api/invoices.ts` methods at 53/68/223/393; only `requireAuth :49`) |
| **Commissions** | GET: any authenticated active user; POST/PATCH: admin + accounting only | **org-wide, all agents' commissions** | admin/accounting | admin/accounting (payout status etc.) | not supported | – | GET 406-430; guards `commissions/list.ts:89, 224` |
| **Users management** (`/api/users`) | GET: agent/trainee/accounting get **self record only**; team_manager: members of team they manage (`Team.findOne({managerId:self})`); owner/admin/ops_manager: org-wide paginated + filters | self / team / org as above | requireRole owner/admin/ops_manager **and** `canManageUser(actor, NEW target role)` | requireRole owner/admin/ops_manager/team_manager; non-managers may edit **self only**; `canManageUser(actor, target.CURRENT role)` checked | owner/admin/ops_manager + `canManageUser` | role/status/team/temporary password/commission editable within those bounds; DELETE cascades nothing else | scope rules `users/index.ts:116-152`; create `:192-241`; patch gates `:330-338`; delete `:680-688` |
| **Teams** | GET: **any authenticated user** (returns all teams + full user directory incl. emails/statuses) | all teams | owner/admin/ops_manager | owner/admin/ops_manager | owner/admin/ops_manager | creating sets `managerId`, seeds `memberIds=[manager]`, updates manager's `teamId` | gates `teams.ts:81, 153, 278`; GET `:63-79`; manager must be active (`:95-97`) |
| **Activity (clock/daily log)** | clock-in/out/log POST: self only | `GET /api/activity/logs`: admin/ops_manager/**team_manager see ALL logs**; everyone else own only | – | – | – | – | `activity/logs.ts:13-15` |
| **Audit logs** | owner/admin/ops_manager only | full audit trail | – | – | – | – | `audit-logs.ts:12-17` |
| **Notifications** | any authed user | strictly own (`recipientUserId = sessionUser.id` for every operation incl. mark-read/delete) | system-generated | self mark read/unread | self delete/clear | – | `notifications.ts:85-140` |
| **Admin utilities** | reset-system: **admin only** + account password + typed confirmation "RESET"; wipes every collection in DB; cleanup: admin/owner purge old notifications/session logs | – | – | destructive | destructive | full-DB wipe loop over collections | `admin/reset-system.ts:18-31+`; `admin/cleanup.ts:17-21` |

### 3.x Notes on specific cells

- **Loads**: although `ROLE_DESCRIPTIONS` says agent = "Scoped to own records", `GET /api/loads` returns all loads to agents/trainees; only agents' own approval requests are scoped. Direct-edit for managers touches any load by id — `PATCH` performs `Load.findById(loadId)` with **no ownership check** beyond `booking_actions`.
- **Leads vs customers asymmetry**: lead editing admits `team_manager` but customer editing doesn't; lead deletion refuses both team_manager and leadagent while customer deletion pattern mirrors owners/admin/ops only.
- **Quote approval vs generic approvals disagree on approver set**: dedicated endpoint excludes `owner` and `leadagent` (`quotes/approve.ts:20`), while generic approval requests include them (`approvals.ts:28-34`).
- Carrier module uses bespoke strings instead of the shared constant for reviewers: `["owner","admin","ops_manager","team_manager"]` plus capability fallbacks (`carriers/list.ts:106,187,241`).

### Per-role quick view (aggregated from above)

| Role | Sees records of… | Mutations | Key restrictions |
|---|---|---|---|
| owner | everything, all modules | everything users mgmt allows; everything data modules allow | admin-tier; cannot be managed by others |
| admin | everything | same as owner minus managing owner targets | `canManageUser(admin, x)` false only for `owner` |
| ops_manager | everything | creates users below admin; cannot touch owner/admin | no Users/Audit/Admin pages by capability, but APIs allow audit-log reads (`audit-logs.ts:13`) |
| team_manager | dashboards+approvals: team; **lists: org-wide**; users: own team; activity logs: ALL | approves (team-matched), books loads, edits users = self only | closest thing to people-management |
| leadagent | lists org-wide; approvals own+team | like team_manager minus user self-service PATCH naming (still has right to update itself), quote-approve denied via dedicated endpoint | inconsistently treated vs team_manager |
| agent | own: leads/customers/quotes/followups/dashboard; org-wide: loads/carriers/invoices/commissions | creates pending-approval; edits/deletes own; books loads | auto-subjected to approval flows |
| trainee | same as agent minus ability to create carriers; README states "read-only" but code allows booking_actions?? — **see note** | NOTE: capability matrix actually omits `booking_actions` for trainee → blocked from load create/edit/delete server-side by `can()`; but CAN create/edit/delete leads/customers/quotes via approval flows | genuinely read-mostly |
| accounting | finance-centric dashboard; commissions POST/PATCH; invoicing UI capability | commissions payout processing; **invoice CRUD technically open to them like everyone** | excluded from most modules by capability matrix (frontend) |

---

## 4. Hierarchy Between Users

**Yes — partially implemented, and it lives in exactly four constructs:**

1. **Team entity** `src/models/team.ts:10-19`: `name`, `managerId → User`, `memberIds[] → User`. One team per user via `User.teamId` (`src/models/user.ts:72`). There is **no `reportsTo`/manager field on User** besides team membership; higher/lower = manager-of-team vs member-of-same-team.
2. **Hierarchy used for visibility** — only here:
   - Dashboard for team_manager/leadagent (`resolveTeamMembers(teamId)` → queries filtered by `memberIds`).
   - Generic approvals feed + team-bound quote approvals + carrier-KPI-less branches.
   - User listing for team_manager (own team members only, `users/index.ts:144-152`).
   - Teams page enrichment shows `teamManager` name derived from `Team.managerId` (`users/index.ts:82-84`).
3. **Approval elevation:** `doesUserNeedApproval(role)` = agent/trainee ⇒ writes become requests; manager-tier roles execute directly (`approvals.ts:27-34, 453-456`). Approver selection: team_manager/leadagent constrained to their `teamId` (`approvals.ts:222-228`).
4. **Management authority over accounts:** `canManageUser` ladder (`users/index.ts:43-48`) + `hasManagerAccess` (`:39-41`).

**Backend-enforced parts:** everything above runs server-side inside handlers.
**Frontend-only hierarchy expressions:** sidebar visibility (`app-shell.tsx:216`), disabled buttons (`_app.users.tsx:353`, `_app.teams.tsx:104`, `_app.loads.tsx:801`, `_app.approvals.tsx:283`).

Lower-level access to higher-level data: an agent *can* view (through unscoped endpoints) loads/financials belonging to anyone including admins; they cannot mutate those without passing approval.

Higher-level inheritance: org tiers (owner/admin/ops_manager) inherit unrestricted visibility by hardcoding; team tier inherits access only where `resolveTeamMembers`/`teamId` filters were written.

---

## 5. Frontend vs Backend Enforcement

### Backend enforced (server code paths shown)
- Session validity + active-status requirement on every API call (`auth.ts:45-68`).
- Login status gate (`login.ts:38-40`).
- All the module gates detailed in §3 (capability `can()` usage exists **only** in the loads and carriers handlers among data modules — e.g. `loads/list.ts:231,613,1310,1372`).
- Approval-flow redirection by role (`agents/trainee` blocked from direct writes in leads/customers/quotes/loads/followups).
- Scoping rules for approvals/users/activity/audit/notifications endpoints.
- Destructive admin operations (`reset-system`, `cleanup`).

### Frontend only
- Route protection: no `beforeLoad` guards exist anywhere under `src/routes/**`; the sole protection is `Gate` in `src/routes/_app.tsx:35-62` doing `window.location.replace("/login")` when the fetched session is null. Page components themselves do **not** verify role before rendering data.
- Navigation restriction: `NAV.filter(n => can(role, n.cap))` (`app-shell.tsx:216`).
- Conditional controls: `canBook` (`_app.loads.tsx:801`), `canAct` (`_app.approvals.tsx:283`), `canEditUsers` (`_app.users.tsx:353`), `canEditTeams` (`_app.teams.tsx:104`).
- Suspended-role lockout screen (`app-shell.tsx:218-226`).
- Forced temporary-password dialog (`_app.tsx:73`).
- Role preview switcher (`app-shell.tsx:417+`) — cosmetic.

### Hidden-in-UI but backend-permitted (summary; details in §8)
- Trainee/accounting and every other role can hit `GET/POST/PATCH/DELETE /api/invoices` directly.
- Any role can read all commissions.
- Agents can read all loads including financial fields (`customerRate`, `carrierCost`, margins) because `mapLoad` never strips fields.
- Team_manager/leadagent see org-wide leads/customers/quotes/followups despite team-oriented descriptions.
- `accounting` cannot manage users per matrix but the self-PATCH allowance still lets team_manager... (self-limits fine).
- "Suspended" lockout screen relies on a role value that login sets only via status, so the *only* real suspended handling server-side is status-based.

---

## 6. Account Status Lifecycle & Special Cases

Statuses (`src/models/user.ts:73-85`): `active, inactive, suspended, locked, pending, pending_invitation, on_leave`.

| Case | Actual behavior | Evidence |
|---|---|---|
| Non-active at login | blocked 403 "Account is not active" | `login.ts:38-40` |
| Becomes non-active after login | next request fails 401 because `loadSessionUser` returns null | `auth.ts:57-59` |
| `pending_access_request` string | mapped to `inactive` in the (unwired) users list handler | `users/list.ts:28` |
| Suspension action | PATCH /api/users with `status:"suspended"`; notifies user, admins, ops, team manager | `users/index.ts:370-373, 437-497` |
| Re-activation | notifies user + team manager when prev was suspended/pending/locked | `users/index.ts:499-536` |
| Locking | notification to admins only; lockout enforced purely by status==≠active | `users/index.ts:537-553` |
| Locked-account reason | UI copy says "too many failed attempts" but **cannot be determined from the current implementation** — no automatic lockout routine exists in code; only admin-set `status:"locked"` | `routes/locked.tsx` copy vs absence of counter logic |
| `/locked` route | reachable nowhere — zero navigation references found | grep for `"/locked"` returned nothing |
| Temporary password | flag set at create and on admin reset; UI forces change modal; server-side enforcement undetermined | `users/index.ts:202-204,404-409` |
| Users without a team | team_manager listings fall back; approvals treat missing teamId as "own only"; empty-data dashboards for tm/la | `users/index.ts:148-150`, `approvals.ts:54-57`, dashboard `if (!user.teamId)` |
| Multiple teams | impossible structurally — single `teamId` on User, single `managerId` on Team | models |
| Role change mid-session | effective immediately next request (fresh DB read each call) | `auth.ts:45-68` |
| Team change | handled in user PATCH: pulls/adds to `Team.memberIds`, swap notifications | `users/index.ts:374-393` |
| Ownership change (records) | leads reassign via PATCH `ownerId` → `ReassignmentHistory` row; loads reassign via `agentId` field in PATCH (any booking-capable user) | `leads/list.ts:163-172`, `loads/list.ts:1236-1277` |
| Administrative overrides | `reset-system` full DB wipe (admin, password + "RESET"); cleanup purge (admin/owner) | `admin/*.ts` |
| Requester-only constraints | approval request `update`/comment-and-cancel paths limited to original requester | `approvals.ts:190-207`, `loads/list.ts:626-630` |

---

## 7. Where Each Mechanism Lives (index)

| Concern | Backend location | Frontend location |
|---|---|---|
| Auth primitives | `src/lib/auth.ts` | `src/lib/auth-context.tsx`, `src/lib/api-client.ts` (auto-refresh on 401, lines 15-40) |
| Role metadata | `src/models/user.ts` | `src/lib/roles.ts` |
| Capability matrix consumed server-side | only loads/carriers handlers import `can()` | `app-shell.tsx`, several route files |
| Approval engine | `src/api/approvals.ts` + per-module branches | `_app.approvals.tsx` |
| Audit trail writer | `src/lib/audit.ts`, `recordAudit` calls across handlers | — |
| Notification routing by role | `src/lib/notification.ts` helpers (`notifyAdmins`, `notifyOpsManagers`, `notifyTeamManager`, `notifyLeadAgents`, `notifyAccounting`) | `_app.notifications.tsx` |

Unwired/legacy code discovered: `src/api/users/list.ts` (`usersListHandler` exported, never routed — would hand full directory to team_managers without team filter if ever wired); `src/api/onboarding/index.ts` (full handler with self/manager rules, **but `/api/onboarding` is absent from `src/api/index.ts:44-104`, so the Onboarding page's calls currently 404**); `/locked` orphan route; `role:"suspended"` remnants.

---

## 8. Observed Gaps & Inconsistencies (documented, not fixed)

1. **Invoices completely unprotected server-side.** `src/api/invoices.ts` contains only `requireAuth` (line 49). Any active account — trainee included — can list all invoices, create, modify, or delete them via the API. UI hides this by nav capability only.
2. **Commissions GET open + unscoped.** `src/api/commissions/list.ts:406-410` builds no ownership filter and performs no role check on GET; POST/PATCH are admin/accounting. So every user can enumerate all agents' commission amounts.
3. **Loads visible org-wide to agents/trainees,** contradicting stated design ("Scoped to own records" `roles.ts:31`): `loads/list.ts:1380-1381` runs `Load.find()` unfiltered; sensitive margin/rate fields ride along unredacted via `mapLoad` (:64-132).
4. **team_manager/leadagent list visibility is org-wide** for leads, customers, quotes, followups, loads — despite "Visibility into assigned team" descriptions (`roles.ts:28-29`) and despite dashboards being properly team-filtered. Only approval feeds carry `teamId` scoping (`leads/list.ts:379-384`, `customers/list.ts:526-529`, etc.).
5. **Lead deletion narrower than lead editing:** edit permits team_manager (`leads/list.ts:110-117`) but delete demands owner-or-admin-or-ops (`:69-75`); leadagent symmetric-less on both sides. Customer module omits team_manager from edit entirely (`customers/list.ts:178-184`) — three different rule-sets for parallel modules.
6. **Two divergent approver definitions:** dedicated quote-approval endpoint locks to `[admin, ops_manager, team_manager]` (`quotes/approve.ts:20`) excluding owner and leadagent, whereas the generic approvals handler includes both (`approvals.ts:28-34`).
7. **Privilege escalation window in user PATCH:** `canManageUser` validates against the target's **current** role, then the payload may promote that user arbitrarily high — e.g., an `ops_manager` PATCHing an `agent` could set `role:"owner"`, since `canManageUser("ops_manager","agent")` is true (`users/index.ts:337-338` followed by `:366-369`). Similarly an admin could mint additional owners. Nothing prevents granting the highest tiers.
8. **teams GET leaks the user directory:** any authenticated user retrieving `/api/teams` receives every team plus every user's email/role/status (`teams.ts:56-79`).
9. **team_manager sees all daily activity logs**, not just team members' (`activity/logs.ts:13-15` groups `team_manager` with admin-level `canSeeAll`).
10. **Duplicate suspension semantics:** `role === "suspended"` checks survive in `login.ts:41` and the app-shell, but the model cannot store that role — status-only in reality; harmless yet misleading legacy.
11. **Orphaned/unwired features:** `/api/onboarding` called by `_app.onboarding.tsx:90,146,186,214` but no matching entry in the route table (`src/api/index.ts`); `usersListHandler` dead; `/locked` unreachable. Feature would appear broken rather than protected.
12. **Permission vocabulary drift:** loads use the shared `can()` matrix; carriers mix hardcoded role arrays with matrix caps; leads/customers/quotes/followups hand-roll per-endpoint conditions; notifications/kpi hardcodes four role-class buckets inline (`kpi.ts:96-99, 289-294`). Same conceptual check expressed ≥3 ways invites divergence (and already has, per items 4-6).
13. **Comment/visibility side-channel:** approval comments notify the requester regardless of who commented, using requester-visible channel; fine, but `add_comment` has no cap check — any participant class able to see a request (per its role feed) can append comments (`approvals.ts:141-187`).
14. **Carrier reviewer strings include accounting implicitly? No** — accounting lacks `approval_actions`, so consistent there, but hardcoded lists risk drift vs matrix (track: `carriers/list.ts:106`).

Items 1-4 are the highest-impact findings for actual data exposure; item 7 is the highest-impact privilege issue.

---

## 9. Traceability Index (quick map)

- Auth/session/token: `src/lib/auth.ts`, `src/api/auth/*`
- Route registry: `src/api/index.ts:44-104`, dispatcher `src/server.ts:43-50`
- Capability matrix: `src/lib/roles.ts:60-205`
- Users CRUD + hierarchy ladder: `src/api/users/index.ts`
- Teams: `src/api/teams.ts`
- Leads / Customers / Quotes / Loads / Carriers / Followups: respective `src/api/*/list*.ts` (+ `src/api/quotes/approve.ts`)
- Approval engine: `src/api/approvals.ts`, model `src/models/approvalRequest.ts`
- Invoices / Commissions: `src/api/invoices.ts`, `src/api/commissions/list.ts`
- Dashboards per role: `src/api/dashboard.ts` (`computeOwnerAdmin`, `computeOpsManager`, `computeTeamManager`, `computeLeadAgent`, `computeAgent`, `computeTrainee`, `computeAccounting`)
- Activity & audit: `src/api/activity/*`, `src/api/audit-logs.ts`, `src/lib/audit.ts`
- Notifications: `src/api/notifications.ts`, `src/api/notifications/kpi.ts`, `src/lib/notification.ts`
- Admin utilities: `src/api/admin/*`
- Frontend shell/guards: `src/routes/_app.tsx`, `src/components/app-shell.tsx`, `src/lib/auth-context.tsx`, `src/lib/api-client.ts`
