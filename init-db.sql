-- Muhriddin Group - Ma'lumotlar bazasi strukturasi

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  worker VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  owner VARCHAR(100) NOT NULL,
  client_phone VARCHAR(20),
  comment TEXT,
  press_count INTEGER,
  land_area DECIMAL(10, 2),
  payment VARCHAR(10) NOT NULL,
  price DECIMAL(12, 2),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test foydalanuvchilar (productionda o'zgartiring!)
-- Admin: login=admin, password=admin123
-- Worker: login=worker1, password=worker123

INSERT INTO users (login, password, role) VALUES
  ('admin', 'admin123', 'admin'),
  ('worker1', 'worker123', 'worker')
ON CONFLICT (login) DO NOTHING;
