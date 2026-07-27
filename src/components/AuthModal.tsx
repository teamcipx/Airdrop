import React, { useState } from 'react';
import { User } from '../types';
import { sendOtpApi, registerApi, loginApi } from '../lib/api';
import { Mail, Key, User as UserIcon, ShieldCheck, X, Sparkles, AlertCircle, ArrowRight, Inbox, MessageCircle, Video } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialReferralCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, initialReferralCode = '' }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Send OTP (Step 1: Check format & quota, then open Email Confirm modal)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@gmail.com')) {
      setErrorMessage('Only Gmail (@gmail.com) email addresses are allowed!');
      return;
    }

    // Frontend Rate Limit check: Max 2 OTP per session/email
    const currentEmailCount = Number(sessionStorage.getItem(`otp_count_${cleanEmail}`) || '0');
    const currentSessionCount = Number(sessionStorage.getItem('otp_session_total') || '0');
    if (currentEmailCount >= 2 || currentSessionCount >= 2) {
      setErrorMessage('একটি সেশনে এবং একটি ইমেইলে সর্বোচ্চ ২ বারের বেশি ওটিপি (OTP) পাঠানো যাবে না! নিরাপত্তা সুরক্ষায় ওটিপি পাঠানো বন্ধ রয়েছে। কিছুক্ষণ পর বা নতুন সেশনে চেষ্টা করুন।');
      return;
    }

    // Show confirmation modal before sending OTP ("R otp patanor age confirm kore nibe je email thik ase kina")
    setShowEmailConfirm(true);
  };

  // Step 2: Actually send OTP after user confirms email
  const executeSendOtp = async () => {
    setShowEmailConfirm(false);
    setErrorMessage(null);
    setLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    const res = await sendOtpApi(cleanEmail);
    setLoading(false);

    if (res.success) {
      const currentEmailCount = Number(sessionStorage.getItem(`otp_count_${cleanEmail}`) || '0') + 1;
      const currentSessionCount = Number(sessionStorage.getItem('otp_session_total') || '0') + 1;
      sessionStorage.setItem(`otp_count_${cleanEmail}`, String(currentEmailCount));
      sessionStorage.setItem('otp_session_total', String(currentSessionCount));
      setStep('otp');
    } else {
      setErrorMessage(res.error || 'Failed to send verification email.');
    }
  };

  // Complete Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await registerApi({
      name,
      email,
      password,
      otp: otpCode,
      referralCode,
    });

    setLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.toLowerCase().trim().endsWith('@gmail.com')) {
      setErrorMessage('Only Gmail (@gmail.com) email addresses are allowed!');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required for login!');
      return;
    }

    setLoading(true);
    const res = await loginApi(email, password);
    setLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Login failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-amber-50">
      <div className="bg-[#241713] border border-[#4d352b] rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-1 text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg border border-amber-400/40 text-white font-black text-xl mb-1">
            XN
          </div>
          <h2 className="text-xl font-black text-amber-100">
            {mode === 'register' ? 'Join XN Reward' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-amber-300/70">
            Gmail verification via Brevo & Resend SMTP
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-[#180d0a] p-1 rounded-2xl border border-[#3d271f] mb-4">
          <button
            onClick={() => { setMode('register'); setStep('details'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'register' ? 'bg-amber-500 text-black shadow-md' : 'text-amber-300/60'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode('login'); setStep('details'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              mode === 'login' ? 'bg-amber-500 text-black shadow-md' : 'text-amber-300/60'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs p-3 rounded-2xl mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Email Confirmation Overlay ("R otp patanor age confirm kore nibe je email thik ase kina") */}
        {showEmailConfirm && (
          <div className="absolute inset-0 z-50 bg-[#1e110d]/95 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center animate-fadeIn border border-amber-500/40 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-amber-100 mb-1">ইমেইল ঠিকানা নিশ্চিত করুন</h3>
            <p className="text-xs text-amber-200/80 mb-4 px-2">
              আপনি কি নিশ্চিত যে আপনার ইমেইল ঠিকানাটি সঠিক? ওটিপি কোড এই ঠিকানায় পাঠানো হবে:
            </p>
            <div className="bg-[#140b08] border border-amber-500/50 px-4 py-2.5 rounded-2xl font-mono text-amber-300 font-bold text-xs mb-3 w-full break-all shadow-inner">
              📧 {email}
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[11px] text-amber-200/90 mb-4 text-left">
              💡 <strong className="text-amber-300">নোট:</strong> ওটিপি পাঠানোর পর জিমেইলের <strong>Inbox</strong> এবং <strong className="text-orange-400">Spam / Junk Box</strong> চেক করবেন।
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowEmailConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#2b1b15] hover:bg-[#38231c] text-amber-300 font-bold text-xs transition-all border border-[#4d3227] cursor-pointer"
              >
                না, ঠিক করব
              </button>
              <button
                type="button"
                onClick={executeSendOtp}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                হ্যাঁ, ওটিপি পাঠান 🚀
              </button>
            </div>
          </div>
        )}

        {mode === 'register' ? (
          step === 'details' ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-amber-300 block mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-amber-400/80 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl pl-9 pr-3 py-2.5 text-amber-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Beautiful Gmail Input Section */}
              <div className="bg-gradient-to-br from-[#1e130f] to-[#170c09] p-3 rounded-2xl border border-amber-500/30 shadow-inner">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-extrabold text-amber-200 text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Official Gmail Address</span>
                  </label>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-mono font-bold border border-red-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    Only @gmail.com
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-2.5 w-5 h-5 rounded-lg bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 p-[1px] flex items-center justify-center shadow-md">
                    <div className="w-full h-full bg-[#180e0b] rounded-[7px] flex items-center justify-center">
                      <Mail className="w-3 h-3 text-amber-400" />
                    </div>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.real.name@gmail.com"
                    className="w-full bg-[#140b08] border border-[#483228] rounded-xl pl-10 pr-3 py-2.5 text-amber-100 text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:text-amber-200/30"
                  />
                </div>

                {email && email.toLowerCase().endsWith('@gmail.com') ? (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Valid Gmail address detected! Ready for OTP.</span>
                  </div>
                ) : email ? (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-400/80">
                    <span>Must end with <strong className="font-mono text-amber-300">@gmail.com</strong></span>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="font-bold text-amber-300 block mb-1">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-amber-400/80 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl pl-9 pr-3 py-2.5 text-amber-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-amber-300 block mb-1">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  placeholder="e.g. NXB123456"
                  className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl px-3 py-2.5 text-amber-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Sending Verification OTP...' : 'Send Gmail OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-3 text-xs">
              <div className="text-center py-1">
                <p className="text-xs text-amber-200">
                  Enter 6-digit OTP code sent to <strong className="text-amber-400 font-mono">{email}</strong>
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
                  <span>কোটা ব্যবহার: <strong>{sessionStorage.getItem(`otp_count_${email.toLowerCase().trim()}`) || '1'}/2 বার</strong></span>
                </div>
              </div>

              {/* Special Mailbox & Support Notice */}
              <div className="bg-gradient-to-br from-amber-950/70 via-[#23150e] to-orange-950/50 border border-amber-500/40 rounded-2xl p-3 space-y-2.5 shadow-lg">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 text-left">
                    <h4 className="text-xs font-black text-amber-200 flex items-center gap-1">
                      <span>ইনবক্স ও স্প্যাম বক্স চেক করুন! 📩</span>
                    </h4>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      আপনার জিমেইলের <strong>Inbox</strong> চেক করুন। যদি ইনবক্সে কোড না পান, তবে অবশ্যই জিমেইলের <strong className="text-orange-400">Spam / Junk Box</strong> ফোল্ডারটি চেক করবেন!
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <a
                    href="https://t.me/nxsupport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-bold transition-all bg-cyan-950/60 px-2.5 py-1.5 rounded-xl border border-cyan-500/40 shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>সাপোর্টে মেসেজ দিন</span>
                  </a>
                  <a
                    href="https://t.me/nxchannel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-300 hover:text-emerald-200 font-bold transition-all bg-emerald-950/60 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ভিডিও দেখুন</span>
                  </a>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#180e0b] border-2 border-amber-500/60 rounded-2xl p-3 text-center text-amber-100 font-mono font-black text-2xl tracking-widest focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying & Creating Account...' : 'Verify OTP & Complete Signup'}
              </button>

              <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#3e281e]">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-amber-400 hover:text-amber-300 text-xs transition-all cursor-pointer"
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  disabled={loading || Number(sessionStorage.getItem(`otp_count_${email.toLowerCase().trim()}`) || '0') >= 2}
                  onClick={executeSendOtp}
                  className="text-orange-400 hover:text-orange-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {Number(sessionStorage.getItem(`otp_count_${email.toLowerCase().trim()}`) || '0') >= 2 ? 'কোটা লিমিট শেষ (2/2)' : '🔄 Resend OTP'}
                </button>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-3 text-xs">
            <div className="bg-gradient-to-br from-[#1e130f] to-[#170c09] p-3 rounded-2xl border border-amber-500/30 shadow-inner">
              <label className="font-extrabold text-amber-200 text-xs flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Registered Gmail Address</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 w-5 h-5 rounded-lg bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 p-[1px] flex items-center justify-center shadow-md">
                  <div className="w-full h-full bg-[#180e0b] rounded-[7px] flex items-center justify-center">
                    <Mail className="w-3 h-3 text-amber-400" />
                  </div>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.real.name@gmail.com"
                  className="w-full bg-[#140b08] border border-[#483228] rounded-xl pl-10 pr-3 py-2.5 text-amber-100 text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:text-amber-200/30"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-amber-300 block mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-400/80 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#180e0b] border border-[#3e2a22] rounded-xl pl-9 pr-3 py-2.5 text-amber-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold py-3 rounded-2xl shadow-lg mt-2 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log In to $NXB Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
