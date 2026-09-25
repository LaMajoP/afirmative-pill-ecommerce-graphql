-- =========================================================
-- AFIRMATIVE PILL — Modelo de datos + Seed (Supabase/PostgreSQL)
-- =========================================================
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor)
-- Incluye: catálogo (read model base), pedidos (write model / CQRS)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. CATEGORÍAS TERAPÉUTICAS
-- ---------------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null
);

insert into categories (name) values
  ('Analgésicos'), ('Antibióticos'), ('Antihipertensivos'),
  ('Antidiabéticos'), ('Antihistamínicos'), ('Antiinflamatorios'),
  ('Gastroenterología'), ('Dermatológicos'), ('Psiquiatría y Neurología'),
  ('Respiratorio'), ('Vitaminas y Suplementos'), ('Endocrinología')
on conflict (name) do nothing;

-- ---------------------------------------------------------
-- 2. MEDICAMENTOS (catálogo base / read model)
-- ---------------------------------------------------------
create table if not exists medications (
  id                   uuid primary key default gen_random_uuid(),
  commercial_name      text not null,
  active_ingredient    text not null,
  category_id          uuid references categories(id),
  laboratory           text not null,
  presentation         text not null,
  price                numeric(10,2) not null check (price >= 0),
  stock                integer not null check (stock >= 0),
  requires_prescription boolean not null default false,
  indications          text,
  contraindications     text,
  created_at           timestamptz default now()
);

create index if not exists idx_medications_category on medications(category_id);
create index if not exists idx_medications_name on medications using gin (to_tsvector('spanish', commercial_name || ' ' || active_ingredient));

-- ---------------------------------------------------------
-- 3. PEDIDOS (write model / CQRS) + PROYECCIÓN DE LECTURA
-- ---------------------------------------------------------
create type order_status as enum ('PENDING_APPROVAL','APPROVED','DISPATCHED','CANCELLED');

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null,
  status        order_status not null default 'PENDING_APPROVAL',
  total         numeric(10,2) not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  medication_id uuid references medications(id),
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10,2) not null
);

-- Soporte de fórmula médica (evidencia de prescripción) requerido cuando
-- algún ítem del pedido tiene requires_prescription = true.
create table if not exists prescriptions (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  document_url  text not null,
  verified      boolean not null default false,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------
-- 4. SEED — 50 MEDICAMENTOS REALES
-- ---------------------------------------------------------
do $$
declare
  cat_analg uuid := (select id from categories where name = 'Analgésicos');
  cat_antib uuid := (select id from categories where name = 'Antibióticos');
  cat_hta   uuid := (select id from categories where name = 'Antihipertensivos');
  cat_diab  uuid := (select id from categories where name = 'Antidiabéticos');
  cat_hist  uuid := (select id from categories where name = 'Antihistamínicos');
  cat_infl  uuid := (select id from categories where name = 'Antiinflamatorios');
  cat_gast  uuid := (select id from categories where name = 'Gastroenterología');
  cat_derm  uuid := (select id from categories where name = 'Dermatológicos');
  cat_neuro uuid := (select id from categories where name = 'Psiquiatría y Neurología');
  cat_resp  uuid := (select id from categories where name = 'Respiratorio');
  cat_vit   uuid := (select id from categories where name = 'Vitaminas y Suplementos');
  cat_endo  uuid := (select id from categories where name = 'Endocrinología');
begin
  insert into medications (commercial_name, active_ingredient, category_id, laboratory, presentation, price, stock, requires_prescription, indications) values
  ('Dolex', 'Acetaminofén 500mg', cat_analg, 'GSK', 'Caja x 20 tabletas', 8900, 500, false, 'Dolor leve a moderado, fiebre'),
  ('Advil', 'Ibuprofeno 400mg', cat_analg, 'Pfizer', 'Caja x 10 cápsulas', 12500, 320, false, 'Dolor e inflamación'),
  ('Tramal', 'Tramadol 50mg', cat_analg, 'Grünenthal', 'Caja x 10 cápsulas', 21000, 60, true, 'Dolor moderado a severo'),
  ('Morfina Genfar', 'Sulfato de morfina 10mg', cat_analg, 'Genfar', 'Caja x 5 ampollas', 45000, 15, true, 'Dolor severo oncológico'),
  ('Dolo Neurobión', 'Metamizol sódico 500mg', cat_analg, 'Merck', 'Caja x 10 tabletas', 9800, 210, false, 'Dolor agudo'),
  ('Amoxil', 'Amoxicilina 500mg', cat_antib, 'GSK', 'Caja x 15 cápsulas', 15200, 180, true, 'Infecciones bacterianas'),
  ('Clavulin', 'Amoxicilina + Ácido clavulánico 875/125mg', cat_antib, 'GSK', 'Caja x 14 tabletas', 32500, 90, true, 'Infecciones bacterianas resistentes'),
  ('Zitromax', 'Azitromicina 500mg', cat_antib, 'Pfizer', 'Caja x 3 tabletas', 18700, 140, true, 'Infecciones respiratorias'),
  ('Cipro', 'Ciprofloxacina 500mg', cat_antib, 'Bayer', 'Caja x 10 tabletas', 16900, 110, true, 'Infecciones urinarias'),
  ('Dalacin C', 'Clindamicina 300mg', cat_antib, 'Pfizer', 'Caja x 16 cápsulas', 24300, 75, true, 'Infecciones de piel y tejidos blandos'),
  ('Vibramicina', 'Doxiciclina 100mg', cat_antib, 'Pfizer', 'Caja x 10 tabletas', 14200, 95, true, 'Infecciones respiratorias y acné'),
  ('Keflex', 'Cefalexina 500mg', cat_antib, 'Novartis', 'Caja x 16 cápsulas', 13600, 130, true, 'Infecciones bacterianas comunes'),
  ('Tavanic', 'Levofloxacina 500mg', cat_antib, 'Sanofi', 'Caja x 7 tabletas', 27800, 60, true, 'Infecciones respiratorias severas'),
  ('Cosart', 'Losartán 50mg', cat_hta, 'Procaps', 'Caja x 30 tabletas', 11400, 400, false, 'Hipertensión arterial'),
  ('Renitec', 'Enalapril 20mg', cat_hta, 'MSD', 'Caja x 30 tabletas', 9600, 380, false, 'Hipertensión arterial'),
  ('Lasix', 'Furosemida 40mg', cat_hta, 'Sanofi', 'Caja x 20 tabletas', 7200, 250, false, 'Edema, hipertensión'),
  ('Betaloc', 'Metoprolol 100mg', cat_hta, 'AstraZeneca', 'Caja x 30 tabletas', 13800, 220, false, 'Hipertensión, arritmias'),
  ('Capotena', 'Captopril 25mg', cat_hta, 'Bristol Myers', 'Caja x 30 tabletas', 8300, 300, false, 'Hipertensión arterial'),
  ('Aldactone', 'Espironolactona 25mg', cat_hta, 'Pfizer', 'Caja x 20 tabletas', 10500, 150, false, 'Hipertensión, edema'),
  ('Glucophage', 'Metformina 850mg', cat_diab, 'Merck', 'Caja x 30 tabletas', 10200, 450, false, 'Diabetes tipo 2'),
  ('Daonil', 'Glibenclamida 5mg', cat_diab, 'Sanofi', 'Caja x 30 tabletas', 6800, 200, false, 'Diabetes tipo 2'),
  ('Lantus', 'Insulina Glargina 100U/ml', cat_diab, 'Sanofi', 'Vial 10ml', 78500, 55, true, 'Diabetes tipo 1 y 2'),
  ('Humulin N', 'Insulina NPH 100U/ml', cat_diab, 'Eli Lilly', 'Vial 10ml', 62300, 40, true, 'Diabetes tipo 1 y 2'),
  ('Claritin', 'Loratadina 10mg', cat_hist, 'Bayer', 'Caja x 10 tabletas', 8400, 350, false, 'Alergias, rinitis'),
  ('Zyrtec', 'Cetirizina 10mg', cat_hist, 'GSK', 'Caja x 10 tabletas', 9100, 300, false, 'Alergias, urticaria'),
  ('Volterol', 'Diclofenaco 50mg', cat_infl, 'Novartis', 'Caja x 20 tabletas', 8700, 280, false, 'Dolor e inflamación'),
  ('Naprosyn', 'Naproxeno 500mg', cat_infl, 'Roche', 'Caja x 10 tabletas', 10300, 190, false, 'Dolor e inflamación articular'),
  ('Decadron', 'Dexametasona 4mg', cat_infl, 'MSD', 'Caja x 10 tabletas', 6500, 160, true, 'Procesos inflamatorios severos'),
  ('Meticorten', 'Prednisolona 5mg', cat_infl, 'Bayer', 'Caja x 20 tabletas', 7900, 175, true, 'Procesos inflamatorios e inmunológicos'),
  ('Cytotec Gastro', 'Omeprazol 20mg', cat_gast, 'Procaps', 'Caja x 14 cápsulas', 9500, 400, false, 'Gastritis, reflujo'),
  ('Zantac', 'Ranitidina 150mg', cat_gast, 'GSK', 'Caja x 20 tabletas', 7100, 220, false, 'Úlceras, reflujo'),
  ('Micoticum', 'Fluconazol 150mg', cat_derm, 'Pfizer', 'Caja x 1 cápsula', 8200, 240, true, 'Infecciones fúngicas'),
  ('Herpex', 'Aciclovir 400mg', cat_derm, 'GSK', 'Caja x 25 tabletas', 15600, 130, true, 'Herpes simple y zóster'),
  ('Micostatin', 'Nistatina crema', cat_derm, 'Bristol Myers', 'Tubo 30g', 9800, 190, false, 'Infecciones fúngicas cutáneas'),
  ('Daktarin', 'Miconazol crema 2%', cat_derm, 'Janssen', 'Tubo 30g', 11200, 175, false, 'Infecciones fúngicas de piel'),
  ('Rivotril', 'Clonazepam 2mg', cat_neuro, 'Roche', 'Caja x 30 tabletas', 12800, 70, true, 'Trastornos de ansiedad, epilepsia'),
  ('Xanax', 'Alprazolam 0.5mg', cat_neuro, 'Pfizer', 'Caja x 30 tabletas', 13500, 65, true, 'Trastornos de ansiedad'),
  ('Altruline', 'Sertralina 50mg', cat_neuro, 'Pfizer', 'Caja x 30 tabletas', 22600, 85, true, 'Depresión, trastornos de ansiedad'),
  ('Lexapro', 'Escitalopram 10mg', cat_neuro, 'Lundbeck', 'Caja x 28 tabletas', 26400, 78, true, 'Depresión mayor'),
  ('Risperdal', 'Risperidona 2mg', cat_neuro, 'Janssen', 'Caja x 20 tabletas', 19800, 55, true, 'Trastornos psicóticos'),
  ('Depakine', 'Ácido valproico 500mg', cat_neuro, 'Sanofi', 'Caja x 30 tabletas', 17300, 60, true, 'Epilepsia, trastorno bipolar'),
  ('Coumadin', 'Warfarina 5mg', cat_neuro, 'Bristol Myers', 'Caja x 30 tabletas', 9200, 100, true, 'Anticoagulación'),
  ('Ventolin', 'Salbutamol inhalador 100mcg', cat_resp, 'GSK', 'Inhalador 200 dosis', 19500, 210, false, 'Crisis asmáticas, broncoespasmo'),
  ('Pulmicort', 'Budesonida inhalador 200mcg', cat_resp, 'AstraZeneca', 'Inhalador 120 dosis', 34200, 140, true, 'Asma persistente'),
  ('Singulair', 'Montelukast 10mg', cat_resp, 'MSD', 'Caja x 30 tabletas', 28700, 95, true, 'Asma, rinitis alérgica'),
  ('Synthroid', 'Levotiroxina 100mcg', cat_endo, 'AbbVie', 'Caja x 50 tabletas', 10800, 260, true, 'Hipotiroidismo'),
  ('Plaquinol', 'Hidroxicloroquina 200mg', cat_endo, 'Sanofi', 'Caja x 36 tabletas', 21900, 45, true, 'Artritis reumatoide, lupus'),
  ('Trexall', 'Metotrexato 2.5mg', cat_endo, 'Pfizer', 'Caja x 24 tabletas', 31500, 35, true, 'Artritis reumatoide, oncología'),
  ('Ácido Fólico Tecnoquímicas', 'Ácido fólico 1mg', cat_vit, 'Tecnoquímicas', 'Caja x 30 tabletas', 4200, 500, false, 'Suplemento prenatal'),
  ('Redoxon', 'Vitamina D3 2000UI + Calcio', cat_vit, 'Bayer', 'Caja x 30 tabletas', 15300, 320, false, 'Suplemento óseo');

end $$;
