import React, { useState, useEffect } from 'react';
import { SystemSettings, TaskSubmission, WithdrawalRecord, User, Task, ImgbbKeyItem } from '../types';
import {
  fetchAdminSettingsApi,
  updateAdminSettingsApi,
  fetchAdminSubmissionsApi,
  reviewSubmissionApi,
  bulkReviewSubmissionsApi,
  createAdminTaskApi,
  fetchWithdrawalsApi,
  reviewWithdrawalApi,
  fetchAdminUsersApi,
  adjustUserBalanceApi,
  adjustUserReferralsApi,
  toggleUserBanApi,
  deleteUserApi,
  fetchTasksApi,
  updateAdminTaskApi,
  deleteAdminTaskApi,
  fetchImgbbKeysApi,
  addImgbbKeysApi,
  toggleImgbbKeyStatusApi,
  deleteImgbbKeyApi,
  testAllImgbbKeysApi,
} from '../lib/api';
import { ShieldCheck, Key, Mail, CheckCircle, XCircle, Plus, Sparkles, Image as ImageIcon, Wallet, Lock, RefreshCw, Users, Search, Ban, Trash2, Coins, UserPlus, Edit3, CheckSquare, User as UserIcon, ExternalLink } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'submissions' | 'users' | 'add_task' | 'manage_tasks' | 'settings'>('withdrawals');

  // Form states
  const [imgbbKey, setImgbbKey] = useState('');
  const [imgbbKeysList, setImgbbKeysList] = useState<ImgbbKeyItem[]>([]);
  const [newImgbbInput, setNewImgbbInput] = useState('');
  const [testingKeys, setTestingKeys] = useState(false);
  const [addingKeys, setAddingKeys] = useState(false);
  const [brevoKey, setBrevoKey] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [fbVideoUrl, setFbVideoUrl] = useState('');
  const [supportUrl, setSupportUrl] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [requireEmailOtp, setRequireEmailOtp] = useState<boolean>(true);

  // User adjustment state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<number>(1000);
  const [refCountAmount, setRefCountAmount] = useState<number>(1);

  // New task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState<number>(10);
  const [taskType, setTaskType] = useState<'one_time' | 'daily'>('one_time');
  const [taskCategory, setTaskCategory] = useState<string>('social');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskRequiresProof, setTaskRequiresProof] = useState(true);

  const [message, setMessage] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [otpStats, setOtpStats] = useState<{
    todayDate: string;
    todayCount: number;
    totalCount: number;
    brevoUsedToday?: number;
    resendUsedToday?: number;
    history?: { date: string; count: number }[];
  }>({
    todayDate: new Date().toISOString().split('T')[0],
    todayCount: 0,
    totalCount: 0,
    brevoUsedToday: 0,
    resendUsedToday: 0,
    history: []
  });

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadOtpStats();
    }
  }, [activeTab]);

  const loadAllData = async () => {
    setLoadingData(true);
    await Promise.all([loadSettings(), loadSubmissions(), loadWithdrawals(), loadUsers(), loadTasks(), loadOtpStats()]);
    setLoadingData(false);
  };

  const loadOtpStats = async () => {
    try {
      const res = await fetch('/api/admin/otp-stats').then(r => r.json());
      if (res.success) {
        setOtpStats(res);
      }
    } catch (err) {}
  };

  const loadTasks = async () => {
    const res = await fetchTasksApi();
    if (res.success && res.tasks) {
      setTasks(res.tasks);
    }
  };

  const loadUsers = async () => {
    const res = await fetchAdminUsersApi();
    if (res.success && res.users) {
      setUsers(res.users);
    }
  };

  const handleAdjustBalance = async (userId: string, amount: number) => {
    const action = amount >= 0 ? 'add' : 'subtract';
    const res = await adjustUserBalanceApi(userId, Math.abs(amount), action);
    if (res.success) {
      setMessage(`User balance updated successfully!`);
      loadUsers();
    } else {
      setMessage(`Failed to update balance: ${res.error}`);
    }
  };

  const handleAdjustReferrals = async (userId: string, count: number) => {
    const res = await adjustUserReferralsApi(userId, count);
    if (res.success) {
      setMessage(`User referral count updated successfully!`);
      loadUsers();
    } else {
      setMessage(`Failed to update referrals: ${res.error}`);
    }
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    const res = await toggleUserBanApi(userId, !currentBanned);
    if (res.success) {
      setMessage(`User ban status updated successfully!`);
      loadUsers();
    } else {
      setMessage(`Failed to toggle ban: ${res.error}`);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    const res = await deleteUserApi(userId);
    if (res.success) {
      setMessage(`User deleted successfully!`);
      loadUsers();
    } else {
      setMessage(`Failed to delete user: ${res.error}`);
    }
  };

  const loadImgbbKeys = async () => {
    const res = await fetchImgbbKeysApi();
    if (res.success && res.keys) {
      setImgbbKeysList(res.keys);
    }
  };

  const handleAddImgbbKeys = async () => {
    if (!newImgbbInput.trim()) return;
    setAddingKeys(true);
    const res = await addImgbbKeysApi(newImgbbInput);
    setAddingKeys(false);
    if (res.success) {
      setImgbbKeysList(res.keys || []);
      setNewImgbbInput('');
      setMessage(res.message || 'Key(s) added successfully!');
    } else {
      setMessage(`Error: ${res.error}`);
    }
  };

  const handleToggleImgbbKey = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'failed' : 'active';
    const res = await toggleImgbbKeyStatusApi(id, newStatus);
    if (res.success) {
      setImgbbKeysList(res.keys || []);
      setMessage(`Key status changed to ${newStatus.toUpperCase()}`);
    }
  };

  const handleDeleteImgbbKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ImgBB API key?')) return;
    const res = await deleteImgbbKeyApi(id);
    if (res.success) {
      setImgbbKeysList(res.keys || []);
      setMessage('ImgBB Key deleted successfully!');
    }
  };

  const handleTestAllImgbbKeys = async () => {
    setTestingKeys(true);
    const res = await testAllImgbbKeysApi();
    setTestingKeys(false);
    if (res.success) {
      setImgbbKeysList(res.keys || []);
      setMessage(res.message);
    } else {
      setMessage('Failed to test ImgBB keys.');
    }
  };

  const loadSettings = async () => {
    const res = await fetchAdminSettingsApi();
    if (res.success && res.settings) {
      setSettings(res.settings);
      setImgbbKey(res.settings.imgbbApiKey || '');
      setBrevoKey(res.settings.brevoApiKey || '');
      setResendKey(res.settings.resendApiKey || '');
      setFbVideoUrl(res.settings.tutorialFbVideoUrl || 'https://www.facebook.com/reel/1148805566373760');
      setSupportUrl(res.settings.supportTelegramUrl || 'https://t.me/xnhelpline');
      setChannelUrl(res.settings.channelTelegramUrl || 'https://t.me/xnrewared');
      setWelcomeText(res.settings.popupWelcomeText || 'ভিডিও দেখুন! (Tutorial)');
      setRequireEmailOtp(res.settings.requireEmailOtp !== false);
    }
    loadImgbbKeys();
  };

  const loadSubmissions = async () => {
    const res = await fetchAdminSubmissionsApi();
    if (res.success && res.submissions) {
      setSubmissions(res.submissions);
    }
  };

  const loadWithdrawals = async () => {
    const res = await fetchWithdrawalsApi();
    if (res.success && res.withdrawals) {
      setWithdrawals(res.withdrawals);
    }
  };

  const handleReviewSubmission = async (id: string, status: 'approved' | 'rejected') => {
    const res = await reviewSubmissionApi(id, status);
    if (res.success) {
      setMessage(`Submission ${status} successfully!`);
      setSelectedSubmissionIds(prev => prev.filter(item => item !== id));
      loadSubmissions();
    } else {
      setMessage(`Failed to review submission: ${res.error}`);
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
      setMessage('অনুগ্রহ করে অন্তত ১টি সাবমিশন সিলেক্ট করুন!');
      return;
    }
    const actionText = status === 'approved' ? 'অ্যাপ্রুভ (Approve)' : 'রিজেক্ট (Reject)';
    if (!confirm(`আপনি কি নিশ্চিত যে সিলেক্ট করা ${selectedSubmissionIds.length}টি সাবমিশন ${actionText} করতে চান?`)) {
      return;
    }
    setBulkProcessing(true);
    const res = await bulkReviewSubmissionsApi(selectedSubmissionIds, status);
    setBulkProcessing(false);
    if (res.success) {
      setMessage(res.message || `Selected submissions ${status} successfully!`);
      setSelectedSubmissionIds([]);
      loadSubmissions();
      loadUsers();
    } else {
      setMessage(`Bulk review failed: ${res.error}`);
    }
  };

  const handleReviewWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    const res = await reviewWithdrawalApi(id, status);
    if (res.success) {
      setMessage(`Withdrawal request ${status} successfully!`);
      loadWithdrawals();
    } else {
      setMessage(`Failed to process withdrawal: ${res.error}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateAdminSettingsApi({
      imgbbApiKey: imgbbKey.trim(),
      brevoApiKey: brevoKey.trim(),
      resendApiKey: resendKey.trim(),
      tutorialFbVideoUrl: fbVideoUrl.trim(),
      supportTelegramUrl: supportUrl.trim(),
      channelTelegramUrl: channelUrl.trim(),
      popupWelcomeText: welcomeText.trim(),
      requireEmailOtp,
    });

    if (res.success && res.settings) {
      setSettings(res.settings);
      setMessage('System Settings & API Keys Saved Successfully!');
    } else {
      setMessage('Failed to save settings.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || taskReward <= 0) {
      setMessage('Please enter a valid task title and positive reward');
      return;
    }

    const res = await createAdminTaskApi({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      reward: taskReward,
      type: taskType,
      category: taskCategory,
      actionUrl: taskUrl.trim(),
      requiresProof: taskRequiresProof,
    });

    if (res.success) {
      setMessage('New Task Created Successfully!');
      setTaskTitle('');
      setTaskDesc('');
      setTaskReward(500);
      setTaskUrl('');
      loadTasks();
    } else {
      setMessage(`Failed to create task: ${res.error}`);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle || taskReward <= 0) return;

    const res = await updateAdminTaskApi(editingTask.id, {
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      reward: taskReward,
      type: taskType,
      category: taskCategory,
      actionUrl: taskUrl.trim(),
      requiresProof: taskRequiresProof,
    });

    if (res.success) {
      setMessage('Task Updated Successfully!');
      setEditingTask(null);
      setTaskTitle('');
      setTaskDesc('');
      setTaskReward(500);
      setTaskUrl('');
      loadTasks();
      setActiveTab('manage_tasks');
    } else {
      setMessage(`Failed to update task: ${res.error}`);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the task "${title}"?`)) return;
    const res = await deleteAdminTaskApi(taskId);
    if (res.success) {
      setMessage(`Task deleted successfully!`);
      loadTasks();
    } else {
      setMessage(`Failed to delete task: ${res.error}`);
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskReward(task.reward);
    setTaskType(task.type);
    setTaskCategory(task.category);
    setTaskUrl(task.actionUrl || '');
    setTaskRequiresProof(task.requiresProof);
    setActiveTab('add_task');
  };

  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const pendingSubmissionsCount = pendingSubmissions.length;

  return (
    <div className="p-4 space-y-4 pb-24 text-amber-50">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#2e1c15] to-[#1e110d] p-4 rounded-3xl border border-amber-500/40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-black text-lg shadow-lg border border-amber-300/40">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black text-amber-100 flex items-center gap-2">
              <span>Admin Management Dashboard</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-amber-300/70 font-mono">
              Withdrawal Requests • Submissions • Tasks • System APIs
            </p>
          </div>
        </div>

        <button
          onClick={loadAllData}
          disabled={loadingData}
          className="bg-[#2a1a14] text-amber-300 hover:text-white p-2.5 rounded-2xl border border-[#4d362c] flex items-center gap-1 text-xs font-bold shadow-md cursor-pointer active:scale-95"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1.5 bg-[#170c09] p-2 rounded-2xl border border-[#3e281e] overflow-x-auto shadow-inner">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`py-2 px-3 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-200/70 hover:text-amber-100'
          }`}
        >
          <span>Requests ({pendingWithdrawalsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`py-2 px-3 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-200/70 hover:text-amber-100'
          }`}
        >
          <span>Submissions ({pendingSubmissionsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-3 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-200/70 hover:text-amber-100'
          }`}
        >
          <span>Users ({users.length})</span>
        </button>

        <button
          onClick={() => { setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setTaskReward(500); setTaskUrl(''); setActiveTab('add_task'); }}
          className={`py-2 px-3 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer ${
            activeTab === 'add_task'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-200/70 hover:text-amber-100'
          }`}
        >
          <span>+ Add Task</span>
        </button>

        <button
          onClick={() => { setEditingTask(null); setActiveTab('manage_tasks'); }}
          className={`py-2 px-3 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer ${
            activeTab === 'manage_tasks'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-200/70 hover:text-amber-100'
          }`}
        >
          <span>📋 Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-3 text-xs font-black rounded-xl shrink-0 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-amber-200/70 hover:text-amber-100'
          }`}
        >
          <span>API & SMTP</span>
        </button>
      </div>

      {/* Daily & Total Email Sent Status Dashboard */}
      <div className="bg-gradient-to-r from-[#2c1811] via-[#24130d] to-[#1e100b] p-4 rounded-2xl border border-amber-500/50 shadow-xl space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0 shadow-inner">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-amber-100 text-sm flex items-center gap-1.5">
                <span>📧 মোট ইমেইল সেন্ড স্ট্যাটাস (Email Sent Monitor)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">Live Active</span>
              </h3>
              <p className="text-[10px] text-amber-300/70">ইউজারদের পাঠানো ওটিপি ও ইমেইলের রিয়েল-টাইম হিসাব</p>
            </div>
          </div>
          <button
            onClick={() => {
              loadOtpStats();
              setMessage('ইমেইল সেন্ড স্ট্যাটাস রিফ্রেশ করা হয়েছে!');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition-all text-[11px] shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>রিফ্রেশ স্ট্যাটাস</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#170c08] p-2.5 rounded-xl border border-amber-500/30 flex flex-col justify-between">
            <span className="text-[10px] text-amber-300/70">আজকে পাঠানো হয়েছে</span>
            <div className="text-base font-black text-amber-400 font-mono mt-1">
              {otpStats?.todayCount || 0} <span className="text-xs font-normal">টি ইমেইল</span>
            </div>
          </div>
          <div className="bg-[#170c08] p-2.5 rounded-xl border border-amber-500/30 flex flex-col justify-between">
            <span className="text-[10px] text-amber-300/70">সর্বমোট পাঠানো হয়েছে</span>
            <div className="text-base font-black text-amber-200 font-mono mt-1">
              {otpStats?.totalCount || 0} <span className="text-xs font-normal">টি ইমেইল</span>
            </div>
          </div>
          <div className="bg-[#170c08] p-2.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-300/80">Brevo SMTP (Primary)</span>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
              {otpStats?.brevoUsedToday || 0} <span className="text-xs text-emerald-300/60 font-normal">/ 290 লিমিট</span>
            </div>
          </div>
          <div className="bg-[#170c08] p-2.5 rounded-xl border border-orange-500/30 flex flex-col justify-between">
            <span className="text-[10px] text-orange-300/80">Resend SMTP (Backup)</span>
            <div className="text-sm font-bold text-orange-400 font-mono mt-1">
              {otpStats?.resendUsedToday || 0} <span className="text-xs text-orange-300/60 font-normal">/ 98 লিমিট</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#140b08] px-3 py-1.5 rounded-xl border border-[#3e281e] text-[10px] text-amber-300/80 font-medium">
          <span>🛡️ স্প্যাম সুরক্ষায় প্রতি ইমেইলে সর্বোচ্চ ২ বার ওটিপি রিকোয়েস্ট লিমিট সক্রিয় আছে।</span>
          <span className="text-amber-400">⚡ স্মার্ট ফেইলওভার: Brevo লিমিট শেষ হলে Resend দিয়ে স্বয়ংক্রিয় ইমেইল যাবে।</span>
        </div>
      </div>

      {message && (
        <div className="bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs p-3 rounded-2xl flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-amber-400 font-bold ml-2">✕</button>
        </div>
      )}

      {/* 1. Withdrawal Requests Tab */}
      {activeTab === 'withdrawals' && (
        <div className="bg-[#211410] p-4 rounded-3xl border border-[#442f26] shadow-xl space-y-3">
          <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Pending Cash Withdrawal Requests ({withdrawals.length})</span>
          </h2>

          {withdrawals.length === 0 ? (
            <p className="text-xs text-amber-300/50 text-center py-6 bg-[#140b08] rounded-2xl border border-[#38251e]">
              No withdrawal requests pending currently.
            </p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map(req => (
                <div key={req.id} className="bg-[#140b08] p-3.5 rounded-2xl border border-[#38251e] space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-extrabold text-amber-100 text-sm">{req.userName}</div>
                      <div className="text-[11px] text-amber-300/60 font-mono">{req.userEmail}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : req.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="bg-[#1c100c] p-2.5 rounded-xl border border-[#3d2921] flex justify-between items-center font-mono">
                    <div>
                      <span className="text-amber-400 font-bold">{req.paymentMethod}:</span>{' '}
                      <span className="text-white font-black text-sm">{req.accountNumber}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-black text-sm">৳ {req.takaAmount} BDT</div>
                      <div className="text-[10px] text-amber-300/60">{req.coinsAmount.toLocaleString()} Coins</div>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleReviewWithdrawal(req.id, 'rejected')}
                        className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-rose-500/30 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleReviewWithdrawal(req.id, 'approved')}
                        className="bg-emerald-500 text-black px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 hover:bg-emerald-400 shadow-md cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve & Pay
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Task Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="bg-[#211410] p-4 rounded-3xl border border-[#442f26] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3e281e]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl">
                <ImageIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-amber-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Pending Task Submissions ({pendingSubmissionsCount})</span>
                </h2>
                <p className="text-[11px] text-amber-300/70">
                  Proof, Username, Email & Bulk Approval Control
                </p>
              </div>
            </div>

            {/* Bulk Action Controls */}
            {pendingSubmissions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPendingSubmissions}
                  className="px-3 py-1.5 bg-[#170c09] hover:bg-[#281610] text-amber-300 border border-[#482f25] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedSubmissionIds.length === pendingSubmissions.length && pendingSubmissions.length > 0
                      ? 'Deselect All'
                      : `Select All (${pendingSubmissions.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkReviewSubmissions('approved')}
                  disabled={selectedSubmissionIds.length === 0 || bulkProcessing}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs rounded-xl shadow-lg disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {bulkProcessing ? 'প্রসেসিং...' : `Bulk Approve (${selectedSubmissionIds.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkReviewSubmissions('rejected')}
                  disabled={selectedSubmissionIds.length === 0 || bulkProcessing}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-extrabold text-xs rounded-xl disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Bulk Reject</span>
                </button>
              </div>
            )}
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-10 bg-[#140b08] rounded-2xl border border-[#38251e] space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto" />
              <p className="text-xs text-amber-300/70 font-bold">
                কোনো পেন্ডিং টাস্ক সাবমিশন নেই! (All clear)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map(sub => {
                const task = tasks.find(t => t.id === sub.taskId);
                const isSelected = selectedSubmissionIds.includes(sub.id);

                return (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 text-xs ${
                      isSelected
                        ? 'bg-[#25150f] border-amber-500 shadow-lg shadow-amber-500/10'
                        : 'bg-[#140b08] border-[#38251e] hover:border-[#52372c]'
                    }`}
                  >
                    {/* Header: Checkbox + User Profile (Username & Email) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox for bulk select */}
                        <label className="mt-0.5 relative flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSubmission(sub.id)}
                            className="w-5 h-5 rounded border-amber-500/50 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-[#0f0705] cursor-pointer accent-amber-500"
                          />
                        </label>

                        {/* User Profile Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                              <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-black text-amber-100 text-sm flex items-center gap-2">
                                <span>{sub.userName || 'Unknown User'}</span>
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                  {sub.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-amber-300 font-mono font-semibold flex items-center gap-1">
                                <Mail className="w-3 h-3 text-amber-400" />
                                <span>{sub.userEmail || 'No Email Registered'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Submission Date & User ID */}
                      <div className="text-right font-mono text-[10px] text-amber-300/60 shrink-0">
                        <div>User ID: {sub.userId}</div>
                        <div>{new Date(sub.submittedAt).toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Task Title & Details */}
                    <div className="bg-[#1c100c] p-2.5 rounded-xl border border-[#3d2921] flex flex-wrap items-center justify-between gap-2">
                      <div className="font-extrabold text-amber-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>টাস্ক: {task ? task.title : sub.taskId}</span>
                      </div>
                      {task && (
                        <div className="text-emerald-400 font-black text-xs bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                          রিওয়ার্ড: ৳ {task.reward} BDT
                        </div>
                      )}
                    </div>

                    {/* Proof Image Box */}
                    {sub.proofImageUrl ? (
                      <div className="space-y-1.5 bg-[#0f0705] p-3 rounded-xl border border-[#36231a]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            <span>ইউজার জমাকৃত প্রমাণ (Screenshot Proof):</span>
                          </span>
                          <a
                            href={sub.proofImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:text-amber-300 text-[11px] font-bold underline flex items-center gap-1 font-mono"
                          >
                            <span>ফুল স্ক্রিনশট দেখুন</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="relative group max-w-sm">
                          <img
                            src={sub.proofImageUrl}
                            alt="Submission Proof"
                            className="max-h-52 w-auto rounded-xl border border-[#482f25] object-contain bg-black/60 shadow-md"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#170d0a] p-2.5 rounded-xl border border-[#36231a] text-amber-300/60 text-xs italic">
                        ⚠️ কোনো প্রমাণ ছবি ফাইল পাওয়া যায়নি।
                      </div>
                    )}

                    {/* Single Review Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#2e1c15]">
                      <div className="text-[11px] text-amber-300/50 font-mono">
                        ID: {sub.id}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewSubmission(sub.id, 'rejected')}
                          className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-rose-500/30 cursor-pointer transition-all"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSubmission(sub.id, 'approved')}
                          className="bg-emerald-500 text-black font-black px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 hover:bg-emerald-400 shadow-md cursor-pointer transition-all"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Credit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Add / Edit Task Tab */}
      {activeTab === 'add_task' && (
        <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="bg-[#211410] p-4 rounded-3xl border border-[#442f26] shadow-xl space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{editingTask ? `✏️ Edit Task: ${editingTask.title}` : 'Publish New Task to App'}</span>
            </h2>
            {editingTask && (
              <button
                type="button"
                onClick={() => { setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setTaskReward(500); setTaskUrl(''); setActiveTab('manage_tasks'); }}
                className="bg-[#2d1e18] text-amber-300 hover:text-white px-2.5 py-1 rounded-xl border border-[#4d3329] text-[10px] font-bold cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label className="font-bold text-amber-300 block mb-1">Task Title</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="Join Telegram Channel / Subscribe YouTube..."
              className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100"
            />
          </div>

          <div>
            <label className="font-bold text-amber-300 block mb-1">Task Description</label>
            <textarea
              rows={2}
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              placeholder="Instructions for user..."
              className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-amber-300 block mb-1">Reward (৳ Taka / BDT)</label>
              <input
                type="number"
                required
                value={taskReward}
                onChange={e => setTaskReward(Number(e.target.value))}
                className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-amber-300 block mb-1">Type</label>
              <select
                value={taskType}
                onChange={e => setTaskType(e.target.value as 'one_time' | 'daily')}
                className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100"
              >
                <option value="one_time">One Time Task</option>
                <option value="daily">Daily Task</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-amber-300 block mb-1">Action Link / URL</label>
            <input
              type="url"
              value={taskUrl}
              onChange={e => setTaskUrl(e.target.value)}
              placeholder="https://t.me/xnrewared"
              className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="proofCheck"
              checked={taskRequiresProof}
              onChange={e => setTaskRequiresProof(e.target.checked)}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="proofCheck" className="text-amber-200 font-bold cursor-pointer">
              Requires Screenshot Proof Upload?
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer"
          >
            {editingTask ? 'Update Task Changes' : 'Publish New Task'}
          </button>
        </form>
      )}

      {/* 3b. Manage Tasks Tab */}
      {activeTab === 'manage_tasks' && (
        <div className="bg-[#211410] p-4 rounded-3xl border border-[#442f26] shadow-xl space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>Active Tasks Database ({tasks.length})</span>
            </h2>
            <button
              onClick={() => { setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setTaskReward(500); setTaskUrl(''); setActiveTab('add_task'); }}
              className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Task
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-amber-300/60 font-mono">
              No tasks created yet. Click "+ Add Task" to create one.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map(t => (
                <div key={t.id} className="bg-[#140b08] p-3.5 rounded-2xl border border-[#3e2a22] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-100 text-sm truncate">{t.title}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${t.type === 'daily' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                        {t.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-300/70 mt-1 line-clamp-1">{t.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-amber-400">
                      <span>Reward: ৳ {t.reward} Taka</span>
                      {t.requiresProof && <span className="text-emerald-400">📸 Proof Req</span>}
                      {t.actionUrl && <a href={t.actionUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">Link ↗</a>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2d1e18]">
                    <button
                      onClick={() => startEditingTask(t)}
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id, t.title)}
                      className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. API Keys & Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#211410] p-4 rounded-3xl border border-[#442f26] shadow-xl space-y-4 text-xs">
          <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>API Keys & System Configuration</span>
          </h2>

          {/* Dedicated Email Sent Analytics & Daily History Box */}
          <div className="bg-gradient-to-br from-[#1c0f0a] to-[#140b08] p-3.5 rounded-2xl border border-amber-500/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <span className="font-extrabold text-amber-200 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>📧 ইমেইল সেন্ডিং বিস্তারিত রিপোর্ট (SMTP Usage Report)</span>
              </span>
              <button
                type="button"
                onClick={() => loadOtpStats()}
                className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 font-bold transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span>রিফ্রেশ</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#211410] p-2 rounded-xl border border-amber-500/30">
                <div className="text-[10px] text-amber-300/70">আজকের ইমেইল সেন্ড</div>
                <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{otpStats?.todayCount || 0} টি</div>
              </div>
              <div className="bg-[#211410] p-2 rounded-xl border border-amber-500/30">
                <div className="text-[10px] text-amber-300/70">সর্বমোট ইমেইল সেন্ড</div>
                <div className="text-lg font-black text-amber-200 font-mono mt-0.5">{otpStats?.totalCount || 0} টি</div>
              </div>
            </div>

            {/* Daily History List if available */}
            {otpStats?.history && otpStats.history.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-bold text-amber-300/80 mb-1 flex items-center justify-between">
                  <span>📅 গত দিনগুলোর ইমেইল সেন্ড হিস্ট্রি:</span>
                  <span>তারিখ ও সংখ্যা</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {otpStats.history.slice(0, 7).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#140b08] px-2.5 py-1 rounded-lg border border-[#34211a] text-[11px]">
                      <span className="font-mono text-amber-200">{item.date}</span>
                      <span className="font-bold text-amber-400 font-mono">{item.count} টি ইমেইল</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dedicated ImgBB API Key Management Table */}
          <div className="bg-[#1a0f0a] border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-amber-100 text-base flex items-center gap-2">
                    <span>ImgBB API Keys Table</span>
                  </h3>
                  <p className="text-[11px] text-amber-200/80">
                    ব্যর্থ কি-গুলো লাল দেখাবে এবং বাদ যাবে। শুধু সক্রিয় (Active) কি দিয়ে ছবি আপলোড হবে।
                  </p>
                </div>
              </div>

              {/* Key Counter Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active: <strong>{imgbbKeysList.filter(k => k.status === 'active').length}</strong></span>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-xl text-[11px] font-mono text-red-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Failed: <strong>{imgbbKeysList.filter(k => k.status === 'failed').length}</strong></span>
                </div>
              </div>
            </div>

            {/* Add Keys Box & Test All Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={newImgbbInput}
                onChange={e => setNewImgbbInput(e.target.value)}
                placeholder="নতুন ImgBB API Key লিখুন (কমা দিয়ে একাধিক key দিতে পারেন)..."
                className="flex-1 bg-[#120a07] border border-[#3e2a22] rounded-xl px-3 py-2 text-amber-100 text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddImgbbKeys}
                disabled={addingKeys || !newImgbbInput.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{addingKeys ? 'যোগ হচ্ছে...' : 'কি যোগ করুন'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestAllImgbbKeys}
                disabled={testingKeys || imgbbKeysList.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold text-xs rounded-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${testingKeys ? 'animate-spin' : ''}`} />
                <span>{testingKeys ? 'টেস্ট চলছে...' : 'সব কি লাইভ টেস্ট করুন'}</span>
              </button>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto rounded-2xl border border-[#3a251c] bg-[#120a07]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#24150f] text-amber-300 font-extrabold border-b border-[#3a251c] uppercase tracking-wider text-[11px]">
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">ImgBB API Key</th>
                    <th className="p-3 text-center">Status (অবস্থা)</th>
                    <th className="p-3 text-right">Actions (অ্যাকশন)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a1a13] text-amber-100 font-mono">
                  {imgbbKeysList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-amber-300/60 text-xs font-sans">
                        কোনো ImgBB Key পাওয়া যায়নি। উপরে নতুন key বসিয়ে "কি যোগ করুন" এ ক্লিক করুন।
                      </td>
                    </tr>
                  ) : (
                    imgbbKeysList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#1f120c] transition-colors">
                        <td className="p-3 text-center font-bold text-amber-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-amber-200 text-xs tracking-wider select-all font-bold">
                              {item.key}
                            </span>
                            {item.failReason && item.status === 'failed' && (
                              <span className="text-[10px] text-red-400 font-sans mt-0.5">
                                ⚠️ কারণ: {item.failReason}
                              </span>
                            )}
                            {item.lastTested && (
                              <span className="text-[9px] text-amber-300/40 font-sans">
                                সর্বশেষ টেস্ট: {new Date(item.lastTested).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-sans">
                          {item.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleImgbbKey(item.id, item.status)}
                              title={item.status === 'active' ? 'Mark as Failed' : 'Mark as Active'}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                                item.status === 'active'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                              }`}
                            >
                              {item.status === 'active' ? 'ব্যর্থ চিহ্নিত করুন' : 'সক্রিয় করুন'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImgbbKey(item.id)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email Verification OTP Toggle Button */}
          <div className="bg-[#1c110d] border-2 border-amber-500/50 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <label className="font-extrabold text-amber-200 text-sm flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <span>ইমেইল ভেরিফিকেশন ওটিপি (Email OTP Verification)</span>
              </label>
              <p className="text-[11px] text-amber-300/80 leading-relaxed mt-1">
                <strong>অন থাকলে:</strong> নতুন অ্যাকাউন্ট তৈরিতে জিমেইলে ৬ ডিজিটের ওটিপি যাবে এবং ভেরিফাই করতে হবে।<br />
                <strong>অফ থাকলে:</strong> ওটিপি ভেরিফিকেশন ছাড়াই সরাসরি রেজিস্ট্রেশন হবে। (দৈনিক ইমেইল লিমিট শেষ হলেও অটো ওটিপি বন্ধ হবে!)<br />
                <span className="text-emerald-400 font-bold">🛡️ বিঃদ্রঃ ওটিপি অফ থাকলেও ১ ডিভাইস ১ অ্যাকাউন্ট এবং হার্ড রেফার সুরক্ষা ১০০% সক্রিয় থাকবে!</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequireEmailOtp(!requireEmailOtp)}
              className={`px-5 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0 ${
                requireEmailOtp
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-600/30 animate-pulse'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${requireEmailOtp ? 'bg-black animate-ping' : 'bg-white'}`} />
              <span>{requireEmailOtp ? '✅ ওটিপি চালু আছে (ON)' : '❌ ওটিপি বন্ধ আছে (OFF)'}</span>
            </button>
          </div>

          <div>
            <label className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <Mail className="w-4 h-4 text-amber-400" />
              <span>Brevo API Key (OTP Emails)</span>
            </label>
            <input
              type="text"
              value={brevoKey}
              onChange={e => setBrevoKey(e.target.value)}
              placeholder="xkeysib-..."
              className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Resend API Key (Backup OTP)</span>
            </label>
            <input
              type="text"
              value={resendKey}
              onChange={e => setResendKey(e.target.value)}
              placeholder="re_..."
              className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-[#3e2a22]">
            <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-2">🎬 Tutorial Reel & Welcome Popup Settings</h3>
            
            <div className="space-y-2.5">
              <div>
                <label className="font-bold text-amber-300 block mb-1">Facebook Tutorial Video/Reel URL</label>
                <input
                  type="text"
                  value={fbVideoUrl}
                  onChange={e => setFbVideoUrl(e.target.value)}
                  placeholder="https://www.facebook.com/reel/1148805566373760"
                  className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-amber-300 block mb-1">Popup Welcome Button Text</label>
                <input
                  type="text"
                  value={welcomeText}
                  onChange={e => setWelcomeText(e.target.value)}
                  placeholder="ভিডিও দেখুন! (Tutorial)"
                  className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-amber-300 block mb-1">Support Helpline Telegram Link</label>
                  <input
                    type="text"
                    value={supportUrl}
                    onChange={e => setSupportUrl(e.target.value)}
                    placeholder="https://t.me/xnhelpline"
                    className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-amber-300 block mb-1">Official Channel Telegram Link</label>
                  <input
                    type="text"
                    value={channelUrl}
                    onChange={e => setChannelUrl(e.target.value)}
                    placeholder="https://t.me/xnrewared"
                    className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl p-2.5 text-amber-100 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer"
          >
            Save Admin API Configuration
          </button>
        </form>
      )}

      {/* 5. Users Management Tab */}
      {activeTab === 'users' && (
        <div className="bg-[#211410] p-4 rounded-3xl border border-[#442f26] shadow-xl space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>User Database Management ({users.length})</span>
            </h2>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search user by name, email, referral code..."
              className="w-full bg-[#140b08] border border-[#3e2a22] rounded-xl pl-9 pr-3 py-2.5 text-amber-100 placeholder-amber-300/40 font-mono"
            />
          </div>

          {/* Users List */}
          <div className="space-y-3 mt-3">
            {users
              .filter(u =>
                userSearch.trim() === '' ||
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                (u.referralCode && u.referralCode.toLowerCase().includes(userSearch.toLowerCase()))
              )
              .map(u => (
                <div
                  key={u.id}
                  className={`bg-[#140b08] p-3.5 rounded-2xl border space-y-2.5 transition-all ${
                    u.isBanned ? 'border-rose-500/50 bg-rose-950/10' : 'border-[#38251e]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-white text-sm shadow overflow-hidden shrink-0 border border-amber-300/30">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{u.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-amber-100 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.role === 'admin' && (
                            <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 rounded font-mono font-bold border border-amber-500/40">
                              ADMIN
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="text-[9px] bg-rose-500/30 text-rose-300 px-1.5 rounded font-mono font-bold border border-rose-500/40">
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-amber-300/60 font-mono">{u.email}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-amber-400 font-extrabold">{u.balance.toLocaleString()} Coins</div>
                      <div className="text-[10px] text-amber-300/60">Ref Code: {u.referralCode || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#2d1e18] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const val = prompt(`Enter coin amount to ADD (+) or REMOVE (-) for ${u.name}:`, '10000');
                          if (val !== null) {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) handleAdjustBalance(u.id, num);
                          }
                        }}
                        className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Add/Subtract Coins"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add Balance</span>
                      </button>

                      <button
                        onClick={() => {
                          const val = prompt(`Enter referral count to ADD (+) for ${u.name}:`, '1');
                          if (val !== null) {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) handleAdjustReferrals(u.id, num);
                          }
                        }}
                        className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/40 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Add Verified Referrals"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-orange-400" />
                        <span>Add Ref</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer border ${
                          u.isBanned
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{u.isBanned ? 'Unban User' : 'Ban User'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-800 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
