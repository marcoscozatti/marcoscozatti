-- =========================================================================
-- Marcos Cozatti — schema Supabase
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Administradores (quem pode logar no painel /admin)
-- -------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------------------
-- Configurações gerais do site (linha única, id = 1)
-- -------------------------------------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1,
  company_name text not null default 'Marcos Cozatti',
  logo_url text,
  favicon_url text,
  font_family text not null default 'Inter',
  heading_font_family text not null default 'Playfair Display',
  font_size_base int not null default 16,
  accent_color text not null default '#1F9E8B',
  slide_interval_ms int not null default 5000,
  default_lang text not null default 'pt',
  enabled_languages jsonb not null default '["pt"]'::jsonb,
  contact_recipient_email text,
  phone text,
  whatsapp text,
  footer_email text,
  address text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.site_settings (id) values (1)
  on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- Slides do topo (hero) — usados na home
-- -------------------------------------------------------------------------
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  order_index int not null default 0,
  image_url text,
  title_pt text,
  title_en text,
  title_es text,
  subtitle_pt text,
  subtitle_en text,
  subtitle_es text,
  cta_text_pt text,
  cta_text_en text,
  cta_text_es text,
  cta_link text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Áreas — páginas próprias (ex: Serviços, Fotografia, Drones), acessadas
-- em /area.html?slug=SLUG (e por URLs amigáveis via netlify.toml)
-- -------------------------------------------------------------------------
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  order_index int not null default 0,
  icon text default 'star',
  cover_image text,
  title_pt text,
  title_en text,
  title_es text,
  subtitle_pt text,
  subtitle_en text,
  subtitle_es text,
  description_md_pt text,
  description_md_en text,
  description_md_es text,
  gallery jsonb not null default '[]'::jsonb,
  cta_text_pt text,
  cta_text_en text,
  cta_text_es text,
  cta_link text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Vídeos — destaques do canal do YouTube, exibidos em /videos.html
-- -------------------------------------------------------------------------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  order_index int not null default 0,
  youtube_id text not null,
  title_pt text,
  title_en text,
  title_es text,
  description_pt text,
  description_en text,
  description_es text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Linha do tempo / Sobre — trajetória acadêmica e profissional
-- -------------------------------------------------------------------------
create table if not exists public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  order_index int not null default 0,
  image_url text,
  date_label_pt text,
  date_label_en text,
  date_label_es text,
  title_pt text,
  title_en text,
  title_es text,
  description_pt text,
  description_en text,
  description_es text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Depoimentos
-- -------------------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  order_index int not null default 0,
  photo_url text,
  name text not null,
  role_pt text,
  role_en text,
  role_es text,
  quote_pt text,
  quote_en text,
  quote_es text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Blog — listagem em /blog.html, post individual em /post.html?slug=SLUG
-- -------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  cover_image text,
  title_pt text,
  title_en text,
  title_es text,
  excerpt_pt text,
  excerpt_en text,
  excerpt_es text,
  content_md_pt text,
  content_md_en text,
  content_md_es text,
  published_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Redes sociais
-- -------------------------------------------------------------------------
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Mensagens de contato
-- -------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.site_settings enable row level security;
alter table public.hero_slides enable row level security;
alter table public.areas enable row level security;
alter table public.videos enable row level security;
alter table public.timeline_items enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_posts enable row level security;
alter table public.social_links enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admins enable row level security;

-- site_settings: leitura pública, escrita só admin
drop policy if exists "settings_select_public" on public.site_settings;
create policy "settings_select_public" on public.site_settings
  for select using (true);

drop policy if exists "settings_update_admin" on public.site_settings;
create policy "settings_update_admin" on public.site_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- hero_slides
drop policy if exists "hero_select_public" on public.hero_slides;
create policy "hero_select_public" on public.hero_slides
  for select using (active = true or public.is_admin());

drop policy if exists "hero_write_admin" on public.hero_slides;
create policy "hero_write_admin" on public.hero_slides
  for all using (public.is_admin()) with check (public.is_admin());

-- areas
drop policy if exists "areas_select_public" on public.areas;
create policy "areas_select_public" on public.areas
  for select using (active = true or public.is_admin());

drop policy if exists "areas_write_admin" on public.areas;
create policy "areas_write_admin" on public.areas
  for all using (public.is_admin()) with check (public.is_admin());

-- videos
drop policy if exists "videos_select_public" on public.videos;
create policy "videos_select_public" on public.videos
  for select using (active = true or public.is_admin());

drop policy if exists "videos_write_admin" on public.videos;
create policy "videos_write_admin" on public.videos
  for all using (public.is_admin()) with check (public.is_admin());

-- timeline_items
drop policy if exists "timeline_select_public" on public.timeline_items;
create policy "timeline_select_public" on public.timeline_items
  for select using (active = true or public.is_admin());

drop policy if exists "timeline_write_admin" on public.timeline_items;
create policy "timeline_write_admin" on public.timeline_items
  for all using (public.is_admin()) with check (public.is_admin());

-- testimonials
drop policy if exists "testimonials_select_public" on public.testimonials;
create policy "testimonials_select_public" on public.testimonials
  for select using (active = true or public.is_admin());

drop policy if exists "testimonials_write_admin" on public.testimonials;
create policy "testimonials_write_admin" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- blog_posts
drop policy if exists "blog_select_public" on public.blog_posts;
create policy "blog_select_public" on public.blog_posts
  for select using (active = true or public.is_admin());

drop policy if exists "blog_write_admin" on public.blog_posts;
create policy "blog_write_admin" on public.blog_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- social_links
drop policy if exists "social_select_public" on public.social_links;
create policy "social_select_public" on public.social_links
  for select using (active = true or public.is_admin());

drop policy if exists "social_write_admin" on public.social_links;
create policy "social_write_admin" on public.social_links
  for all using (public.is_admin()) with check (public.is_admin());

-- contact_messages: qualquer visitante pode inserir; só admin lê/edita/apaga
drop policy if exists "contact_insert_public" on public.contact_messages;
create policy "contact_insert_public" on public.contact_messages
  for insert with check (true);

drop policy if exists "contact_admin_all" on public.contact_messages;
create policy "contact_admin_all" on public.contact_messages
  for select using (public.is_admin());

drop policy if exists "contact_admin_update" on public.contact_messages;
create policy "contact_admin_update" on public.contact_messages
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact_admin_delete" on public.contact_messages;
create policy "contact_admin_delete" on public.contact_messages
  for delete using (public.is_admin());

-- admins: só o próprio admin enxerga a lista (necessário para checagens simples)
drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins
  for select using (public.is_admin());

-- =========================================================================
-- Storage: bucket "media" para logo, imagens de slides/áreas/blog/etc.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- =========================================================================
-- Seed: link do canal do YouTube (edite/apague em /admin > Redes Sociais)
-- =========================================================================
insert into public.social_links (platform, url, order_index)
select 'youtube', 'https://www.youtube.com/@marcoscozatti', 0
where not exists (select 1 from public.social_links where platform = 'youtube');

-- =========================================================================
-- Depois de rodar este script:
-- 1) Crie um usuário em Authentication > Users (email + senha).
-- 2) Copie o UUID desse usuário e rode:
--    insert into public.admins (user_id, name) values ('COLE-O-UUID-AQUI', 'Marcos');
-- 3) (Opcional) Crie as áreas iniciais — pode fazer isso pelo painel /admin
--    em "Áreas", com os slugs: servicos, fotografia, drones.
-- 4) Cadastre seus vídeos em destaque em /admin > Vídeos (basta colar o ID
--    do vídeo do YouTube, ex: em youtube.com/watch?v=ABC123, o ID é ABC123).
-- =========================================================================
