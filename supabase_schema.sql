-- =========================================================
-- XN REWARD ($NXB) - SUPABASE PRODUCTION DATABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance NUMERIC(15, 2) DEFAULT 0.00,
  energy INT DEFAULT 1000,
  max_energy INT DEFAULT 1000,
  energy_level INT DEFAULT 1,
  hit_level INT DEFAULT 1,
  hit_damage NUMERIC(10, 2) DEFAULT 0.50,
  subject_level INT DEFAULT 1,
  subject_hp NUMERIC(10, 2) DEFAULT 100.00,
  subject_max_hp NUMERIC(10, 2) DEFAULT 100.00,
  referral_code VARCHAR(30) UNIQUE,
  referred_by VARCHAR(30),
  device_id VARCHAR(100),
  device_name VARCHAR(150),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  reward NUMERIC(15, 2) DEFAULT 100.00,
  type VARCHAR(20) DEFAULT 'one_time' CHECK (type IN ('one_time', 'daily')),
  category VARCHAR(30) DEFAULT 'social',
  action_url TEXT,
  requires_proof BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Task Submissions Table
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  task_id VARCHAR(64) REFERENCES public.tasks(id) ON DELETE CASCADE,
  proof_image TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
  id VARCHAR(64) PRIMARY KEY,
  referrer_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  referrer_name VARCHAR(100),
  referee_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
  referee_name VARCHAR(100),
  reward_amount NUMERIC(15, 2) DEFAULT 200.00,
  status VARCHAR(20) DEFAULT 'rewarded' CHECK (status IN ('pending', 'rewarded', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create System Settings Table
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

-- 7. Create OTP Codes Table
CREATE TABLE IF NOT EXISTS public.otps (
  email VARCHAR(150) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- =========================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON public.task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- =========================================================
-- INITIAL DEFAULT SEED DATA
-- =========================================================

-- Insert Admin Account
INSERT INTO public.users (
  id, name, email, password, role, balance, energy, max_energy, energy_level,
  hit_level, hit_damage, subject_level, subject_hp, subject_max_hp, referral_code,
  device_id, device_name, last_active, created_at
) VALUES (
  'usr_admin', 'XN Admin', 'admin@gmail.com', 'admin123', 'admin', 10000.00, 1000, 1000, 1,
  1, 0.50, 1, 100.00, 100.00, 'ADMIN777',
  'device_admin_pc', 'Admin Workstation', NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert System Settings Default Row
INSERT INTO public.system_settings (id, admin_email) VALUES (1, 'admin@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Disable RLS or allow service role full access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps DISABLE ROW LEVEL SECURITY;
