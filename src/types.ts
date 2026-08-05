export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  balance: number; // $NXB coins
  takaBalance?: number; // ৳ Taka balance (earned from tasks & referrals)
  energy: number; // Current charge points
  maxEnergy: number; // Max charge capacity
  energyLevel: number; // Upgrade level for energy capacity
  hitLevel: number; // Upgrade level for hit damage
  hitDamage: number; // $NXB per tap (0.5 * hitLevel)
  subjectLevel: number; // Mascot subject level
  subjectHp: number; // Current HP of subject
  subjectMaxHp: number; // Max HP of current subject level
  referralCode: string;
  referredBy?: string;
  deviceId: string;
  deviceName?: string;
  lastActive: string; // ISO timestamp
  createdAt: string;
  lastCheckInDate?: string; // YYYY-MM-DD
  checkInStreak?: number;
  avatar?: string;
  isBanned?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number; // $NXB coins
  type: 'daily' | 'one_time';
  category: 'telegram' | 'youtube' | 'social' | 'custom';
  actionUrl?: string;
  requiresProof: boolean;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userEmail: string;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail: string;
  referredDeviceId: string;
  referredDeviceName: string;
  isFirstReferral: boolean;
  status: 'pending' | 'verified' | 'failed';
  failureReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

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

export interface SystemSettings {
  imgbbApiKey: string;
  imgbbKeysList?: ImgbbKeyItem[];
  freeimageApiKey?: string;
  freeimageKeysList?: FreeimageKeyItem[];
  brevoApiKey: string;
  brevoDailyLimit: number;
  brevoUsedToday: number;
  resendApiKey: string;
  resendDailyLimit: number;
  resendUsedToday: number;
  rechargeIntervalHours: number;
  defaultHitDamage: number;
  adminEmail: string;
  tutorialFbVideoUrl?: string;
  supportTelegramUrl?: string;
  channelTelegramUrl?: string;
  popupWelcomeText?: string;
  requireEmailOtp?: boolean;
}

export interface TapResponse {
  success: boolean;
  tapsCount: number;
  coinsEarned: number;
  newBalance: number;
  newEnergy: number;
  newSubjectHp: number;
  subjectLevelUp: boolean;
  newSubjectLevel: number;
  newSubjectMaxHp: number;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  withdrawType?: 'coins' | 'taka';
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Binance';
  accountNumber: string;
  coinsAmount: number;
  takaAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  requestedAt: string;
  processedAt?: string;
}
