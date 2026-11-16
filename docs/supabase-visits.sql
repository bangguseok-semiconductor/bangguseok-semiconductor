-- 방구석 반도체 · 방문 기록 (소속 · 닉네임)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run.
-- 맨 아래 '관리자 비밀번호'만 원하는 값으로 바꿔 주세요.

create extension if not exists pgcrypto with schema extensions;

-- 1) 방문 기록 표: 누구나 '추가'만 할 수 있고, 읽기는 막아요
create table if not exists public.visits (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  organization text check (char_length(organization) <= 60),
  nickname    text not null check (char_length(nickname) between 1 and 30),
  user_agent  text check (char_length(user_agent) <= 300)
);
alter table public.visits enable row level security;
drop policy if exists "visitors can add a visit" on public.visits;
create policy "visitors can add a visit" on public.visits for insert to anon with check (true);
-- select 정책이 없으므로 사이트(anon 키)로는 기록을 읽을 수 없어요.
grant usage on schema public to anon;
grant insert on public.visits to anon;
revoke select, update, delete on public.visits from anon;

-- 2) 관리자 비밀번호: 공개되지 않는 private 스키마에 해시로만 저장
create schema if not exists private;
create table if not exists private.admin (pass_hash text not null);
revoke all on schema private from anon, authenticated;

-- 3) 관리자 페이지가 부르는 함수: 비밀번호가 맞을 때만 기록을 돌려줘요
create or replace function public.admin_visits(pass text)
returns setof public.visits
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if not exists (select 1 from private.admin where pass_hash = extensions.crypt(pass, pass_hash)) then
    perform pg_sleep(0.6);
    raise exception 'denied' using errcode = '28000';
  end if;
  return query select * from public.visits order by created_at desc limit 5000;
end $$;
revoke all on function public.admin_visits(text) from public;
grant execute on function public.admin_visits(text) to anon;

-- 4) 관리자 비밀번호 정하기 (작은따옴표 안을 바꾸세요)
delete from private.admin;
insert into private.admin (pass_hash) values (extensions.crypt('여기에-관리자-비밀번호', extensions.gen_salt('bf')));
