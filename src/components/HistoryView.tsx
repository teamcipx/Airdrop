import React, { useState, useEffect } from 'react';
import { User, TaskSubmission, WithdrawalRecord } from '../types';
import { fetchMySubmissionsApi, fetchWithdrawalsApi } from '../lib/api';
import { History, CheckCircle2, Clock, XCircle, Wallet, FileText, Eye, X, ShieldCheck, AlertCircle, Sparkles, Award, ExternalLink, Calendar, ArrowDownRight } from 'lucide-react';

interface HistoryViewProps {
  user: User | null;
  onOpenAuth: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, onOpenAuth }) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'withdrawals'>('submissions');
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`nxb_subs_cache_${user.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`nxb_with_cache_${user.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    if (submissions.length === 0 && withdrawals.length === 0) {
      setLoading(true);
    }

    try {
      const [subRes, withRes] = await Promise.all([
        fetchMySubmissionsApi(user.id),
        fetchWithdrawalsApi(user.id)
      ]);

      if (subRes.submissions) {
        setSubmissions(subRes.submissions);
        localStorage.setItem(`nxb_subs_cache_${user.id}`, JSON.stringify(subRes.submissions));
      }
      if (withRes.withdrawals) {
        setWithdrawals(withRes.withdrawals);
        localStorage.setItem(`nxb_with_cache_${user.id}`, JSON.stringify(withRes.withdrawals));
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-amber-50 my-10 bg-[#241713] rounded-3xl border border-[#4a352b] max-w-sm mx-auto shadow-xl">
        <History className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold">Log in to View History</h3>
        <p className="text-xs text-amber-300/70 mt-1 mb-4">
          Please log in to track your task proof submissions & withdrawal status.
        </p>
        <button
          onClick={onOpenAuth}
          className="bg-amber-500 text-black px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg hover:bg-amber-400"
        >
          Login with Gmail
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-24 text-amber-50">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#2c1d18] via-[#241611] to-[#1c110d] p-5 rounded-3xl border border-[#4d362c] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
            <History className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-amber-100 uppercase tracking-wide">
              ACTIVITY & WITHDRAWALS
            </h2>
            <p className="text-xs text-amber-300/70 mt-0.5">
              আপনার টাস্ক এবং উইথড্রয়াল স্ট্যাটাস এখানে রিয়েল-টাইমে দেখুন।
            </p>
          </div>
        </div>
      </div>

      {/* Switcher Tabs */}
      <div className="flex bg-[#251814] p-1.5 rounded-2xl border border-[#443027] shadow-inner">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'submissions' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md scale-[1.01]' : 'text-amber-200/60 hover:text-amber-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Tasks ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'withdrawals' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md scale-[1.01]' : 'text-amber-200/60 hover:text-amber-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Withdrawals ({withdrawals.length})</span>
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="py-16 text-center text-amber-300/60 text-xs flex flex-col items-center justify-center gap-3 bg-[#1e130f] rounded-3xl border border-[#3d2921]">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading activity records...</span>
        </div>
      ) : activeTab === 'submissions' ? (
        submissions.length === 0 ? (
          <div className="bg-[#1f130f] p-10 rounded-3xl border border-[#3b2820] text-center text-xs text-amber-300/60 space-y-2 shadow-lg">
            <FileText className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
            <p className="font-bold text-amber-200">কোনো টাস্ক সাবমিশন পাওয়া যায়নি!</p>
            <p className="text-[11px] text-amber-300/50">টাস্ক সম্পন্ন করে পুরস্কার জিতে নিন।</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => (
              <div
                key={sub.id}
                className="bg-gradient-to-br from-[#221510] to-[#1a100b] p-4 rounded-2xl border border-[#442f25] shadow-lg flex flex-col gap-2.5 transition-all hover:border-[#5a3f33]"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#36231a]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-200 bg-[#2b1b15] px-2.5 py-1 rounded-lg border border-[#4d3429]">
                      Task ID: {sub.taskId}
                    </span>
                  </div>

                  <div>
                    {sub.status === 'approved' && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approved</span>
                      </span>
                    )}
                    {sub.status === 'pending' && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>In Review</span>
                      </span>
                    )}
                    {sub.status === 'rejected' && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="text-[11px] text-amber-300/60 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400/60" />
                    <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    className="bg-[#2d1d17] hover:bg-amber-500 hover:text-black text-amber-300 px-3 py-1.5 rounded-xl border border-[#52392d] hover:border-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400 group-hover:text-black transition-colors" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        withdrawals.length === 0 ? (
          <div className="bg-[#1f130f] p-10 rounded-3xl border border-[#3b2820] text-center text-xs text-amber-300/60 space-y-2 shadow-lg">
            <Wallet className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
            <p className="font-bold text-amber-200">কোনো উইথড্রয়াল রেকর্ড পাওয়া যায়নি!</p>
            <p className="text-[11px] text-amber-300/50">পর্যাপ্ত কয়েন অর্জন করে যেকোনো সময় উইথড্র করুন।</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map(item => {
              const methodBg = 
                item.paymentMethod === 'bKash' ? 'bg-pink-500/15 border-pink-500/40 text-pink-300 shadow-pink-500/5' :
                item.paymentMethod === 'Nagad' ? 'bg-orange-500/15 border-orange-500/40 text-orange-300 shadow-orange-500/5' :
                item.paymentMethod === 'Rocket' ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-purple-500/5' :
                'bg-yellow-500/15 border-yellow-500/40 text-yellow-300 shadow-yellow-500/5';

              return (
                <div
                  key={item.id}
                  className="bg-gradient-to-br from-[#221510] to-[#1a100b] p-4 rounded-2xl border border-[#442f25] shadow-lg transition-all hover:border-[#5a3f33] relative overflow-hidden"
                >
                  {/* Subtle top indicator bar */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                    item.status === 'approved' ? 'bg-emerald-500' :
                    item.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />

                  <div className="flex items-center justify-between pb-3 border-b border-[#36231a]">
                    <div className="flex items-center gap-2.5">
                      <div className={`px-3 py-1 rounded-xl border text-xs font-black tracking-wide shadow-sm ${methodBg}`}>
                        {item.paymentMethod}
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-100 bg-[#2b1b15] px-2.5 py-1 rounded-lg border border-[#4d3429]">
                        {item.accountNumber}
                      </div>
                    </div>

                    <div>
                      {item.status === 'approved' && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Paid</span>
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span className="text-[10px]">Processing</span>
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Refunded</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-base font-black text-emerald-400 flex items-center gap-1">
                        <span>৳ {item.takaAmount} BDT</span>
                      </div>
                      <div className="text-[11px] text-amber-300/60 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>{item.coinsAmount.toLocaleString()} Coins</span>
                        <span>•</span>
                        <span>{new Date(item.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedWithdrawal(item)}
                      className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500 hover:to-amber-600 hover:text-black text-amber-300 px-4 py-2 rounded-xl border border-amber-500/40 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95 group"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400 group-hover:text-black transition-colors" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Withdrawal Details Modal Popup */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#2a1a14] to-[#1c110d] w-full max-w-sm rounded-3xl border border-[#53392d] p-6 shadow-2xl relative overflow-hidden">
            {/* Background glowing glow */}
            {selectedWithdrawal.status === 'approved' && (
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            )}
            {selectedWithdrawal.status === 'pending' && (
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            )}

            {/* Close button top right */}
            <button
              onClick={() => setSelectedWithdrawal(null)}
              className="absolute top-4 right-4 text-amber-300/60 hover:text-amber-100 bg-[#140b08] p-2 rounded-full border border-[#3d271f] transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Status Section */}
            <div className="text-center my-3">
              {selectedWithdrawal.status === 'approved' ? (
                <div className="py-5 space-y-3.5 bg-emerald-500/10 rounded-3xl border border-emerald-500/30 p-4">
                  <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-400 tracking-wide drop-shadow-md">
                    আপনার উইথড্রয়াল সফল! ✨
                  </h3>
                  <p className="text-xs text-emerald-200/90 font-bold leading-relaxed">
                    অভিনন্দন! আপনার পেমেন্ট সফলভাবে আপনার অ্যাকাউন্টে পাঠিয়ে দেওয়া হয়েছে।
                  </p>
                </div>
              ) : selectedWithdrawal.status === 'pending' ? (
                <div className="py-2.5 space-y-1 bg-amber-500/5 rounded-2xl border border-amber-500/20 p-3">
                  <div className="w-9 h-9 bg-amber-500/15 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <h3 className="text-xs font-extrabold text-amber-300/90">
                    আপনার উইথড্রয়াল প্রসেসিং এ রয়েছে...
                  </h3>
                  <p className="text-[10px] text-amber-400/60 font-medium">
                    কিছুক্ষণ অপেক্ষা করুন, অ্যাডমিন যাচাই করে দ্রুত পেমেন্ট পাঠিয়ে দেবে।
                  </p>
                </div>
              ) : (
                <div className="py-4 space-y-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/30 p-3">
                  <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-base font-black text-rose-400">
                    আপনার উইথড্রয়াল বাতিল হয়েছে!
                  </h3>
                  {selectedWithdrawal.rejectionReason ? (
                    <p className="text-xs text-rose-200 bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/30 font-semibold">
                      কারণ: {selectedWithdrawal.rejectionReason}
                    </p>
                  ) : (
                    <p className="text-xs text-rose-300/70">
                      আপনার কয়েন অ্যাকাউন্টে রিফান্ড করে দেওয়া হয়েছে।
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Details Table */}
            <div className="mt-4 bg-[#140b08] rounded-2xl border border-[#3a251d] p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-center border-b border-[#2d1b14] pb-2.5">
                <span className="text-xs text-amber-300/70 font-bold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Amount :</span>
                </span>
                <div className="text-right">
                  <div className="text-base font-black text-emerald-400 font-mono">
                    ৳ {selectedWithdrawal.takaAmount} BDT
                  </div>
                  <div className="text-[10px] text-amber-300/60 font-mono">
                    ({selectedWithdrawal.coinsAmount.toLocaleString()} Coins)
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-[#2d1b14] pb-2.5">
                <span className="text-xs text-amber-300/70 font-bold">
                  Methode :
                </span>
                <span className="text-xs font-black px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                  {selectedWithdrawal.paymentMethod}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-[#2d1b14] pb-2.5">
                <span className="text-xs text-amber-300/70 font-bold">
                  Number :
                </span>
                <span className="text-xs font-mono font-black text-amber-100 bg-[#241611] px-3 py-1 rounded-lg border border-[#4a3126]">
                  {selectedWithdrawal.accountNumber}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-300/70 font-bold">
                  Id (Reffer Code) :
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-[#241611] px-2.5 py-1 rounded-lg border border-[#4a3126] truncate max-w-[170px]" title={selectedWithdrawal.id}>
                  {selectedWithdrawal.id}
                </span>
              </div>
            </div>

            {/* Date and Time info */}
            <div className="mt-3 text-center text-[10px] text-amber-400/60 font-mono bg-[#1a100b] py-2 px-3 rounded-xl border border-[#332018]">
              <div>অনুরোধের তারিখ: {new Date(selectedWithdrawal.requestedAt).toLocaleString()}</div>
              {selectedWithdrawal.processedAt && (
                <div className="text-emerald-400/80 mt-0.5">প্রসেস হয়েছে: {new Date(selectedWithdrawal.processedAt).toLocaleString()}</div>
              )}
            </div>

            {/* Action Close Button */}
            <button
              onClick={() => setSelectedWithdrawal(null)}
              className="mt-5 w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}

      {/* Task Submission Details Modal Popup */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-[#2a1a14] to-[#1c110d] w-full max-w-sm rounded-3xl border border-[#53392d] p-6 shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-4 right-4 text-amber-300/60 hover:text-amber-100 bg-[#140b08] p-2 rounded-full border border-[#3d271f] transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center my-2">
              <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-black text-amber-100">
                টাস্ক সাবমিশন বিস্তারিত
              </h3>
            </div>

            <div className="mt-4 bg-[#140b08] rounded-2xl border border-[#3a251d] p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-[#2d1b14] pb-2">
                <span className="text-amber-300/70 font-bold">Task ID:</span>
                <span className="font-mono font-bold text-amber-200">{selectedSubmission.taskId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2d1b14] pb-2">
                <span className="text-amber-300/70 font-bold">Status:</span>
                <span className="font-bold uppercase">
                  {selectedSubmission.status === 'approved' && <span className="text-emerald-400">Approved ✅</span>}
                  {selectedSubmission.status === 'pending' && <span className="text-amber-400">In Review ⏳</span>}
                  {selectedSubmission.status === 'rejected' && <span className="text-rose-400">Rejected ❌</span>}
                </span>
              </div>
              {selectedSubmission.rejectionReason && (
                <div className="bg-rose-500/15 p-2.5 rounded-xl border border-rose-500/30 text-rose-200 text-xs font-semibold">
                  বাতিলের কারণ: {selectedSubmission.rejectionReason}
                </div>
              )}
              {selectedSubmission.proofImageUrl && (
                <div className="pt-1">
                  <span className="text-amber-300/70 font-bold block mb-1.5">জমাকৃত স্ক্রিনশট:</span>
                  <img src={selectedSubmission.proofImageUrl} alt="Proof" className="w-full max-h-48 object-cover rounded-xl border border-[#4a3126]" />
                </div>
              )}
              <div className="text-[10px] text-amber-400/50 font-mono text-center pt-2 border-t border-[#2d1b14]">
                জমা দেওয়া হয়েছে: {new Date(selectedSubmission.submittedAt).toLocaleString()}
              </div>
            </div>

            <button
              onClick={() => setSelectedSubmission(null)}
              className="mt-5 w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
