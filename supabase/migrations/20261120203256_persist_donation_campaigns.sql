-- As campanhas passam a ter uma fonte compartilhada entre os aparelhos.
-- Esta migração não modifica buckets, políticas ou tabelas já existentes.
create table public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  subtitle text not null default '',
  description text not null default '',
  image_path text,
  asset_key text,
  created_at timestamptz not null default now(),
  constraint donation_campaigns_image_source_check check (
    (image_path is not null and btrim(image_path) <> '' and asset_key is null)
    or (image_path is null and asset_key is not null and asset_key in ('agasalho-1', 'agasalho-2'))
  ),
  constraint donation_campaigns_image_path_check check (
    image_path is null
    or image_path ~ ('^donations/' || id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif|heic|heif|bmp)$')
  )
);

alter table public.donation_campaigns enable row level security;

revoke all on public.donation_campaigns from public, anon, authenticated;
grant select on public.donation_campaigns to anon, authenticated;
grant insert, update, delete on public.donation_campaigns to authenticated;

create policy public_can_view_donation_campaigns
  on public.donation_campaigns for select
  to anon, authenticated using (true);

-- Segue o modelo atual do projeto: somente a conta administrativa autentica.
create policy admin_can_insert_donation_campaigns
  on public.donation_campaigns for insert
  to authenticated with check (true);

create policy admin_can_update_donation_campaigns
  on public.donation_campaigns for update
  to authenticated using (true) with check (true);

create policy admin_can_delete_donation_campaigns
  on public.donation_campaigns for delete
  to authenticated using (true);

-- Os banners já distribuídos com o aplicativo são cadastrados uma única vez.
-- A leitura da tela não recria estas linhas quando o administrador as excluir.
insert into public.donation_campaigns (title, subtitle, description, asset_key)
values
  ('campanha do AGASALHO', 'O FRIO NÃO ESPERA', 'AQUEÇA O INVERNO DE QUEM PRECISA', 'agasalho-1'),
  ('campanha do AGASALHO', 'O FRIO NÃO ESPERA', 'AQUEÇA O INVERNO DE QUEM PRECISA', 'agasalho-2');
