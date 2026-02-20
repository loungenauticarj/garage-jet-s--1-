-- Criar tabela de grupos de jets para cotistas
CREATE TABLE IF NOT EXISTS jet_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jet_name VARCHAR NOT NULL UNIQUE,
  manufacturer VARCHAR,
  model VARCHAR,
  year VARCHAR,
  max_cotistas INT DEFAULT 6,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna jet_group_id à tabela users (se não existir)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS jet_group_id UUID REFERENCES jet_groups(id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_jet_group_id ON users(jet_group_id);
CREATE INDEX IF NOT EXISTS idx_jet_groups_jet_name ON jet_groups(jet_name);

-- Inserir jets padrão
INSERT INTO jet_groups (jet_name, manufacturer, model, year, max_cotistas) VALUES
('Gti170 2022', 'Sea-Doo', 'GTi 170', '2022', 10),
('Gti170 2023', 'Sea-Doo', 'GTi 170', '2023', 6),
('Gti130 2014', 'Sea-Doo', 'GTi 130', '2014', 10),
('Gti130 2024 Brc', 'Sea-Doo', 'GTi 130', '2024', 6),
('Gti130 2024 Ramos', 'Sea-Doo', 'GTi 130', '2024', 6),
('Gtx170 2023', 'Sea-Doo', 'GTX 170', '2023', 6),
('Rxt300 2020', 'Sea-Doo', 'RXt 300', '2020', 6),
('Wake170 2024', 'Sea-Doo', 'Wake 170', '2024', 10)
ON CONFLICT DO NOTHING;

-- Inserir usuario operacional (somente se nao existir)
INSERT INTO users (
  email,
  name,
  phone,
  cpf,
  address,
  cep,
  registration_code,
  role,
  monthly_due_date,
  monthly_value,
  is_blocked,
  jet_ski_manufacturer,
  jet_ski_model,
  jet_ski_year
)
SELECT
  'operacional@marina.com',
  'Operacional Marina',
  '0000000000',
  '00000000000',
  'Marina',
  '00000000',
  '001',
  'OPERATIONAL',
  1,
  0,
  false,
  'N/A',
  'N/A',
  '2024'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'operacional@marina.com'
);
