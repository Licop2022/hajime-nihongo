-- Each account owns two independent, revisioned progress documents.
begin;

create table if not exists public.hajime_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null check (namespace in ('study', 'real')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, namespace),
  check (octet_length(payload::text) <= 2097152)
);

alter table public.hajime_progress enable row level security;

create policy hajime_read_own_progress on public.hajime_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create policy hajime_insert_own_progress on public.hajime_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy hajime_update_own_progress on public.hajime_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Application writes use the revision-checked RPC; RLS also covers direct Data API calls.
revoke all on public.hajime_progress from anon, authenticated;
grant select, insert, update on public.hajime_progress to authenticated;

create or replace function public.hajime_save_progress(
  p_namespace text,
  p_payload jsonb,
  p_expected_revision bigint
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.hajime_progress;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_namespace is null or p_namespace not in ('study', 'real') or
     p_payload is null or jsonb_typeof(p_payload) <> 'object' or
     octet_length(p_payload::text) > 2097152 or
     p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid progress document' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    insert into public.hajime_progress (user_id, namespace, payload)
      values (v_user, p_namespace, p_payload)
      on conflict (user_id, namespace) do nothing
      returning * into v_row;
    if found then
      return jsonb_build_object('accepted', true, 'document', to_jsonb(v_row));
    end if;
  else
    update public.hajime_progress
      set payload = p_payload, revision = revision + 1, updated_at = now()
      where user_id = v_user and namespace = p_namespace
        and revision = p_expected_revision
      returning * into v_row;
    if found then
      return jsonb_build_object('accepted', true, 'document', to_jsonb(v_row));
    end if;
  end if;

  select * into v_row from public.hajime_progress
    where user_id = v_user and namespace = p_namespace;
  return jsonb_build_object('accepted', false,
    'document', case when found then to_jsonb(v_row) else null end);
end;
$$;

revoke all on function public.hajime_save_progress(text, jsonb, bigint) from public, anon;
grant execute on function public.hajime_save_progress(text, jsonb, bigint) to authenticated;

commit;
