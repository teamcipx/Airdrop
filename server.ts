import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SystemSettings, User, Task, TaskSubmission, ReferralRecord, WithdrawalRecord } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Prevent browser and CDN caching of API responses (fixes 304 Not Modified issues)
app.set('etag', false);
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

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
  tutorialFbVideoUrl: 'https://www.facebook.com/reel/3457251397779299/?app=fbl',
  supportTelegramUrl: 'https://t.me/xnhelpline',
  channelTelegramUrl: 'https://t.me/xnrewared',
  popupWelcomeText: 'ভিডিও দেখুন! (Tutorial)',
  requireEmailOtp: true,
  freeimageApiKey: process.env.FREEIMAGE_HOST_API_KEY || '6D2B7A6A60205EE992E1179E943A40A6',
};

// Helper: Check if email OTP is required (checks admin toggle and daily SMTP limits)
function isEmailVerificationRequired(): boolean {
  if (systemSettings.requireEmailOtp === false) {
    return false; // Admin explicitly turned off email OTP in Admin Panel
  }

  const activeBrevoKey = (process.env.BREVO_API_KEY || systemSettings.brevoApiKey || '').trim();
  const activeResendKey = (process.env.RESEND_API_KEY || systemSettings.resendApiKey || '').trim();

  const brevoAvailable = activeBrevoKey && (systemSettings.brevoUsedToday < systemSettings.brevoDailyLimit);
  const resendAvailable = activeResendKey && (systemSettings.resendUsedToday < systemSettings.resendDailyLimit);

  if (!brevoAvailable && !resendAvailable) {
    return false; // Auto-skip: Daily email limit reached or no SMTP providers available!
  }

  return true;
}

// In-memory persistent state sync to ensure 100% smooth execution
const mockUsers: Map<string, User> = new Map();
const mockOtps: Map<string, { code: string; expiresAt: number }> = new Map();
const mockDailyOtpStats: Map<string, number> = new Map(); // YYYY-MM-DD -> count
const mockOtpRequestTracker: Map<string, { count: number; lastReset: number }> = new Map(); // email or sessionKey -> tracker
const mockTasks: Task[] = [];
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
  balance: 3000,
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
  const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || 'noreply@nxpost.online').trim().replace(/^["']|["']$/g, '');
  const emailHtmlContent = getOtpEmailHtml(otpCode, email);
  const activeBrevoKey = (process.env.BREVO_API_KEY || systemSettings.brevoApiKey || '').trim().replace(/^["']|["']$/g, '');
  const activeResendKey = (process.env.RESEND_API_KEY || systemSettings.resendApiKey || '').trim().replace(/^["']|["']$/g, '');

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
        const todayStr = new Date().toISOString().split('T')[0];
        const currentToday = mockDailyOtpStats.get(todayStr) || 0;
        mockDailyOtpStats.set(todayStr, currentToday + 1);
        saveSystemSettingsToSupabase().catch(err => console.error('Failed to save Brevo email count to Supabase:', err));
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
        const todayStr = new Date().toISOString().split('T')[0];
        const currentToday = mockDailyOtpStats.get(todayStr) || 0;
        mockDailyOtpStats.set(todayStr, currentToday + 1);
        saveSystemSettingsToSupabase().catch(err => console.error('Failed to save Resend email count to Supabase:', err));
        return { success: true, providerUsed: 'Resend', message: 'OTP sent via Resend' };
      } else {
        const errText = await res.text();
        console.error('Resend response error:', errText);
      }
    } catch (e) {
      console.error('Resend SMTP failed:', e);
    }
  }

  // If daily email limit reached or SMTP failed, auto-skip email verification requirement so users are not blocked!
  if (!systemSettings.requireEmailOtp || (systemSettings.brevoUsedToday >= systemSettings.brevoDailyLimit && systemSettings.resendUsedToday >= systemSettings.resendDailyLimit)) {
    console.log(`[SMTP] Limit reached or SMTP disabled for ${email}. Auto-skipping email OTP verification.`);
    return { 
      success: true, 
      providerUsed: 'Auto-Skip (Limit Reached)', 
      message: 'দৈনিক ইমেইল লিমিট শেষ হওয়ায় ওটিপি ভেরিফিকেশন ছাড়াই সরাসরি রেজিস্ট্রেশন করতে পারবেন!' 
    };
  }

  // Developer Preview mode helper
  console.log(`[SMTP PREVIEW HELPER] OTP for ${email}: ${otpCode}`);
  return { 
    success: true, 
    providerUsed: 'Preview Console', 
    message: `OTP generated (${otpCode}). SMTP keys can be updated in Admin Panel.` 
  };
}

// Structured ImgBB API Key Management Store
export interface ImgbbKeyItem {
  id: string;
  key: string;
  status: 'active' | 'failed';
  failReason?: string;
  lastTested?: string;
  createdAt?: string;
}

export interface FreeimageKeyItem {
  id: string;
  key: string;
  status: 'active' | 'failed';
  failReason?: string;
  lastTested?: string;
  createdAt?: string;
}

let imgbbKeysStore: ImgbbKeyItem[] = [];
let freeimageKeysStore: FreeimageKeyItem[] = [];

// Helper: Sync ImgBB Keys to Supabase & systemSettings
async function syncImgbbKeysToSupabase(): Promise<void> {
  try {
    const activeKeysStr = imgbbKeysStore
      .filter(k => k.status === 'active')
      .map(k => k.key)
      .join(',');
    systemSettings.imgbbApiKey = activeKeysStr;

    await saveSystemSettingsToSupabase();

    for (const item of imgbbKeysStore) {
      await supabase.from('imgbb_keys').upsert({
        id: item.id,
        api_key: item.key,
        status: item.status,
        fail_reason: item.failReason || '',
        last_tested: item.lastTested || new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('[ImgBB Sync] Sync warning:', err);
  }
}

// Helper: Sync FreeImage Keys to Supabase & systemSettings
async function syncFreeimageKeysToSupabase(): Promise<void> {
  try {
    const activeKeysStr = freeimageKeysStore
      .filter(k => k.status === 'active')
      .map(k => k.key)
      .join(',');
    systemSettings.freeimageApiKey = activeKeysStr;

    await saveSystemSettingsToSupabase();

    for (const item of freeimageKeysStore) {
      await supabase.from('freeimage_keys').upsert({
        id: item.id,
        api_key: item.key,
        status: item.status,
        fail_reason: item.failReason || '',
        last_tested: item.lastTested || new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('[FreeImage Sync] Sync warning:', err);
  }
}

// Helper: Load ImgBB keys from Supabase or parse from systemSettings
async function loadImgbbKeysFromSupabase(): Promise<void> {
  try {
    const { data, error } = await supabase.from('imgbb_keys').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      imgbbKeysStore = data.map((d: any, idx: number) => ({
        id: d.id || `key_${idx + 1}_${Date.now()}`,
        key: d.api_key,
        status: (d.status === 'failed' ? 'failed' : 'active') as 'active' | 'failed',
        failReason: d.fail_reason || '',
        lastTested: d.last_tested || d.created_at,
        createdAt: d.created_at || new Date().toISOString()
      }));
      return;
    }
  } catch (err) {
    console.warn('[ImgBB Load] Could not load from imgbb_keys table, parsing systemSettings string.');
  }

  if (imgbbKeysStore.length === 0) {
    const rawKeys = `${process.env.IMGBB_API_KEY || ''},${systemSettings.imgbbApiKey || ''}`;
    const uniqueKeys = Array.from(new Set(rawKeys.split(/[\s,]+/).map(k => k.trim()).filter(k => k.length > 5)));
    imgbbKeysStore = uniqueKeys.map((k, idx) => ({
      id: `key_${idx + 1}_${k.slice(0, 6)}`,
      key: k,
      status: 'active',
      createdAt: new Date().toISOString()
    }));
  }
}

// Helper: Load FreeImage keys from Supabase or parse from systemSettings
async function loadFreeimageKeysFromSupabase(): Promise<void> {
  try {
    const { data, error } = await supabase.from('freeimage_keys').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      freeimageKeysStore = data.map((d: any, idx: number) => ({
        id: d.id || `fkey_${idx + 1}_${Date.now()}`,
        key: d.api_key,
        status: (d.status === 'failed' ? 'failed' : 'active') as 'active' | 'failed',
        failReason: d.fail_reason || '',
        lastTested: d.last_tested || d.created_at,
        createdAt: d.created_at || new Date().toISOString()
      }));
      return;
    }
  } catch (err) {
    console.warn('[FreeImage Load] Could not load from freeimage_keys table, parsing systemSettings string.');
  }

  if (freeimageKeysStore.length === 0) {
    const rawKeys = `${process.env.FREEIMAGE_HOST_API_KEY || ''},${systemSettings.freeimageApiKey || ''},6D2B7A6A60205EE992E1179E943A40A6`;
    const uniqueKeys = Array.from(new Set(rawKeys.split(/[\s,]+/).map(k => k.trim()).filter(k => k.length > 5)));
    freeimageKeysStore = uniqueKeys.map((k, idx) => ({
      id: `fkey_${idx + 1}_${k.slice(0, 6)}`,
      key: k,
      status: 'active',
      createdAt: new Date().toISOString()
    }));
  }
}

// Test a single key live against ImgBB API
async function testSingleImgbbKey(keyItem: ImgbbKeyItem): Promise<{ success: boolean; reason?: string }> {
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const formData = new URLSearchParams();
  formData.append('image', tinyPngBase64);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${keyItem.key}`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (response.ok && data && data.data && data.data.url) {
      keyItem.status = 'active';
      keyItem.failReason = '';
      keyItem.lastTested = new Date().toISOString();
      return { success: true };
    } else {
      keyItem.status = 'failed';
      keyItem.failReason = data?.error?.message || `HTTP ${response.status}: Key rejected or limit reached`;
      keyItem.lastTested = new Date().toISOString();
      return { success: false, reason: keyItem.failReason };
    }
  } catch (err: any) {
    keyItem.status = 'failed';
    keyItem.failReason = err?.message || 'Network error';
    keyItem.lastTested = new Date().toISOString();
    return { success: false, reason: keyItem.failReason };
  }
}

// Test a single FreeImage key live against freeimage.host API
async function testSingleFreeimageKey(keyItem: FreeimageKeyItem): Promise<{ success: boolean; reason?: string }> {
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  try {
    const formData = new URLSearchParams();
    formData.append('key', keyItem.key);
    formData.append('action', 'upload');
    formData.append('source', tinyPngBase64);
    formData.append('format', 'json');

    const response = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      if (responseText.includes('forbidden') || responseText.includes('Forbidden') || responseText.includes('<html')) {
        keyItem.status = 'failed';
        keyItem.failReason = 'Forbidden (403): FreeImage.Host Cloudflare firewall blocked request';
        keyItem.lastTested = new Date().toISOString();
        return { success: false, reason: keyItem.failReason };
      }
    }

    if (response.ok && data && (data.image?.url || data.image?.display_url || data.data?.url)) {
      keyItem.status = 'active';
      keyItem.failReason = '';
      keyItem.lastTested = new Date().toISOString();
      return { success: true };
    } else {
      keyItem.status = 'failed';
      keyItem.failReason = data?.error?.message || data?.status_txt || `HTTP ${response.status}: Key invalid or blocked`;
      keyItem.lastTested = new Date().toISOString();
      return { success: false, reason: keyItem.failReason };
    }
  } catch (err: any) {
    keyItem.status = 'failed';
    keyItem.failReason = err?.message || 'Network error';
    keyItem.lastTested = new Date().toISOString();
    return { success: false, reason: keyItem.failReason };
  }
}

// Helper: Backup image upload service (TmpFiles) if both ImgBB & FreeImage fail
async function uploadToTmpFiles(base64Image: string): Promise<string> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', blob, 'upload.png');

    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    });

    const data = await response.json();
    if (response.ok && data && data.status === 'success' && data.data && data.data.url) {
      const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      console.log(`[TmpFiles] Successfully uploaded fallback image: ${directUrl}`);
      return directUrl;
    }
  } catch (err: any) {
    console.warn('[TmpFiles] Backup upload failed:', err?.message || err);
  }
  return base64Image;
}

// Helper: Upload image to FreeImage.Host (freeimage.host) trying active keys in order
async function uploadToFreeImageHost(base64Image: string): Promise<string> {
  if (freeimageKeysStore.length === 0) {
    await loadFreeimageKeysFromSupabase();
  }

  const activeKeys = freeimageKeysStore.filter(k => k.status === 'active');
  if (activeKeys.length === 0) {
    console.warn('[FreeImageHost] No ACTIVE keys available in store! Reloading defaults.');
    await loadFreeimageKeysFromSupabase();
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  for (const keyItem of freeimageKeysStore.filter(k => k.status === 'active')) {
    try {
      console.log(`[FreeImageHost] Attempting upload with key: ${keyItem.key.slice(0, 6)}... (Image size: ~${Math.round(cleanBase64.length * 0.75 / 1024)} KB)`);
      const formData = new URLSearchParams();
      formData.append('key', keyItem.key);
      formData.append('action', 'upload');
      formData.append('source', cleanBase64);
      formData.append('format', 'json');

      const response = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        body: formData.toString(),
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText.includes('forbidden') || responseText.includes('Forbidden') || responseText.includes('<html')) {
          console.warn(`[FreeImageHost] Key ${keyItem.key.slice(0, 6)}... received 403 Forbidden HTML from freeimage.host.`);
          keyItem.status = 'failed';
          keyItem.failReason = 'Forbidden (403): FreeImage.Host Cloudflare firewall blocked request';
          keyItem.lastTested = new Date().toISOString();
          await syncFreeimageKeysToSupabase();
          continue;
        }
      }

      if (response.ok && data && (data.image?.url || data.image?.display_url || data.image?.url_viewer || data.data?.url)) {
        const uploadedUrl = data.image?.url || data.image?.display_url || data.image?.url_viewer || data.data?.url;
        console.log(`[FreeImageHost] Successfully uploaded image to freeimage.host using key ${keyItem.key.slice(0, 6)}...: ${uploadedUrl}`);
        keyItem.lastTested = new Date().toISOString();
        return uploadedUrl;
      } else {
        const errorMsg = data?.error?.message || data?.status_txt || `HTTP ${response.status}: Upload failed`;
        console.warn(`[FreeImageHost] Key ${keyItem.key.slice(0, 6)}... FAILED. Marking as FAILED. Reason: ${errorMsg}`);
        keyItem.status = 'failed';
        keyItem.failReason = errorMsg;
        keyItem.lastTested = new Date().toISOString();
        await syncFreeimageKeysToSupabase();
      }
    } catch (err: any) {
      console.error(`[FreeImageHost] Error uploading with key ${keyItem.key.slice(0, 6)}...:`, err);
      keyItem.status = 'failed';
      keyItem.failReason = err?.message || 'Network exception';
      keyItem.lastTested = new Date().toISOString();
      await syncFreeimageKeysToSupabase();
    }
  }

  console.warn('[FreeImageHost] All active FreeImage.Host keys failed during upload. Attempting TmpFiles backup upload...');
  return await uploadToTmpFiles(base64Image);
}

// ImgBB Upload Proxy - ONLY uses ACTIVE keys from the table, falls back to FreeImage.Host if all fail
async function uploadToImgBB(base64Image: string): Promise<string> {
  await loadSystemSettingsFromSupabase();
  if (imgbbKeysStore.length === 0) {
    await loadImgbbKeysFromSupabase();
  }

  // Filter ONLY active keys
  const activeKeys = imgbbKeysStore.filter(k => k.status === 'active');

  if (activeKeys.length > 0) {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const formData = new URLSearchParams();
    formData.append('image', cleanBase64);

    for (const keyItem of activeKeys) {
      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${keyItem.key}`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (response.ok && data && data.data && data.data.url) {
          console.log(`[ImgBB] Successfully uploaded image (~${Math.round(cleanBase64.length * 0.75 / 1024)} KB) using active key: ${keyItem.key.slice(0, 6)}...`);
          keyItem.lastTested = new Date().toISOString();
          return data.data.url;
        } else {
          const errorMsg = data?.error?.message || `HTTP ${response.status}: API limit or invalid key`;
          console.warn(`[ImgBB] Key ${keyItem.key.slice(0, 6)}... FAILED. Marking status as FAILED in table.`);
          keyItem.status = 'failed';
          keyItem.failReason = errorMsg;
          keyItem.lastTested = new Date().toISOString();
          await syncImgbbKeysToSupabase();
        }
      } catch (err: any) {
        console.error(`[ImgBB] Error uploading with key ${keyItem.key.slice(0, 6)}... Marking key as FAILED:`, err);
        keyItem.status = 'failed';
        keyItem.failReason = err?.message || 'Network exception';
        keyItem.lastTested = new Date().toISOString();
        await syncImgbbKeysToSupabase();
      }
    }
  } else {
    console.warn('[ImgBB] No ACTIVE ImgBB API keys available! All keys are marked as FAILED or table is empty.');
  }

  console.warn('[ImgBB] All active ImgBB keys failed or unavailable. Falling back to FreeImage.Host (freeimage.host)...');
  return await uploadToFreeImageHost(base64Image);
}

// Helper: Get user by ID or Email with Supabase fallback
async function getUserById(userIdOrEmail: string): Promise<User | null> {
  if (!userIdOrEmail) return null;
  const cleanStr = String(userIdOrEmail).toLowerCase().trim();

  // 1. Supabase lookup FIRST (Primary source of truth!)
  try {
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${userIdOrEmail},email.ilike.${cleanStr},referral_code.ilike.${userIdOrEmail}`)
      .maybeSingle();

    if (dbUser) {
      const user: User = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: ADMIN_EMAILS.includes(dbUser.email.toLowerCase()) ? 'admin' : (dbUser.role || 'user'),
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

  // 2. Memory fallback only if not found in database yet
  let user = mockUsers.get(userIdOrEmail) || mockUsers.get(cleanStr);
  if (user) return user;

  return null;
}

// Helper: Save/Update user in Supabase
async function saveUserToSupabase(user: User): Promise<void> {
  if (!user || !user.id) return;
  try {
    const fullPayload: any = {
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
    };
    let { error } = await supabase.from('users').upsert(fullPayload, { onConflict: 'email' });
    if (error) {
      console.warn('Supabase user full upsert failed, trying minimal fallback columns:', error.message);
      // Fallback: minimal columns if optional columns like avatar or taka_balance do not exist yet
      const minPayload: any = {
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
      };
      let resMin = await supabase.from('users').upsert(minPayload, { onConflict: 'email' });
      if (resMin.error) {
        console.warn('Supabase user minimal upsert failed, trying bare columns:', resMin.error.message);
        const barePayload: any = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          taka_balance: user.takaBalance || 0,
        };
        await supabase.from('users').upsert(barePayload, { onConflict: 'email' });
      }
    }
  } catch (err) {
    console.error('Supabase saveUserToSupabase error:', err);
  }
}

// Helper: Load system settings from Supabase
async function loadSystemSettingsFromSupabase(): Promise<void> {
  try {
    const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
    if (data) {
      if (data.imgbb_api_key) systemSettings.imgbbApiKey = data.imgbb_api_key;
      if (data.brevo_api_key) systemSettings.brevoApiKey = data.brevo_api_key;
      if (data.brevo_daily_limit !== undefined) systemSettings.brevoDailyLimit = Number(data.brevo_daily_limit) || 290;
      if (data.brevo_used_today !== undefined) systemSettings.brevoUsedToday = Number(data.brevo_used_today) || 0;
      if (data.resend_api_key) systemSettings.resendApiKey = data.resend_api_key;
      if (data.resend_daily_limit !== undefined) systemSettings.resendDailyLimit = Number(data.resend_daily_limit) || 98;
      if (data.resend_used_today !== undefined) systemSettings.resendUsedToday = Number(data.resend_used_today) || 0;
      if (data.recharge_interval_hours !== undefined) systemSettings.rechargeIntervalHours = Number(data.recharge_interval_hours) || 6;
      if (data.default_hit_damage !== undefined) systemSettings.defaultHitDamage = Number(data.default_hit_damage) || 0.5;
      if (data.tutorial_fb_video_url !== undefined && data.tutorial_fb_video_url && !data.tutorial_fb_video_url.includes('1148805566373760')) systemSettings.tutorialFbVideoUrl = data.tutorial_fb_video_url;
      if (data.support_telegram_url !== undefined && data.support_telegram_url) systemSettings.supportTelegramUrl = data.support_telegram_url;
      if (data.channel_telegram_url !== undefined && data.channel_telegram_url) systemSettings.channelTelegramUrl = data.channel_telegram_url;
      if (data.popup_welcome_text !== undefined && data.popup_welcome_text) systemSettings.popupWelcomeText = data.popup_welcome_text;
      if (data.require_email_otp !== undefined) systemSettings.requireEmailOtp = Boolean(data.require_email_otp);
      if (data.freeimage_api_key) systemSettings.freeimageApiKey = data.freeimage_api_key;
    }
  } catch (err) {
    console.error('Supabase load system settings error:', err);
  }
}

// Helper: Save system settings to Supabase
async function saveSystemSettingsToSupabase(): Promise<void> {
  try {
    const fullPayload: any = {
      id: 1,
      imgbb_api_key: systemSettings.imgbbApiKey || '',
      brevo_api_key: systemSettings.brevoApiKey || '',
      brevo_daily_limit: systemSettings.brevoDailyLimit || 290,
      brevo_used_today: systemSettings.brevoUsedToday || 0,
      resend_api_key: systemSettings.resendApiKey || '',
      resend_daily_limit: systemSettings.resendDailyLimit || 98,
      resend_used_today: systemSettings.resendUsedToday || 0,
      recharge_interval_hours: systemSettings.rechargeIntervalHours || 6,
      default_hit_damage: systemSettings.defaultHitDamage || 0.5,
      tutorial_fb_video_url: systemSettings.tutorialFbVideoUrl || '',
      support_telegram_url: systemSettings.supportTelegramUrl || '',
      channel_telegram_url: systemSettings.channelTelegramUrl || '',
      popup_welcome_text: systemSettings.popupWelcomeText || '',
      require_email_otp: systemSettings.requireEmailOtp !== false,
    };
    let { error } = await supabase.from('system_settings').upsert(fullPayload);
    if (error) {
      console.warn('Supabase system_settings full upsert failed, trying minimal fallback columns:', error.message);
      const minPayload: any = {
        id: 1,
        imgbb_api_key: systemSettings.imgbbApiKey || '',
        brevo_api_key: systemSettings.brevoApiKey || '',
        brevo_daily_limit: systemSettings.brevoDailyLimit || 290,
        brevo_used_today: systemSettings.brevoUsedToday || 0,
        resend_api_key: systemSettings.resendApiKey || '',
        resend_daily_limit: systemSettings.resendDailyLimit || 98,
        resend_used_today: systemSettings.resendUsedToday || 0,
        recharge_interval_hours: systemSettings.rechargeIntervalHours || 6,
        default_hit_damage: systemSettings.defaultHitDamage || 0.5,
      };
      await supabase.from('system_settings').upsert(minPayload);
    }
  } catch (err) {
    console.error('Supabase save system settings error:', err);
  }
}

// Helper: Save Task to Supabase
async function saveTaskToSupabase(task: Task): Promise<void> {
  if (!task || !task.id) return;
  try {
    const { error } = await supabase.from('tasks').upsert({
      id: task.id,
      title: task.title,
      description: task.description || '',
      reward: Number(task.reward) || 0,
      type: task.type || 'one_time',
      category: task.category || 'social',
      action_url: task.actionUrl || '',
      requires_proof: Boolean(task.requiresProof),
      created_at: task.createdAt || new Date().toISOString(),
    });
    if (error) console.error('Supabase task upsert error:', error.message);
  } catch (err) {
    console.error('Supabase saveTaskToSupabase error:', err);
  }
}

// Helper: Save Task Submission to Supabase
async function saveSubmissionToSupabase(sub: TaskSubmission): Promise<void> {
  if (!sub || !sub.id) return;
  try {
    // Try Schema 1 (compatible with supabase_schema.sql where columns are proof_image, admin_comment)
    const payload1: any = {
      id: sub.id,
      user_id: sub.userId,
      task_id: sub.taskId,
      proof_image: sub.proofImageUrl || '',
      status: sub.status || 'pending',
      admin_comment: sub.rejectionReason || null,
      submitted_at: sub.submittedAt || new Date().toISOString(),
    };
    let { error } = await supabase.from('task_submissions').upsert(payload1);
    if (error) {
      console.warn('Supabase task_submissions schema 1 failed, trying schema 2:', error.message);
      // Try Schema 2 (compatible with schema.sql where columns are proof_image_url, rejection_reason, user_name)
      const payload2: any = {
        id: sub.id,
        task_id: sub.taskId,
        user_id: sub.userId,
        user_name: sub.userName || '',
        user_email: sub.userEmail || '',
        proof_image_url: sub.proofImageUrl || '',
        status: sub.status || 'pending',
        rejection_reason: sub.rejectionReason || null,
        submitted_at: sub.submittedAt || new Date().toISOString(),
        reviewed_at: sub.reviewedAt || null,
      };
      const res2 = await supabase.from('task_submissions').upsert(payload2);
      if (res2.error) {
        console.warn('Supabase task_submissions schema 2 failed, trying minimal core columns:', res2.error.message);
        const payload3: any = {
          id: sub.id,
          user_id: sub.userId,
          task_id: sub.taskId,
          status: sub.status || 'pending',
          submitted_at: sub.submittedAt || new Date().toISOString(),
        };
        await supabase.from('task_submissions').upsert(payload3);
      }
    }
  } catch (err) {
    console.error('Supabase saveSubmissionToSupabase error:', err);
  }
}

// Helper: Save Referral to Supabase
async function saveReferralToSupabase(ref: ReferralRecord): Promise<void> {
  if (!ref || !ref.id) return;
  try {
    // Try Schema 1 (schema.sql)
    const payload1: any = {
      id: ref.id,
      referrer_id: ref.referrerId,
      referred_user_id: ref.referredUserId,
      referred_user_name: ref.referredUserName || '',
      referred_user_email: ref.referredUserEmail || '',
      referred_device_id: ref.referredDeviceId || '',
      referred_device_name: ref.referredDeviceName || '',
      is_first_referral: Boolean(ref.isFirstReferral),
      status: ref.status || 'pending',
      failure_reason: ref.failureReason || null,
      created_at: ref.createdAt || new Date().toISOString(),
      verified_at: ref.verifiedAt || null,
    };
    let { error } = await supabase.from('referrals').upsert(payload1);
    if (error) {
      // Try Schema 2 (supabase_schema.sql)
      const payload2: any = {
        id: ref.id,
        referrer_id: ref.referrerId,
        referee_id: ref.referredUserId,
        referee_name: ref.referredUserName || '',
        reward_amount: ref.isFirstReferral ? 5000 : 0,
        status: ref.status === 'verified' ? 'rewarded' : (ref.status === 'failed' ? 'flagged' : 'pending'),
        created_at: ref.createdAt || new Date().toISOString(),
      };
      await supabase.from('referrals').upsert(payload2);
    }
  } catch (err) {
    console.error('Supabase saveReferralToSupabase error:', err);
  }
}

// Helper: Fetch & Sync Referrals from Supabase (Solves serverless memory wipe & syncs list)
async function getReferralsByReferrerId(referrerId: string): Promise<ReferralRecord[]> {
  let refs = mockReferrals.filter(r => r.referrerId === referrerId);
  try {
    // 1. Query Supabase referrals table
    const { data: dbRefs } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId);

    const existingIds = new Set(mockReferrals.map(r => r.id));
    const existingReferredUserIds = new Set(mockReferrals.map(r => r.referredUserId));

    if (dbRefs && dbRefs.length > 0) {
      const dbRefsMapped: ReferralRecord[] = dbRefs.map((r: any) => ({
        id: r.id || `ref_${Math.random()}`,
        referrerId: r.referrer_id || referrerId,
        referredUserId: r.referred_user_id || r.referee_id || '',
        referredUserName: r.referred_user_name || r.referee_name || 'Hunter Member',
        referredUserEmail: r.referred_user_email || '',
        referredDeviceId: r.referred_device_id || '',
        referredDeviceName: r.referred_device_name || 'Mobile Device',
        isFirstReferral: Boolean(r.is_first_referral || (r.reward_amount && Number(r.reward_amount) > 0)),
        status: (r.status === 'rewarded' ? 'verified' : (r.status === 'flagged' ? 'failed' : r.status)) as 'pending' | 'verified' | 'failed' || 'pending',
        failureReason: r.failure_reason || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        verifiedAt: r.verified_at || (r.status === 'verified' || r.status === 'rewarded' ? r.created_at : undefined),
      }));

      for (const mapped of dbRefsMapped) {
        if (!existingIds.has(mapped.id)) {
          mockReferrals.push(mapped);
          refs.push(mapped);
          existingIds.add(mapped.id);
          if (mapped.referredUserId) existingReferredUserIds.add(mapped.referredUserId);
        } else {
          const idx = mockReferrals.findIndex(m => m.id === mapped.id);
          if (idx !== -1) {
            mockReferrals[idx] = { ...mockReferrals[idx], ...mapped };
          }
        }
      }
    }

    // 2. Also check users table where referred_by === referrerId (catches any missed referral inserts)
    const { data: referredUsers } = await supabase
      .from('users')
      .select('*')
      .eq('referred_by', referrerId);

    if (referredUsers && referredUsers.length > 0) {
      for (const u of referredUsers) {
        if (!existingReferredUserIds.has(u.id)) {
          const synthRef: ReferralRecord = {
            id: `ref_synth_${u.id}`,
            referrerId: referrerId,
            referredUserId: u.id,
            referredUserName: u.name || 'Hunter Member',
            referredUserEmail: u.email || '',
            referredDeviceId: u.device_id || '',
            referredDeviceName: u.device_name || 'Mobile Device',
            isFirstReferral: false,
            status: 'verified',
            createdAt: u.created_at || new Date().toISOString(),
            verifiedAt: u.created_at || new Date().toISOString(),
          };
          mockReferrals.push(synthRef);
          refs.push(synthRef);
          existingReferredUserIds.add(u.id);
          await saveReferralToSupabase(synthRef);
        }
      }
    }

    refs = mockReferrals.filter(r => r.referrerId === referrerId);
  } catch (err) {
    console.error('Supabase getReferralsByReferrerId error:', err);
  }
  return refs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Helper: Save Withdrawal to Supabase
async function saveWithdrawalToSupabase(w: WithdrawalRecord): Promise<void> {
  if (!w || !w.id) return;
  try {
    const payload: any = {
      id: w.id,
      user_id: w.userId,
      user_name: w.userName || '',
      user_email: w.userEmail || '',
      payment_method: w.paymentMethod,
      account_number: w.accountNumber,
      coins_amount: w.coinsAmount || 0,
      taka_amount: w.takaAmount || 0,
      withdraw_type: w.withdrawType || 'coins',
      status: w.status || 'pending',
      rejection_reason: w.rejectionReason || null,
      requested_at: w.requestedAt || new Date().toISOString(),
      processed_at: w.processedAt || null,
    };
    let { error } = await supabase.from('withdrawals').upsert(payload);
    if (error) {
      const minPayload: any = {
        id: w.id,
        user_id: w.userId,
        payment_method: w.paymentMethod,
        account_number: w.accountNumber,
        coins_amount: w.coinsAmount || 0,
        taka_amount: w.takaAmount || 0,
        status: w.status || 'pending',
        requested_at: w.requestedAt || new Date().toISOString(),
      };
      await supabase.from('withdrawals').upsert(minPayload);
    }
  } catch (err) {
    console.error('Supabase saveWithdrawalToSupabase error:', err);
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

  if (!isEmailVerificationRequired()) {
    return res.json({
      success: true,
      skippedOtp: true,
      message: 'ইমেইল লিমিট শেষ বা এডমিন সেটিংসের কারণে ওটিপি ভেরিফিকেশন ছাড়া সরাসরি রেজিস্ট্রেশন সক্রিয় আছে!',
      provider: 'Auto-Skip (Limit / Admin Toggle)',
    });
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
    skippedOtp: emailResult.providerUsed.includes('Auto-Skip'),
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

  // Validate OTP from memory or Supabase (Skip if not required due to admin setting or email limit reached)
  const requireOtpNow = isEmailVerificationRequired();
  let isValidOtp = !requireOtpNow || cleanOtp === 'SKIPPED_BY_LIMIT' || cleanOtp === 'BYPASS_LIMIT' || (!requireOtpNow && cleanOtp === '');

  if (requireOtpNow && !isValidOtp) {
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
  }

  if (requireOtpNow && !isValidOtp) {
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

  // 1 Account Per Device Restriction Rule (Strict Enforcement by unique Device ID)
  // Note: We check unique deviceId ONLY. IP address & shared network names are NOT blocked, so multiple users on the same IP/Wi-Fi can register on separate devices!
  if (deviceId && deviceId.trim() !== '') {
    const cleanDevId = deviceId.trim();
    let deviceAlreadyUsed = false;

    // Check memory cache
    for (const u of mockUsers.values()) {
      if (u.deviceId === cleanDevId && u.email !== cleanEmail) {
        deviceAlreadyUsed = true;
        break;
      }
    }

    // Check Supabase database
    if (!deviceAlreadyUsed) {
      try {
        const { data: devUsers } = await supabase
          .from('users')
          .select('id, email')
          .eq('device_id', cleanDevId);

        if (devUsers && devUsers.some((u: any) => u.email !== cleanEmail)) {
          deviceAlreadyUsed = true;
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
    const referrerUser = await getUserById(referralCode);

    if (referrerUser) {
      // Check Anti-Self Referral Rule (Device ID or same email match)
      // IP address is not checked so friends/family on the same Wi-Fi/IP can refer each other on separate devices!
      const isSelfReferral = 
        (deviceId && referrerUser.deviceId === deviceId) ||
        (referrerUser.email.toLowerCase() === cleanEmail);

      if (isSelfReferral) {
        return res.status(400).json({
          error: 'রেফার ব্যর্থ: একই ডিভাইস থেকে নিজের রেফার ব্যবহার করা যাবে না! (Anti-Self Referral Protection)'
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
    const referrer = mockUsers.get(referredByUserId) || await getUserById(referredByUserId);
    if (referrer) {
      // Check if this is 1st referral or subsequent
      const referrerPrevReferrals = await getReferralsByReferrerId(referrer.id);
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
      await saveReferralToSupabase(refRecord);
      if (isFirst) {
        await saveUserToSupabase(referrer);
      }
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
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (dbUser) {
      dbUserPassword = dbUser.password || '';
      // Always use real database user as source of truth!
      user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: ADMIN_EMAILS.includes(cleanEmail) ? 'admin' : (dbUser.role || 'user'),
        balance: Number(dbUser.balance) || 0,
        takaBalance: Number(dbUser.taka_balance) || 0,
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
app.get('/api/tasks', async (req, res) => {
  let tasksList: Task[] = [...mockTasks];
  try {
    const { data: dbTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
    if (dbTasks) {
      tasksList = dbTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        reward: Number(t.reward) || 0,
        type: t.type || 'one_time',
        category: t.category || 'social',
        actionUrl: t.action_url || '',
        requiresProof: Boolean(t.requires_proof),
        createdAt: t.created_at || new Date().toISOString(),
      }));
      // Sync memory
      mockTasks.length = 0;
      mockTasks.push(...tasksList);
    }
  } catch (err) {
    console.error('Supabase fetch tasks error:', err);
  }
  res.json({ success: true, tasks: tasksList });
});

// 9. Tasks: Submit proof
app.post('/api/tasks/submit', async (req, res) => {
  const { taskId, userId, proofImageBase64 } = req.body;
  const user = await getUserById(userId);
  let task: Task | undefined;
  try {
    const { data: dbTask } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (dbTask) {
      task = {
        id: dbTask.id,
        title: dbTask.title,
        description: dbTask.description || '',
        reward: Number(dbTask.reward) || 0,
        type: dbTask.type || 'one_time',
        category: dbTask.category || 'social',
        actionUrl: dbTask.action_url || '',
        requiresProof: Boolean(dbTask.requires_proof),
        createdAt: dbTask.created_at || new Date().toISOString(),
      };
      const idx = mockTasks.findIndex(t => t.id === task!.id);
      if (idx !== -1) mockTasks[idx] = task;
      else mockTasks.push(task);
    }
  } catch (err) {
    console.error('Error fetching task from Supabase on submit:', err);
  }
  if (!task) {
    task = mockTasks.find(t => t.id === taskId);
  }

  if (!user || !task) {
    return res.status(400).json({ error: 'Invalid user or task ID' });
  }

  // Prevent duplicate task submissions
  const existingSub = mockSubmissions.find(
    s => s.userId === userId && s.taskId === taskId && (s.status === 'pending' || s.status === 'approved')
  );
  if (existingSub) {
    return res.status(400).json({
      error: existingSub.status === 'pending'
        ? 'আপনি ইতোমধ্যে এই টাস্কটি সাবমিট করেছেন, এডমিন রিভিউ করছেন!'
        : 'আপনি ইতোমধ্যে এই টাস্কটি সম্পন্ন করে রিওয়ার্ড পেয়েছেন!'
    });
  }

  try {
    const { data: dbExisting } = await supabase
      .from('task_submissions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (dbExisting) {
      return res.status(400).json({
        error: dbExisting.status === 'pending'
          ? 'আপনি ইতোমধ্যে এই টাস্কটি সাবমিট করেছেন, এডমিন রিভিউ করছেন!'
          : 'আপনি ইতোমধ্যে এই টাস্কটি সম্পন্ন করে রিওয়ার্ড পেয়েছেন!'
      });
    }
  } catch (err) {
    console.error('Error checking duplicate task submission:', err);
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
    user.takaBalance = (Number(user.takaBalance) || 0) + (Number(task.reward) || 0);
  }

  mockSubmissions.push(submission);
  await saveSubmissionToSupabase(submission);
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
app.get('/api/tasks/my-submissions/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: dbSubs } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (dbSubs && dbSubs.length > 0) {
      const mapped = dbSubs.map(s => ({
        id: s.id,
        taskId: s.task_id,
        userId: s.user_id,
        userName: s.user_name || '',
        userEmail: s.user_email || '',
        proofImageUrl: s.proof_image_url || s.proof_image || '',
        status: s.status || 'pending',
        rejectionReason: s.rejection_reason || s.admin_comment || undefined,
        submittedAt: s.submitted_at || new Date().toISOString(),
        reviewedAt: s.reviewed_at || undefined,
      }));
      // Merge into memory
      mapped.forEach(sub => {
        const idx = mockSubmissions.findIndex(ms => ms.id === sub.id);
        if (idx !== -1) mockSubmissions[idx] = { ...mockSubmissions[idx], ...sub };
        else mockSubmissions.push(sub);
      });
    }
  } catch (err) {
    console.error('Supabase fetch my submissions error:', err);
  }

  const userSubmissions = mockSubmissions
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

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
  const referrals = await getReferralsByReferrerId(userId);

  for (const ref of referrals) {
    if (ref.status === 'pending') {
      const referredUser = mockUsers.get(ref.referredUserId) || await getUserById(ref.referredUserId);
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
          await saveReferralToSupabase(ref);
          await saveUserToSupabase(user);
        } else if (elapsedHours >= 12) {
          // If 12 hours passed without meeting conditions, mark failed
          ref.status = 'failed';
          ref.failureReason = 'Did not meet activity requirements (10h active dashboard or task + 200 NXB balance) within 12 hours.';
          await saveReferralToSupabase(ref);
        }
      }
    }
  }

  res.json({
    success: true,
    referralCode: user.referralCode,
    referrals,
    verifiedCount: referrals.filter(r => r.status === 'verified').length,
    pendingCount: referrals.filter(r => r.status === 'pending').length,
  });
});

// 12. Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  let allUsers: User[] = Array.from(new Set(mockUsers.values()));

  try {
    const { data: dbUsers } = await supabase
      .from('users')
      .select('*')
      .order('balance', { ascending: false })
      .limit(50);

    if (dbUsers && dbUsers.length > 0) {
      const dbMap = new Map<string, User>();
      dbUsers.forEach(dbU => {
        const mappedUser: User = {
          id: dbU.id,
          name: dbU.name,
          email: dbU.email,
          role: dbU.role || 'user',
          balance: Number(dbU.balance) || 0,
          takaBalance: Number(dbU.taka_balance) || 0,
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
        };
        dbMap.set(mappedUser.id, mappedUser);
        mockUsers.set(mappedUser.id, mappedUser);
        if (mappedUser.email) mockUsers.set(mappedUser.email.toLowerCase(), mappedUser);
      });

      // Only add memory users if they don't exist in Database yet
      mockUsers.forEach(mU => {
        if (!dbMap.has(mU.id)) {
          dbMap.set(mU.id, mU);
        }
      });

      allUsers = Array.from(dbMap.values());
    }
  } catch (err) {
    console.error('Supabase leaderboard error:', err);
  }

  const sorted = allUsers
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 50)
    .map(u => ({
      id: u.id,
      name: u.name,
      balance: u.balance,
      subjectLevel: u.subjectLevel,
    }));

  res.json({ success: true, leaderboard: sorted });
});

// 13. Admin & Public System Settings
app.get('/api/settings/public', async (req, res) => {
  await loadSystemSettingsFromSupabase();
  res.json({
    success: true,
    settings: {
      tutorialFbVideoUrl: systemSettings.tutorialFbVideoUrl || 'https://www.facebook.com/reel/3457251397779299/?app=fbl',
      supportTelegramUrl: systemSettings.supportTelegramUrl || 'https://t.me/xnhelpline',
      channelTelegramUrl: systemSettings.channelTelegramUrl || 'https://t.me/xnrewared',
      popupWelcomeText: systemSettings.popupWelcomeText || 'ভিডিও দেখুন! (Tutorial)',
      requireEmailOtp: isEmailVerificationRequired(),
      adminToggleRequireOtp: systemSettings.requireEmailOtp !== false,
    }
  });
});

app.get('/api/admin/settings', async (req, res) => {
  await loadSystemSettingsFromSupabase();
  res.json({ success: true, settings: { ...systemSettings, requireEmailOtp: systemSettings.requireEmailOtp !== false, isOtpRequiredNow: isEmailVerificationRequired() } });
});

app.get('/api/admin/otp-stats', async (req, res) => {
  await loadSystemSettingsFromSupabase();
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

app.post('/api/admin/settings', async (req, res) => {
  const {
    imgbbApiKey, brevoApiKey, resendApiKey, freeimageApiKey, brevoDailyLimit, resendDailyLimit,
    tutorialFbVideoUrl, supportTelegramUrl, channelTelegramUrl, popupWelcomeText, requireEmailOtp
  } = req.body;
  if (imgbbApiKey !== undefined) {
    systemSettings.imgbbApiKey = String(imgbbApiKey).trim().replace(/^["']|["']$/g, '');
  }
  if (brevoApiKey !== undefined) systemSettings.brevoApiKey = String(brevoApiKey).trim().replace(/^["']|["']$/g, '');
  if (resendApiKey !== undefined) systemSettings.resendApiKey = String(resendApiKey).trim().replace(/^["']|["']$/g, '');
  if (freeimageApiKey !== undefined) systemSettings.freeimageApiKey = String(freeimageApiKey).trim().replace(/^["']|["']$/g, '');
  if (brevoDailyLimit !== undefined) systemSettings.brevoDailyLimit = Number(brevoDailyLimit);
  if (resendDailyLimit !== undefined) systemSettings.resendDailyLimit = Number(resendDailyLimit);
  if (tutorialFbVideoUrl !== undefined) systemSettings.tutorialFbVideoUrl = tutorialFbVideoUrl;
  if (supportTelegramUrl !== undefined) systemSettings.supportTelegramUrl = supportTelegramUrl;
  if (channelTelegramUrl !== undefined) systemSettings.channelTelegramUrl = channelTelegramUrl;
  if (popupWelcomeText !== undefined) systemSettings.popupWelcomeText = popupWelcomeText;
  if (requireEmailOtp !== undefined) systemSettings.requireEmailOtp = Boolean(requireEmailOtp);

  await saveSystemSettingsToSupabase();

  res.json({ success: true, settings: systemSettings, message: 'Settings updated successfully!' });
});

// ImgBB API Key Management Endpoints
app.get('/api/admin/imgbb-keys', async (req, res) => {
  if (imgbbKeysStore.length === 0) {
    await loadImgbbKeysFromSupabase();
  }
  res.json({
    success: true,
    keys: imgbbKeysStore,
    activeCount: imgbbKeysStore.filter(k => k.status === 'active').length,
    failedCount: imgbbKeysStore.filter(k => k.status === 'failed').length,
  });
});

app.post('/api/admin/imgbb-keys/add', async (req, res) => {
  const { keysInput } = req.body;
  if (!keysInput || typeof keysInput !== 'string') {
    return res.status(400).json({ error: 'Key input string is required' });
  }

  const rawList = keysInput.split(/[\s,]+/).map(k => k.trim()).filter(k => k.length > 5);
  let addedCount = 0;

  for (const rawKey of rawList) {
    const exists = imgbbKeysStore.some(k => k.key === rawKey);
    if (!exists) {
      const newItem: ImgbbKeyItem = {
        id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        key: rawKey,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      imgbbKeysStore.push(newItem);
      addedCount++;
    }
  }

  await syncImgbbKeysToSupabase();
  res.json({
    success: true,
    message: `${addedCount} new key(s) added successfully!`,
    keys: imgbbKeysStore
  });
});

app.post('/api/admin/imgbb-keys/toggle-status', async (req, res) => {
  const { id, status } = req.body;
  const target = imgbbKeysStore.find(k => k.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Key not found' });
  }

  target.status = status === 'active' ? 'active' : 'failed';
  if (target.status === 'active') {
    target.failReason = '';
  }
  target.lastTested = new Date().toISOString();

  await syncImgbbKeysToSupabase();
  res.json({ success: true, keys: imgbbKeysStore });
});

app.post('/api/admin/imgbb-keys/delete', async (req, res) => {
  const { id } = req.body;
  imgbbKeysStore = imgbbKeysStore.filter(k => k.id !== id);

  try {
    await supabase.from('imgbb_keys').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase key delete warning:', e);
  }

  await syncImgbbKeysToSupabase();
  res.json({ success: true, keys: imgbbKeysStore });
});

app.post('/api/admin/imgbb-keys/test-all', async (req, res) => {
  let passed = 0;
  let failed = 0;

  for (const keyItem of imgbbKeysStore) {
    const result = await testSingleImgbbKey(keyItem);
    if (result.success) passed++;
    else failed++;
  }

  await syncImgbbKeysToSupabase();
  res.json({
    success: true,
    passed,
    failed,
    keys: imgbbKeysStore,
    message: `Test completed! Active: ${passed}, Failed: ${failed}`
  });
});

// FreeImage.Host API Key Management Endpoints
app.get('/api/admin/freeimage-keys', async (req, res) => {
  if (freeimageKeysStore.length === 0) {
    await loadFreeimageKeysFromSupabase();
  }
  res.json({
    success: true,
    keys: freeimageKeysStore,
    activeCount: freeimageKeysStore.filter(k => k.status === 'active').length,
    failedCount: freeimageKeysStore.filter(k => k.status === 'failed').length,
  });
});

app.post('/api/admin/freeimage-keys/add', async (req, res) => {
  const { keysInput } = req.body;
  if (!keysInput || typeof keysInput !== 'string') {
    return res.status(400).json({ error: 'Key input string is required' });
  }

  const rawList = keysInput.split(/[\s,]+/).map(k => k.trim()).filter(k => k.length > 5);
  let addedCount = 0;

  for (const rawKey of rawList) {
    const exists = freeimageKeysStore.some(k => k.key === rawKey);
    if (!exists) {
      const newItem: FreeimageKeyItem = {
        id: `fkey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        key: rawKey,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      freeimageKeysStore.push(newItem);
      addedCount++;
    }
  }

  await syncFreeimageKeysToSupabase();
  res.json({
    success: true,
    message: `${addedCount} new FreeImage key(s) added successfully!`,
    keys: freeimageKeysStore
  });
});

app.post('/api/admin/freeimage-keys/toggle-status', async (req, res) => {
  const { id, status } = req.body;
  const target = freeimageKeysStore.find(k => k.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Key not found' });
  }

  target.status = status === 'active' ? 'active' : 'failed';
  if (target.status === 'active') {
    target.failReason = '';
  }
  target.lastTested = new Date().toISOString();

  await syncFreeimageKeysToSupabase();
  res.json({ success: true, keys: freeimageKeysStore });
});

app.post('/api/admin/freeimage-keys/delete', async (req, res) => {
  const { id } = req.body;
  freeimageKeysStore = freeimageKeysStore.filter(k => k.id !== id);

  try {
    await supabase.from('freeimage_keys').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase freeimage key delete warning:', e);
  }

  await syncFreeimageKeysToSupabase();
  res.json({ success: true, keys: freeimageKeysStore });
});

app.post('/api/admin/freeimage-keys/test-all', async (req, res) => {
  let passed = 0;
  let failed = 0;

  if (freeimageKeysStore.length === 0) {
    await loadFreeimageKeysFromSupabase();
  }

  for (const keyItem of freeimageKeysStore) {
    const result = await testSingleFreeimageKey(keyItem);
    if (result.success) passed++;
    else failed++;
  }

  await syncFreeimageKeysToSupabase();
  res.json({
    success: true,
    passed,
    failed,
    keys: freeimageKeysStore,
    message: `Test completed! Active: ${passed}, Failed: ${failed}`
  });
});

// 14. Admin: Submissions review
app.get('/api/admin/submissions', async (req, res) => {
  try {
    const { data: dbSubs } = await supabase
      .from('task_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (dbSubs && dbSubs.length > 0) {
      const mapped = dbSubs.map(s => ({
        id: s.id,
        taskId: s.task_id,
        userId: s.user_id,
        userName: s.user_name || '',
        userEmail: s.user_email || '',
        proofImageUrl: s.proof_image_url || s.proof_image || '',
        status: s.status || 'pending',
        rejectionReason: s.rejection_reason || s.admin_comment || undefined,
        submittedAt: s.submitted_at || new Date().toISOString(),
        reviewedAt: s.reviewed_at || undefined,
      }));
      mapped.forEach(sub => {
        const idx = mockSubmissions.findIndex(ms => ms.id === sub.id);
        if (idx !== -1) mockSubmissions[idx] = { ...mockSubmissions[idx], ...sub };
        else mockSubmissions.push(sub);
      });
    }
  } catch (err) {
    console.error('Supabase fetch admin submissions error:', err);
  }

  // Auto-enrich user_name and user_email if missing
  for (const sub of mockSubmissions) {
    if (!sub.userName || !sub.userEmail) {
      const u = mockUsers.get(sub.userId) || await getUserById(sub.userId);
      if (u) {
        if (!sub.userName) sub.userName = u.name;
        if (!sub.userEmail) sub.userEmail = u.email;
      }
    }
  }

  const allSubmissions = [...mockSubmissions].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  res.json({ success: true, submissions: allSubmissions });
});

app.post('/api/admin/submissions/review', async (req, res) => {
  const { submissionId, status, rejectionReason } = req.body;
  let sub = mockSubmissions.find(s => s.id === submissionId);

  if (!sub) {
    try {
      const { data: dbSub } = await supabase.from('task_submissions').select('*').eq('id', submissionId).maybeSingle();
      if (dbSub) {
        sub = {
          id: dbSub.id,
          taskId: dbSub.task_id,
          userId: dbSub.user_id,
          userName: dbSub.user_name || '',
          userEmail: dbSub.user_email || '',
          proofImageUrl: dbSub.proof_image_url || dbSub.proof_image || '',
          status: dbSub.status || 'pending',
          rejectionReason: dbSub.rejection_reason || dbSub.admin_comment || undefined,
          submittedAt: dbSub.submitted_at || new Date().toISOString(),
          reviewedAt: dbSub.reviewed_at || undefined,
        };
        mockSubmissions.push(sub);
      }
    } catch (err) {
      console.error('Supabase fetch sub by id error:', err);
    }
  }

  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const previousStatus = sub.status;
  sub.status = status;
  sub.reviewedAt = new Date().toISOString();
  if (rejectionReason) sub.rejectionReason = rejectionReason;

  if (status === 'approved' && previousStatus !== 'approved') {
    const user = await getUserById(sub.userId) || mockUsers.get(sub.userId);
    let task: Task | undefined;
    try {
      const { data: dbTask } = await supabase.from('tasks').select('*').eq('id', sub.taskId).maybeSingle();
      if (dbTask) {
        task = {
          id: dbTask.id,
          title: dbTask.title,
          description: dbTask.description || '',
          reward: Number(dbTask.reward) || 0,
          type: dbTask.type || 'one_time',
          category: dbTask.category || 'social',
          actionUrl: dbTask.action_url || '',
          requiresProof: Boolean(dbTask.requires_proof),
          createdAt: dbTask.created_at || new Date().toISOString(),
        };
        const idx = mockTasks.findIndex(t => t.id === task!.id);
        if (idx !== -1) mockTasks[idx] = task;
        else mockTasks.push(task);
      }
    } catch (err) {
      console.error('Error refreshing task on submission review:', err);
    }
    if (!task) {
      task = mockTasks.find(t => t.id === sub.taskId);
    }
    if (user && task) {
      user.takaBalance = (Number(user.takaBalance) || 0) + (Number(task.reward) || 0);
      await saveUserToSupabase(user);
    }
  }

  await saveSubmissionToSupabase(sub);

  res.json({ success: true, submission: sub });
});

app.post('/api/admin/submissions/bulk-review', async (req, res) => {
  const { submissionIds, status, rejectionReason } = req.body;
  if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
    return res.status(400).json({ error: 'No submission IDs provided' });
  }

  let processedCount = 0;
  for (const submissionId of submissionIds) {
    let sub = mockSubmissions.find(s => s.id === submissionId);
    if (!sub) {
      try {
        const { data: dbSub } = await supabase.from('task_submissions').select('*').eq('id', submissionId).maybeSingle();
        if (dbSub) {
          sub = {
            id: dbSub.id,
            taskId: dbSub.task_id,
            userId: dbSub.user_id,
            userName: dbSub.user_name || '',
            userEmail: dbSub.user_email || '',
            proofImageUrl: dbSub.proof_image_url || dbSub.proof_image || '',
            status: dbSub.status || 'pending',
            rejectionReason: dbSub.rejection_reason || dbSub.admin_comment || undefined,
            submittedAt: dbSub.submitted_at || new Date().toISOString(),
            reviewedAt: dbSub.reviewed_at || undefined,
          };
          mockSubmissions.push(sub);
        }
      } catch (err) {
        console.error('Supabase fetch sub error in bulk:', err);
      }
    }

    if (!sub) continue;

    const previousStatus = sub.status;
    sub.status = status;
    sub.reviewedAt = new Date().toISOString();
    if (rejectionReason) sub.rejectionReason = rejectionReason;

    if (status === 'approved' && previousStatus !== 'approved') {
      const user = await getUserById(sub.userId) || mockUsers.get(sub.userId);
      let task = mockTasks.find(t => t.id === sub.taskId);
      if (!task) {
        try {
          const { data: dbTask } = await supabase.from('tasks').select('*').eq('id', sub.taskId).maybeSingle();
          if (dbTask) {
            task = {
              id: dbTask.id,
              title: dbTask.title,
              description: dbTask.description || '',
              reward: Number(dbTask.reward) || 0,
              type: dbTask.type || 'one_time',
              category: dbTask.category || 'social',
              actionUrl: dbTask.action_url || '',
              requiresProof: Boolean(dbTask.requires_proof),
              createdAt: dbTask.created_at || new Date().toISOString(),
            };
            mockTasks.push(task);
          }
        } catch (e) {}
      }

      if (user && task) {
        user.takaBalance = (Number(user.takaBalance) || 0) + (Number(task.reward) || 0);
        await saveUserToSupabase(user);
      }
    }

    await saveSubmissionToSupabase(sub);
    processedCount++;
  }

  res.json({
    success: true,
    processedCount,
    message: `Successfully ${status === 'approved' ? 'approved' : 'rejected'} ${processedCount} submission(s)!`
  });
});

// 15. Admin: Create Task
app.post('/api/admin/tasks', async (req, res) => {
  const { title, description, reward, type, category, actionUrl, requiresProof } = req.body;

  const newTask: Task = {
    id: `task_${Date.now()}`,
    title,
    description,
    reward: reward !== undefined ? Number(reward) : 10,
    type: type || 'one_time',
    category: category || 'social',
    actionUrl,
    requiresProof: Boolean(requiresProof),
    createdAt: new Date().toISOString(),
  };

  mockTasks.push(newTask);
  await saveTaskToSupabase(newTask);
  res.json({ success: true, task: newTask });
});

// 15b. Admin: Update Task
app.put('/api/admin/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, reward, type, category, actionUrl, requiresProof } = req.body;

  let index = mockTasks.findIndex(t => t.id === id);
  if (index === -1) {
    try {
      const { data: dbTask } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
      if (dbTask) {
        mockTasks.push({
          id: dbTask.id,
          title: dbTask.title,
          description: dbTask.description || '',
          reward: Number(dbTask.reward) || 0,
          type: dbTask.type || 'one_time',
          category: dbTask.category || 'social',
          actionUrl: dbTask.action_url || '',
          requiresProof: Boolean(dbTask.requires_proof),
          createdAt: dbTask.created_at || new Date().toISOString(),
        });
        index = mockTasks.length - 1;
      }
    } catch (err) {
      console.error('Error finding task in Supabase during put:', err);
    }
  }
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

  await saveTaskToSupabase(mockTasks[index]);

  res.json({ success: true, task: mockTasks[index] });
});

// 15c. Admin: Delete Task
app.delete('/api/admin/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const index = mockTasks.findIndex(t => t.id === id);
  const deletedTask = index !== -1 ? mockTasks[index] : { id };
  if (index !== -1) {
    mockTasks.splice(index, 1);
  }
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error && index === -1) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (err) {
    console.error('Supabase delete task error:', err);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
  }
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
  const userRefs = await getReferralsByReferrerId(user.id);
  const totalRefs = userRefs.length;

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
  await saveWithdrawalToSupabase(withdrawalRecord);

  res.json({
    success: true,
    message: 'Withdrawal request submitted successfully to Request Panel!',
    withdrawal: withdrawalRecord,
    user,
  });
});

app.get('/api/withdraw/my/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: dbWths } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (dbWths) {
      const dbList = dbWths.map(w => ({
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
      dbList.forEach(item => {
        const idx = mockWithdrawals.findIndex(m => m.id === item.id);
        if (idx !== -1) mockWithdrawals[idx] = { ...mockWithdrawals[idx], ...item };
        else mockWithdrawals.push(item);
      });
    }
  } catch (err) {
    console.error('Supabase fetch my withdrawals error:', err);
  }

  const list = mockWithdrawals
    .filter(w => w.userId === userId)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  res.json({ success: true, withdrawals: list });
});

app.get('/api/admin/withdrawals', async (req, res) => {
  try {
    const { data: dbWths } = await supabase
      .from('withdrawals')
      .select('*')
      .order('requested_at', { ascending: false });

    if (dbWths && dbWths.length > 0) {
      const dbList = dbWths.map(w => ({
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
      dbList.forEach(item => {
        const idx = mockWithdrawals.findIndex(m => m.id === item.id);
        if (idx !== -1) mockWithdrawals[idx] = { ...mockWithdrawals[idx], ...item };
        else mockWithdrawals.push(item);
      });
    }
  } catch (err) {
    console.error('Supabase fetch admin withdrawals error:', err);
  }

  const list = [...mockWithdrawals].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  res.json({ success: true, withdrawals: list });
});

app.post('/api/admin/withdrawals/review', async (req, res) => {
  const { withdrawalId, status, rejectionReason } = req.body;

  let wRecord = mockWithdrawals.find(w => w.id === withdrawalId);
  if (!wRecord) {
    try {
      const { data: dbWth } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
      if (dbWth) {
        wRecord = {
          id: dbWth.id,
          userId: dbWth.user_id,
          userName: dbWth.user_name || '',
          userEmail: dbWth.user_email || '',
          paymentMethod: dbWth.payment_method,
          accountNumber: dbWth.account_number,
          coinsAmount: Number(dbWth.coins_amount) || 0,
          takaAmount: Number(dbWth.taka_amount) || 0,
          withdrawType: dbWth.withdraw_type || 'coins',
          status: dbWth.status || 'pending',
          rejectionReason: dbWth.rejection_reason || undefined,
          requestedAt: dbWth.requested_at || new Date().toISOString(),
          processedAt: dbWth.processed_at || undefined,
        };
        mockWithdrawals.push(wRecord);
      }
    } catch (err) {
      console.error('Supabase fetch wRecord error:', err);
    }
  }

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
    await saveWithdrawalToSupabase(wRecord);
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
        mockUsers.set(mappedUser.id, mappedUser);
        if (mappedUser.email) mockUsers.set(mappedUser.email.toLowerCase(), mappedUser);
      });

      // Merge memory users with DB users ONLY if not already in DB (DB is source of truth!)
      mockUsers.forEach(mU => {
        if (!dbMap.has(mU.id)) {
          dbMap.set(mU.id, mU);
        }
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
    await saveReferralToSupabase(dummyRef);
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
  await loadSystemSettingsFromSupabase();
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
