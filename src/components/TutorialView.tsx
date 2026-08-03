import React, { useState } from 'react';
import { Play, ExternalLink, ShieldCheck, Gamepad2, CheckSquare, Wallet, Sparkles, Copy, Check, Share2, Video, Maximize2 } from 'lucide-react';
import { TabType } from './Navbar';

interface TutorialViewProps {
  fbVideoUrl?: string;
  onSelectTab: (tab: TabType) => void;
}

// Helper to convert raw FB reel or video link into a playable iframe embed URL
function getFbVideoIframeSrc(rawUrl?: string): string {
  const defaultUrl = 'https://www.facebook.com/reel/1148805566373760';
  let url = (rawUrl || defaultUrl).trim();

  // If pasted an iframe tag, extract src="..."
  if (url.includes('<iframe') || url.includes('src=')) {
    const match = url.match(/src=["']([^"']+)["']/);
    if (match && match[1]) {
      url = match[1];
    }
  }

  // If already an embed link (FB plugins, YouTube embed, Vimeo), return directly
  if (
    url.includes('facebook.com/plugins/video.php') ||
    url.includes('facebook.com/plugins/post.php') ||
    url.includes('youtube.com/embed/') ||
    url.includes('player.vimeo.com')
  ) {
    return url;
  }

  // If it is a standard YouTube watch link or short, convert to embed
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  // Otherwise, treat as Facebook URL and wrap in video.php plugin with explicit height & fit parameters
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&t=0&height=800`;
}

// Helper to extract clean raw watch URL for "Open directly in FB app"
function getRawFbUrl(rawUrl?: string): string {
  const defaultUrl = 'https://www.facebook.com/reel/1148805566373760';
  let url = (rawUrl || defaultUrl).trim();
  if (url.includes('<iframe') || url.includes('src=')) {
    const match = url.match(/src=["']([^"']+)["']/);
    if (match && match[1]) url = match[1];
  }
  if (url.includes('facebook.com/plugins/video.php') && url.includes('href=')) {
    try {
      const parsed = new URL(url);
      const href = parsed.searchParams.get('href');
      if (href) return decodeURIComponent(href);
    } catch {
      // ignore
    }
  }
  return url;
}

export const TutorialView: React.FC<TutorialViewProps> = ({
  fbVideoUrl = 'https://www.facebook.com/reel/3457251397779299/?app=fbl',
  onSelectTab,
}) => {
  const iframeSrc = getFbVideoIframeSrc(fbVideoUrl);
  const rawUrl = getRawFbUrl(fbVideoUrl);
  const [copied, setCopied] = useState(false);
  const tutorialLink = 'https://nxpost.online/tutorial';

  const handleCopyLink = () => {
    const linkToCopy = window.location.origin.includes('localhost') 
      ? tutorialLink 
      : `${window.location.origin}/tutorial`;
    
    navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="pb-28 pt-4 px-3 sm:px-4 max-w-md mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2 bg-gradient-to-b from-[#281710] to-[#180d09] p-5 rounded-3xl border border-amber-500/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Official Video Guide</span>
        </div>
        
        <h1 className="text-2xl font-black text-amber-100 tracking-tight flex items-center justify-center gap-2">
          <Video className="w-6 h-6 text-amber-400" />
          <span>ভিডিও টিউটোরিয়াল</span>
        </h1>
        <p className="text-xs text-amber-300/80 leading-relaxed font-sans font-medium">
          কীভাবে টাস্ক পূরণ করবেন, এয়ারড্রপ মাইন করবেন এবং সরাসরি বিকাশ/নগদে ক্যাশআউট করবেন তা নিচের ভিডিওতে দেখুন!
        </p>

        {/* Shareable Tutorial Link Box */}
        <div className="pt-2">
          <div className="bg-[#120a07] p-2.5 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2 overflow-hidden px-1">
              <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-mono font-bold text-amber-200 truncate">
                nxpost.online/tutorial
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>লিঙ্ক কপি</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Video Player Container (Tall Vertical Format: h-[640px] sm:h-[720px] so bottom video controls are NOT cut off) */}
      <div className="bg-[#140b08] p-2.5 sm:p-3 rounded-3xl border-2 border-amber-500/60 shadow-[0_12px_35px_rgba(0,0,0,0.85)] space-y-3">
        <div className="flex items-center justify-between px-2 py-1 border-b border-[#3e2316]">
          <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Facebook Short / Vertical Reel</span>
          </span>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40 font-bold">
            Full Height HD
          </span>
        </div>

        {/* Embedded Video Iframe - Tall 9:16 layout without restrictive max-h so bottom is completely visible */}
        <div className="relative w-full h-[620px] sm:h-[700px] rounded-2xl overflow-hidden bg-black border border-[#4a2818] shadow-2xl flex items-center justify-center">
          <iframe
            src={iframeSrc}
            title="XN Reward Tutorial Video"
            width="100%"
            height="100%"
            style={{ border: 'none', overflow: 'hidden' }}
            scrolling="no"
            frameBorder="0"
            allowFullScreen={true}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            className="w-full h-full"
          />
        </div>

        {/* Direct App Opener & Troubleshooting */}
        <div className="pt-1 space-y-2">
          <a
            href={rawUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#1877f2] via-[#1569d6] to-[#0d55b8] hover:from-[#1b84ff] hover:to-[#1877f2] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 border border-blue-400/40"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>ফেইসবুক অ্যাপে ফুল স্ক্রিনে দেখুন (Open in FB App) ↗</span>
          </a>
          <p className="text-[11px] text-amber-300/70 text-center font-sans font-medium px-1">
            💡 যদি ব্রাউজারে ভিডিও লোড হতে দেরি হয়, তাহলে ওপরের নীল বাটনে ক্লিক করে ফেসবুক অ্যাপেই সম্পূর্ণ টিউটোরিয়াল দেখে নিতে পারেন।
          </p>
        </div>
      </div>

      {/* Quick 3-Step Earning Summary Cards */}
      <div className="space-y-3 pt-1">
        <h3 className="text-xs font-black text-amber-200 uppercase tracking-wider px-1 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>৩টি সহজ উপায়ে প্রতিদিন টাকা ইনকাম করুন</span>
        </h3>

        <div className="bg-[#21120b] p-3.5 rounded-2xl border border-[#4a2818] flex items-start gap-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black shrink-0">
            ১
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-100 flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5 text-orange-400" />
              <span>এয়ারড্রপ মাইনিং (AirDrop Mining)</span>
            </h4>
            <p className="text-[11px] text-amber-300/70 mt-0.5 leading-relaxed font-sans">
              মাঝখানের AirDrop বাটনে গিয়ে ট্যাপ করে $NXB কয়েন মাইন করুন এবং এনার্জি ও হিট লেভেল আপগ্রেড করে ইনকাম বাড়ান।
            </p>
          </div>
        </div>

        <div className="bg-[#21120b] p-3.5 rounded-2xl border border-[#4a2818] flex items-start gap-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black shrink-0">
            ২
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-100 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>টাস্ক পূরণ ও বোনাস (Daily Tasks)</span>
            </h4>
            <p className="text-[11px] text-amber-300/70 mt-0.5 leading-relaxed font-sans">
              Task অপশনে গিয়ে টেলিগ্রাম ও ইউটিউব চ্যানেলে জয়েন করে স্ক্রিনশট জমা দিন। ভেরিফাই হলেই বড় কয়েন বোনাস পাবেন।
            </p>
          </div>
        </div>

        <div className="bg-[#21120b] p-3.5 rounded-2xl border border-[#4a2818] flex items-start gap-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-black shrink-0">
            ৩
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-100 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>বিকাশ/নগদে ক্যাশআউট (Withdraw Cash)</span>
            </h4>
            <p className="text-[11px] text-emerald-300/80 mt-0.5 leading-relaxed font-sans">
              পর্যাপ্ত কয়েন বা রেফারেল টাকা জমা হলে Withdraw অপশন থেকে সরাসরি আপনার বিকাশ, নগদ বা রকেটে পেমেন্ট নিন।
            </p>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="pt-2 grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelectTab('airdrop')}
          className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>মাইনিং শুরু করুন</span>
        </button>

        <button
          onClick={() => onSelectTab('task')}
          className="py-3 px-4 rounded-2xl bg-[#25150e] border border-amber-500/50 hover:border-amber-400 text-amber-100 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckSquare className="w-4 h-4 text-amber-400" />
          <span>টাস্ক পূরণ করুন</span>
        </button>
      </div>
    </div>
  );
};

