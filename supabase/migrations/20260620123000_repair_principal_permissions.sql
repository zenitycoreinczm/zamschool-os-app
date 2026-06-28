update public.permission_features pf
set
  can_create = true,
  can_read = true,
  can_update = true,
  can_delete = case
    when pf.feature_key in (
      'attendance',
      'grading_scales',
      'academic_years',
      'terms',
      'settings',
      'announcements',
      'messages',
      'notifications'
    ) then false
    else true
  end,
  scope = 'school'
from public.permission_groups pg
join public.permission_group_roles pgr
  on pgr.group_id = pg.id
 and pgr.school_id = pg.school_id
where pf.group_id = pg.id
  and pf.school_id = pg.school_id
  and pg.name = 'Head Teacher Authority'
  and pgr.role = 'principal'
  and pf.feature_key in (
    'users',
    'classes',
    'subjects',
    'attendance',
    'grades',
    'assignments',
    'timetable',
    'grading_scales',
    'academic_years',
    'terms',
    'settings',
    'announcements',
    'messages',
    'notifications',
    'finance',
    'payments',
    'audit',
    'overrides'
  );

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
  seed.feature_key,
  true,
  true,
  true,
  seed.can_delete,
  'school'
from public.permission_groups pg
join public.permission_group_roles pgr
  on pgr.group_id = pg.id
 and pgr.school_id = pg.school_id
cross join (
  values
    ('assignments', true),
    ('finance', true),
    ('payments', true)
) as seed(feature_key, can_delete)
where pg.name = 'Head Teacher Authority'
  and pgr.role = 'principal'
  and not exists (
    select 1
    from public.permission_features existing
    where existing.school_id = pg.school_id
      and existing.group_id = pg.id
      and existing.feature_key = seed.feature_key
  );
