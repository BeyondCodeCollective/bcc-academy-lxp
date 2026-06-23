# Access Control — Tiers & Roles

The single source of truth for **who can do what** on BCC Academy. Access is
defined as **capabilities** (in `src/lib/roles.ts`), not scattered role-string
checks. To restrict a new action, add a capability and gate the server action
with `requireCapability()` — never compare role strings ad hoc.

## The tiers

| Tier | What it is |
|---|---|
| **student** | A learner. Their own dashboard only. |
| **instructor** | Teaches assigned tracks. Can **upload curriculum & content** (lessons, materials, recordings, track overview) for their tracks. Cannot manage students or roles. |
| **admin** | Runs **one program**. Manages students & cohorts in that program. |
| **super_admin** | All programs (program switcher). |
| **master** | The platform owner. One rung above super-admin: the **only** tier that can manage other people's roles/credentials. **Email-gated**, not a DB role (`MASTER_EMAILS` in `src/lib/auth/admins.ts`, default `fonz.morris@wearebgc.org`). A master keeps `role = super_admin` in the database for every other check. |

## Capability matrix

| Capability | student | instructor | admin | super_admin | master |
|---|:--:|:--:|:--:|:--:|:--:|
| Learn (own dashboard) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload curriculum / content (their tracks) | | ✅ | ✅ | ✅ | ✅ |
| Manage students & cohorts | | | ✅ | ✅ | ✅ |
| View insights / analytics | | | ✅ | ✅ | ✅ |
| Switch programs | | | | ✅ | ✅ |
| **Assign roles** | | | → instructor | → admin | → super_admin |
| Manage super-admins / role management | | | | | ✅ |

`access_admin_panel` = instructor+. `manage_students` = admin+. `switch_programs`
= super_admin. `canManageRoles(email)` = master only.

## Role-assignment rules (enforced in `roles.ts` + server actions)

A person may only set someone **else's** role to a tier **strictly below their
own**, and only a **master** may grant `super_admin`:

- **admin** → can set `student` / `instructor` (within their program).
- **super_admin** → can set `student` / `instructor` / `admin`.
- **master** → can set anything, including `super_admin`.

Invariants:
- You can **never change your own role**.
- You can **never modify someone at or above your own tier** (e.g. an admin can't
  touch another admin; a super-admin can't demote another super-admin — only a
  master can).
- The role value is **validated** against the allowed set — no arbitrary strings.
- `master` cannot be granted in-app at all; it's email-only.

Enforcement lives in:
- `assignableRoles()` / `canAssignRole()` — `src/lib/roles.ts` (the rules).
- `updateStudentAction()` / `addStudentAction()` — `src/app/dashboard/admin/actions-students.ts` (server-side checks; the real boundary).
- Roster + "Add directly" dropdowns — only show roles the actor may grant.

> Before this, `updateStudentAction` accepted any role string at admin level, so
> any admin could set anyone (including themselves) to `super_admin`. That
> escalation path is now closed server-side.

## How to test

### Locally
1. `pnpm dev` (point `.env.local` at the East prod DB or a local stack).
2. Sign in as an **admin** (not super-admin). On the **People** tab:
   - The role dropdown shows **only Student / Instructor** — no Admin, no Super Admin.
   - On another admin's row, the role dropdown is **disabled**.
   - "Add directly" only offers Student / Instructor.
3. Sign in as a **super_admin** (non-master): dropdown goes up to **Admin**; no Super Admin option; another super-admin's row is disabled.
4. Sign in as **master** (`fonz.morris@wearebgc.org`): dropdown includes **Super Admin**; you can edit super-admins.
5. **Server-guard check** (the important one): as an admin, try to escalate via a stale/forged request — the action throws `You don't have permission to assign that role.` and nothing changes.

### Quick role flip for testing
Use the grant script (creates/sets a test user's role) to spin up an admin/instructor to log in as:
```
GRANT_EMAIL=test.admin@example.com node --env-file=<repo>/.env.local ~/bcc-demo/grant-superadmin.mjs
```
(then edit their role in the DB to `admin`/`instructor` to test the lower tiers).

### Verify the build
```
pnpm exec tsc --noEmit
pnpm build
```
