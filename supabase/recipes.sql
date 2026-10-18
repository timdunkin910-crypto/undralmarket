-- undralmarket.mn — "Өнөөдөр юу хийх вэ?" recipe bundles. Run after schema.sql and seed.sql.
-- Prices are never stored here: every ingredient links to a product, whose live price/stock the site reads.

-- ───────────────────────── Tables ─────────────────────────
create table public.recipes (
  id          serial primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(name) between 1 and 80),
  emoji       text not null default '🍲',
  image_url   text,
  category    text not null,                       -- Үндэсний хоол · Шөл · Хуурга · Өглөөний цай · Салат
  time_min    int  not null check (time_min between 1 and 600),
  servings    int  not null default 4 check (servings between 1 and 20),
  difficulty  text not null default 'Амархан' check (difficulty in ('Амархан', 'Дунд', 'Хэцүү')),
  for_kids    boolean not null default false,      -- "Хүүхдэд" filter ("30 минутаас бага" is derived from time_min)
  steps       text[] not null default '{}',
  active      boolean not null default true,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.recipe_items (
  id          serial primary key,
  recipe_id   int  not null references public.recipes(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,   -- null → "Дэлгүүрт байхгүй"
  label       text not null check (length(label) between 1 and 80),
  amount      text not null default '',             -- how much the recipe uses, e.g. "500 гр"
  qty         int  not null default 1 check (qty between 1 and 20),     -- product units added to the cart
  optional    boolean not null default false,
  sort        int  not null default 0
);
create index recipe_items_recipe_idx on public.recipe_items(recipe_id, sort);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.recipes      enable row level security;
alter table public.recipe_items enable row level security;

create policy recipes_read on public.recipes for select using (active or is_staff());
create policy recipes_write on public.recipes for all using (is_staff()) with check (is_staff());
create policy recipe_items_read on public.recipe_items for select
  using (exists (select 1 from public.recipes r where r.id = recipe_id and (r.active or is_staff())));
create policy recipe_items_write on public.recipe_items for all using (is_staff()) with check (is_staff());

-- Admin save: recipe + its ingredient list in one transaction (RLS still applies — security invoker)
create or replace function public.save_recipe(p jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare
  rid int := (p->>'id')::int;
begin
  if not is_staff() then raise exception 'FORBIDDEN'; end if;
  if rid is null then
    insert into recipes (slug, name, emoji, image_url, category, time_min, servings, difficulty, for_kids, steps, active, sort)
    values (p->>'slug', p->>'name', p->>'emoji', p->>'image_url', p->>'category', (p->>'time_min')::int,
            (p->>'servings')::int, p->>'difficulty', (p->>'for_kids')::boolean,
            array(select jsonb_array_elements_text(p->'steps')), (p->>'active')::boolean,
            coalesce((select max(sort) from recipes), 0) + 1)
    returning id into rid;
  else
    update recipes set slug = p->>'slug', name = p->>'name', emoji = p->>'emoji', image_url = p->>'image_url',
      category = p->>'category', time_min = (p->>'time_min')::int, servings = (p->>'servings')::int,
      difficulty = p->>'difficulty', for_kids = (p->>'for_kids')::boolean,
      steps = array(select jsonb_array_elements_text(p->'steps')), active = (p->>'active')::boolean
    where id = rid;
    if not found then raise exception 'NOT_FOUND'; end if;
    delete from recipe_items where recipe_id = rid;
  end if;

  insert into recipe_items (recipe_id, product_id, label, amount, qty, optional, sort)
  select rid, (x->>'product_id')::uuid, x->>'label', x->>'amount', (x->>'qty')::int, (x->>'optional')::boolean, ord
  from jsonb_array_elements(p->'items') with ordinality as t(x, ord);
  return rid;
end $$;
revoke execute on function public.save_recipe(jsonb) from public, anon;
grant execute on function public.save_recipe(jsonb) to authenticated;

-- ───────────────────────── Seed: 16 recipes ─────────────────────────
insert into public.recipes (slug, name, emoji, category, time_min, servings, difficulty, for_kids, sort, steps) values
('buuz', 'Бууз', '🥟', 'Үндэсний хоол', 90, 4, 'Хэцүү', false, 1, array[
  'Гурилаа бага зэрэг давс нэмсэн бүлээн усаар зуурч, 20 минут амраана.',
  'Махаа татаж, жижиглэсэн сонгино, сармис, давс, 3–4 халбага ус нэмээд сайн хольно.',
  'Зуурмагаа жижиг бөөрөнхийлж, гурав орчим см диаметртэй нимгэн хуудас элдэнэ.',
  'Хуудас бүрт нэг халбага хачир хийж, оройд нь жижиг нүх үлдээн хуниасаар нь чимхэж боогоорой.',
  'Тосолсон жигнүүрт өрж, буцалж буй усан дээр 20–25 минут жигнэнэ.']),
('khuushuur', 'Хуушуур', '🫓', 'Үндэсний хоол', 60, 4, 'Дунд', false, 2, array[
  'Гурилаа хүйтэн усаар хатуувтар зуурч, 15 минут амраана.',
  'Махаа татаж, жижиглэсэн сонгино, давс, бага зэрэг ус нэмж хольно.',
  'Зуурмагаа бөөрөнхийлөн дугуй хуудас элдээд, хагаст нь хачир тавина.',
  'Хуудсаа хагас сар хэлбэрээр нугалж, амсрыг нь сайтар дарж хавчина.',
  'Халуун тосонд хоёр талыг нь шаргал болтол 4–5 минут шарна.']),
('tsuivan', 'Цуйван', '🍝', 'Үндэсний хоол', 50, 4, 'Дунд', false, 3, array[
  'Гурилаа хатуувтар зуурч, нимгэн элдээд тосолсон хайруулын тавганд хоёр талыг нь болгоно.',
  'Болсон гурилаа хөргөөд нарийн урт гоймон болгон зүснэ.',
  'Махаа урт нарийн зүсэж, халуун тосонд хуурна.',
  'Сонгино, лууван, байцаагаа нэмж, давслаад 5 минут хуурна.',
  'Хагас аяга ус нэмж, гоймноо дээр нь дэвсээд таглаад 15 минут жигнэнэ.',
  'Сайтар хольж, халуунаар нь тавина.']),
('banshtai-shul', 'Банштай шөл', '🍲', 'Шөл', 30, 4, 'Амархан', false, 4, array[
  '2 литр усаа буцалгаж, давс хийнэ.',
  'Төмс, лууван, сонгиноо хальслаад жижиг шоо хэлбэрээр хэрчинэ.',
  'Ногоогоо буцалж буй усанд хийж, 10 минут чанана.',
  'Баншаа нэмж хийгээд, хөвж гартал 7–8 минут чанана.',
  'Амтыг нь шалгаад халуунаар нь тавина.']),
('guriltai-shul', 'Гурилтай шөл', '🍜', 'Шөл', 60, 4, 'Дунд', false, 5, array[
  'Махаа нарийн урт зүсээд, тосонд бага зэрэг хуурна.',
  '2 литр ус нэмж буцалгаад, давс хийж 20 минут чанана.',
  'Гурилаа хатуувтар зуурч, нимгэн элдээд нарийн гоймон зүснэ.',
  'Төмс, лууван, сонгиноо хэрчиж шөлөндөө хийнэ.',
  'Гоймноо сэгсэрч хийгээд, 5–7 минут буцалгана.']),
('budaatai-khuurga', 'Будаатай хуурга', '🍛', 'Хуурга', 40, 4, 'Амархан', false, 6, array[
  'Будаагаа угааж, 20 минут дэвтээнэ.',
  'Махаа жижиг шоо хэлбэрээр хэрчиж, халуун тосонд хуурна.',
  'Сонгино, луувангаа нэмж 5 минут хуурна.',
  'Будаагаа нэмж, будаанаас нэг хуруу дээш ус хийгээд давслана.',
  'Тагийг нь хааж, бага гал дээр 20 минут болгоно.']),
('nogootoi-makhan-shul', 'Ногоотой махан шөл', '🥘', 'Шөл', 50, 4, 'Амархан', false, 7, array[
  'Махаа том хэрчиж, 2 литр усанд хийгээд буцалгана.',
  'Хөөсийг нь авч, давс хийгээд бага гал дээр 30 минут чанана.',
  'Төмс, лууван, сонгиноо шоо хэлбэрээр хэрчиж нэмнэ.',
  '10 минутын дараа нарийн хэрчсэн байцаагаа хийнэ.',
  'Ногоо зөөлрөхөд галаа унтрааж, 5 минут тогтооно.']),
('bantan', 'Бантан', '🥣', 'Шөл', 25, 3, 'Амархан', true, 8, array[
  'Татсан махаа жижиглэсэн сонгинотой хамт тосонд 3–4 минут хуурна.',
  '1.5 литр ус нэмж буцалгаад давслана.',
  'Гурил дээр ус бага багаар дусааж, гараараа үрж жижиг бөөм болгоно.',
  'Гурилаа шөлөндөө хутгангаа бага багаар цацна.',
  '7–8 минут буцалгаад, бүлээн болсон хойно тавина.']),
('kotlet-tumsnii-nukhashtai', 'Котлет төмсний нухаштай', '🥔', 'Хуурга', 45, 4, 'Дунд', true, 9, array[
  'Талхаа сүүнд дэвтээгээд, татсан мах, өндөг, давстай хольж зуурна.',
  'Зуурмагаа хавтгай дугуй котлет болгон хэлбэржүүлнэ.',
  'Халуун тосонд хоёр талыг нь 5–6 минут шарна.',
  'Төмсөө хальслаад давстай усанд 20 минут чанана.',
  'Төмсний усыг асгаж, бүлээн сүү, цөцгийн тос нэмээд нухна.']),
('takhiatai-budaa', 'Тахиатай будаа', '🍗', 'Хуурга', 40, 4, 'Амархан', false, 10, array[
  'Тахианы гуяг давсаар амтлаад халуун тосонд шаргал болтол шарна.',
  'Сонгино, луувангаа нэмж 5 минут хуурна.',
  'Угаасан будаагаа нэмж, 3 аяга ус хийгээд давслана.',
  'Тагийг нь хааж, бага гал дээр 25 минут болгоно.',
  'Галаа унтраагаад 5 минут тогтоож, хутгаад тавина.']),
('undugtei-khairsan-budaa', 'Өндөгтэй хайрсан будаа', '🍳', 'Хуурга', 20, 2, 'Амархан', false, 11, array[
  'Будаагаа урьдчилан чанаад хөргөнө — өчигдрийн будаа хамгийн тохиромжтой.',
  'Сонгино, лууван, хиамаа жижиг шоо болгон хэрчинэ.',
  'Халуун тосонд ногоо, хиамаа 3–4 минут хуурна.',
  'Өндгөө хагалж хийгээд, хутгаж хуурна.',
  'Будаагаа нэмж, давсаар амтлаад 3 минут хуурна.']),
('khairsan-goimon', 'Хайрсан гоймон', '🥡', 'Хуурга', 25, 3, 'Амархан', false, 12, array[
  'Гоймноо давстай усанд 5 минут чанаад шүүнэ.',
  'Махаа нарийн урт зүсээд халуун тосонд хуурна.',
  'Сонгино, лууван, байцаагаа нарийн хэрчиж нэмээд 5 минут хуурна.',
  'Гоймноо нэмж, давсаар амтална.',
  'Сайтар хольж 2–3 минут хуураад тавина.']),
('nogoon-salat', 'Ногоон салат', '🥗', 'Салат', 15, 3, 'Амархан', false, 13, array[
  'Ногоогоо сайтар угааж, усыг нь гоожуулна.',
  'Өргөст хэмх, помидороо дугуй эсвэл шоо хэлбэрээр хэрчинэ.',
  'Салатны навчаа гараараа том урж, яншуйгаа жижиглэнэ.',
  'Бүгдийг нь аяганд хийж, тос, давсаар амтлаад хольно.']),
('mongol-suutei-tsai', 'Монгол сүүтэй цай', '🍵', 'Өглөөний цай', 15, 4, 'Амархан', false, 14, array[
  '1.5 литр усаа буцалгаад цайгаа хийнэ.',
  '3–4 минут буцалгаад, шанагаар самарна.',
  'Сүүгээ нэмж, дахин буцалгана.',
  'Давсаа хийж, 2–3 удаа самраад шүүнэ.',
  'Хүсвэл шар тос нэмж, боорцогтой тавина.']),
('suutei-budaa', 'Сүүтэй будаа', '🍚', 'Өглөөний цай', 25, 3, 'Амархан', true, 15, array[
  'Будаагаа угааж, нэг аяга усанд 5 минут чанана.',
  'Сүүгээ нэмж, буцлах үед галаа багасгана.',
  'Наалдахаас сэргийлж байнга хутгангаа 15 минут болгоно.',
  'Элсэн чихэр, чимх давс нэмнэ.',
  'Цөцгийн тос хийж, бүлээн байхад нь тавина.']),
('khachirtai-talkh-undugtei', 'Хачиртай талх, өндөгтэй', '🥪', 'Өглөөний цай', 10, 2, 'Амархан', false, 16, array[
  'Өндгөө 8–9 минут чанаад хүйтэн усанд хөргөнө.',
  'Талхаа хайруулын тавган дээр эсвэл тостерт шарна.',
  'Өндөг, помидор, хиамаа дугуй зүснэ.',
  'Талхан дээр бяслаг, хиам, помидор, өндгөө давхарлан тавина.'])
on conflict (slug) do nothing;

-- Ingredients: `pattern` is matched against products.name (ilike); no match → product_id null.
insert into public.recipe_items (recipe_id, product_id, label, amount, qty, optional, sort)
select r.id, p.id, v.label, v.amount, v.qty, v.optional, v.sort
from (values
  ('buuz', 1, 'Хонины мах', '1 кг', 1, false, 'Хонины мах'::text),
  ('buuz', 2, 'Гурил', '2 кг', 1, false, 'Гурил 2кг'),
  ('buuz', 3, 'Сонгино', '2 ширхэг', 1, false, 'Сонгино'),
  ('buuz', 4, 'Сармис', '3 хумс', 1, false, 'Сармис'),
  ('buuz', 5, 'Давс', 'амтлахаар', 1, false, 'Давс%'),

  ('khuushuur', 1, 'Хонины мах', '1 кг', 1, false, 'Хонины мах'),
  ('khuushuur', 2, 'Гурил', '2 кг', 1, false, 'Гурил 2кг'),
  ('khuushuur', 3, 'Сонгино', '2 ширхэг', 1, false, 'Сонгино'),
  ('khuushuur', 4, 'Наранцэцгийн тос', 'шарахад', 1, false, 'Наранцэцгийн тос%'),
  ('khuushuur', 5, 'Давс', 'амтлахаар', 1, false, 'Давс%'),

  ('tsuivan', 1, 'Үхрийн мах', '500 гр', 1, false, 'Үхрийн мах'),
  ('tsuivan', 2, 'Гурил', '3 аяга', 1, false, 'Гурил 2кг'),
  ('tsuivan', 3, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('tsuivan', 4, 'Байцаа', '¼ толгой', 1, false, 'Байцаа'),
  ('tsuivan', 5, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),
  ('tsuivan', 6, 'Наранцэцгийн тос', '3 хоолны халбага', 1, false, 'Наранцэцгийн тос%'),

  ('banshtai-shul', 1, 'Банш', '1 кг', 1, false, 'Банш'),
  ('banshtai-shul', 2, 'Төмс', '3 ширхэг', 1, false, 'Төмс'),
  ('banshtai-shul', 3, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('banshtai-shul', 4, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),
  ('banshtai-shul', 5, 'Давс', 'амтлахаар', 1, false, 'Давс%'),

  ('guriltai-shul', 1, 'Хонины мах', '500 гр', 1, false, 'Хонины мах'),
  ('guriltai-shul', 2, 'Гурил', '2 аяга', 1, false, 'Гурил 2кг'),
  ('guriltai-shul', 3, 'Төмс', '2 ширхэг', 1, false, 'Төмс'),
  ('guriltai-shul', 4, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('guriltai-shul', 5, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),

  ('budaatai-khuurga', 1, 'Үхрийн мах', '500 гр', 1, false, 'Үхрийн мах'),
  ('budaatai-khuurga', 2, 'Цагаан будаа', '2 аяга', 1, false, 'Цагаан будаа'),
  ('budaatai-khuurga', 3, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('budaatai-khuurga', 4, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),
  ('budaatai-khuurga', 5, 'Наранцэцгийн тос', '3 хоолны халбага', 1, false, 'Наранцэцгийн тос%'),

  ('nogootoi-makhan-shul', 1, 'Үхрийн мах', '500 гр', 1, false, 'Үхрийн мах'),
  ('nogootoi-makhan-shul', 2, 'Төмс', '3 ширхэг', 1, false, 'Төмс'),
  ('nogootoi-makhan-shul', 3, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('nogootoi-makhan-shul', 4, 'Байцаа', '¼ толгой', 1, false, 'Байцаа'),
  ('nogootoi-makhan-shul', 5, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),

  ('bantan', 1, 'Үхрийн татсан мах', '500 гр', 1, false, 'Татсан мах%'),
  ('bantan', 2, 'Гурил', '½ аяга', 1, false, 'Гурил 2кг'),
  ('bantan', 3, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),
  ('bantan', 4, 'Давс', 'амтлахаар', 1, false, 'Давс%'),

  ('kotlet-tumsnii-nukhashtai', 1, 'Үхрийн татсан мах', '500 гр', 1, false, 'Татсан мах%'),
  ('kotlet-tumsnii-nukhashtai', 2, 'Өндөг', '1 ширхэг', 1, false, 'Өндөг 10ш'),
  ('kotlet-tumsnii-nukhashtai', 3, 'Талх', '2 зүсэм', 1, false, 'Талх'),
  ('kotlet-tumsnii-nukhashtai', 4, 'Төмс', '1 кг', 1, false, 'Төмс'),
  ('kotlet-tumsnii-nukhashtai', 5, 'Сүү', '½ аяга', 1, false, 'Сүү 1л'),
  ('kotlet-tumsnii-nukhashtai', 6, 'Цөцгийн тос', '30 гр', 1, false, 'Цөцгийн тос%'),

  ('takhiatai-budaa', 1, 'Тахианы гуя', '1 кг', 1, false, 'Тахианы гуя'),
  ('takhiatai-budaa', 2, 'Цагаан будаа', '2 аяга', 1, false, 'Цагаан будаа'),
  ('takhiatai-budaa', 3, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),
  ('takhiatai-budaa', 4, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('takhiatai-budaa', 5, 'Наранцэцгийн тос', '2 хоолны халбага', 1, false, 'Наранцэцгийн тос%'),

  ('undugtei-khairsan-budaa', 1, 'Цагаан будаа', '1 аяга', 1, false, 'Цагаан будаа'),
  ('undugtei-khairsan-budaa', 2, 'Өндөг', '3 ширхэг', 1, false, 'Өндөг 10ш'),
  ('undugtei-khairsan-budaa', 3, 'Лууван', '½ ширхэг', 1, false, 'Лууван'),
  ('undugtei-khairsan-budaa', 4, 'Сонгино', '½ ширхэг', 1, false, 'Сонгино'),
  ('undugtei-khairsan-budaa', 5, 'Утсан хиам', '100 гр', 1, true, 'Хиам%'),

  ('khairsan-goimon', 1, 'Гоймон', '500 гр', 1, false, 'Гоймон'),
  ('khairsan-goimon', 2, 'Үхрийн мах', '300 гр', 1, false, 'Үхрийн мах'),
  ('khairsan-goimon', 3, 'Байцаа', '¼ толгой', 1, false, 'Байцаа'),
  ('khairsan-goimon', 4, 'Лууван', '1 ширхэг', 1, false, 'Лууван'),
  ('khairsan-goimon', 5, 'Сонгино', '1 ширхэг', 1, false, 'Сонгино'),

  ('nogoon-salat', 1, 'Өргөст хэмх', '2 ширхэг', 1, false, 'Өргөст хэмх'),
  ('nogoon-salat', 2, 'Помидор', '2 ширхэг', 1, false, 'Улаан лооль'),
  ('nogoon-salat', 3, 'Салатны навч', '1 баглаа', 1, false, null),
  ('nogoon-salat', 4, 'Яншуй', '½ баглаа', 1, false, null),
  ('nogoon-salat', 5, 'Наранцэцгийн тос', '2 хоолны халбага', 1, false, 'Наранцэцгийн тос%'),

  ('mongol-suutei-tsai', 1, 'Сүү', '½ литр', 1, false, 'Сүү 1л'),
  ('mongol-suutei-tsai', 2, 'Ногоон цай', '1 халбага', 1, false, 'Ногоон цай'),
  ('mongol-suutei-tsai', 3, 'Давс', 'амтлахаар', 1, false, 'Давс%'),
  ('mongol-suutei-tsai', 4, 'Боорцог', 'цайтай хамт', 1, true, 'Боорцог'),
  ('mongol-suutei-tsai', 5, 'Шар тос', '1 халбага', 1, true, null),

  ('suutei-budaa', 1, 'Цагаан будаа', '½ аяга', 1, false, 'Цагаан будаа'),
  ('suutei-budaa', 2, 'Сүү', '1 литр', 1, false, 'Сүү 1л'),
  ('suutei-budaa', 3, 'Элсэн чихэр', '2 хоолны халбага', 1, false, 'Элсэн чихэр%'),
  ('suutei-budaa', 4, 'Цөцгийн тос', '20 гр', 1, false, 'Цөцгийн тос%'),

  ('khachirtai-talkh-undugtei', 1, 'Талх', '4 зүсэм', 1, false, 'Зүсмэл талх'),
  ('khachirtai-talkh-undugtei', 2, 'Өндөг', '2 ширхэг', 1, false, 'Өндөг 10ш'),
  ('khachirtai-talkh-undugtei', 3, 'Голланд бяслаг', '2 зүсэм', 1, false, 'Бяслаг%'),
  ('khachirtai-talkh-undugtei', 4, 'Утсан хиам', '4 зүсэм', 1, false, 'Хиам%'),
  ('khachirtai-talkh-undugtei', 5, 'Помидор', '1 ширхэг', 1, false, 'Улаан лооль')
) as v(slug, sort, label, amount, qty, optional, pattern)
join public.recipes r on r.slug = v.slug
left join lateral (
  select id from public.products
  where v.pattern is not null and name ilike v.pattern
  order by length(name)
  limit 1
) p on true
where not exists (select 1 from public.recipe_items i where i.recipe_id = r.id);
