import React, { useState, useEffect } from 'react';
import { SystemSettings, TaskSubmission, WithdrawalRecord } from '../types';
import {
  fetchAdminSettingsApi,
  updateAdminSettingsApi,
  fetchAdminSubmissionsApi,
  reviewSubmissionApi,
  bulkReviewSubmissionsApi,
  createAdminTaskApi,
  fetchWithdrawalsApi,
  reviewWithdrawalApi,
} from '../lib/api';
import { ShieldCheck, Key, Mail, CheckCircle, XCircle, Plus, Sparkles, X, Image as ImageIcon, Wallet, Database, Copy, Check, CheckSquare, User, ExternalLink } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'submissions' | 'withdrawals' | 'add_task' | 'sql_schema'>('withdrawals');

  // Form states
  const [imgbbKey, setImgbbKey] = useState('');
  const [brevoKey, setBrevoKey] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [brevoLimit, setBrevoLimit] = useState(290);
  const [resendLimit, setResendLimit] = useState(98);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState(10);
  const [taskType, setTaskType] = useState<'one_time' | 'daily'>('one_time');
  const [taskCategory, setTaskCategory] = useState<'telegram' | 'youtube' | 'social'>('social');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskRequiresProof, setTaskRequiresProof] = useState(true);

  const [message, setMessage] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSubmissions();
    loadWithdrawals();
  }, []);

  const loadSettings = async () => {
    const res = await fetchAdminSettingsApi();
    if (res.settings) {
      setSettings(res.settings);
      setImgbbKey(res.settings.imgbbApiKey || '');
      setBrevoKey(res.settings.brevoApiKey || '');
      setResendKey(res.settings.resendApiKey || '');
      setBrevoLimit(res.settings.brevoDailyLimit || 290);
      setResendLimit(res.settings.resendDailyLimit || 98);
    }
  };

  const loadSubmissions = async () => {
    const res = await fetchAdminSubmissionsApi();
    if (res.submissions) {
      setSubmissions(res.submissions);
    }
  };

  const loadWithdrawals = async () => {
    const res = await fetchWithdrawalsApi();
    if (res.withdrawals) {
      setWithdrawals(res.withdrawals);
    }
  };

  const handleReviewWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    const res = await reviewWithdrawalApi(id, status);
    if (res.success) {
      setMessage(`Withdrawal request ${status}`);
      loadWithdrawals();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateAdminSettingsApi({
      imgbbApiKey: imgbbKey,
      brevoApiKey: brevoKey,
      resendApiKey: resendKey,
      brevoDailyLimit: brevoLimit,
      resendDailyLimit: resendLimit,
    });

    if (res.success) {
      setMessage('Admin settings & API keys updated!');
      loadSettings();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReviewSubmission = async (id: string, status: 'approved' | 'rejected') => {
    const res = await reviewSubmissionApi(id, status);
    if (res.success) {
      setMessage(`Submission marked as ${status}`);
      setSelectedSubmissionIds(prev => prev.filter(item => item !== id));
      loadSubmissions();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleSelectSubmission = (id: string) => {
    setSelectedSubmissionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPendingSubmissions = () => {
    const pendingIds = submissions.filter(s => s.status === 'pending').map(s => s.id);
    if (selectedSubmissionIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedSubmissionIds([]);
    } else {
      setSelectedSubmissionIds(pendingIds);
    }
  };

  const handleBulkReviewSubmissions = async (status: 'approved' | 'rejected') => {
    if (selectedSubmissionIds.length === 0) {
      setMessage('At least 1 submission must be selected!');
      return;
    }
    if (!confirm(`Are you sure you want to bulk ${status} ${selectedSubmissionIds.length} submission(s)?`)) {
      return;
    }
    setBulkProcessing(true);
    const res = await bulkReviewSubmissionsApi(selectedSubmissionIds, status);
    setBulkProcessing(false);
    if (res.success) {
      setMessage(res.message || `Submissions ${status} successfully!`);
      setSelectedSubmissionIds([]);
      loadSubmissions();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage(`Bulk review failed: ${res.error}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createAdminTaskApi({
      title: taskTitle,
      description: taskDesc,
      reward: taskReward,
      type: taskType,
      category: taskCategory,
      actionUrl: taskUrl,
      requiresProof: taskRequiresProof,
    });

    if (res.success) {
      setMessage('New Task Created Successfully!');
      setTaskTitle('');
      setTaskDesc('');
      setTaskUrl('');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const sqlCode = `-- SQL Schema for XN Reward / NXB Application (PostgreSQL & Supabase Compatible)

CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password TEXT DEFAULT '',
  role VARCHAR(20) DEFAULT 'user',
  balance NUMERIC(15, 2) DEFAULT 0,
  energy INT DEFAULT 1000,
  max_energy INT DEFAULT 1000,
  energy_level INT DEFAULT 1,
  hit_level INT DEFAULT 1,
  hit_damage NUMERIC(10, 2) DEFAULT 0.5,
  subject_level INT DEFAULT 1,
  subject_hp NUMERIC(15, 2) DEFAULT 100,
  subject_max_hp NUMERIC(15, 2) DEFAULT 100,
  referral_code VARCHAR(50) UNIQUE,
  referred_by VARCHAR(100),
  device_id VARCHAR(100),
  device_name VARCHAR(150),
  last_check_in_date VARCHAR(20),
  check_in_streak INT DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  reward NUMERIC(15, 2) DEFAULT 100,
  type VARCHAR(20) DEFAULT 'one_time',
  category VARCHAR(50) DEFAULT 'social',
  action_url TEXT,
  requires_proof BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.task_submissions (
  id VARCHAR(100) PRIMARY KEY,
  task_id VARCHAR(100) REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(150),
  user_email VARCHAR(150),
  proof_image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.withdrawal_records (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(150),
  user_email VARCHAR(150),
  taka_amount NUMERIC(15, 2) NOT NULL,
  coins_amount NUMERIC(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id VARCHAR(100) PRIMARY KEY,
  referrer_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_name VARCHAR(150),
  referred_user_email VARCHAR(150),
  referred_device_id VARCHAR(100),
  referred_device_name VARCHAR(150),
  is_first_referral BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#211511] border border-[#4d352b] rounded-3xl p-5 w-full max-w-lg text-amber-50 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-400 hover:text-white cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 text-xl font-black text-amber-100 mb-2">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <span>NXB Admin Control Panel</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#170d0a] p-1.5 rounded-2xl border border-[#3b271f] overflow-x-auto">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`py-1.5 px-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === 'withdrawals' ? 'bg-amber-500 text-black font-black' : 'text-amber-200/60'
            }`}
          >
            Requests ({withdrawals.filter(w => w.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-1.5 px-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === 'submissions' ? 'bg-amber-500 text-black' : 'text-amber-200/60'
            }`}
          >
            Proofs ({submissions.filter(s => s.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('add_task')}
            className={`py-1.5 px-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === 'add_task' ? 'bg-amber-500 text-black' : 'text-amber-200/60'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-1.5 px-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === 'settings' ? 'bg-amber-500 text-black' : 'text-amber-200/60'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('sql_schema')}
            className={`py-1.5 px-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === 'sql_schema' ? 'bg-amber-500 text-black' : 'text-amber-200/60'
            }`}
          >
            SQL Script
          </button>
        </div>

        {message && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs p-3 rounded-2xl flex items-center gap-2 my-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab 0: Withdrawal Request Panel */}
        {activeTab === 'withdrawals' && (
          <div className="flex flex-col gap-3 my-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Pending Withdrawal Requests (Request Panel)</span>
            </h3>

            {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
              <p className="text-xs text-amber-300/50 py-4 text-center">No pending withdrawal requests.</p>
            ) : (
              withdrawals.filter(w => w.status === 'pending').map(req => (
                <div key={req.id} className="bg-[#1a0f0c] p-3.5 rounded-2xl border border-[#3e2920] flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-amber-100">
                    <span>{req.userName} ({req.userEmail})</span>
                    <span className="text-emerald-400 font-mono text-sm font-black">৳ {req.takaAmount} BDT</span>
                  </div>

                  <div className="bg-[#110907] p-2.5 rounded-xl border border-[#2d1b15] font-mono text-xs flex justify-between items-center text-amber-200">
                    <div>
                      <span className="text-amber-400 font-bold">{req.paymentMethod}: </span>
                      <span className="text-white font-extrabold">{req.accountNumber}</span>
                    </div>
                    <span className="text-[11px] text-amber-300/70">{req.coinsAmount.toLocaleString()} Coins</span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-amber-300/60">
                    <span>Requested: {new Date(req.requestedAt).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewWithdrawal(req.id, 'rejected')}
                        className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-xl font-bold flex items-center gap-1 hover:bg-rose-500/30 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleReviewWithdrawal(req.id, 'approved')}
                        className="bg-emerald-500 text-black px-4 py-1 rounded-xl font-extrabold flex items-center gap-1 hover:bg-emerald-400 shadow-md cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve & Pay
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 1: Proof Submissions */}
        {activeTab === 'submissions' && (
          <div className="flex flex-col gap-3 my-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#3e2920]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Pending Task Proof Submissions ({submissions.filter(s => s.status === 'pending').length})</span>
              </h3>

              {submissions.filter(s => s.status === 'pending').length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllPendingSubmissions}
                    className="px-2.5 py-1 bg-[#120a07] text-amber-300 border border-[#3e2920] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Select All ({submissions.filter(s => s.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkReviewSubmissions('approved')}
                    disabled={selectedSubmissionIds.length === 0 || bulkProcessing}
                    className="px-3 py-1 bg-emerald-500 text-black font-black text-[11px] rounded-lg disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Bulk Approve ({selectedSubmissionIds.length})</span>
                  </button>
                </div>
              )}
            </div>

            {submissions.filter(s => s.status === 'pending').length === 0 ? (
              <p className="text-xs text-amber-300/50 py-4 text-center">No pending task proofs to review.</p>
            ) : (
              submissions.filter(s => s.status === 'pending').map(sub => {
                const isSelected = selectedSubmissionIds.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all ${
                      isSelected ? 'bg-[#24150f] border-amber-500' : 'bg-[#1a0f0c] border-[#3e2920]'
                    }`}
                  >
                    {/* User profile row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectSubmission(sub.id)}
                          className="w-4 h-4 rounded text-amber-500 bg-[#0f0705] border-amber-500/50 cursor-pointer accent-amber-500"
                        />
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-amber-100 text-xs flex items-center gap-2">
                            <span>Username: <strong>{sub.userName || 'User'}</strong></span>
                          </div>
                          <div className="text-[11px] text-amber-300/80 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 text-amber-400" />
                            <span>Email: <strong>{sub.userEmail || 'No Email'}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-amber-300/60 font-mono">
                        <div>User ID: {sub.userId}</div>
                        <div>{new Date(sub.submittedAt).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    {/* Proof Section */}
                    {sub.proofImageUrl && (
                      <div className="border border-[#483025] rounded-xl overflow-hidden bg-black/40 p-2 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-amber-300/70 font-mono">
                          <span>Proof Screenshot:</span>
                          <a
                            href={sub.proofImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 underline flex items-center gap-0.5"
                          >
                            <span>Open Full Screenshot ↗</span>
                          </a>
                        </div>
                        <img src={sub.proofImageUrl} alt="Proof" className="max-h-48 object-contain rounded-lg mx-auto" />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-[#2e1d15]">
                      <span className="text-[10px] font-mono text-amber-300/40">Task ID: {sub.taskId}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                          className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-rose-500/30 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleReviewSubmission(sub.id, 'approved')}
                          className="bg-emerald-500 text-black px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-400 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Credit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Create Task */}
        {activeTab === 'add_task' && (
          <form onSubmit={handleCreateTask} className="flex flex-col gap-3 my-2 text-xs">
            <div>
              <label className="font-bold text-amber-300 block mb-1">Task Title</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="e.g. Follow NXB Official Twitter"
                className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100"
              />
            </div>

            <div>
              <label className="font-bold text-amber-300 block mb-1">Description</label>
              <textarea
                required
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                placeholder="Task instructions for user..."
                className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 h-16"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-amber-300 block mb-1">Reward (Taka / ৳ BDT)</label>
                <input
                  type="number"
                  required
                  value={taskReward}
                  onChange={e => setTaskReward(Number(e.target.value))}
                  className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-amber-300 block mb-1">Task Type</label>
                <select
                  value={taskType}
                  onChange={e => setTaskType(e.target.value as any)}
                  className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100"
                >
                  <option value="one_time">One-Time Task</option>
                  <option value="daily">Daily Task</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-amber-300 block mb-1">Target Action URL</label>
              <input
                type="url"
                value={taskUrl}
                onChange={e => setTaskUrl(e.target.value)}
                placeholder="https://t.me/your_channel"
                className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="reqProof"
                checked={taskRequiresProof}
                onChange={e => setTaskRequiresProof(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
              <label htmlFor="reqProof" className="font-semibold text-amber-200">
                Requires Proof Screenshot (Uploaded via ImgBB)
              </label>
            </div>

            <button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 cursor-pointer"
            >
              Publish New Task
            </button>
          </form>
        )}

        {/* Tab 3: API Keys & Settings */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-3 my-2 text-xs">
            {/* ImgBB Key */}
            <div className="bg-[#180e0b] p-3 rounded-2xl border border-[#3d2820]">
              <label className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>ImgBB API Key (Task Proof Image Upload Host)</span>
              </label>
              <input
                type="text"
                value={imgbbKey}
                onChange={e => setImgbbKey(e.target.value)}
                placeholder="Enter ImgBB API key..."
                className="w-full bg-[#110907] border border-[#311f18] rounded-xl p-2 text-amber-100 font-mono text-xs"
              />
              <p className="text-[10px] text-amber-300/60 mt-1">
                Obtain your free API key at <a href="https://api.imgbb.com/" target="_blank" rel="noreferrer" className="text-amber-400 underline">api.imgbb.com</a> to enable direct image hosting.
              </p>
            </div>

            {/* Brevo SMTP Key */}
            <div className="bg-[#180e0b] p-3 rounded-2xl border border-[#3d2820]">
              <label className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Brevo API Key (SMTP Provider 1)</span>
              </label>
              <input
                type="password"
                value={brevoKey}
                onChange={e => setBrevoKey(e.target.value)}
                placeholder="xkeysib-..."
                className="w-full bg-[#110907] border border-[#311f18] rounded-xl p-2 text-amber-100 font-mono text-xs"
              />
              <div className="flex justify-between items-center mt-2 text-[11px] text-amber-300/70">
                <span>Daily Limit: {settings?.brevoDailyLimit || 290}</span>
                <span>Used Today: {settings?.brevoUsedToday || 0}</span>
              </div>
            </div>

            {/* Resend SMTP Key */}
            <div className="bg-[#180e0b] p-3 rounded-2xl border border-[#3d2820]">
              <label className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Resend API Key (SMTP Failover Provider 2)</span>
              </label>
              <input
                type="password"
                value={resendKey}
                onChange={e => setResendKey(e.target.value)}
                placeholder="re_..."
                className="w-full bg-[#110907] border border-[#311f18] rounded-xl p-2 text-amber-100 font-mono text-xs"
              />
              <div className="flex justify-between items-center mt-2 text-[11px] text-amber-300/70">
                <span>Daily Limit: {settings?.resendDailyLimit || 98}</span>
                <span>Used Today: {settings?.resendUsedToday || 0}</span>
              </div>
            </div>

            <button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 cursor-pointer"
            >
              Save Admin API & Settings Configuration
            </button>
          </form>
        )}

        {/* Tab 4: SQL Database Schema Script */}
        {activeTab === 'sql_schema' && (
          <div className="flex flex-col gap-3 my-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <span>PostgreSQL / Supabase DDL Schema Script</span>
              </span>
              <button
                onClick={handleCopySql}
                className="bg-amber-500 text-black font-bold px-3 py-1 rounded-xl flex items-center gap-1 text-xs hover:bg-amber-400 cursor-pointer"
              >
                {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{sqlCopied ? 'Copied SQL' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <p className="text-[11px] text-amber-300/70">
              You can run these SQL statements directly in your PostgreSQL or Supabase SQL Editor to establish all tables:
            </p>

            <pre className="bg-[#100806] p-3 rounded-2xl border border-[#332018] text-emerald-400 font-mono text-[10px] max-h-64 overflow-y-auto whitespace-pre-wrap">
              {sqlCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

