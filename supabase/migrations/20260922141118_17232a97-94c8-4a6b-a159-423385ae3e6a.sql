
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_approved_host(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.has_access(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_host(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_access(uuid, uuid) TO authenticated;
