import React, { useState, useEffect } from 'react';
import { User, Task, TaskSubmission } from '../types';
import { fetchTasksApi, fetchMySubmissionsApi, submitTaskProofApi, compressImage } from '../lib/api';
import { CheckCircle, Clock, Upload, ExternalLink, Flag, Image as ImageIcon, ShieldCheck, X, HelpCircle, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface TaskListProps {
  user: User | null;
  onUpdateUser: (user: User) => void;
  onOpenAuth: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({ user, onUpdateUser, onOpenAuth }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const cached = localStorage.getItem('nxb_tasks_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`nxb_subs_cache_${user.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [filterTab, setFilterTab] = useState<'all' | 'daily' | 'one_time'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [linkOpened, setLinkOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
    if (user) {
      loadMySubmissions();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const res = await fetchTasksApi();
      if (res.tasks) {
        setTasks(res.tasks);
        localStorage.setItem('nxb_tasks_cache', JSON.stringify(res.tasks));
      }
    } catch (err) {
      console.warn('[Cache] Using cached tasks due to network error:', err);
    }
  };

  const loadMySubmissions = async () => {
    if (!user) return;
    try {
      const res = await fetchMySubmissionsApi(user.id);
      if (res.submissions) {
        setSubmissions(res.submissions);
        localStorage.setItem(`nxb_subs_cache_${user.id}`, JSON.stringify(res.submissions));
      }
    } catch (err) {
      console.warn('[Cache] Using cached submissions due to network error:', err);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setCompressing(true);
        const compressed = await compressImage(file, 800, 800, 0.65);
        setProofImageBase64(compressed);
      } catch (err) {
        console.error('Image compression failed, fallback to raw reader:', err);
        const reader = new FileReader();
        reader.onloadend = () => setProofImageBase64(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSubmitProof = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!selectedTask) return;

    if (selectedTask.requiresProof && !proofImageBase64) {
      setMessage('Please select a screenshot proof image first!');
      return;
    }

    setSubmitting(true);
    const res = await submitTaskProofApi(selectedTask.id, user.id, proofImageBase64);
    setSubmitting(false);

    if (res.success) {
      setMessage(res.message);
      if (res.user) {
        onUpdateUser(res.user);
      } else if (res.newTakaBalance !== undefined) {
        onUpdateUser({ ...user, takaBalance: res.newTakaBalance });
      } else if (res.newBalance !== undefined) {
        onUpdateUser({ ...user, balance: res.newBalance });
      }
      setSelectedTask(null);
      setProofImageBase64('');
      setLinkOpened(false);
      loadMySubmissions();
    } else {
      setMessage(res.error || 'Failed to submit proof');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterTab === 'daily' && t.type !== 'daily') return false;
    if (filterTab === 'one_time' && t.type !== 'one_time') return false;
    
    // Hide tasks that have already been submitted and are currently pending or approved
    const sub = submissions.find(s => s.taskId === t.id);
    if (sub && (sub.status === 'pending' || sub.status === 'approved')) {
      return false;
    }

    return true;
  });

  const getTaskStatus = (taskId: string) => {
    const sub = submissions.find(s => s.taskId === taskId);
    if (!sub) return 'available';
    return sub.status; // 'pending' | 'approved' | 'rejected'
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-24 text-amber-50">
      {/* Top Banner - Luxury Golden Card */}
      <div className="bg-gradient-to-br from-[#382015] via-[#26150e] to-[#150a06] p-5 rounded-3xl border-t border-t-amber-400/60 border-x border-x-amber-500/30 border-b border-b-black/80 shadow-[0_15px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-amber-400 rounded-full blur-md opacity-40 animate-pulse" />
            <img
              src="/src/assets/images/nxb_golden_coin_1784869821261.jpg"
              alt="Coins"
              className="relative w-14 h-14 rounded-2xl shadow-2xl border-2 border-amber-300/80 object-cover"
            />
          </div>
          <div>
            <h2 className="text-xl font-black text-amber-100 flex items-center gap-2">
              <span className="tracking-wide">INCREASE YOUR RATING</span>
            </h2>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              টাস্ক পূরণ করুন, স্ক্রিনশট প্রুফ দিন এবং নগদ টাকা (<strong className="text-emerald-400 font-mono">Taka BDT</strong>) রিওয়ার্ড পান!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-black animate-bounce" />
          <span>কীভাবে কাজ করবেন? (নিয়ম)</span>
        </button>
      </div>

      {/* Interactive Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1b0f0b] border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-amber-100 relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-amber-400 font-black text-lg pb-2 border-b border-amber-500/20">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>সহজে টাকা ইনকামের ৩টি নিয়ম!</span>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-amber-200/90">
              <div className="bg-black/40 p-3 rounded-2xl border border-amber-500/30 flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 mt-0.5">১</span>
                <div>
                  <strong className="text-amber-300 block mb-0.5">টাস্ক সিলেক্ট করুন:</strong>
                  তালিকা থেকে আপনার পছন্দের টাস্ক (যেমন: YouTube Subscribe, Telegram Join) বেছে নিয়ে <strong className="text-white">'টাস্ক করুন'</strong> বাটনে ক্লিক করুন।
                </div>
              </div>
              <div className="bg-black/40 p-3 rounded-2xl border border-amber-500/30 flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 mt-0.5">২</span>
                <div>
                  <strong className="text-amber-300 block mb-0.5">লিংকে যান ও কাজ করুন:</strong>
                  বিবরণ পড়ে <strong className="text-cyan-400">'🔗 টাস্ক লিংকে যান'</strong> বাটনে ক্লিক করে নির্দিষ্ট সাইটে গিয়ে কাজ সম্পন্ন করুন এবং একটি স্ক্রিনশট (Screenshot) নিন।
                </div>
              </div>
              <div className="bg-black/40 p-3 rounded-2xl border border-amber-500/30 flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 mt-0.5">৩</span>
                <div>
                  <strong className="text-amber-300 block mb-0.5">স্ক্রিনশট প্রুফ জমা দিন:</strong>
                  <strong className="text-emerald-400">ধাপ ৩</strong> থেকে স্ক্রিনশটটি আপলোড করে <strong className="text-white">'🚀 টাস্ক জমা দিন'</strong> বাটনে ক্লিক করুন। এডমিন চেক করে আপনার ব্যালেন্সে টাকা যোগ করে দেবে!
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-2xl text-emerald-300 text-center font-bold text-[11px]">
                ⚡ আমাদের সিস্টেমে ছবি আপলোড খুব ফাস্ট! স্ক্রিনশট অটো-কমপ্রেস হয়ে মাত্র কয়েক সেকেন্ডে জমা হয়ে যায়।
              </div>
            </div>
            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer text-center"
            >
              বুঝেছি, এখন কাজ শুরু করব! 👍
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-[#1b0f0b]/90 p-1.5 rounded-2xl border border-[#4a2b1d] shadow-inner">
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
            filterTab === 'all' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md scale-102' : 'text-amber-200/60 hover:text-amber-100 hover:bg-white/5'
          }`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setFilterTab('daily')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
            filterTab === 'daily' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md scale-102' : 'text-amber-200/60 hover:text-amber-100 hover:bg-white/5'
          }`}
        >
          Daily Tasks
        </button>
        <button
          onClick={() => setFilterTab('one_time')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
            filterTab === 'one_time' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md scale-102' : 'text-amber-200/60 hover:text-amber-100 hover:bg-white/5'
          }`}
        >
          One-Time
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div className="bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 border border-amber-500 text-amber-100 text-xs p-3.5 rounded-2xl flex items-center justify-between shadow-lg font-bold animate-bounce">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-amber-400 font-extrabold px-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Task List Items */}
      <div className="flex flex-col gap-3.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#1f130f] p-8 rounded-3xl border border-[#3b2820] text-center text-xs text-amber-300/60 font-bold">
            কোনো টাস্ক অবশিষ্ট নেই! আপনি সব টাস্ক সম্পন্ন করেছেন অথবা নতুন টাস্কের জন্য অপেক্ষা করুন।
          </div>
        ) : (
          filteredTasks.map(task => {
          const status = getTaskStatus(task.id);
          return (
            <div
              key={task.id}
              className="bg-gradient-to-br from-[#331e15]/95 via-[#23140e]/95 to-[#150a07]/95 backdrop-blur-xl p-4 rounded-3xl border-t border-t-amber-400/50 border-x border-x-amber-500/20 border-b border-b-black/80 flex items-center justify-between gap-3 shadow-[0_10px_25px_rgba(0,0,0,0.7)] hover:scale-101 hover:border-amber-400/80 transition-all group relative overflow-hidden"
            >
              <div className="absolute -left-4 -top-4 w-12 h-12 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                  <Flag className="w-5 h-5 fill-amber-400/20" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-amber-100 group-hover:text-amber-300 transition-colors">{task.title}</h3>
                  <p className="text-[11px] text-amber-300/70 line-clamp-1 mt-0.5">{task.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-xl border border-emerald-500/40 shadow-inner">
                  ৳ {task.reward} Taka
                </span>

                {status === 'approved' ? (
                  <span className="flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl font-bold border border-emerald-500/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </span>
                ) : status === 'pending' ? (
                  <span className="flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-xl font-bold border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (!user) {
                        onOpenAuth();
                      } else {
                        setSelectedTask(task);
                        setLinkOpened(false);
                        setProofImageBase64('');
                      }
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs px-3.5 py-1.5 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          );
        }))}
      </div>

      {/* 3-Step Task Execution & Proof Submission Page/Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#2a1a14] via-[#1f130e] to-[#150a07] border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 w-full max-w-md text-amber-50 flex flex-col gap-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#4d352b] sticky top-0 bg-[#2a1a14]/95 z-10 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
                  <Flag className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-100 leading-tight">টাস্ক সম্পন্ন করুন (Complete Task)</h3>
                  <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">রিওয়ার্ড: ৳ {selectedTask.reward} Taka BDT</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setLinkOpened(false);
                  setProofImageBase64('');
                }}
                className="w-8 h-8 rounded-full bg-black/50 text-amber-400 hover:text-white hover:bg-black/80 flex items-center justify-center cursor-pointer transition-all border border-[#4d352b] shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Read Task */}
            <div className="bg-[#1c110d] p-3.5 rounded-2xl border border-[#3a271f] space-y-2 relative overflow-hidden shadow-inner">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs pb-2 border-b border-[#3a271f]">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-[11px] font-mono font-black text-amber-300">১</span>
                <span>ধাপ ১: টাস্ক বিবরণ পড়ুন (Read Instructions)</span>
              </div>
              <h4 className="text-sm font-black text-amber-100 pt-0.5">{selectedTask.title}</h4>
              <p className="text-xs text-amber-200/80 leading-relaxed bg-black/30 p-3 rounded-xl border border-amber-500/10 font-medium whitespace-pre-line">{selectedTask.description}</p>
              <div className="bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-mono font-bold text-emerald-300 flex items-center justify-between mt-1">
                <span>কাজটি সঠিকভাবে করলে পাবেন:</span>
                <span className="font-black text-emerald-400 text-sm">৳ {selectedTask.reward} টাকা</span>
              </div>
            </div>

            {/* Step 2: Click Link */}
            <div className={`p-3.5 rounded-2xl border transition-all space-y-2.5 shadow-inner ${
              linkOpened ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-[#1c110d] border-[#3a271f]'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-[#3a271f]/80">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-[11px] font-mono font-black text-amber-300">২</span>
                  <span>ধাপ ২: লিংকে ক্লিক করুন (Open Link)</span>
                </div>
                {linkOpened && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> লিংক ভিজিট হয়েছে
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-200/70 leading-relaxed">
                নিচের বাটনে ক্লিক করে নির্দিষ্ট লিংকে যান এবং নির্দেশিত কাজ (যেমন: জয়েন/সাবস্ক্রাইব/ভিজিট/লাইক) সম্পন্ন করুন।
              </p>
              {selectedTask.actionUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    window.open(selectedTask.actionUrl, '_blank');
                    setLinkOpened(true);
                  }}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                    linkOpened
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 scale-101'
                      : 'bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:brightness-110 text-white border border-sky-400/40 animate-pulse'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>{linkOpened ? '🔗 আবার লিংকে যান (Visit Link Again)' : '🔗 টাস্ক লিংকে যান (Click Here to Complete Task)'}</span>
                </button>
              ) : (
                <div className="bg-white/5 p-3 rounded-xl text-center text-xs text-amber-300/80 font-medium border border-amber-500/20">
                  এই টাস্কে কোনো বাইরের লিংক নেই, সরাসরি ধাপ ৩ সম্পূর্ণ করুন।
                </div>
              )}
            </div>

            {/* Step 3: Upload Proof & Submit */}
            <div className="bg-[#1c110d] p-3.5 rounded-2xl border border-[#3a271f] space-y-3 shadow-inner">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs pb-2 border-b border-[#3a271f]">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-[11px] font-mono font-black text-amber-300">৩</span>
                <span>ধাপ ৩: প্রুফ জমা দিন (Upload Proof)</span>
              </div>

              {selectedTask.requiresProof ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-amber-200 block">
                    কাজের স্ক্রিনশট আপলোড করুন (Upload Screenshot):
                  </label>
                  <div className="border-2 border-dashed border-[#543b30] hover:border-amber-500/80 rounded-2xl p-4 text-center cursor-pointer bg-[#1e130f] transition-all relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {proofImageBase64 ? (
                      <div className="flex flex-col items-center gap-2 py-1">
                        <img src={proofImageBase64} alt="Proof" className="w-36 h-36 object-cover rounded-xl border-2 border-emerald-500/60 shadow-lg mx-auto" />
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-950/90 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center justify-center gap-1 mx-auto w-fit">
                          <CheckCircle className="w-3.5 h-3.5" /> স্ক্রিনশট সিলেক্ট হয়েছে (Change)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-amber-300/70 py-3">
                        <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-amber-200">ক্লিক করে স্ক্রিনশট আপলোড করুন</span>
                        <span className="text-[10px] text-amber-400/60 font-mono">(PNG, JPG, JPEG supported)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-300/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-center font-medium leading-relaxed">
                  এই টাস্কে কোনো স্ক্রিনশট প্রুফ প্রয়োজন নেই। সরাসরি নিচের বাটনে ক্লিক করে রিওয়ার্ড সংগ্রহ করুন!
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={submitting || (selectedTask.requiresProof && !proofImageBase64)}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black font-extrabold py-3.5 rounded-2xl shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <span>আপলোড হচ্ছে... (Submitting...)</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                    <span>🚀 টাস্ক জমা দিন (Submit Task Proof)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
