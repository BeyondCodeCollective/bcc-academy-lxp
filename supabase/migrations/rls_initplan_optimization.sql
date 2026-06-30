-- Wrap auth.uid() / auth.role() in scalar subselects inside RLS policies so
-- Postgres evaluates them ONCE per query instead of once per row. Flagged by
-- the Supabase performance advisor (auth_rls_initplan) on 37 policies — a major
-- query-cost win at scale, no behavior change (the subselect returns the same
-- value). Uses ALTER POLICY so policies are never dropped (no access gap).
-- Idempotent: skips policies already wrapped (case-insensitive guard).

do $$
declare r record;
begin
  for r in
    select format(
      'alter policy %I on %I.%I%s%s;',
      policyname, schemaname, tablename,
      coalesce(' using (' || replace(replace(qual, 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())') || ')', ''),
      coalesce(' with check (' || replace(replace(with_check, 'auth.uid()', '(select auth.uid())'), 'auth.role()', '(select auth.role())') || ')', '')
    ) as ddl
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.(uid|role)\(\)' or with_check ~ 'auth\.(uid|role)\(\)')
      and not (coalesce(qual,'') ~* 'select\s+auth\.' or coalesce(with_check,'') ~* 'select\s+auth\.')
  loop
    execute r.ddl;
  end loop;
end $$;
