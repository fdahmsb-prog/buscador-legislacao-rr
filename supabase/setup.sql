-- =====================================================================
-- Buscador de Legislação Tributária – SEFAZ-RR
-- Banco compartilhado do app (Supabase). Rode UMA VEZ no SQL Editor.
-- Leitura: pública (é legislação). Gravação: só e-mails da tabela "editores".
-- =====================================================================

-- 1) Quem pode incluir/alterar normas (você adiciona os e-mails aqui)
create table if not exists public.editores (
  email text primary key,
  nome  text
);
alter table public.editores enable row level security;   -- sem políticas: só o painel do Supabase mexe

-- 2) Nome de quem cadastrou (preenchido pelo app no login)
create table if not exists public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nome       text,
  atualizado timestamptz default now()
);
alter table public.perfis enable row level security;

-- 3) Normas cadastradas pela equipe e ajustes (link/PDF) das normas da base
create table if not exists public.normas_equipe (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  autor      uuid default auth.uid()
);
create table if not exists public.ajustes_normas (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  autor      uuid default auth.uid()
);
alter table public.normas_equipe  enable row level security;
alter table public.ajustes_normas enable row level security;

-- 4) Função: o usuário logado é editor?
create or replace function public.eh_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editores
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.eh_editor() to anon, authenticated;

-- 5) Políticas
drop policy if exists "ler normas"      on public.normas_equipe;
drop policy if exists "editar normas"   on public.normas_equipe;
drop policy if exists "ler ajustes"     on public.ajustes_normas;
drop policy if exists "editar ajustes"  on public.ajustes_normas;
drop policy if exists "ler perfis"      on public.perfis;
drop policy if exists "proprio perfil"  on public.perfis;

create policy "ler normas"     on public.normas_equipe  for select using (true);
create policy "editar normas"  on public.normas_equipe  for all    to authenticated using (public.eh_editor()) with check (public.eh_editor());
create policy "ler ajustes"    on public.ajustes_normas for select using (true);
create policy "editar ajustes" on public.ajustes_normas for all    to authenticated using (public.eh_editor()) with check (public.eh_editor());
create policy "ler perfis"     on public.perfis for select using (true);
create policy "proprio perfil" on public.perfis for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 6) Pasta dos PDFs (leitura pública; envio só por editores; até 50 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', true, 52428800, array['application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists "editores enviam pdf"  on storage.objects;
drop policy if exists "editores alteram pdf" on storage.objects;
drop policy if exists "editores apagam pdf"  on storage.objects;
create policy "editores enviam pdf"  on storage.objects for insert to authenticated with check (bucket_id = 'pdfs' and public.eh_editor());
create policy "editores alteram pdf" on storage.objects for update to authenticated using (bucket_id = 'pdfs' and public.eh_editor());
create policy "editores apagam pdf"  on storage.objects for delete to authenticated using (bucket_id = 'pdfs' and public.eh_editor());

-- 7) Primeiro editor: TROQUE pelo seu e-mail antes de rodar
insert into public.editores (email, nome) values ('fdahmsb@gmail.com', 'Francisco Alves')
on conflict (email) do nothing;

-- Para autorizar outro auditor depois (Table Editor → editores → Insert row), ou:
-- insert into public.editores (email, nome) values ('auditor@exemplo.com', 'Nome do Auditor');
