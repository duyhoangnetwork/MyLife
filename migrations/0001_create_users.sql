-- Migration 0001: Users and per-user preferences/settings
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256:v1:100000',
  email_verified INTEGER NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '/src/assets/images/avatar_user_profile_1795412997980.jpg',
  bio TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'glass')),
  accent_color TEXT NOT NULL DEFAULT 'sky',
  font_scale TEXT NOT NULL DEFAULT 'md' CHECK (font_scale IN ('sm', 'md', 'lg')),
  transitions_enabled INTEGER NOT NULL DEFAULT 1,
  glass_effects_enabled INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'VND' CHECK (currency IN ('VND', 'USD', 'EUR')),
  monthly_budget REAL NOT NULL DEFAULT 15000000,
  cycle_start_day INTEGER NOT NULL DEFAULT 1,
  categories_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
