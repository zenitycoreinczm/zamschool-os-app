-- Synchronize default school staff permission groups for existing schools.
--
-- Some schools already had permission_groups rows before the newer Head
-- Teacher / Registrar / Academic Admin / ICT Admin defaults were introduced.
-- The app intentionally uses DB-backed permissions once any group exists, so
-- stale groups could block Head Teachers from inviting key staff or prevent
-- those staff from operating their school domains.

with default_groups(name, description) as (
  values
    ('Head Teacher Authority', 'Full school leadership access for setup, daily operations, approvals, audit review, and workflow escalation authority.'),
    ('School Administrator', 'Day-to-day school operations. School Administrator (admin) manages routine tasks but cannot override published records.'),
    ('Deputy Head Authority', 'Academic quality control — review and validate, not create.'),
    ('Finance Office', 'Separated financial access for bursars and payments staff'),
    ('Guidance Office', 'Student welfare, counseling, and privacy-focused oversight'),
    ('Discipline Management', 'Student conduct administration — no academic data access.'),
    ('ICT Administration', 'Technical support, session visibility, and system recovery. No academic data access.'),
    ('Admissions & Registrar', 'Student admissions, parent registration, transfers, and biodata management. No finance, grading, or HR access.'),
    ('Academic Administration', 'Academic structure, grades, assignments, timetables, and academic calendar.'),
    ('Human Resources', 'Staff records and department-level attendance oversight'),
    ('Teaching', 'Teacher access scoped to assigned classes and departments')
)
insert into public.permission_groups (school_id, name, description, is_system)
select s.id, dg.name, dg.description, true
from public.schools s
cross join default_groups dg
on conflict (school_id, name) do update
set
  description = excluded.description,
  is_system = true,
  updated_at = now();

with role_seed(group_name, role) as (
  values
    ('Head Teacher Authority', 'principal'),
    ('School Administrator', 'admin'),
    ('Deputy Head Authority', 'deputy_head'),
    ('Finance Office', 'bursar'),
    ('Finance Office', 'payments'),
    ('Guidance Office', 'guidance_office'),
    ('Discipline Management', 'discipline_admin'),
    ('ICT Administration', 'ict_admin'),
    ('Admissions & Registrar', 'registrar'),
    ('Academic Administration', 'academic_admin'),
    ('Human Resources', 'hr_admin'),
    ('Teaching', 'teacher')
)
insert into public.permission_group_roles (school_id, group_id, role)
select pg.school_id, pg.id, rs.role
from public.permission_groups pg
join role_seed rs on rs.group_name = pg.name
on conflict (group_id, role) do update
set school_id = excluded.school_id;

with feature_seed(group_name, feature_key, can_create, can_read, can_update, can_delete, scope) as (
  values
    -- Head Teacher: full school leadership, including user/staff invitation.
    ('Head Teacher Authority', 'users', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'classes', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'subjects', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'attendance', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'grades', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'assignments', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'timetable', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'grading_scales', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'academic_years', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'terms', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'settings', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'announcements', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'messages', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'notifications', true, true, true, false, 'school'),
    ('Head Teacher Authority', 'finance', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'payments', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'audit', true, true, true, true, 'school'),
    ('Head Teacher Authority', 'overrides', true, true, true, true, 'school'),

    -- School Administrator: routine school administration.
    ('School Administrator', 'users', true, true, true, true, 'school'),
    ('School Administrator', 'classes', true, true, true, true, 'school'),
    ('School Administrator', 'subjects', true, true, true, true, 'school'),
    ('School Administrator', 'attendance', true, true, true, false, 'school'),
    ('School Administrator', 'grades', true, true, true, true, 'school'),
    ('School Administrator', 'settings', true, true, true, false, 'school'),
    ('School Administrator', 'announcements', true, true, true, true, 'school'),
    ('School Administrator', 'messages', true, true, true, true, 'school'),
    ('School Administrator', 'notifications', true, true, true, true, 'school'),
    ('School Administrator', 'finance', true, true, true, true, 'school'),
    ('School Administrator', 'payments', true, true, true, true, 'school'),
    ('School Administrator', 'audit', false, true, false, false, 'school'),

    -- Deputy Head: review/oversight and academic validation.
    ('Deputy Head Authority', 'users', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'classes', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'subjects', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'attendance', true, true, true, false, 'school'),
    ('Deputy Head Authority', 'grades', true, true, true, false, 'school'),
    ('Deputy Head Authority', 'timetable', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'grading_scales', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'academic_years', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'terms', false, true, false, false, 'school'),
    ('Deputy Head Authority', 'announcements', true, true, true, false, 'school'),
    ('Deputy Head Authority', 'messages', true, true, true, false, 'school'),
    ('Deputy Head Authority', 'notifications', true, true, true, false, 'school'),

    -- Finance Office.
    ('Finance Office', 'finance', true, true, true, false, 'school'),
    ('Finance Office', 'payments', true, true, true, false, 'school'),
    ('Finance Office', 'users', false, true, false, false, 'school'),

    -- Guidance and discipline.
    ('Guidance Office', 'users', false, true, false, false, 'school'),
    ('Guidance Office', 'attendance', false, true, false, false, 'school'),
    ('Guidance Office', 'discipline', true, true, true, false, 'school'),
    ('Guidance Office', 'messages', true, true, true, false, 'school'),
    ('Discipline Management', 'users', false, true, false, false, 'school'),
    ('Discipline Management', 'attendance', false, true, false, false, 'school'),
    ('Discipline Management', 'discipline', true, true, true, false, 'school'),
    ('Discipline Management', 'messages', true, true, true, false, 'school'),

    -- ICT: account support, settings, sessions, audit visibility.
    ('ICT Administration', 'users', true, true, true, false, 'school'),
    ('ICT Administration', 'settings', true, true, true, false, 'school'),
    ('ICT Administration', 'sessions', true, true, true, true, 'school'),
    ('ICT Administration', 'audit', false, true, false, false, 'school'),

    -- Registrar: admissions and biodata, not academic/finance writes.
    ('Admissions & Registrar', 'users', true, true, true, false, 'school'),
    ('Admissions & Registrar', 'classes', false, true, false, false, 'school'),
    ('Admissions & Registrar', 'attendance', false, true, false, false, 'school'),
    ('Admissions & Registrar', 'grades', false, true, false, false, 'school'),
    ('Admissions & Registrar', 'messages', true, true, true, false, 'school'),
    ('Admissions & Registrar', 'notifications', true, true, true, false, 'school'),

    -- Academic Admin: academic setup and delivery structures.
    ('Academic Administration', 'users', false, true, false, false, 'school'),
    ('Academic Administration', 'classes', true, true, true, false, 'school'),
    ('Academic Administration', 'subjects', true, true, true, false, 'school'),
    ('Academic Administration', 'attendance', false, true, false, false, 'school'),
    ('Academic Administration', 'grades', true, true, true, false, 'school'),
    ('Academic Administration', 'assignments', true, true, true, false, 'school'),
    ('Academic Administration', 'timetable', true, true, true, false, 'school'),
    ('Academic Administration', 'grading_scales', true, true, true, false, 'school'),
    ('Academic Administration', 'academic_years', true, true, true, false, 'school'),
    ('Academic Administration', 'terms', true, true, true, false, 'school'),

    -- HR and teachers.
    ('Human Resources', 'users', true, true, true, false, 'school'),
    ('Human Resources', 'attendance', false, true, false, false, 'department'),
    ('Teaching', 'attendance', true, true, true, false, 'own'),
    ('Teaching', 'grades', true, true, true, false, 'own'),
    ('Teaching', 'assignments', true, true, true, false, 'own'),
    ('Teaching', 'users', false, true, false, false, 'department')
)
insert into public.permission_features (
  school_id,
  group_id,
  feature_key,
  can_create,
  can_read,
  can_update,
  can_delete,
  scope
)
select
  pg.school_id,
  pg.id,
  fs.feature_key,
  fs.can_create,
  fs.can_read,
  fs.can_update,
  fs.can_delete,
  fs.scope
from public.permission_groups pg
join feature_seed fs on fs.group_name = pg.name
on conflict (group_id, feature_key) do update
set
  school_id = excluded.school_id,
  can_create = excluded.can_create,
  can_read = excluded.can_read,
  can_update = excluded.can_update,
  can_delete = excluded.can_delete,
  scope = excluded.scope;
