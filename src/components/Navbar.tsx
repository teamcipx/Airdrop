import React from 'react';
import { CheckSquare, Wallet, User as UserIcon, LayoutGrid } from 'lucide-react';

export type TabType = 'task' | 'history' | 'airdrop' | 'withdraw' | 'account' | 'top' | 'upgrades' | 'friends' | 'admin' | 'tutorial' | 'menu';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingTasksCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, pendingTasksCount = 0 }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-[#140c0a] via-[#140c0a]/90 to-transparent pointer-events-none">
      <nav className="pointer-events-auto bg-[#241814]/90 backdrop-blur-xl border border-[#443027]/70 rounded-3xl px-2 py-2 flex items-center justify-between shadow-2xl shadow-black/80">
        {/* 1. Task Tab */}
        <button
          onClick={() => setActiveTab('task')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all relative ${
            activeTab === 'task' ? 'text-amber-400 font-bold scale-105' : 'text-amber-200/50 hover:text-amber-200'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5" />
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {pendingTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Task</span>
        </button>

        {/* 2. Withdrawal Tab */}
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'withdraw' ? 'text-amber-400 font-bold scale-105' : 'text-amber-200/50 hover:text-amber-200'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Withdrawal</span>
        </button>

        {/* 3. Center AirDrop Button */}
        <button
          onClick={() => setActiveTab('airdrop')}
          className="relative -top-3 group flex flex-col items-center"
        >
          <div
            className={`w-16 h-12 rounded-2xl flex items-center justify-center font-black text-[11px] tracking-wider shadow-xl transition-all border transform active:scale-95 ${
              activeTab === 'airdrop'
                ? 'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 text-white border-amber-300 shadow-orange-500/50 scale-105 ring-2 ring-orange-400/40'
                : 'bg-gradient-to-b from-[#3a2720] to-[#251712] text-amber-200 border-[#5a3f34] hover:border-amber-500/50'
            }`}
          >
            <span>AirDrop</span>
          </div>
        </button>

        {/* 4. Account Tab */}
        <button
          onClick={() => setActiveTab('account')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'account' ? 'text-amber-400 font-bold scale-105' : 'text-amber-200/50 hover:text-amber-200'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px]">Account</span>
        </button>

        {/* 5. Menu Tab */}
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'menu' ? 'text-amber-400 font-bold scale-105' : 'text-amber-200/50 hover:text-amber-200'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </div>
  );
};
