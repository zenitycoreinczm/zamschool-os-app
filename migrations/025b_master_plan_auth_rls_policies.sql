-- Migration 025: RLS policies for tables introduced/hardened in 024_master_plan_auth_hardening.
-- 024 enables RLS on these tables; policies were defined in 023 but are not applied on live DB.
-- staff_invitations is excluded here (live DB already has manage/select policies).

-- Permission groups: admins manage, all school staff read
DROP POLICY IF EXISTS permission_groups_school_access ON public.permission_groups;
CREATE POLICY permission_groups_school_access ON public.permission_groups
    FOR ALL TO authenticated
    USING (school_id = public.get_my_school_id() AND public.is_admin_role())
    WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS permission_groups_staff_read ON public.permission_groups;
CREATE POLICY permission_groups_staff_read ON public.permission_groups
    FOR SELECT TO authenticated
    USING (school_id = public.get_my_school_id());

-- Permission group roles
DROP POLICY IF EXISTS permission_group_roles_school_access ON public.permission_group_roles;
CREATE POLICY permission_group_roles_school_access ON public.permission_group_roles
    FOR ALL TO authenticated
    USING (school_id = public.get_my_school_id() AND public.is_admin_role())
    WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS permission_group_roles_staff_read ON public.permission_group_roles;
CREATE POLICY permission_group_roles_staff_read ON public.permission_group_roles
    FOR SELECT TO authenticated
    USING (school_id = public.get_my_school_id());

-- Permission features
DROP POLICY IF EXISTS permission_features_school_access ON public.permission_features;
CREATE POLICY permission_features_school_access ON public.permission_features
    FOR ALL TO authenticated
    USING (school_id = public.get_my_school_id() AND public.is_admin_role())
    WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS permission_features_staff_read ON public.permission_features;
CREATE POLICY permission_features_staff_read ON public.permission_features
    FOR SELECT TO authenticated
    USING (school_id = public.get_my_school_id());

-- User sessions: own profile sessions + admins view school sessions
DROP POLICY IF EXISTS user_sessions_self ON public.user_sessions;
CREATE POLICY user_sessions_self ON public.user_sessions
    FOR ALL TO authenticated
    USING (
      user_id IN (
        SELECT id FROM public.profiles
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
    WITH CHECK (
      user_id IN (
        SELECT id FROM public.profiles
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS user_sessions_admin_view ON public.user_sessions;
CREATE POLICY user_sessions_admin_view ON public.user_sessions
    FOR SELECT TO authenticated
    USING (school_id = public.get_my_school_id() AND public.is_admin_role());

-- School departments
DROP POLICY IF EXISTS school_departments_school_access ON public.school_departments;
CREATE POLICY school_departments_school_access ON public.school_departments
    FOR ALL TO authenticated
    USING (school_id = public.get_my_school_id() AND public.is_admin_role())
    WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS school_departments_staff_read ON public.school_departments;
CREATE POLICY school_departments_staff_read ON public.school_departments
    FOR SELECT TO authenticated
    USING (school_id = public.get_my_school_id());

-- School settings
DROP POLICY IF EXISTS school_settings_school_access ON public.school_settings;
CREATE POLICY school_settings_school_access ON public.school_settings
    FOR ALL TO authenticated
    USING (school_id = public.get_my_school_id() AND public.is_admin_role())
    WITH CHECK (school_id = public.get_my_school_id() AND public.is_admin_role());

DROP POLICY IF EXISTS school_settings_staff_read ON public.school_settings;
CREATE POLICY school_settings_staff_read ON public.school_settings
    FOR SELECT TO authenticated
    USING (school_id = public.get_my_school_id());
