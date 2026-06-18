# Teacher Assignment Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured teacher subject specializations, class teaching assignments, and class-teacher ownership to the admin teacher workflow.

**Architecture:** Keep `classes.supervisor_id` as the class teacher source of truth, add normalized specialization and assignment tables for teacher-to-subject and teacher-to-class-subject relationships, then extend the admin users API and teacher form to read and write those relationships in one save flow.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, node:test, existing admin browser API helpers

---

### Task 1: Define schema for teacher specializations and teaching assignments

**Files:**
- Modify: `C:\-zamschool-os\webapp\schema.sql`
- Create: `C:\-zamschool-os\webapp\migrations\012_add_teacher_assignment_tables.sql`
- Test: `C:\-zamschool-os\webapp\app\api\admin\users\route.test.mjs`

**Step 1: Write the failing test**

Add assertions that the admin users route references:
- `teacher_subject_specializations`
- `teacher_class_subject_assignments`
- `specializationSubjectIds`
- `teachingAssignments`
- `supervisedClassIds`

**Step 2: Run test to verify it fails**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: FAIL because those symbols are not present yet.

**Step 3: Write minimal implementation**

Add the new tables to `schema.sql` and create migration `012_add_teacher_assignment_tables.sql` with:
- `teacher_subject_specializations`
- `teacher_class_subject_assignments`
- unique constraints on `(teacher_profile_id, subject_id)` and `(teacher_profile_id, class_id, subject_id)`
- school-scoped foreign keys

**Step 4: Run test to verify partial progress**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: still failing until the route is updated.

### Task 2: Extend admin users route to read and write teacher assignments

**Files:**
- Modify: `C:\-zamschool-os\webapp\app\api\admin\users\route.ts`
- Modify: `C:\-zamschool-os\webapp\lib\admin-user-directory.ts`
- Modify: `C:\-zamschool-os\webapp\app\api\admin\users\route.test.mjs`

**Step 1: Write the failing test**

Add tests asserting the route:
- accepts structured teacher assignment fields
- syncs specialization and assignment tables
- reads normalized assigned subjects and classes when building teacher detail

**Step 2: Run test to verify it fails**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: FAIL because the route does not support structured assignments yet.

**Step 3: Write minimal implementation**

Update the route schema and helpers to:
- accept `specializationSubjectIds`, `teachingAssignments`, and `supervisedClassIds`
- validate the referenced teacher, subject, and class rows belong to the admin school
- upsert teacher role data
- sync specialization rows
- sync assignment rows
- update `classes.supervisor_id`
- include normalized assigned classes and subjects in teacher detail responses and merged teacher rows

**Step 4: Run test to verify it passes**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: PASS.

### Task 3: Extend admin teacher form with assignment controls

**Files:**
- Modify: `C:\-zamschool-os\webapp\app\app\admin\users\page.tsx`
- Test: `C:\-zamschool-os\webapp\app\api\admin\users\route.test.mjs`

**Step 1: Write the failing test**

Add UI assertions that the admin users page exposes:
- subject specialization selection
- teaching class assignment controls
- class teacher selection

**Step 2: Run test to verify it fails**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: FAIL because the current form only has a free-text specialization field.

**Step 3: Write minimal implementation**

Update the teacher modal to:
- load subjects and classes
- replace single specialization text input with multi-select specialization choices
- add a structured class assignment section
- send the normalized assignment payload through create and update requests
- keep the UX compact and professional

**Step 4: Run test to verify it passes**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: PASS.

### Task 4: Keep teacher overview and details readable

**Files:**
- Modify: `C:\-zamschool-os\webapp\app\app\admin\users\page.tsx`
- Modify: `C:\-zamschool-os\webapp\app\api\admin\users\route.ts`
- Modify: `C:\-zamschool-os\webapp\lib\teacher-oversight.ts`

**Step 1: Write the failing test**

Add assertions that teacher detail output includes normalized:
- assigned subjects
- teaching classes
- supervised classes

**Step 2: Run test to verify it fails**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: FAIL if the detail view still depends only on lessons.

**Step 3: Write minimal implementation**

Update the teacher detail payload and admin detail UI to surface the new relationships clearly, while preserving existing timetable-derived oversight data.

**Step 4: Run test to verify it passes**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: PASS.

### Task 5: Verify and run the production app

**Files:**
- Verify: `C:\-zamschool-os\webapp\app\app\admin\users\page.tsx`
- Verify: `C:\-zamschool-os\webapp\app\api\admin\users\route.ts`
- Verify: `C:\-zamschool-os\webapp\migrations\012_add_teacher_assignment_tables.sql`

**Step 1: Run targeted tests**

Run: `node --test app/api/admin/users/route.test.mjs`
Expected: PASS.

**Step 2: Run regression tests**

Run: `node --test app/api/admin/audit/route.test.mjs app/app/detail-panel-experience.test.mjs lib/timetable-workspace.test.mjs`
Expected: PASS.

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS.

**Step 4: Start the app**

Run: `npm start`
Expected: server boots successfully on the configured port.
