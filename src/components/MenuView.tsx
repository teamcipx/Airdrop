import React from 'react';
import { User } from '../types';
import { TabType } from './Navbar';
import { 
  CheckSquare, 
  Wallet, 
  Zap, 
  User as UserIcon, 
  Users, 
  History, 
  Trophy, 
  Rocket, 
  Play, 
  ShieldAlert, 
  MessageCircle, 
  Send, 
  LogOut, 
  Sparkles, 
  ChevronRight, 
  ExternalLink,
  HelpCircle,
  LayoutGrid
} from 'lucide-react';

interface MenuViewProps {
  user: User | null;
  onSelectTab: (tab: TabType) => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  supportUrl?: string;
  channelUrl?: string;
}

interface GridNavItem {
  id: TabType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgGradient: string;
  iconColor: string;
  borderColor: string;
  badge?: string;
  requiresAuth?: boolean;
}

export const MenuView: React.FC<MenuViewProps> = ({
  user,
  onSelectTab,
  onOpenAuth,
  onLogout,
  supportUrl = 'https://t.me/nxsupport',
  channelUrl = 'https://t.me/nxchannel',
}) => {
  const navItems: GridNavItem[] = [
    {
      id: 'task',
      title: 'টাস্ক ও ইনকাম',
      subtitle: 'দৈনিক টাস্ক করে কয়েন ইনকাম করুন',
      icon: <CheckSquare className="w-6 h-6" />,
      bgGradient: 'from-amber-500/15 via-orange-500/10 to-transparent',
      iconColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      borderColor: 'border-amber-500/30 hover:border-amber-500/60',
      badge: 'Hot 🔥',
    },
    {
      id: 'withdraw',
      title: 'উইথড্রয়াল (উত্তোলন)',
      subtitle: 'বিকাশ, নগদ, রকেটে টাকা নিন',
      icon: <Wallet className="w-6 h-6" />,
      bgGradient: 'from-emerald-500/15 via-teal-500/10 to-transparent',
      iconColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      badge: 'ইনস্ট্যান্ট',
      requiresAuth: true,
    },
    {
      id: 'airdrop',
      title: 'এয়ারড্রপ গেম',
      subtitle: 'ট্যাপ করে ফ্রি কয়েন মাইনিং করুন',
      icon: <Zap className="w-6 h-6" />,
      bgGradient: 'from-yellow-500/15 via-amber-500/10 to-transparent',
      iconColor: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
      borderColor: 'border-yellow-500/30 hover:border-yellow-500/60',
      badge: 'ট্যাপ গেম',
    },
    {
      id: 'friends',
      title: 'রেফারেল ও ইনভাইট',
      subtitle: 'প্রতি রেফারে ১০ টাকা ও ৫,০০০ কয়েন',
      icon: <Users className="w-6 h-6" />,
      bgGradient: 'from-purple-500/15 via-indigo-500/10 to-transparent',
      iconColor: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
      borderColor: 'border-purple-500/30 hover:border-purple-500/60',
      badge: '১০ টাকা/রেফার',
    },
    {
      id: 'history',
      title: 'এক্টিভিটি হিস্ট্রি',
      subtitle: 'কাজের বিবরণ ও উইথড্র স্ট্যাটাস',
      icon: <History className="w-6 h-6" />,
      bgGradient: 'from-blue-500/15 via-cyan-500/10 to-transparent',
      iconColor: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
      borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    },
    {
      id: 'top',
      title: 'লিডারবোর্ড',
      subtitle: 'শীর্ষ রেফারি ও বেশি আয়কারী মেম্বারগণ',
      icon: <Trophy className="w-6 h-6" />,
      bgGradient: 'from-orange-500/15 via-red-500/10 to-transparent',
      iconColor: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
      borderColor: 'border-orange-500/30 hover:border-orange-500/60',
    },
    {
      id: 'upgrades',
      title: 'আপগ্রেড ও বুস্ট',
      subtitle: 'ট্যাপ পাওয়ার ও এনার্জি লিমিট বৃদ্ধি',
      icon: <Rocket className="w-6 h-6" />,
      bgGradient: 'from-pink-500/15 via-rose-500/10 to-transparent',
      iconColor: 'text-pink-400 bg-pink-500/20 border-pink-500/40',
      borderColor: 'border-pink-500/30 hover:border-pink-500/60',
    },
    {
      id: 'tutorial',
      title: 'টিউটোরিয়াল ও নির্দেশিকা',
      subtitle: 'কিভাবে কাজ করবেন ভিডিও নির্দেশিকা',
      icon: <Play className="w-6 h-6 fill-current" />,
      bgGradient: 'from-red-500/15 via-amber-500/10 to-transparent',
      iconColor: 'text-red-400 bg-red-500/20 border-red-500/40',
      borderColor: 'border-red-500/30 hover:border-red-500/60',
    },
    {
      id: 'account',
      title: 'আমার একাউন্ট',
      subtitle: 'প্রোফাইল সেটআপ ও একাউন্ট বিস্তারিত',
      icon: <UserIcon className="w-6 h-6" />,
      bgGradient: 'from-teal-500/15 via-emerald-500/10 to-transparent',
      iconColor: 'text-teal-400 bg-teal-500/20 border-teal-500/40',
      borderColor: 'border-teal-500/30 hover:border-teal-500/60',
    },
  ];

  // If Admin, prepend or append admin item
  if (user?.role === 'admin') {
    navItems.unshift({
      id: 'admin',
      title: 'অ্যাডমিন কন্ট্রোল প্যানেল',
      subtitle: 'ইউজার, পেমেন্ট ও টাস্ক ম্যানেজমেন্ট',
      icon: <ShieldAlert className="w-6 h-6" />,
      bgGradient: 'from-rose-600/25 via-purple-600/20 to-transparent',
      iconColor: 'text-rose-300 bg-rose-500/30 border-rose-400/50',
      borderColor: 'border-rose-500/50 shadow-lg shadow-rose-500/10 hover:border-rose-400',
      badge: 'ADMIN',
    });
  }

  const handleItemClick = (item: GridNavItem) => {
    if (item.requiresAuth && !user) {
      onOpenAuth();
      return;
    }
    onSelectTab(item.id);
  };

  return (
    <div className="px-4 pt-4 pb-28 min-h-screen space-y-6">
      {/* 1. Page Title Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#2a1b15] via-[#241712] to-[#1c120e] p-4 rounded-2xl border border-[#443027] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-amber-200 flex items-center gap-1.5">
              কুইক মেনু <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-normal border border-amber-500/30">All features</span>
            </h1>
            <p className="text-xs text-amber-400/70">সব ফিচার এক জায়গায় সহজেই ব্রাউজ করুন</p>
          </div>
        </div>
        {user ? (
          <div className="text-right">
            <div className="text-[11px] text-amber-300/80 font-medium">ব্যালেন্স</div>
            <div className="text-sm font-black text-emerald-400 font-mono">
              ৳{(user.takaBalance || (user.balance * 0.002)).toFixed(2)}
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
          >
            লগইন করুন
          </button>
        )}
      </div>

      {/* 2. User Info Card (if logged in) */}
      {user && (
        <div 
          onClick={() => onSelectTab('account')}
          className="bg-gradient-to-br from-[#2a1c16] via-[#221611] to-[#19100c] p-4 rounded-2xl border border-amber-500/30 shadow-xl flex items-center justify-between cursor-pointer hover:border-amber-500/60 transition-all group relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400/60 overflow-hidden bg-[#1a110d] flex items-center justify-center shadow-md shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt="DP" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-black text-amber-400">{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-amber-100 group-hover:text-amber-400 transition-colors">
                  {user.name}
                </h2>
                {user.role === 'admin' && (
                  <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-black">ADMIN</span>
                )}
              </div>
              <p className="text-[11px] text-amber-300/60 font-mono">{user.email || 'No email registered'}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px]">
                <span className="text-amber-400 font-bold font-mono">🪙 {user.balance.toLocaleString()}</span>
                <span className="text-amber-500/40">•</span>
                <span className="text-emerald-400 font-bold font-mono">৳{(user.takaBalance || (user.balance * 0.002)).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-all shrink-0 z-10">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 3. Main Grid Navigation - UI Friendly 2 Columns */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          কুইক নেভিগেশন গ্রিড (Quick Nav)
        </h3>

        <div className="grid grid-cols-2 gap-3.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`text-left p-3.5 rounded-2xl bg-gradient-to-b ${item.bgGradient} bg-[#231712]/80 border ${item.borderColor} shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group flex flex-col justify-between min-h-[115px]`}
            >
              {/* Badge if present */}
              {item.badge && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md z-10">
                  {item.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner ${item.iconColor} group-hover:scale-110 transition-transform mb-2 shrink-0`}>
                {item.icon}
              </div>

              {/* Text */}
              <div>
                <h4 className="text-sm font-bold text-amber-100 group-hover:text-amber-400 transition-colors leading-tight">
                  {item.title}
                </h4>
                <p className="text-[10px] text-amber-300/60 leading-normal mt-0.5 line-clamp-2">
                  {item.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Community & Support Banner Grid */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-wider px-1 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          সাপোর্ট ও কমিউনিটি চ্যানেল
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-500/30 hover:border-blue-500/60 shadow-lg flex items-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-200 flex items-center gap-1">
                সাপোর্ট চ্যাট <ExternalLink className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-[10px] text-blue-300/60">লাইভ হেল্প ডেস্ক</div>
            </div>
          </a>

          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 hover:border-indigo-500/60 shadow-lg flex items-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-200 flex items-center gap-1">
                অফিসিয়াল চ্যানেল <ExternalLink className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="text-[10px] text-indigo-300/60">আপডেট ও পেমেন্ট প্রুফ</div>
            </div>
          </a>
        </div>
      </div>

      {/* 5. Logout / Sign Out Button */}
      {user && onLogout && (
        <div className="pt-4">
          <button
            onClick={() => {
              if (window.confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?')) {
                onLogout();
              }
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            লগআউট করুন (Log Out)
          </button>
        </div>
      )}

      {/* Footer copyright info */}
      <div className="text-center pt-6 pb-4">
        <p className="text-[10px] text-amber-300/40 font-mono">
          XN REWARD • ALL RIGHTS RESERVED © 2026
        </p>
      </div>
    </div>
  );
};
