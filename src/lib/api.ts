import { User, Task, TaskSubmission, ReferralRecord, SystemSettings, TapResponse } from '../types';

// Extract Device Fingerprint Info
export function getDeviceInfo(): { deviceId: string; deviceName: string } {
  let deviceId = localStorage.getItem('nxb_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('nxb_device_id', deviceId);
  }

  const ua = navigator.userAgent;
  let baseName = 'Browser Device';

  if (/android/i.test(ua)) {
    baseName = 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    baseName = 'Apple iOS Device';
  } else if (/Macintosh/i.test(ua)) {
    baseName = 'Mac Workstation';
  } else if (/Windows/i.test(ua)) {
    baseName = 'Windows PC';
  } else if (/Linux/i.test(ua)) {
    baseName = 'Linux Workstation';
  }

  // Build a unique hardware fingerprint so different users on same platform have different deviceName,
  // while the same device (e.g., Incognito or multiple profiles) shares the exact same fingerprint!
  const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  const cores = navigator.hardwareConcurrency || 4;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const deviceName = `${baseName} [${screenRes}|${cores}c|${tz}]`;

  return { deviceId, deviceName };
}

export async function sendOtpApi(email: string) {
  const { deviceId, deviceName } = getDeviceInfo();
  const res = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      'x-device-name': deviceName
    },
    body: JSON.stringify({ email, deviceId, deviceName }),
  });
  return res.json();
}

export async function registerApi(data: {
  name: string;
  email: string;
  password?: string;
  otp: string;
  referralCode?: string;
}) {
  const { deviceId, deviceName } = getDeviceInfo();
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, deviceId, deviceName }),
  });
  return res.json();
}

export async function loginApi(email: string, password?: string) {
  const { deviceId, deviceName } = getDeviceInfo();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId, deviceName }),
  });
  return res.json();
}

export async function requestWithdrawalApi(data: {
  userId: string;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Binance';
  accountNumber: string;
  coinsAmount?: number;
  takaAmount?: number;
  withdrawType?: 'coins' | 'taka';
}) {
  const res = await fetch('/api/withdraw/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchWithdrawalsApi(userId?: string) {
  const url = userId ? `/api/withdraw/my/${userId}` : '/api/admin/withdrawals';
  const res = await fetch(url);
  return res.json();
}

export async function reviewWithdrawalApi(withdrawalId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
  const res = await fetch('/api/admin/withdrawals/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ withdrawalId, status, rejectionReason }),
  });
  return res.json();
}


export async function fetchUserApi(userId: string) {
  const res = await fetch(`/api/game/user/${userId}`);
  return res.json();
}

export async function syncUserApi(userId: string, userState: User) {
  try {
    const res = await fetch('/api/game/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userState }),
    });
    return await res.json();
  } catch (err) {
    console.error('Auto sync error:', err);
    return { success: false, error: 'Network error during auto sync' };
  }
}

export async function tapApi(userId: string, tapsCount: number = 1): Promise<{ success: boolean; user?: User; coinsEarned?: number; subjectLevelUp?: boolean; error?: string }> {
  const res = await fetch('/api/game/tap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, tapsCount }),
  });
  return res.json();
}

export async function upgradeApi(userId: string, upgradeType: 'energy' | 'hit') {
  const res = await fetch('/api/game/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, upgradeType }),
  });
  return res.json();
}

export async function fetchTasksApi() {
  const res = await fetch('/api/tasks');
  return res.json();
}

export async function submitTaskProofApi(taskId: string, userId: string, proofImageBase64?: string) {
  const res = await fetch('/api/tasks/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, userId, proofImageBase64 }),
  });
  return res.json();
}

export async function fetchMySubmissionsApi(userId: string) {
  const res = await fetch(`/api/tasks/my-submissions/${userId}`);
  return res.json();
}

export async function fetchReferralsApi(userId: string) {
  const res = await fetch(`/api/referrals/my/${userId}`);
  return res.json();
}

export async function fetchLeaderboardApi() {
  const res = await fetch('/api/leaderboard');
  return res.json();
}

// Admin APIs
export async function fetchAdminSettingsApi() {
  const res = await fetch('/api/admin/settings');
  return res.json();
}

export async function updateAdminSettingsApi(settings: Partial<SystemSettings>) {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function fetchAdminSubmissionsApi() {
  const res = await fetch('/api/admin/submissions');
  return res.json();
}

export async function reviewSubmissionApi(submissionId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
  const res = await fetch('/api/admin/submissions/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, status, rejectionReason }),
  });
  return res.json();
}

export async function createAdminTaskApi(taskData: any) {
  const res = await fetch('/api/admin/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  return res.json();
}

export async function updateAdminTaskApi(taskId: string, taskData: any) {
  const res = await fetch(`/api/admin/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  return res.json();
}

export async function deleteAdminTaskApi(taskId: string) {
  const res = await fetch(`/api/admin/tasks/${taskId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function claimDailyCheckInApi(userId: string) {
  const res = await fetch('/api/checkin/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function fetchPublicSettingsApi() {
  const res = await fetch('/api/settings/public');
  return res.json();
}

export async function uploadAvatarApi(userId: string, imageBase64: string) {
  const res = await fetch('/api/user/upload-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, imageBase64 }),
  });
  return res.json();
}

// Admin User Management APIs
export async function fetchAdminUsersApi(query?: string) {
  const url = query ? `/api/admin/users?query=${encodeURIComponent(query)}` : '/api/admin/users';
  const res = await fetch(url);
  return res.json();
}

export async function adjustUserBalanceApi(userId: string, amount: number, action: 'add' | 'subtract', balanceType: 'coins' | 'taka' = 'coins') {
  const res = await fetch('/api/admin/users/adjust-balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, action, balanceType }),
  });
  return res.json();
}

export async function adjustUserReferralsApi(userId: string, referralCount: number) {
  const res = await fetch('/api/admin/users/adjust-referrals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, referralCount }),
  });
  return res.json();
}

export async function toggleUserBanApi(userId: string, isBanned: boolean) {
  const res = await fetch('/api/admin/users/ban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, isBanned }),
  });
  return res.json();
}

export async function deleteUserApi(userId: string) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// Client-Side Image Compression & Resizing (Reduces 4MB+ screenshots to ~50KB to prevent ImgBB API rate limit & bandwidth exhaustion!)
export async function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        console.log(`[Image Compress] Original: ${(file.size / 1024).toFixed(1)} KB -> Compressed Base64: ~${((compressedBase64.length * 0.75) / 1024).toFixed(1)} KB`);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(event.target?.result as string || '');
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

