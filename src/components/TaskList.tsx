import React, { useState, useEffect } from 'react';
import { User, Task, TaskSubmission } from '../types';
import { fetchTasksApi, fetchMySubmissionsApi, submitTaskProofApi } from '../lib/api';
import { CheckCircle, Clock, Upload, ExternalLink, Flag, Image as ImageIcon, ShieldCheck, X } from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      <div className="bg-gradient-to-br from-[#382015] via-[#26150e] to-[#150a06] p-5 rounded-3xl border-t border-t-amber-400/60 border-x border-x-amber-500/30 border-b border-b-black/80 shadow-[0_15px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.15)] flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h2 className="text-xl font-black text-amber-100 flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-400/40">
              <Flag className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <span className="tracking-wide">INCREASE YOUR RATING</span>
          </h2>
          <p className="text-xs text-amber-200/80 mt-1.5 leading-relaxed">
            টাস্ক পূরণ করুন, স্ক্রিনশট প্রুফ দিন এবং নগদ টাকা (<strong className="text-emerald-400 font-mono">Taka BDT</strong>) রিওয়ার্ড পান!
          </p>
        </div>
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-amber-400 rounded-full blur-md opacity-40 animate-pulse" />
          <img
            src="/src/assets/images/nxb_golden_coin_1784869821261.jpg"
            alt="Coins"
            className="relative w-14 h-14 rounded-2xl shadow-2xl border-2 border-amber-300/80 object-cover"
          />
        </div>
      </div>

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
                        if (task.actionUrl) {
                          window.open(task.actionUrl, '_blank');
                        }
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

      {/* Task Proof Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#241713] border border-[#4d352b] rounded-3xl p-5 w-full max-w-sm text-amber-50 flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-amber-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-amber-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Submit Task Screenshot Proof</span>
            </h3>

            <div className="bg-[#1c110d] p-3 rounded-2xl border border-[#3a271f] text-xs">
              <p className="font-bold text-amber-200">{selectedTask.title}</p>
              <p className="text-amber-300/70 mt-1">{selectedTask.description}</p>
              <div className="mt-2 text-emerald-400 font-mono font-bold">Reward: ৳ {selectedTask.reward} Taka</div>
            </div>

            {selectedTask.requiresProof ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-amber-300">
                  Upload Screenshot Proof (Hosted via ImgBB):
                </label>
                <div className="border-2 border-dashed border-[#543b30] hover:border-amber-500/60 rounded-2xl p-4 text-center cursor-pointer bg-[#1e130f] transition-all relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {proofImageBase64 ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={proofImageBase64} alt="Proof" className="w-32 h-32 object-cover rounded-xl border border-amber-500/40" />
                      <span className="text-xs text-emerald-400 font-semibold">Screenshot Selected ✓</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-amber-300/70">
                      <ImageIcon className="w-8 h-8 text-amber-400/80" />
                      <span className="text-xs font-medium">Click to select screenshot image</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-300/80">This task does not require screenshot proof. Click submit to claim reward!</p>
            )}

            <button
              onClick={handleSubmitProof}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Uploading ImgBB & Submitting...' : 'Submit Proof Screenshot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
