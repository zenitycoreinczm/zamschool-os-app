-- Update registrar permission_features for the 'classes' feature to allow
-- update (can_update = true).  Registrars need to assign students to classes
-- and link teachers as class teachers / subject teachers — these are
-- registration operations, not class creation/deletion.  can_create and
-- can_delete remain false so registrars cannot create or delete classes.
UPDATE permission_features pf
SET can_update = true
FROM permission_group_roles pgr
JOIN permission_groups pg ON pg.id = pgr.group_id
WHERE pf.group_id = pgr.group_id
  AND pg.school_id = pgr.school_id
  AND lower(pgr.role) = 'registrar'
  AND pf.feature_key = 'classes'
  AND pf.can_read = true
  AND pf.can_create = false
  AND pf.can_delete = false;
