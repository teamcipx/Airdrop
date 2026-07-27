import React, { useState } from 'react';
import { MessageCircle, Send, HelpCircle, X, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface SupportWidgetProps {
  supportUrl?: string;
  channelUrl?: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({
  supportUrl = 'https://t.me/xnhelpline',
  channelUrl = 'https://t.me/xnrewared',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Fixed Support Button */}
      <div className="fixed bottom-24 right-4 sm:right-[calc(50%-13rem)] z-40 animate-bounce sm:animate-none">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-gradient-to-r from-[#0088cc] via-[#0099e5] to-[#00a8ff] text-white p-3.5 rounded-full shadow-[0_4px_25px_rgba(0,136,204,0.7)] border-2 border-sky-200 hover:scale-110 transition-all duration-300 flex items-center gap-2 cursor-pointer"
          title="লাইভ টেলিগ্রাম হেল্পলাইন (Live Support)"
        >
          {/* Glowing pulse ring */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
          </span>

          <MessageCircle className="w-6 h-6 text-white animate-pulse" />
          <span className="text-xs font-black tracking-wide pr-1.5 hidden sm:inline group-hover:inline">
            সাপোর্ট
          </span>
        </button>
      </div>

      {/* Support Menu Popup Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#1a2936] via-[#111c24] to-[#0b131a] w-full max-w-sm rounded-3xl border border-sky-500/40 shadow-[0_0_40px_rgba(0,136,204,0.3)] p-5 relative overflow-hidden space-y-4">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sky-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0088cc] to-sky-400 flex items-center justify-center shadow-lg border border-sky-200">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-sky-100 flex items-center gap-1">
                    <span>লাইভ টেলিগ্রাম হেল্পলাইন</span>
                    <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    ২৪/৭ এডমিন সাপোর্ট একটিভ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3 text-xs text-sky-100/90">
              <p className="bg-[#0088cc]/10 p-3 rounded-2xl border border-sky-500/30 text-center font-medium leading-relaxed">
                উইথড্র, রেফার বা টাস্ক সম্পর্কিত যেকোনো সমস্যায় আমাদের সরাসরি টেলিগ্রামে মেসেজ দিন। এডমিন দ্রুত সমাধান করে দেবে!
              </p>

              {/* Support Links */}
              <div className="space-y-2 pt-1">
                <a
                  href={supportUrl || 'https://t.me/xnhelpline'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-gradient-to-r from-[#0088cc] to-[#0099e5] text-white p-3.5 rounded-2xl font-black text-sm shadow-lg hover:brightness-110 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <Send className="w-4 h-4" />
                    <span>এডমিন সাপোর্ট (Direct Chat)</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href={channelUrl || 'https://t.me/xnrewared'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#11232e] hover:bg-[#162d3b] text-sky-300 p-3.5 rounded-2xl font-bold text-xs border border-sky-500/40 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>অফিসিয়াল টেলিগ্রাম চ্যানেল (Updates)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              </div>

              {/* Tips */}
              <div className="bg-black/40 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> জরুরি নিয়মাবলি:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-400">
                  <li>৪টি রিয়েল রেফার থাকলে আজীবন আনলিমিটেড উইথড্র করতে পারবেন।</li>
                  <li>কোনো প্রকার ফেইক রেফার বা বট ব্যবহার করলে একাউন্ট ব্যান হবে।</li>
                  <li>পেমেন্ট রিকোয়েস্ট দেওয়ার ২৪ ঘণ্টার মধ্যে টাকা পাঠিয়ে দেওয়া হয়।</li>
                </ul>
              </div>
            </div>

            {/* Footer Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all"
            >
              বন্ধ করুন (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
