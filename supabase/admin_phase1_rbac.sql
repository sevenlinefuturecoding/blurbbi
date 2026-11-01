-- =============================================================================
-- Blurbbi Phase 1: Private Admin Architecture & Multi-Role RBAC Migration
-- =============================================================================

-- 1. ADMIN INVITATIONS TABLE (Expiring single-use invitation tokens)
create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.profiles(id),
  role_id text not null references public.admin_roles(id),
  invited_by uuid not null references public.profiles(id),
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

-- Performance Indexes
create index if not exists admin_invitations_token_idx on public.admin_invitations (token);
create index if not exists admin_invitations_email_idx on public.admin_invitations (lower(email));
create index if not exists admin_invitations_status_idx on public.admin_invitations (status, expires_at);

-- 2. ROW-LEVEL SECURITY FOR INVITATIONS
alter table public.admin_invitations enable row level security;

-- Admins with roles.manage can view invitations
create policy "admin_invitations_select" on public.admin_invitations for select
  to authenticated
  using (
    public.has_admin_permission('roles.manage')
    or (auth.uid() = user_id)
  );

-- Direct client insert/update/delete disabled: managed exclusively via SECURITY DEFINER RPCs

-- 3. INVITATION RPC FUNCTIONS

-- A. Create Invitation
create or replace function public.admin_create_invitation(
  p_email text,
  p_role_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_token text;
  v_invitation public.admin_invitations%rowtype;
begin
  if not public.has_admin_permission('roles.manage', v_admin_id) then
    raise exception 'Unauthorized: Only Super Administrators can invite admin personnel';
  end if;

  if not exists (select 1 from public.admin_roles where id = p_role_id) then
    raise exception 'Invalid admin role: %', p_role_id;
  end if;

  -- Generate cryptographically random token (48 chars hex)
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.admin_invitations (
    email, role_id, invited_by, token, expires_at, status
  ) values (
    lower(trim(p_email)),
    p_role_id,
    v_admin_id,
    v_token,
    now() + interval '7 days',
    'pending'
  )
  returning * into v_invitation;

  -- Log action into audit trail
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_admin_id,
    'admin_invite_create',
    'role',
    v_invitation.id::text,
    'Invited ' || p_email || ' as ' || p_role_id,
    jsonb_build_object('email', p_email, 'role_id', p_role_id, 'expires_at', v_invitation.expires_at)
  );

  return to_jsonb(v_invitation);
end;
$$;

-- B. Accept Invitation
create or replace function public.admin_accept_invitation(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.admin_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required to accept an administrative invitation';
  end if;

  select * into v_invitation
  from public.admin_invitations
  where token = p_token and status = 'pending';

  if not found then
    raise exception 'Invalid or consumed invitation token';
  end if;

  if v_invitation.expires_at < now() then
    update public.admin_invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'This administrative invitation has expired';
  end if;

  -- Assign user role
  insert into public.admin_user_roles (user_id, role_id, assigned_by)
  values (v_user_id, v_invitation.role_id, v_invitation.invited_by)
  on conflict (user_id, role_id) do nothing;

  -- Flag profile as admin
  update public.profiles set is_admin = true where id = v_user_id;

  -- Mark invitation as accepted
  update public.admin_invitations set
    status = 'accepted',
    accepted_at = now(),
    user_id = v_user_id
  where id = v_invitation.id;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_user_id,
    'admin_invite_accept',
    'role',
    v_invitation.id::text,
    'Accepted invitation for role ' || v_invitation.role_id,
    jsonb_build_object('role_id', v_invitation.role_id, 'invited_by', v_invitation.invited_by)
  );

  return jsonb_build_object(
    'success', true,
    'role_id', v_invitation.role_id,
    'user_id', v_user_id
  );
end;
$$;

-- C. Revoke Invitation
create or replace function public.admin_revoke_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_invitation public.admin_invitations%rowtype;
begin
  if not public.has_admin_permission('roles.manage', v_admin_id) then
    raise exception 'Unauthorized: Only Super Administrators can revoke invitations';
  end if;

  select * into v_invitation from public.admin_invitations where id = p_invitation_id;
  if not found then
    raise exception 'Invitation not found';
  end if;

  update public.admin_invitations set
    status = 'revoked',
    revoked_at = now()
  where id = p_invitation_id;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_admin_id,
    'admin_invite_revoke',
    'role',
    p_invitation_id::text,
    'Revoked invitation for ' || v_invitation.email,
    jsonb_build_object('email', v_invitation.email, 'role_id', v_invitation.role_id)
  );
end;
$$;

-- D. Record Admin Login Event
create or replace function public.admin_record_login(
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_role text;
begin
  if v_admin_id is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.get_admin_role(v_admin_id);
  if v_role is null then
    raise exception 'Unauthorized: User is not an authorized administrator';
  end if;

  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_admin_id,
    'admin_login',
    'user',
    v_admin_id::text,
    'Administrative login verified with role: ' || v_role,
    p_metadata
  );
end;
$$;

-- 4. FUNCTION EXECUTION GRANTS
grant execute on function public.admin_create_invitation(text, text) to authenticated;
grant execute on function public.admin_accept_invitation(text) to authenticated;
grant execute on function public.admin_revoke_invitation(uuid) to authenticated;
grant execute on function public.admin_record_login(jsonb) to authenticated;

