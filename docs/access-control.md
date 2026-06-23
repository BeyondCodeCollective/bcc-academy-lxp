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
| **super_admin** | **View / oversight across all programs** (program switcher, rosters, analytics, content). Does **not** manage people or roles — it's a read/oversight tier. |
| **master** | The platform owner. One rung above super-admin: the **only** tier that can manage other people's roles/credentials — and it **bypasses every capability check** (so it can manage people too). **Email-gated**, not a DB role (`MASTER_EMAILS` in `src/lib/auth/admins.ts`, default `fonz.morris@wearebgc.org`). A master keeps `role = super_admin` in the database for every other check. |

## Capability matrix

| Capability | student | instructor | admin | super_admin | master |
|---|:--:|:--:|:--:|:--:|:--:|
| Learn (own dashboard) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload curriculum / content (their tracks) | | ✅ | ✅ | ✅ | ✅ |
| View all programs / switch programs | | | | ✅ | ✅ |
| View insights / analytics | | | ✅ | ✅ | ✅ |
| Manage students & cohorts | | | ✅ (their program) | | ✅ |
| **Assign roles** | | | → instructor | | → super_admin |
| Manage super-admins / role management | | | | | ✅ |

`access_admin_panel` = instructor+. `manage_students` = **admin only** (super_admin
is view-only). `switch_programs` = super_admin. `canManageRoles(email)` = master
only. The **master bypasses all capability checks** in `requireCapability()`.

## Role-assignment rules (enforced in `roles.ts` + server actions)

A person may only set someone **else's** role to a tier **strictly below their
own**, and only a **master** may grant `super_admin`. super-admin is view-only,
so it assigns no roles:

- **admin** → can set `student` / `instructor` (within their program).
- **super_admin** → none (view-only).
- **master** → can set anything, including `super_admin`.

Invariants:
- You can **never change your own role**.
- You can **never modify someone at or above your own tier** (e.g. an admin can't
  touch another admin; only a master touches super-admins).
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
3. Sign in as a **super_admin** (non-master, e.g. Lauren/Tara): you can **view** all programs, rosters, and analytics, but there are **no add / edit / delete / role controls** — every role dropdown is disabled and "Add person" is gone. View-only.
4. Sign in as **master** (`fonz.morris@wearebgc.org`): full management everywhere — role dropdowns include **Super Admin**, you can add/edit people and edit super-admins.
5. **Server-guard checks** (the important ones): as an admin, trying to escalate via a stale/forged request throws `You don't have permission to assign that role.`; as a super-admin, any management mutation throws `Not authorized`. Nothing changes either way.

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
