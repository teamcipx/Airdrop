import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SystemSettings, User, Task, TaskSubmission, ReferralRecord, WithdrawalRecord } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tcmzgqedczwvacflqpic.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInRlZiI6InRjbXpncWVkY3p3dmFjZmxxcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg2NTI3MCwiZXhwIjoyMTAwNDQxMjcwfQ.NdZXhs0mQ7-58NGgN7Wo3lGxCcGWUrS_GgWpNonznTI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// System Settings State
let systemSettings: SystemSettings = {
  imgbbApiKey: process.env.IMGBB_API_KEY || '',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  brevoDailyLimit: 290,
  brevoUsedToday: 0,
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendDailyLimit: 98,
  resendUsedToday: 0,
  rechargeIntervalHours: 6,
  defaultHitDamage: 0.5,
  adminEmail: 'admin@gmail.com',
  tutorialFbVideoUrl: 'https://www.facebook.com/reel/1148805566373760',
  supportTelegramUrl: 'https://t.me/xnhelpline',
  channelTelegramUrl: 'https://t.me/xnrewared',
  popupWelcomeText: 'ভিডিও দেখুন! (Tutorial)',
};

// In-memory persistent state sync to ensure 100% smooth execution
const mockUsers: Map<string, User> = new Map();
const mockOtps: Map<string, { code: string; expiresAt: number }> = new Map();
const mockDailyOtpStats: Map<string, number> = new Map(); // YYYY-MM-DD -> count
const mockOtpRequestTracker: Map<string, { count: number; lastReset: number }> = new Map(); // email or sessionKey -> tracker
const mockTasks: Task[] = [
  {
    id: 'task_1',
    title: 'Join HedHog Official Telegram',
    description: 'Subscribe to our official Telegram channel for $NXB announcements and drops.',
    reward: 100,
    type: 'one_time',
    category: 'telegram',
    actionUrl: 'https://t.me',
    requiresProof: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task_2',
    title: 'Subscribe to YouTube Channel',
    description: 'Watch our latest $NXB gameplay video and subscribe.',
    reward: 150,
    type: 'one_time',
    category: 'youtube',
    actionUrl: 'https://youtube.com',
    requiresProof: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task_3',
    title: 'Daily Check-in & Share',
    description: 'Log into $NXB Airdrop today and share your status with friends.',
    reward: 50,
    type: 'daily',
    category: 'social',
    actionUrl: 'https://x.com',
    requiresProof: false,
    createdAt: new Date().toISOString(),
  }
];
const mockSubmissions: TaskSubmission[] = [];
const mockReferrals: ReferralRecord[] = [];
const mockWithdrawals: WithdrawalRecord[] = [];

// Admin Emails List
const ADMIN_EMAILS = ['hello.alihosen@gmail.com', 'admin@gmail.com'];

// Helper: Seed Default Admin User
const adminUser: User = {
  id: 'usr_admin',
  name: 'NXB Admin',
  email: 'hello.alihosen@gmail.com',
  role: 'admin',
  balance: 10000,
  energy: 1000,
  maxEnergy: 1000,
  energyLevel: 1,
  hitLevel: 1,
  hitDamage: 0.5,
  subjectLevel: 1,
  subjectHp: 100,
  subjectMaxHp: 100,
  referralCode: 'ADMIN777',
  deviceId: 'device_admin_pc',
  deviceName: 'Admin Workstation',
  lastActive: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};
mockUsers.set(adminUser.id, adminUser);
mockUsers.set(adminUser.email, adminUser);
mockUsers.set('admin@gmail.com', { ...adminUser, email: 'admin@gmail.com' });

// Energy Auto Recharge calculation (6 hours full refuel = 21600 seconds)
function calculateRechargedEnergy(user: User): number {
  const now = Date.now();
  const lastActiveTime = new Date(user.lastActive).getTime();
  const elapsedSeconds = Math.max(0, (now - lastActiveTime) / 1000);
  
  // Refill rate per second: maxEnergy / (6 * 3600)
  const fullRechargeSeconds = systemSettings.rechargeIntervalHours * 3600;
  const energyAdded = (user.maxEnergy / fullRechargeSeconds) * elapsedSeconds;
  
  return Math.min(user.maxEnergy, Math.round(user.energy + energyAdded));
}

// Premium Responsive OTP Email Template Generator
function getOtpEmailHtml(otpCode: string, email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XN Reward OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0806; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f3e8df;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0d0806; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(145deg, #1f120d, #140b08); border-radius: 20px; border: 1px solid #4a2d1f; box-shadow: 0 15px 35px rgba(0,0,0,0.7); overflow: hidden;">
          
          <!-- Top Golden Banner Header -->
          <tr>
            <td align="center" style="background: linear-gradient(90deg, #f59e0b, #ea580c); padding: 25px 20px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #000000; letter-spacing: 2px; text-transform: uppercase;">XN REWARD OFFICIAL</h1>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #2a1304; font-weight: 700;">SECURE EMAIL VERIFICATION SYSTEM</p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 35px 25px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 15px; color: #d6bdae;">Hello <strong style="color: #f59e0b;">${email}</strong>,</p>
              <p style="margin: 0 0 25px 0; font-size: 14px; color: #a88d7f; line-height: 1.6;">
                Welcome to XN Reward! Please use the following 6-digit One-Time Password (OTP) to complete your secure sign-in or account verification:
              </p>

              <!-- Glowing Golden OTP Box -->
              <div style="background: #25140e; border: 2px dashed #f59e0b; border-radius: 16px; padding: 22px 15px; margin: 25px 0; box-shadow: inset 0 0 15px rgba(245, 158, 11, 0.2);">
                <span style="font-size: 36px; font-weight: 900; color: #fbbf24; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; display: inline-block;">${otpCode}</span>
              </div>

              <p style="margin: 15px 0; font-size: 13px; color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                ⏳ This code is valid for exactly 10 minutes.
              </p>

              <!-- Bangla Instruction Box -->
              <div style="margin-top: 25px; padding: 15px; background: #1a0f0a; border-left: 4px solid #f59e0b; border-radius: 8px; text-align: left;">
                <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: bold; color: #fbbf24;">🔒 নিরাপত্তা বার্তা (Security Alert):</p>
                <p style="margin: 0; font-size: 12px; color: #c4a796; line-height: 1.5;">
                  আপনার ওটিপি (OTP) কোডটি কখনোই অন্য কারো সাথে শেয়ার করবেন না। XN Reward-এর কোনো অ্যাডমিন বা মডারেটর কখনো আপনার কাছে ওটিপি বা পাসওয়ার্ড জানতে চাইবে না।
                </p>
              </div>

              <!-- Official Telegram Button -->
              <div style="margin-top: 30px;">
                <a href="https://t.me/xnrewared" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #f59e0b, #f97316); color: #000000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 25px; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                  Join Official Telegram Channel →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background: #110906; padding: 20px; border-top: 1px solid #2d1a12;">
              <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; color: #a88d7f;">XN Reward Earning Platform</p>
              <p style="margin: 0; font-size: 11px; color: #6e5548;">Need help? Contact 24/7 Helpline on Telegram: <a href="https://t.me/xnhelpline" style="color: #38bdf8; text-decoration: none;">@xnhelpline</a></p>
              <p style="margin: 8px 0 0 0; font-size: 10px; color: #523c32;">© ${new Date().getFullYear()} XN Reward. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// SMTP Failover Handler (Brevo -> Resend -> Fallback)
async function sendOtpEmail(email: string, otpCode: string): Promise<{ success: boolean; providerUsed: string; message: string }> {
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@nxpost.online';
  const emailHtmlContent = getOtpEmailHtml(otpCode, email);
  const activeBrevoKey = systemSettings.brevoApiKey || process.env.BREVO_API_KEY || '';
  const activeResendKey = systemSettings.resendApiKey || process.env.RESEND_API_KEY || '';

  // Check Brevo first
  if (activeBrevoKey && systemSettings.brevoUsedToday < systemSettings.brevoDailyLimit) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': activeBrevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'XN Reward Official', email: brevoSenderEmail },
          to: [{ email }],
          subject: '🔒 Your XN Reward Verification OTP Code',
          htmlContent: emailHtmlContent,
        }),
      });
      if (res.ok) {
        systemSettings.brevoUsedToday++;
        return { success: true, providerUsed: 'Brevo', message: 'OTP sent via Brevo' };
      } else {
        const errText = await res.text();
        console.error('Brevo response error:', errText);
      }
    } catch (e) {
      console.error('Brevo SMTP failed, falling back to Resend:', e);
    }
  }

  // Fallback to Resend
  if (activeResendKey && systemSettings.resendUsedToday < systemSettings.resendDailyLimit) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeResendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'XN Reward <onboarding@resend.dev>',
          to: email,
          subject: '🔒 Your XN Reward Verification OTP Code',
          html: emailHtmlContent,
        }),
      });
      if (res.ok) {
        systemSettings.resendUsedToday++;
        return { success: true, providerUsed: 'Resend', message: 'OTP sent via Resend' };
      } else {
        const errText = await res.text();
        console.error('Resend response error:', errText);
      }
    } catch (e) {
      console.error('Resend SMTP failed:', e);
    }
  }

  // Developer Preview mode helper
  console.log(`[SMTP PREVIEW HELPER] OTP for ${email}: ${otpCode}`);
  return { 
    success: true, 
    providerUsed: 'Preview Console', 
    message: `OTP generated (${otpCode}). SMTP keys can be updated in Admin Panel.` 
  };
}

// Track failed ImgBB API keys so they are not used again in this session
const failedImgbbKeys = new Set<string>();

// ImgBB Upload Proxy with Multi-Key Failover & Automatic Rotation
async function uploadToImgBB(base64Image: string): Promise<string> {
  const rawKeys = `${systemSettings.imgbbApiKey || ''},${process.env.IMGBB_API_KEY || ''}`;
  const allKeys = rawKeys
    .split(/[\s,]+/)
    .map(k => k.trim())
    .filter(k => k.length > 5 && !failedImgbbKeys.has(k));

  if (allKeys.length === 0) {
    console.warn('[ImgBB] No valid active API keys available (or all keys failed). Returning base64 fallback.');
    return base64Image;
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const formData = new URLSearchParams();
  formData.append('image', cleanBase64);

  for (const apiKey of allKeys) {
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data && data.data && data.data.url) {
        console.log(`[ImgBB] Successfully uploaded image using key: ${apiKey.slice(0, 4)}...`);
        return data.data.url;
      } else {
        console.warn(`[ImgBB] Upload failed with key ${apiKey.slice(0, 4)}... Status: ${response.status}. Marking key as failed.`);
        failedImgbbKeys.add(apiKey);
      }
    } catch (err) {
      console.error(`[ImgBB] Error uploading with key ${apiKey.slice(0, 4)}... Marking key as failed:`, err);
      failedImgbbKeys.add(apiKey);
    }
  }

  console.warn('[ImgBB] All available ImgBB API keys failed during this upload attempt.');
  return base64Image;
}

// Helper: Get user by ID or Email with Supabase fallback
async function getUserById(userIdOrEmail: string): Promise<User | null> {
  if (!userIdOrEmail) return null;
  const cleanStr = String(userIdOrEmail).toLowerCase().trim();

  // 1. Memory lookup
  let user = mockUsers.get(userIdOrEmail) || mockUsers.get(cleanStr);
  if (user) return user;

  // 2. Supabase lookup
  try {
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${userIdOrEmail},email.eq.${cleanStr},referral_code.eq.${userIdOrEmail}`)
      .maybeSingle();

    if (dbUser) {
      user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role || 'user',
        balance: Number(dbUser.balance) || 0,
        takaBalance: Number(dbUser.taka_balance) || 0,
        energy: dbUser.energy || 1000,
        maxEnergy: dbUser.max_energy || 1000,
        energyLevel: dbUser.energy_level || 1,
        hitLevel: dbUser.hit_level || 1,
        hitDamage: Number(dbUser.hit_damage) || 0.5,
        subjectLevel: dbUser.subject_level || 1,
        subjectHp: Number(dbUser.subject_hp) || 100,
        subjectMaxHp: Number(dbUser.subject_max_hp) || 100,
        referralCode: dbUser.referral_code || '',
        referredBy: dbUser.referred_by || undefined,
        deviceId: dbUser.device_id || '',
        deviceName: dbUser.device_name || '',
        lastActive: dbUser.last_active || new Date().toISOString(),
        createdAt: dbUser.created_at || new Date().toISOString(),
        lastCheckInDate: dbUser.last_check_in_date || undefined,
        checkInStreak: dbUser.check_in_streak || 0,
        avatar: dbUser.avatar || undefined,
        isBanned: Boolean(dbUser.is_banned),
      };
      mockUsers.set(user.id, user);
      mockUsers.set(user.email.toLowerCase(), user);
      return user;
    }
  } catch (err) {
    console.error('Supabase getUserById error:', err);
  }

  return null;
}

// Helper: Save/Update user in Supabase
async function saveUserToSupabase(user: User): Promise<void> {
  if (!user || !user.id) return;
  try {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
      taka_balance: user.takaBalance || 0,
      energy: user.energy,
      max_energy: user.maxEnergy,
      energy_level: user.energyLevel,
      hit_level: user.hitLevel,
      hit_damage: user.hitDamage,
      subject_level: user.subjectLevel,
      subject_hp: user.subjectHp,
      subject_max_hp: user.subjectMaxHp,
      referral_code: user.referralCode,
      referred_by: user.referredBy || null,
      device_id: user.deviceId,
      device_name: user.deviceName,
      last_active: user.lastActive,
      last_check_in_date: user.lastCheckInDate || null,
      check_in_streak: user.checkInStreak || 0,
      avatar: user.avatar || null,
      is_banned: Boolean(user.isBanned),
    }, { onConflict: 'email' });
    if (error) {
      console.error('Supabase user upsert error:', error.message, error.details);
    }
  } catch (err) {
    console.error('Supabase saveUserToSupabase error:', err);
  }
}

// ---------------- API ROUTES ----------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Auth: Send OTP (Gmail only)
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, deviceId } = req.body;
  if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Only Gmail (@gmail.com) addresses are allowed!' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const sessionKey = deviceId ? `${cleanEmail}_${deviceId}` : cleanEmail;

  // Rule: Max 2 OTP requests per session/email
  const tracker = mockOtpRequestTracker.get(sessionKey) || mockOtpRequestTracker.get(cleanEmail) || { count: 0, lastReset: Date.now() };
  if (Date.now() - tracker.lastReset > 4 * 60 * 60 * 1000) {
    tracker.count = 0;
    tracker.lastReset = Date.now();
  }

  if (tracker.count >= 2) {
    return res.status(429).json({
      error: 'আপনি এই ইমেইলে বা সেশনে সর্বোচ্চ ২ বার ওটিপি (OTP) পাঠিয়েছেন! নিরাপত্তা সুরক্ষায় সাময়িকভাবে ওটিপি পাঠানো বন্ধ রয়েছে। কিছুক্ষণ পর চেষ্টা করুন।'
    });
  }

  tracker.count += 1;
  mockOtpRequestTracker.set(cleanEmail, tracker);
  if (deviceId) {
    mockOtpRequestTracker.set(sessionKey, tracker);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  mockOtps.set(cleanEmail, { code: otpCode, expiresAt });

  // Persist in Supabase for cross-serverless lambda synchronization
  try {
    await supabase.from('otps').upsert({
      email: cleanEmail,
      code: otpCode,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch (err) {
    console.error('Supabase OTP save error:', err);
  }

  const emailResult = await sendOtpEmail(cleanEmail, otpCode);

  // Increment daily OTP stats
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDailyCount = (mockDailyOtpStats.get(todayStr) || 0) + 1;
  mockDailyOtpStats.set(todayStr, currentDailyCount);

  res.json({
    success: true,
    message: emailResult.message,
    provider: emailResult.providerUsed,
  });
});

// 3. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, otp, referralCode, deviceId, deviceName } = req.body;

  if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Only Gmail (@gmail.com) addresses are allowed!' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp || '').trim();

  // Validate OTP from memory or Supabase
  let isValidOtp = false;
  const otpEntry = mockOtps.get(cleanEmail);
  if (otpEntry && String(otpEntry.code).trim() === cleanOtp && Date.now() <= otpEntry.expiresAt) {
    isValidOtp = true;
  } else {
    try {
      const { data: dbOtp } = await supabase
        .from('otps')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbOtp && String(dbOtp.code).trim() === cleanOtp) {
        const expiresTime = new Date(dbOtp.expires_at).getTime();
        if (Date.now() <= expiresTime) {
          isValidOtp = true;
        }
      }
    } catch (err) {
      console.error('Supabase OTP check error:', err);
    }
  }

  if (!isValidOtp) {
    return res.status(400).json({ error: 'Invalid or expired OTP code!' });
  }

  // Check existing user
  let existingUser = mockUsers.get(cleanEmail);
  if (!existingUser) {
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (dbUser) {
        existingUser = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role || 'user',
          balance: Number(dbUser.balance) || 0,
          energy: dbUser.energy || 1000,
          maxEnergy: dbUser.max_energy || 1000,
          energyLevel: dbUser.energy_level || 1,
          hitLevel: dbUser.hit_level || 1,
          hitDamage: Number(dbUser.hit_damage) || 0.5,
          subjectLevel: dbUser.subject_level || 1,
          subjectHp: Number(dbUser.subject_hp) || 100,
          subjectMaxHp: Number(dbUser.subject_max_hp) || 100,
          referralCode: dbUser.referral_code || '',
          referredBy: dbUser.referred_by || undefined,
          deviceId: dbUser.device_id || '',
          deviceName: dbUser.device_name || '',
          lastActive: dbUser.last_active || new Date().toISOString(),
          createdAt: dbUser.created_at || new Date().toISOString(),
        };
        mockUsers.set(existingUser.id, existingUser);
        mockUsers.set(cleanEmail, existingUser);
      }
    } catch (err) {
      console.error('Supabase check existing user error:', err);
    }
  }

  if (existingUser) {
    return res.status(400).json({ error: 'এই জিমেইল (Gmail) দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে! নতুন করে রেজিস্টার না করে অনুগ্রহ করে লগইন করুন।' });
  }

  // 1 Account Per Device Restriction Rule
  if (deviceId && deviceId.trim() !== '') {
    let deviceAlreadyUsed = false;
    for (const u of mockUsers.values()) {
      if (u.deviceId === deviceId && u.email !== cleanEmail) {
        deviceAlreadyUsed = true;
        break;
      }
    }

    if (!deviceAlreadyUsed) {
      try {
        const { data: devUsers } = await supabase
          .from('users')
          .select('id, email')
          .eq('device_id', deviceId);
        if (devUsers && devUsers.length > 0) {
          if (devUsers.some((u: any) => u.email !== cleanEmail)) {
            deviceAlreadyUsed = true;
          }
        }
      } catch (err) {
        console.error('Supabase check device_id error:', err);
      }
    }

    if (deviceAlreadyUsed) {
      return res.status(400).json({
        error: 'একটি ডিভাইস থেকে শুধুমাত্র ১টি অ্যাকাউন্ট তৈরি করা যাবে! আপনার এই ডিভাইসে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে।'
      });
    }
  }

  // Referral Anti-Fraud Check
  let referredByUserId: string | undefined = undefined;
  if (referralCode) {
    let referrerUser: User | undefined;
    for (const u of mockUsers.values()) {
      if (u.referralCode === referralCode) {
        referrerUser = u;
        break;
      }
    }

    if (referrerUser) {
      // Check Anti-Self Referral Rule (Device ID or Device Name/fingerprint match or same email)
      const isDeviceMatch = 
        (deviceId && referrerUser.deviceId === deviceId) ||
        (deviceName && referrerUser.deviceName && referrerUser.deviceName.toLowerCase() === deviceName.toLowerCase()) ||
        (referrerUser.email.toLowerCase() === cleanEmail);

      if (isDeviceMatch) {
        return res.status(400).json({
          error: 'রেফার ব্যর্থ: একই ডিভাইস বা একই ডিভাইসের নাম (Same Device Fingerprint) থেকে নিজের রেফার ব্যবহার করা যাবে না! (Anti-Self Referral Protection)'
        });
      }

      referredByUserId = referrerUser.id;
    }
  }

  const userId = `usr_${Date.now()}`;
  const userRefCode = `NXB${Math.floor(100000 + Math.random() * 900000)}`;

  const newUser: User = {
    id: userId,
    name: name || 'XN Hunter',
    email: cleanEmail,
    role: ADMIN_EMAILS.includes(cleanEmail) ? 'admin' : 'user',
    balance: 100, // Joining bonus 100 Coin
    energy: 200, // Default Charge: 200
    maxEnergy: 200,
    energyLevel: 1,
    hitLevel: 1,
    hitDamage: 0.5,
    subjectLevel: 1,
    subjectHp: 100, // Default Subject 1 HP: 100
    subjectMaxHp: 100,
    referralCode: userRefCode,
    referredBy: referredByUserId,
    deviceId: deviceId || `dev_${Math.random()}`,
    deviceName: deviceName || 'Generic Device',
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Persist user in Supabase FIRST before adding to memory
  try {
    const { error } = await supabase.from('users').upsert({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      password: password || '',
      role: newUser.role,
      balance: newUser.balance,
      energy: newUser.energy,
      max_energy: newUser.maxEnergy,
      energy_level: newUser.energyLevel,
      hit_level: newUser.hitLevel,
      hit_damage: newUser.hitDamage,
      subject_level: newUser.subjectLevel,
      subject_hp: newUser.subjectHp,
      subject_max_hp: newUser.subjectMaxHp,
      referral_code: newUser.referralCode,
      referred_by: newUser.referredBy,
      device_id: newUser.deviceId,
      device_name: newUser.deviceName,
      last_active: newUser.lastActive,
      created_at: newUser.createdAt,
    }, { onConflict: 'email' });

    if (error) {
      console.error('Supabase register error:', error.message, error.details);
      if (error.message?.includes('duplicate key') || error.message?.includes('users_email_key') || error.message?.includes('email')) {
        return res.status(400).json({
          error: 'এই জিমেইল (Gmail) দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে! নতুন করে রেজিস্টার না করে অনুগ্রহ করে লগইন করুন।'
        });
      }
      return res.status(500).json({
        error: `ডাটাবেসে অ্যাকাউন্ট সংরক্ষণ করতে সমস্যা হয়েছে: ${error.message}`
      });
    }
  } catch (err: any) {
    console.error('Supabase save user error:', err);
    return res.status(500).json({
      error: `সার্ভার এরর: ডাটাবেসে সংযোগ করা সম্ভব হয়নি।`
    });
  }

  // Now that database write succeeded without error, add to memory cache!
  mockUsers.set(userId, newUser);
  mockUsers.set(cleanEmail, newUser);

  // If referred, create Referral Record & evaluate verification rules
  if (referredByUserId) {
    const referrer = mockUsers.get(referredByUserId);
    if (referrer) {
      // Check if this is 1st referral or subsequent
      const referrerPrevReferrals = mockReferrals.filter(r => r.referrerId === referrer.id);
      const isFirst = referrerPrevReferrals.length === 0;

      const refRecord: ReferralRecord = {
        id: `ref_${Date.now()}`,
        referrerId: referrer.id,
        referredUserId: newUser.id,
        referredUserName: newUser.name,
        referredUserEmail: newUser.email,
        referredDeviceId: newUser.deviceId,
        referredDeviceName: newUser.deviceName || 'Device',
        isFirstReferral: isFirst,
        status: isFirst ? 'verified' : 'pending', // 1st referral verified fast; subsequent requires 12h evaluation
        createdAt: new Date().toISOString(),
      };

      if (isFirst) {
        // 10 Taka reward for referral (1k coins = 2 Taka => 5000 coins)
        referrer.balance += 5000;
        refRecord.verifiedAt = new Date().toISOString();
      }

      mockReferrals.push(refRecord);
    }
  }

  mockOtps.delete(cleanEmail);

  res.json({
    success: true,
    user: newUser,
    token: `token_${userId}`,
  });
});

// 4. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password, deviceId, deviceName } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  let user = mockUsers.get(cleanEmail);
  let dbUserPassword = '';

  try {
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dbUser) {
      dbUserPassword = dbUser.password || '';
      if (!user) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: ADMIN_EMAILS.includes(cleanEmail) ? 'admin' : (dbUser.role || 'user'),
          balance: Number(dbUser.balance) || 0,
          energy: dbUser.energy || 200,
          maxEnergy: dbUser.max_energy || 200,
          energyLevel: dbUser.energy_level || 1,
          hitLevel: dbUser.hit_level || 1,
          hitDamage: Number(dbUser.hit_damage) || 0.5,
          subjectLevel: dbUser.subject_level || 1,
          subjectHp: Number(dbUser.subject_hp) || 100,
          subjectMaxHp: Number(dbUser.subject_max_hp) || 100,
          referralCode: dbUser.referral_code || '',
          referredBy: dbUser.referred_by || undefined,
          deviceId: dbUser.device_id || '',
          deviceName: dbUser.device_name || '',
          lastActive: dbUser.last_active || new Date().toISOString(),
          createdAt: dbUser.created_at || new Date().toISOString(),
        };
        mockUsers.set(user.id, user);
        mockUsers.set(cleanEmail, user);
      }
    }
  } catch (err) {
    console.error('Supabase fetch login user error:', err);
  }

  if (!user) {
    return res.status(404).json({ error: 'No account found with this Gmail. Please sign up.' });
  }

  // Password verification check
  if (dbUserPassword && dbUserPassword !== password) {
    return res.status(401).json({ error: 'Incorrect password! Please check and try again.' });
  }

  // 1 Account Per Device Restriction Rule on Login
  if (deviceId && deviceId.trim() !== '') {
    let deviceAlreadyUsedByOther = false;
    for (const u of mockUsers.values()) {
      if (u.deviceId === deviceId && u.email !== cleanEmail && u.id !== user.id) {
        deviceAlreadyUsedByOther = true;
        break;
      }
    }
    if (!deviceAlreadyUsedByOther) {
      try {
        const { data: devUsers } = await supabase
          .from('users')
          .select('id, email')
          .eq('device_id', deviceId);
        if (devUsers && devUsers.length > 0) {
          if (devUsers.some((u: any) => u.email !== cleanEmail && u.id !== user?.id)) {
            deviceAlreadyUsedByOther = true;
          }
        }
      } catch (err) {
        console.error('Supabase check login device_id error:', err);
      }
    }
    if (deviceAlreadyUsedByOther) {
      return res.status(400).json({
        error: 'একটি ডিভাইস থেকে শুধুমাত্র ১টি অ্যাকাউন্ট ব্যবহার করা যাবে! আপনার এই ডিভাইসে ইতিমধ্যে অন্য একটি অ্যাকাউন্ট রয়েছে।'
      });
    }
  }

  if (deviceId && !user.deviceId) user.deviceId = deviceId;
  if (deviceName && !user.deviceName) user.deviceName = deviceName;
  user.energy = calculateRechargedEnergy(user);
  user.lastActive = new Date().toISOString();
  await saveUserToSupabase(user);

  res.json({
    success: true,
    user,
    token: `token_${user.id}`,
  });
});

// 5. Game: Synchronize / Fetch User State
app.get('/api/game/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.energy = calculateRechargedEnergy(user);
  user.lastActive = new Date().toISOString();
  await saveUserToSupabase(user);

  res.json({ success: true, user });
});

// 5.5 Game: Periodic 30-Second Auto Sync User State
app.post('/api/game/sync', async (req, res) => {
  const { userId, userState } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (userState) {
    if (typeof userState.balance === 'number' && !isNaN(userState.balance)) {
      user.balance = Math.max(user.balance, userState.balance);
    }
    if (typeof userState.takaBalance === 'number' && !isNaN(userState.takaBalance)) {
      user.takaBalance = Math.max(user.takaBalance || 0, userState.takaBalance);
    }
    if (typeof userState.energy === 'number' && !isNaN(userState.energy)) {
      user.energy = userState.energy;
    }
    if (typeof userState.subjectHp === 'number' && !isNaN(userState.subjectHp)) {
      user.subjectHp = userState.subjectHp;
    }
    if (typeof userState.subjectLevel === 'number' && !isNaN(userState.subjectLevel)) {
      user.subjectLevel = Math.max(user.subjectLevel, userState.subjectLevel);
    }
    if (typeof userState.subjectMaxHp === 'number' && !isNaN(userState.subjectMaxHp)) {
      user.subjectMaxHp = userState.subjectMaxHp;
    }
    if (typeof userState.energyLevel === 'number' && !isNaN(userState.energyLevel)) {
      user.energyLevel = Math.max(user.energyLevel, userState.energyLevel);
    }
    if (typeof userState.hitLevel === 'number' && !isNaN(userState.hitLevel)) {
      user.hitLevel = Math.max(user.hitLevel, userState.hitLevel);
    }
    if (typeof userState.hitDamage === 'number' && !isNaN(userState.hitDamage)) {
      user.hitDamage = userState.hitDamage;
    }
    if (typeof userState.maxEnergy === 'number' && !isNaN(userState.maxEnergy)) {
      user.maxEnergy = userState.maxEnergy;
    }
  }

  user.energy = calculateRechargedEnergy(user);
  user.lastActive = new Date().toISOString();

  // Save in memory map
  mockUsers.set(user.id, user);
  if (user.email) mockUsers.set(user.email.toLowerCase(), user);

  // Persist to Supabase Database
  await saveUserToSupabase(user);

  res.json({ success: true, message: 'Data synced successfully to database', user });
});

// 6. Game: Tap Action
app.post('/api/game/tap', async (req, res) => {
  const { userId, tapsCount = 1 } = req.body;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.energy = calculateRechargedEnergy(user);

  if (user.energy < tapsCount) {
    return res.status(400).json({
      error: 'Not enough charge/energy! Energy recharges over 6 hours or upgrade Charge Box.',
      user,
    });
  }

  // Apply Taps
  const coinsEarned = tapsCount * user.hitDamage;
  user.energy -= tapsCount;
  user.balance += coinsEarned;

  // Damage Subject HP
  let damageDone = tapsCount * user.hitDamage;
  let subjectLevelUp = false;

  user.subjectHp -= damageDone;

  if (user.subjectHp <= 0) {
    subjectLevelUp = true;
    user.subjectLevel += 1;
    user.subjectMaxHp = user.subjectLevel * 100;
    user.subjectHp = user.subjectMaxHp;
    // Level Up Bonus!
    user.balance += user.subjectLevel * 50;
  }

  user.lastActive = new Date().toISOString();

  // Save changes to database
  await saveUserToSupabase(user);

  res.json({
    success: true,
    tapsCount,
    coinsEarned,
    newBalance: user.balance,
    newEnergy: user.energy,
    newSubjectHp: user.subjectHp,
    subjectLevelUp,
    newSubjectLevel: user.subjectLevel,
    newSubjectMaxHp: user.subjectMaxHp,
    user,
  });
});

// Daily Check-In Claim Route
const DAILY_CHECKIN_REWARDS = [
  { day: 1, reward: 500 },
  { day: 2, reward: 1000 },
  { day: 3, reward: 2500 },
  { day: 4, reward: 5000 },
  { day: 5, reward: 10000 },
  { day: 6, reward: 15000 },
  { day: 7, reward: 25000, bonusEnergy: 100 },
];

app.post('/api/checkin/claim', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (user.lastCheckInDate === todayStr) {
    return res.status(400).json({
      error: 'আজকের দৈনিক বোনাস ইতিমধ্যে দাবি করা হয়েছে! আগামীকাল আবার আসুন।'
    });
  }

  // Calculate streak
  let newStreak = 1;
  if (user.lastCheckInDate) {
    const lastDate = new Date(user.lastCheckInDate);
    const currentDate = new Date(todayStr);
    const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = ((user.checkInStreak || 0) % 7) + 1;
    } else if (diffDays === 0) {
      newStreak = user.checkInStreak || 1;
    } else {
      newStreak = 1; // streak broken
    }
  }

  const rewardObj = DAILY_CHECKIN_REWARDS.find(r => r.day === newStreak) || DAILY_CHECKIN_REWARDS[0];

  user.balance += rewardObj.reward;
  if (rewardObj.bonusEnergy) {
    user.energy = Math.min(user.maxEnergy, user.energy + rewardObj.bonusEnergy);
  }
  user.lastCheckInDate = todayStr;
  user.checkInStreak = newStreak;
  user.lastActive = new Date().toISOString();

  // Update in-memory cache
  mockUsers.set(user.id, user);
  if (user.email) mockUsers.set(user.email.toLowerCase(), user);

  await saveUserToSupabase(user);

  res.json({
    success: true,
    message: `অভিনন্দন! আপনি Day ${newStreak} এর বোনাস +${rewardObj.reward.toLocaleString()} Coins পেয়েছেন! 🎉`,
    rewardCoins: rewardObj.reward,
    streak: newStreak,
    user,
  });
});

// 7. Game: Upgrades (Charge Box Level UP & Hit Damage Level UP)
app.post('/api/game/upgrade', async (req, res) => {
  const { userId, upgradeType } = req.body; // 'energy' or 'hit'
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (upgradeType === 'energy') {
    const cost = user.energyLevel * 100;
    if (user.balance < cost) {
      return res.status(400).json({ error: `Insufficient $NXB balance! Needs ${cost} coins.` });
    }
    user.balance -= cost;
    user.energyLevel += 1;
    user.maxEnergy += 500;
    user.energy = user.maxEnergy; // Fully refills energy on upgrade!
  } else if (upgradeType === 'hit') {
    const cost = user.hitLevel * 150;
    if (user.balance < cost) {
      return res.status(400).json({ error: `Insufficient $NXB balance! Needs ${cost} coins.` });
    }
    user.balance -= cost;
    user.hitLevel += 1;
    user.hitDamage = user.hitLevel * 0.5;
  } else {
    return res.status(400).json({ error: 'Invalid upgrade type' });
  }

  user.lastActive = new Date().toISOString();
  await saveUserToSupabase(user);

  res.json({ success: true, user });
});

// 8. Tasks: Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json({ success: true, tasks: mockTasks });
});

// 9. Tasks: Submit proof
app.post('/api/tasks/submit', async (req, res) => {
  const { taskId, userId, proofImageBase64 } = req.body;
  const user = await getUserById(userId);
  const task = mockTasks.find(t => t.id === taskId);

  if (!user || !task) {
    return res.status(400).json({ error: 'Invalid user or task ID' });
  }

  let imageUrl = '';
  if (task.requiresProof && proofImageBase64) {
    imageUrl = await uploadToImgBB(proofImageBase64);
  }

  const submission: TaskSubmission = {
    id: `sub_${Date.now()}`,
    taskId,
    userId,
    userName: user.name,
    userEmail: user.email,
    proofImageUrl: imageUrl,
    status: task.requiresProof ? 'pending' : 'approved',
    submittedAt: new Date().toISOString(),
  };

  if (!task.requiresProof) {
    // Auto approve task reward in Taka
    user.takaBalance = (user.takaBalance || 0) + task.reward;
  }

  mockSubmissions.push(submission);
  await saveUserToSupabase(user);

  res.json({
    success: true,
    submission,
    user,
    newBalance: user.balance,
    newTakaBalance: user.takaBalance,
    message: task.requiresProof ? 'Proof screenshot submitted for admin review!' : 'Task completed and ৳ Taka reward added!',
  });
});

// 10. Tasks: User Submissions
app.get('/api/tasks/my-submissions/:userId', (req, res) => {
  const { userId } = req.params;
  const userSubmissions = mockSubmissions.filter(s => s.userId === userId);
  res.json({ success: true, submissions: userSubmissions });
});

// 11. Referrals: Get User Referrals & Status
app.get('/api/referrals/my/:userId', async (req, res) => {
  const { userId } = req.params;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Perform referral verification evaluation for pending 12-hour referrals
  const now = Date.now();
  const referrals = mockReferrals.filter(r => r.referrerId === userId);

  referrals.forEach(ref => {
    if (ref.status === 'pending') {
      const referredUser = mockUsers.get(ref.referredUserId);
      if (referredUser) {
        const createdAtTime = new Date(ref.createdAt).getTime();
        const elapsedHours = (now - createdAtTime) / (3600 * 1000);

        // Verification condition checks:
        // 1. Logged in dashboard at least 1 hour in last 10 hours
        const lastActiveTime = new Date(referredUser.lastActive).getTime();
        const activeWithinLast10Hours = (now - lastActiveTime) <= (10 * 3600 * 1000);

        // 2. Completed at least 1 task AND balance > 200
        const userApprovedSubmissions = mockSubmissions.filter(s => s.userId === referredUser.id && s.status === 'approved');
        const completedTaskAndHighBalance = userApprovedSubmissions.length >= 1 && referredUser.balance >= 200;

        if (activeWithinLast10Hours || completedTaskAndHighBalance) {
          ref.status = 'verified';
          ref.verifiedAt = new Date().toISOString();
          // Credit 10 Taka for verified referral
          user.takaBalance = (user.takaBalance || 0) + 10;
        } else if (elapsedHours >= 12) {
          // If 12 hours passed without meeting conditions, mark failed
          ref.status = 'failed';
          ref.failureReason = 'Did not meet activity requirements (10h active dashboard or task + 200 NXB balance) within 12 hours.';
        }
      }
    }
  });

  res.json({
    success: true,
    referralCode: user.referralCode,
    referrals,
    verifiedCount: referrals.filter(r => r.status === 'verified').length,
    pendingCount: referrals.filter(r => r.status === 'pending').length,
  });
});

// 12. Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const allUsers = Array.from(new Set(mockUsers.values()))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 50)
    .map(u => ({
      id: u.id,
      name: u.name,
      balance: u.balance,
      subjectLevel: u.subjectLevel,
    }));

  res.json({ success: true, leaderboard: allUsers });
});

// 13. Admin & Public System Settings
app.get('/api/settings/public', (req, res) => {
  res.json({
    success: true,
    settings: {
      tutorialFbVideoUrl: systemSettings.tutorialFbVideoUrl || 'https://www.facebook.com/reel/1148805566373760',
      supportTelegramUrl: systemSettings.supportTelegramUrl || 'https://t.me/xnhelpline',
      channelTelegramUrl: systemSettings.channelTelegramUrl || 'https://t.me/xnrewared',
      popupWelcomeText: systemSettings.popupWelcomeText || 'ভিডিও দেখুন! (Tutorial)',
    }
  });
});

app.get('/api/admin/settings', (req, res) => {
  res.json({ success: true, settings: systemSettings });
});

app.get('/api/admin/otp-stats', (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = mockDailyOtpStats.get(todayStr) || (systemSettings.brevoUsedToday + systemSettings.resendUsedToday);
  let totalCount = 0;
  const history: { date: string; count: number }[] = [];

  if (!mockDailyOtpStats.has(todayStr)) {
    mockDailyOtpStats.set(todayStr, todayCount);
  }

  mockDailyOtpStats.forEach((count, date) => {
    totalCount += count;
    history.push({ date, count });
  });
  history.sort((a, b) => b.date.localeCompare(a.date));

  res.json({
    success: true,
    todayDate: todayStr,
    todayCount,
    totalCount,
    history,
    brevoUsedToday: systemSettings.brevoUsedToday,
    resendUsedToday: systemSettings.resendUsedToday
  });
});

app.post('/api/admin/settings', (req, res) => {
  const {
    imgbbApiKey, brevoApiKey, resendApiKey, brevoDailyLimit, resendDailyLimit,
    tutorialFbVideoUrl, supportTelegramUrl, channelTelegramUrl, popupWelcomeText
  } = req.body;
  if (imgbbApiKey !== undefined) {
    systemSettings.imgbbApiKey = imgbbApiKey;
    failedImgbbKeys.clear(); // Clear failed keys on admin update so corrected keys can be re-tested
  }
  if (brevoApiKey !== undefined) systemSettings.brevoApiKey = brevoApiKey;
  if (resendApiKey !== undefined) systemSettings.resendApiKey = resendApiKey;
  if (brevoDailyLimit !== undefined) systemSettings.brevoDailyLimit = Number(brevoDailyLimit);
  if (resendDailyLimit !== undefined) systemSettings.resendDailyLimit = Number(resendDailyLimit);
  if (tutorialFbVideoUrl !== undefined) systemSettings.tutorialFbVideoUrl = tutorialFbVideoUrl;
  if (supportTelegramUrl !== undefined) systemSettings.supportTelegramUrl = supportTelegramUrl;
  if (channelTelegramUrl !== undefined) systemSettings.channelTelegramUrl = channelTelegramUrl;
  if (popupWelcomeText !== undefined) systemSettings.popupWelcomeText = popupWelcomeText;

  res.json({ success: true, settings: systemSettings, message: 'Settings updated successfully!' });
});

// 14. Admin: Submissions review
app.get('/api/admin/submissions', (req, res) => {
  res.json({ success: true, submissions: mockSubmissions });
});

app.post('/api/admin/submissions/review', async (req, res) => {
  const { submissionId, status, rejectionReason } = req.body;
  const sub = mockSubmissions.find(s => s.id === submissionId);

  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  sub.status = status;
  sub.reviewedAt = new Date().toISOString();
  if (rejectionReason) sub.rejectionReason = rejectionReason;

  if (status === 'approved') {
    const user = mockUsers.get(sub.userId) || await getUserById(sub.userId);
    const task = mockTasks.find(t => t.id === sub.taskId);
    if (user && task) {
      user.takaBalance = (user.takaBalance || 0) + task.reward;
      await saveUserToSupabase(user);
    }
  }

  res.json({ success: true, submission: sub });
});

// 15. Admin: Create Task
app.post('/api/admin/tasks', (req, res) => {
  const { title, description, reward, type, category, actionUrl, requiresProof } = req.body;

  const newTask: Task = {
    id: `task_${Date.now()}`,
    title,
    description,
    reward: Number(reward) || 100,
    type: type || 'one_time',
    category: category || 'social',
    actionUrl,
    requiresProof: Boolean(requiresProof),
    createdAt: new Date().toISOString(),
  };

  mockTasks.push(newTask);
  res.json({ success: true, task: newTask });
});

// 15b. Admin: Update Task
app.put('/api/admin/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, reward, type, category, actionUrl, requiresProof } = req.body;

  const index = mockTasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  mockTasks[index] = {
    ...mockTasks[index],
    title: title || mockTasks[index].title,
    description: description !== undefined ? description : mockTasks[index].description,
    reward: reward !== undefined ? Number(reward) : mockTasks[index].reward,
    type: type || mockTasks[index].type,
    category: category || mockTasks[index].category,
    actionUrl: actionUrl !== undefined ? actionUrl : mockTasks[index].actionUrl,
    requiresProof: requiresProof !== undefined ? Boolean(requiresProof) : mockTasks[index].requiresProof,
  };

  res.json({ success: true, task: mockTasks[index] });
});

// 15c. Admin: Delete Task
app.delete('/api/admin/tasks/:id', (req, res) => {
  const { id } = req.params;
  const index = mockTasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const deletedTask = mockTasks[index];
  mockTasks.splice(index, 1);
  res.json({ success: true, deletedTaskId: id, task: deletedTask });
});

// 16. Withdrawal Endpoints
app.post('/api/withdraw/request', async (req, res) => {
  const { userId, paymentMethod, accountNumber, coinsAmount, takaAmount, withdrawType } = req.body;

  if (!userId || !paymentMethod || !accountNumber) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found!' });
  }

  // 1. Referral check: Must have at least 4 referrals
  const userRefs = mockReferrals.filter(r => r.referrerId === user.id);
  let totalRefs = userRefs.length;
  if (totalRefs === 0) {
    try {
      const { data: dbRefs } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);
      if (dbRefs) totalRefs = dbRefs.length;
    } catch (err) {
      console.error('Supabase fetch referrals count error:', err);
    }
  }

  if (totalRefs < 4) {
    return res.status(400).json({
      error: `উইথড্র করতে সর্বনিম্ন ৪ জন রেফার লাগবে! (আপনার বর্তমান রেফার: ${totalRefs})`
    });
  }

  const isTakaWithdraw = withdrawType === 'taka';
  let finalCoinsAmount = 0;
  let finalTakaAmount = 0;

  if (isTakaWithdraw) {
    // Taka Withdrawal Rule: Minimum 300 Taka required
    const reqTaka = Number(takaAmount) || 0;
    if (reqTaka < 300) {
      return res.status(400).json({
        error: 'টাকা উইথড্র করতে সর্বনিম্ন ৩০০ Taka লাগবে!'
      });
    }

    const currentTaka = user.takaBalance || 0;
    if (currentTaka < reqTaka) {
      return res.status(400).json({
        error: `আপনার অ্যাকাউন্টে পর্যাপ্ত Taka নেই! (বর্তমান Taka ব্যালেন্স: ৳${currentTaka.toLocaleString()} BDT)`
      });
    }

    finalTakaAmount = reqTaka;
    finalCoinsAmount = 0;
    user.takaBalance = Math.max(0, currentTaka - reqTaka);
  } else {
    // Coins Withdrawal Rule: 1k Coins = 2 Taka. Min 250k before Aug 15 / 100k after Aug 15
    const reqCoins = Number(coinsAmount) || 0;
    const targetDate = new Date('2026-08-15T00:00:00');
    const isBeforeAug15 = new Date() < targetDate;
    const minCoinsRequired = isBeforeAug15 ? 250000 : 100000;

    if (reqCoins < minCoinsRequired) {
      const minText = isBeforeAug15 ? '২৫০k (250,000)' : '১০০k (100,000)';
      return res.status(400).json({
        error: `১৫ আগস্ট এর ${isBeforeAug15 ? 'আগে' : 'পর'} উইথড্র করতে সর্বনিম্ন ${minText} Coin লাগবে!`
      });
    }

    if (user.balance < reqCoins) {
      return res.status(400).json({
        error: `আপনার অ্যাকাউন্টে পর্যাপ্ত Coin নেই! (বর্তমান ব্যালেন্স: ${user.balance.toLocaleString()} Coin)`
      });
    }

    finalCoinsAmount = reqCoins;
    finalTakaAmount = Math.floor((reqCoins / 1000) * 2);
    user.balance -= reqCoins;
  }

  mockUsers.set(user.id, user);
  if (user.email) mockUsers.set(user.email.toLowerCase(), user);
  await saveUserToSupabase(user);

  const withdrawalRecord: WithdrawalRecord = {
    id: `wth_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    withdrawType: isTakaWithdraw ? 'taka' : 'coins',
    paymentMethod,
    accountNumber,
    coinsAmount: finalCoinsAmount,
    takaAmount: finalTakaAmount,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  mockWithdrawals.push(withdrawalRecord);

  // Persist in Supabase
  try {
    await supabase.from('withdrawals').upsert({
      id: withdrawalRecord.id,
      user_id: withdrawalRecord.userId,
      user_name: withdrawalRecord.userName,
      user_email: withdrawalRecord.userEmail,
      payment_method: withdrawalRecord.paymentMethod,
      account_number: withdrawalRecord.accountNumber,
      coins_amount: withdrawalRecord.coinsAmount,
      taka_amount: withdrawalRecord.takaAmount,
      status: withdrawalRecord.status,
      requested_at: withdrawalRecord.requestedAt,
    });
  } catch (err) {
    console.error('Supabase save withdrawal error:', err);
  }

  res.json({
    success: true,
    message: 'Withdrawal request submitted successfully to Request Panel!',
    withdrawal: withdrawalRecord,
    user,
  });
});

app.get('/api/withdraw/my/:userId', async (req, res) => {
  const { userId } = req.params;
  let list = mockWithdrawals.filter(w => w.userId === userId);

  if (list.length === 0) {
    try {
      const { data: dbWths } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });

      if (dbWths) {
        list = dbWths.map(w => ({
          id: w.id,
          userId: w.user_id,
          userName: w.user_name,
          userEmail: w.user_email,
          paymentMethod: w.payment_method,
          accountNumber: w.account_number,
          coinsAmount: Number(w.coins_amount) || 0,
          takaAmount: Number(w.taka_amount) || 0,
          status: w.status,
          rejectionReason: w.rejection_reason,
          requestedAt: w.requested_at,
          processedAt: w.processed_at,
        }));
      }
    } catch (err) {
      console.error('Supabase fetch my withdrawals error:', err);
    }
  }

  res.json({ success: true, withdrawals: list });
});

app.get('/api/admin/withdrawals', async (req, res) => {
  let list = [...mockWithdrawals];

  try {
    const { data: dbWths } = await supabase
      .from('withdrawals')
      .select('*')
      .order('requested_at', { ascending: false });

    if (dbWths && dbWths.length > 0) {
      list = dbWths.map(w => ({
        id: w.id,
        userId: w.user_id,
        userName: w.user_name,
        userEmail: w.user_email,
        paymentMethod: w.payment_method,
        accountNumber: w.account_number,
        coinsAmount: Number(w.coins_amount) || 0,
        takaAmount: Number(w.taka_amount) || 0,
        status: w.status,
        rejectionReason: w.rejection_reason,
        requestedAt: w.requested_at,
        processedAt: w.processed_at,
      }));
    }
  } catch (err) {
    console.error('Supabase fetch admin withdrawals error:', err);
  }

  res.json({ success: true, withdrawals: list });
});

app.post('/api/admin/withdrawals/review', async (req, res) => {
  const { withdrawalId, status, rejectionReason } = req.body;

  const wRecord = mockWithdrawals.find(w => w.id === withdrawalId);
  if (wRecord) {
    wRecord.status = status;
    wRecord.processedAt = new Date().toISOString();
    wRecord.rejectionReason = rejectionReason;

    // Refund if rejected
    if (status === 'rejected') {
      const user = await getUserById(wRecord.userId);
      if (user) {
        user.balance += wRecord.coinsAmount;
        await saveUserToSupabase(user);
      }
    }
  }

  try {
    await supabase.from('withdrawals').update({
      status,
      rejection_reason: rejectionReason || null,
      processed_at: new Date().toISOString(),
    }).eq('id', withdrawalId);

    if (status === 'rejected' && wRecord) {
      const user = await getUserById(wRecord.userId);
      if (user) {
        await supabase.from('users').update({ balance: user.balance }).eq('id', user.id);
      }
    }
  } catch (err) {
    console.error('Supabase review withdrawal error:', err);
  }

  res.json({ success: true, message: `Withdrawal request ${status}` });
});

// 17. User Profile Avatar / DP Upload
app.post('/api/user/upload-avatar', async (req, res) => {
  const { userId, imageBase64 } = req.body;
  if (!userId || !imageBase64) {
    return res.status(400).json({ error: 'User ID and image data are required!' });
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found!' });
  }

  // Upload to ImgBB
  const avatarUrl = await uploadToImgBB(imageBase64);
  user.avatar = avatarUrl;

  mockUsers.set(user.id, user);
  if (user.email) mockUsers.set(user.email.toLowerCase(), user);

  await saveUserToSupabase(user);

  res.json({
    success: true,
    message: 'Profile picture updated successfully!',
    avatar: avatarUrl,
    user,
  });
});

// 18. Admin Users Section Endpoints
app.get('/api/admin/users', async (req, res) => {
  const query = (req.query.query as string || '').toLowerCase().trim();

  let allUsersList: User[] = Array.from(new Set(mockUsers.values()));

  try {
    const { data: dbUsers } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbUsers && dbUsers.length > 0) {
      const dbMap = new Map<string, User>();
      dbUsers.forEach(dbU => {
        const mappedUser: User = {
          id: dbU.id,
          name: dbU.name,
          email: dbU.email,
          role: dbU.role || 'user',
          balance: Number(dbU.balance) || 0,
          energy: dbU.energy || 1000,
          maxEnergy: dbU.max_energy || 1000,
          energyLevel: dbU.energy_level || 1,
          hitLevel: dbU.hit_level || 1,
          hitDamage: Number(dbU.hit_damage) || 0.5,
          subjectLevel: dbU.subject_level || 1,
          subjectHp: Number(dbU.subject_hp) || 100,
          subjectMaxHp: Number(dbU.subject_max_hp) || 100,
          referralCode: dbU.referral_code || '',
          referredBy: dbU.referred_by || undefined,
          deviceId: dbU.device_id || '',
          deviceName: dbU.device_name || '',
          lastActive: dbU.last_active || new Date().toISOString(),
          createdAt: dbU.created_at || new Date().toISOString(),
          lastCheckInDate: dbU.last_check_in_date || undefined,
          checkInStreak: dbU.check_in_streak || 0,
          avatar: dbU.avatar || undefined,
          isBanned: Boolean(dbU.is_banned),
        };
        dbMap.set(mappedUser.id, mappedUser);
      });

      // Merge memory users with DB users
      mockUsers.forEach(mU => {
        dbMap.set(mU.id, mU);
      });

      allUsersList = Array.from(dbMap.values());
    }
  } catch (err) {
    console.error('Supabase fetch admin users error:', err);
  }

  // Filter if query present
  if (query) {
    allUsersList = allUsersList.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(query))
    );
  }

  res.json({ success: true, users: allUsersList });
});

// Admin: Adjust Balance
app.post('/api/admin/users/adjust-balance', async (req, res) => {
  const { userId, amount, action } = req.body;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found!' });
  }

  const numericAmount = Number(amount) || 0;
  if (action === 'subtract') {
    user.balance = Math.max(0, user.balance - numericAmount);
  } else {
    user.balance += numericAmount;
  }

  mockUsers.set(user.id, user);
  if (user.email) mockUsers.set(user.email.toLowerCase(), user);
  await saveUserToSupabase(user);

  res.json({
    success: true,
    message: `User balance ${action === 'subtract' ? 'deducted' : 'increased'} by ${numericAmount.toLocaleString()} coins`,
    user,
  });
});

// Admin: Adjust Referrals
app.post('/api/admin/users/adjust-referrals', async (req, res) => {
  const { userId, referralCount } = req.body;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found!' });
  }

  const count = Number(referralCount) || 1;
  // Add synthetic verified referrals
  for (let i = 0; i < count; i++) {
    const dummyRef: ReferralRecord = {
      id: `ref_admin_add_${Date.now()}_${i}`,
      referrerId: user.id,
      referredUserId: `usr_dummy_${Date.now()}_${i}`,
      referredUserName: `Admin Added Referral ${i + 1}`,
      referredUserEmail: `ref${i + 1}@nxpost.online`,
      referredDeviceId: `dev_ref_${i}`,
      referredDeviceName: 'Verified Member',
      isFirstReferral: false,
      status: 'verified',
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };
    mockReferrals.push(dummyRef);

    try {
      await supabase.from('referrals').upsert({
        id: dummyRef.id,
        referrer_id: dummyRef.referrerId,
        referred_user_id: dummyRef.referredUserId,
        referred_user_name: dummyRef.referredUserName,
        referred_user_email: dummyRef.referredUserEmail,
        referred_device_id: dummyRef.referredDeviceId,
        referred_device_name: dummyRef.referredDeviceName,
        is_first_referral: false,
        status: 'verified',
        created_at: dummyRef.createdAt,
        verified_at: dummyRef.verifiedAt,
      });
    } catch (err) {
      console.error('Supabase add dummy ref error:', err);
    }
  }

  res.json({
    success: true,
    message: `Added ${count} verified referral(s) to user!`,
    user,
  });
});

// Admin: Ban / Unban User
app.post('/api/admin/users/ban', async (req, res) => {
  const { userId, isBanned } = req.body;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found!' });
  }

  user.isBanned = Boolean(isBanned);
  mockUsers.set(user.id, user);
  if (user.email) mockUsers.set(user.email.toLowerCase(), user);
  await saveUserToSupabase(user);

  res.json({
    success: true,
    message: `User has been ${user.isBanned ? 'Banned 🚫' : 'Unbanned ✅'}!`,
    user,
  });
});

// Admin: Delete User
app.delete('/api/admin/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const user = await getUserById(userId);

  if (user) {
    mockUsers.delete(user.id);
    if (user.email) mockUsers.delete(user.email.toLowerCase());
  }

  try {
    await supabase.from('users').delete().eq('id', userId);
  } catch (err) {
    console.error('Supabase delete user error:', err);
  }

  res.json({ success: true, message: 'User deleted permanently!' });
});

// Serve Vite frontend
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`XN Reward Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
