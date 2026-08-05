-- ====================================================================
-- XN REWARD ($NXB) - SUPABASE & POSTGRESQL MASTER PRODUCTION SCHEMA
-- Execute this script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password TEXT DEFAULT '',
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance NUMERIC(15, 2) DEFAULT 0.00,
  taka_balance NUMERIC(15, 2) DEFAULT 0.00,
  energy INT DEFAULT 1000,
  max_energy INT DEFAULT 1000,
  energy_level INT DEFAULT 1,
  hit_level INT DEFAULT 1,
  hit_damage NUMERIC(10, 2) DEFAULT 0.50,
  subject_level INT DEFAULT 1,
  subject_hp NUMERIC(15, 2) DEFAULT 100.00,
  subject_max_hp NUMERIC(15, 2) DEFAULT 100.00,
  referral_code VARCHAR(50) UNIQUE,
  referred_by VARCHAR(100),
  device_id VARCHAR(100),
  device_name VARCHAR(150),
  last_check_in_date VARCHAR(20),
  check_in_streak INT DEFAULT 0,
  avatar TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  reward NUMERIC(15, 2) DEFAULT 100.00,
  type VARCHAR(20) DEFAULT 'one_time' CHECK (type IN ('one_time', 'daily')),
  category VARCHAR(50) DEFAULT 'social',
  action_url TEXT,
  requires_proof BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TASK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id VARCHAR(100) PRIMARY KEY,
  task_id VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(150),
  user_email VARCHAR(150),
  proof_image TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 5. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(150),
  user_email VARCHAR(150),
  payment_method VARCHAR(50) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  coins_amount NUMERIC(15, 2) DEFAULT 0,
  taka_amount NUMERIC(15, 2) NOT NULL,
  withdraw_type VARCHAR(20) DEFAULT 'coins',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 6. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS public.referrals (
  id VARCHAR(100) PRIMARY KEY,
  referrer_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_name VARCHAR(150),
  referred_user_email VARCHAR(150),
  referred_device_id VARCHAR(100),
  referred_device_name VARCHAR(150),
  is_first_referral BOOLEAN DEFAULT FALSE,
  reward_amount NUMERIC(15, 2) DEFAULT 200.00,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'verified', 'flagged', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- 7. OTP CODES TABLE (FOR EMAIL OTP VERIFICATION)
CREATE TABLE IF NOT EXISTS public.otps (
  email VARCHAR(150) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. IMGBB & FREEIMAGE API KEYS TABLES
CREATE TABLE IF NOT EXISTS public.imgbb_keys (
  id VARCHAR(100) PRIMARY KEY,
  api_key TEXT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'failed')),
  fail_reason TEXT,
  last_tested TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freeimage_keys (
  id VARCHAR(100) PRIMARY KEY,
  api_key TEXT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'failed')),
  fail_reason TEXT,
  last_tested TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  imgbb_api_key TEXT DEFAULT '',
  brevo_api_key TEXT DEFAULT '',
  brevo_daily_limit INT DEFAULT 290,
  brevo_used_today INT DEFAULT 0,
  resend_api_key TEXT DEFAULT '',
  resend_daily_limit INT DEFAULT 98,
  resend_used_today INT DEFAULT 0,
  recharge_interval_hours INT DEFAULT 6,
  default_hit_damage NUMERIC(10, 2) DEFAULT 0.50,
  admin_email VARCHAR(150) DEFAULT 'admin@gmail.com',
  tutorial_fb_video_url TEXT DEFAULT '',
  support_telegram_url TEXT DEFAULT '',
  channel_telegram_url TEXT DEFAULT '',
  popup_welcome_text TEXT DEFAULT '',
  require_email_otp BOOLEAN DEFAULT TRUE
);

-- =========================================================
-- PERFORMANCE INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON public.task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- =========================================================
-- MIGRATIONS FOR EXISTING DATABASES (SAFE ADD COLUMNS)
-- =========================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS taka_balance NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_check_in_date VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS check_in_streak INT DEFAULT 0;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS require_email_otp BOOLEAN DEFAULT TRUE;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS freeimage_api_key TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS public.freeimage_keys (
  id VARCHAR(100) PRIMARY KEY,
  api_key TEXT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'failed')),
  fail_reason TEXT,
  last_tested TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- DEFAULT SEED DATA
-- =========================================================
INSERT INTO public.users (
  id, name, email, password, role, balance, taka_balance, energy, max_energy, energy_level,
  hit_level, hit_damage, subject_level, subject_hp, subject_max_hp, referral_code,
  device_id, device_name, last_active, created_at
) VALUES (
  'usr_admin', 'XN Admin', 'admin@gmail.com', 'admin123', 'admin', 10000.00, 500.00, 1000, 1000, 1,
  1, 0.50, 1, 100.00, 100.00, 'ADMIN777',
  'device_admin_pc', 'Admin Workstation', NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.system_settings (id, admin_email, require_email_otp) 
VALUES (1, 'admin@gmail.com', TRUE)
ON CONFLICT (id) DO UPDATE SET require_email_otp = TRUE;

-- Disable RLS for standard API direct access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.imgbb_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freeimage_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.imgbb_keys DISABLE ROW LEVEL SECURITY;

