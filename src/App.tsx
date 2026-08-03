import React, { useState, useEffect, useRef } from 'react';
import { User } from './types';
import { fetchUserApi, syncUserApi, fetchPublicSettingsApi } from './lib/api';
import { Header } from './components/Header';
import { Navbar, TabType } from './components/Navbar';
import { AirdropTapGame } from './components/AirdropTapGame';
import { TaskList } from './components/TaskList';
import { HistoryView } from './components/HistoryView';
import { AccountView } from './components/AccountView';
import { LeaderboardView } from './components/LeaderboardView';
import { UpgradesView } from './components/UpgradesView';
import { ReferralView } from './components/ReferralView';
import { WithdrawView } from './components/WithdrawView';
import { AdminView } from './components/AdminView';
import { AuthModal } from './components/AuthModal';
import { WelcomePopup } from './components/WelcomePopup';
import { TutorialView } from './components/TutorialView';
import { MenuView } from './components/MenuView';
import { OnboardingModal } from './components/OnboardingModal';
import { SupportWidget } from './components/SupportWidget';

export default function App() {
  // ⚡ Instant Optimistic Load: Read user from localStorage/cookie cache on initial render
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('nxb_user_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading user cache on refresh:', e);
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path.includes('/tutorial') || path === '/tutorial' || params.get('tab') === 'tutorial') {
      return 'tutorial';
    }
    return 'airdrop';
  });

  // Keep browser address bar in sync with route paths like /tutorial
  useEffect(() => {
    if (activeTab === 'tutorial') {
      if (!window.location.pathname.toLowerCase().includes('/tutorial')) {
        window.history.pushState({}, '', '/tutorial');
      }
    } else {
      if (window.location.pathname.toLowerCase().includes('/tutorial')) {
        window.history.pushState({}, '', '/');
      }
    }
  }, [activeTab]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/tutorial') || path === '/tutorial') {
        setActiveTab('tutorial');
      } else {
        setActiveTab('airdrop');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [urlRefCode, setUrlRefCode] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const completed = localStorage.getItem('nxb_onboarding_completed_v2');
    return !completed;
  });
  const [showWelcomePopup, setShowWelcomePopup] = useState(() => {
    const shown = sessionStorage.getItem('nxb_popup_shown');
    return !shown;
  });
  const [publicSettings, setPublicSettings] = useState<{
    tutorialFbVideoUrl?: string;
    supportTelegramUrl?: string;
    channelTelegramUrl?: string;
    popupWelcomeText?: string;
  }>({});

  // Auto-persist latest user state to localStorage whenever it changes
  useEffect(() => {
    if (user && user.id) {
      localStorage.setItem('nxb_user_id', user.id);
      localStorage.setItem('nxb_user_cache', JSON.stringify(user));
    }
  }, [user]);

  // Extract ?ref= Referral code from URL if present & background sync session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setUrlRefCode(ref);
      if (!user) {
        setShowAuthModal(true);
      }
    }

    // Background sync: Fetch fresh user data from server silently
    const savedUserId = localStorage.getItem('nxb_user_id');
    if (savedUserId) {
      fetchUserApi(savedUserId).then(res => {
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('nxb_user_cache', JSON.stringify(res.user));
        }
      }).catch(err => {
        console.warn('[Network] Offline or slow connection, using instant cached user data:', err);
      });
    }

    // Fetch public settings for popup & tutorial reel
    fetchPublicSettingsApi().then(res => {
      if (res && res.success && res.settings) {
        setPublicSettings(res.settings);
      }
    }).catch(err => {
      console.warn('Could not load public settings:', err);
    });
  }, []);

  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Periodic 10-Second Auto Sync
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      const currentUser = userRef.current;
      if (currentUser && currentUser.id) {
        try {
          const res = await syncUserApi(currentUser.id, currentUser);
          if (res && res.success && res.user) {
            setUser(prev => {
              const next = prev ? { ...prev, energy: res.user.energy } : res.user;
              if (next) localStorage.setItem('nxb_user_cache', JSON.stringify(next));
              return next;
            });
          }
        } catch (err) {
          console.error('Periodic 10s auto sync error:', err);
        }
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && userRef.current && userRef.current.id) {
        syncUserApi(userRef.current.id, userRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('nxb_user_id', updatedUser.id);
    localStorage.setItem('nxb_user_cache', JSON.stringify(updatedUser));
  };

  const handleAuthSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('nxb_user_id', loggedUser.id);
    localStorage.setItem('nxb_user_cache', JSON.stringify(loggedUser));
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nxb_user_id');
    localStorage.removeItem('nxb_user_cache');
  };

  const handleClosePopup = () => {
    setShowWelcomePopup(false);
    sessionStorage.setItem('nxb_popup_shown', 'true');
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'withdraw' && !user) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1c1310] via-[#160d0a] to-[#110806] text-amber-50 font-sans relative overflow-x-hidden">
      {/* Background ambient lighting glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Constraints for Mobile Telegram Mini-App UI */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between relative z-10 shadow-2xl bg-[#170e0b]/60 border-x border-[#38261e]/40">
        {/* Header with Top-Left Toggle Menu */}
        <Header
          user={user}
          onUpdateUser={handleUserUpdate}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenAdmin={() => setActiveTab('admin')}
          onOpenWithdraw={() => handleTabChange('withdraw')}
          onSelectTab={handleTabChange}
          onLogout={handleLogout}
        />

        {/* Dynamic Body Views */}
        <main className="flex-1">
          {(activeTab === 'airdrop' || (activeTab as string) === 'game') && (
            <AirdropTapGame
              user={user}
              onUpdateUser={handleUserUpdate}
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenUpgrades={() => setActiveTab('upgrades')}
              onOpenOnboarding={() => setShowOnboarding(true)}
            />
          )}

          {activeTab === 'task' && (
            <TaskList
              user={user}
              onUpdateUser={handleUserUpdate}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeTab === 'withdraw' && (
            <WithdrawView
              user={user}
              onUpdateUser={handleUserUpdate}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeTab === 'account' && (
            <AccountView
              user={user}
              onUpdateUser={handleUserUpdate}
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenWithdraw={() => handleTabChange('withdraw')}
              onOpenAdmin={() => setActiveTab('admin')}
              onLogout={handleLogout}
              onOpenOnboarding={() => setShowOnboarding(true)}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView />
          )}

          {activeTab === 'top' && <LeaderboardView />}

          {activeTab === 'upgrades' && (
            <UpgradesView
              user={user}
              onUpdateUser={handleUserUpdate}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeTab === 'friends' && (
            <ReferralView
              user={user}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {activeTab === 'tutorial' && (
            <TutorialView
              fbVideoUrl={publicSettings.tutorialFbVideoUrl}
              onSelectTab={handleTabChange}
            />
          )}

          {activeTab === 'menu' && (
            <MenuView
              user={user}
              onSelectTab={handleTabChange}
              onOpenAuth={() => setShowAuthModal(true)}
              onLogout={handleLogout}
              supportUrl={publicSettings.supportTelegramUrl}
              channelUrl={publicSettings.channelTelegramUrl}
            />
          )}
        </main>

        {/* Floating Fixed Live Support Widget */}
        <SupportWidget
          supportUrl={publicSettings.supportTelegramUrl}
          channelUrl={publicSettings.channelTelegramUrl}
        />

        {/* Bottom Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          initialReferralCode={urlRefCode}
        />
      )}

      {/* Welcome Announcement & Tutorial Popup */}
      <WelcomePopup
        user={user}
        isOpen={showWelcomePopup && !showOnboarding}
        onClose={handleClosePopup}
        onSelectTab={handleTabChange}
        onOpenOnboarding={() => setShowOnboarding(true)}
        supportUrl={publicSettings.supportTelegramUrl}
        channelUrl={publicSettings.channelTelegramUrl}
        welcomeText={publicSettings.popupWelcomeText}
      />

      {/* 3-Screen Interactive Onboarding & Listing Guide Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onFinish={() => setShowOnboarding(false)}
      />
    </div>
  );
}
