-- Óptica AR Vision - Supabase schema para GitHub Pages
-- Ejecutar en Supabase SQL Editor.
-- IMPORTANTE: estas policies son para DEMO comercial pública.
-- Para producción, usa Supabase Auth y restringe INSERT/UPDATE/DELETE a usuarios administradores.

create extension if not exists "pgcrypto";

create table if not exists public.glasses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  original_image_url text,
  processed_image_url text,
  is_active boolean default true,
  offset_x numeric default 0,
  offset_y numeric default 0,
  scale numeric default 1,
  rotation numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.glasses enable row level security;

-- Permite leer catálogo público.
drop policy if exists "Public read glasses" on public.glasses;
create policy "Public read glasses"
on public.glasses for select
to anon, authenticated
using (true);

-- DEMO: permite insertar desde GitHub Pages.
drop policy if exists "Demo insert glasses" on public.glasses;
create policy "Demo insert glasses"
on public.glasses for insert
to anon, authenticated
with check (true);

-- DEMO: permite actualizar estado/nombre/categoría desde el panel admin frontend.
drop policy if exists "Demo update glasses" on public.glasses;
create policy "Demo update glasses"
on public.glasses for update
to anon, authenticated
using (true)
with check (true);

-- DEMO: permite eliminar desde el panel admin frontend.
drop policy if exists "Demo delete glasses" on public.glasses;
create policy "Demo delete glasses"
on public.glasses for delete
to anon, authenticated
using (true);

-- Crear bucket público para imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'glasses-designs',
  'glasses-designs',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Permite ver imágenes del bucket.
drop policy if exists "Public read glasses images" on storage.objects;
create policy "Public read glasses images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'glasses-designs');

-- DEMO: permite subir imágenes desde la web.
drop policy if exists "Demo upload glasses images" on storage.objects;
create policy "Demo upload glasses images"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'glasses-designs');

-- DEMO: permite reemplazar imágenes.
drop policy if exists "Demo update glasses images" on storage.objects;
create policy "Demo update glasses images"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'glasses-designs')
with check (bucket_id = 'glasses-designs');

-- DEMO: permite eliminar imágenes.
drop policy if exists "Demo delete glasses images" on storage.objects;
create policy "Demo delete glasses images"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'glasses-designs');

-- Datos de ejemplo opcionales. Descomenta si quieres registros iniciales.
-- insert into public.glasses (name, category, original_image_url, processed_image_url, is_active)
-- values ('Demo lente óptico', 'Ópticos', '', '', true);
