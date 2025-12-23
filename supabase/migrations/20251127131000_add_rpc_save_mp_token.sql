create or replace function public.save_mp_token(token text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.mercado_pago_config (user_id, access_token)
  values (auth.uid(), token)
  on conflict (user_id) do update
    set access_token = excluded.access_token,
        updated_at = now();
end;
$$;

grant execute on function public.save_mp_token(token text) to authenticated;
