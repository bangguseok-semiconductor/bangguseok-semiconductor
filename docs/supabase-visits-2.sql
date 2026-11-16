-- 방구석 반도체 · 방문 기록 2단계: 닉네임 중복 막기 + 관리자 삭제
-- (supabase-visits.sql 을 먼저 실행한 뒤 SQL Editor 에서 실행)

-- 1) 브라우저마다 만드는 임의 ID: 같은 브라우저는 같은 닉네임으로 다시 들어올 수 있어요
alter table public.visits add column if not exists client_id uuid;

-- 2) 사이트는 이제 표에 직접 쓰지 않고 claim_visit 함수만 써요
drop policy if exists "visitors can add a visit" on public.visits;
revoke insert on public.visits from anon;

create or replace function public.claim_visit(p_org text, p_nick text, p_ua text, p_client uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare n text := btrim(coalesce(p_nick, ''));
begin
  if char_length(n) < 1 or char_length(n) > 30 then return 'invalid'; end if;
  -- 다른 브라우저가 이미 쓴 닉네임이면(대소문자·앞뒤 공백 무시) 거절
  if exists (select 1 from public.visits where lower(btrim(nickname)) = lower(n) and client_id is distinct from p_client) then
    return 'taken';
  end if;
  insert into public.visits (organization, nickname, user_agent, client_id)
  values (nullif(left(btrim(coalesce(p_org, '')), 60), ''), n, left(p_ua, 300), p_client);
  return 'ok';
end $$;
revoke all on function public.claim_visit(text, text, text, uuid) from public;
grant execute on function public.claim_visit(text, text, text, uuid) to anon;

-- 3) 관리자: 고른 기록 지우기 (비밀번호 확인)
create or replace function public.admin_delete_visits(pass text, ids bigint[])
returns integer
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare c integer;
begin
  if not exists (select 1 from private.admin where pass_hash = extensions.crypt(pass, pass_hash)) then
    perform pg_sleep(0.6);
    raise exception 'denied' using errcode = '28000';
  end if;
  delete from public.visits where id = any(ids);
  get diagnostics c = row_count;
  return c;
end $$;
revoke all on function public.admin_delete_visits(text, bigint[]) from public;
grant execute on function public.admin_delete_visits(text, bigint[]) to anon;
