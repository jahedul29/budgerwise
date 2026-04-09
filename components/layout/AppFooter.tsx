'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Bell, Heart, Smartphone, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/LogoMark';

/* ─── Store Badge ─── */

function StoreBadge({ store, onClick }: { store: 'apple' | 'google'; onClick: () => void }) {
  const isApple = store === 'apple';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-center gap-2.5 rounded-2xl p-2.5 pr-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] hover:border-gray-300/80 dark:hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/[0.03] dark:hover:shadow-black/20"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isApple ? 'bg-gradient-to-br from-gray-900/[0.03] to-transparent dark:from-white/[0.03]' : 'bg-gradient-to-br from-emerald-500/[0.04] to-transparent dark:from-emerald-500/[0.06]'}`} />
      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${isApple ? 'bg-gray-900 dark:bg-white/[0.12]' : 'bg-gradient-to-br from-emerald-500/90 to-teal-600/90 dark:from-emerald-500/80 dark:to-teal-600/80'}`}>
        {isApple ? (
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.445 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 9.131l2.302-2.302 5.148 2.97c.694.4.694 1.374 0 1.774l-5.148 2.97-2.302-2.302L12 12l2.499-1.055zm-1.907-1.078L4.487.752l9.073 5.242-2.968 2.873zM4.487 23.248l8.105-9.115 2.968 2.873-9.073 5.242z" />
          </svg>
        )}
      </div>
      <div className="relative text-left whitespace-nowrap">
        <p className="text-[7px] uppercase tracking-widest text-navy-400/70 dark:text-navy-500 leading-none">
          {isApple ? 'Download on the' : 'Get it on'}
        </p>
        <p className="text-[14px] font-display font-bold text-navy-800 dark:text-navy-100 leading-snug">
          {isApple ? 'App Store' : 'Google Play'}
        </p>
      </div>
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      </div>
    </button>
  );
}

/* ─── Coming Soon Modal ─── */

function ComingSoonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[85] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white dark:bg-[#0B1022] border border-gray-200/60 dark:border-white/[0.08] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-navy-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative px-6 py-6 space-y-5">
                {/* Header */}
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: 'spring', damping: 12 }}
                    className="relative mb-4"
                  >
                    <motion.div
                      className="absolute -inset-4 rounded-3xl"
                      style={{ background: 'radial-gradient(circle, rgba(6,214,160,0.2) 0%, transparent 70%)' }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent/20 flex items-center justify-center ring-1 ring-primary-500/20">
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Bell className="h-6 w-6 text-primary-500" />
                      </motion.div>
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{ scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    </motion.div>
                  </motion.div>

                  <motion.h3
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-lg font-display font-bold text-navy-800 dark:text-navy-50 mb-1"
                  >
                    Native App Coming Soon
                  </motion.h3>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-[12px] text-navy-500 dark:text-navy-300 leading-relaxed max-w-[260px]"
                  >
                    Meanwhile, install BudgetWise as a web app on your device for the full experience.
                  </motion.p>
                </div>

                {/* Install guides — direct links */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500 px-1">
                    Install as web app
                  </p>

                  <a
                    href={INSTALL_GUIDES.ios}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 rounded-xl p-3 transition-all active:scale-[0.98] ${
                      platform === 'ios'
                        ? 'bg-primary-500/[0.06] border border-primary-500/15'
                        : 'bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.05] hover:border-gray-300/60 dark:hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 dark:bg-white/[0.10]">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-100">iPhone / iPad</p>
                      <p className="text-[10px] text-navy-400 dark:text-navy-500">Watch how to add to home screen</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-navy-300 dark:text-navy-600 group-hover:text-primary-500 transition-colors" />
                  </a>

                  <a
                    href={INSTALL_GUIDES.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 rounded-xl p-3 transition-all active:scale-[0.98] ${
                      platform === 'android'
                        ? 'bg-primary-500/[0.06] border border-primary-500/15'
                        : 'bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.05] hover:border-gray-300/60 dark:hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/90 to-teal-600/90">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.609 1.814L13.445 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 9.131l2.302-2.302 5.148 2.97c.694.4.694 1.374 0 1.774l-5.148 2.97-2.302-2.302L12 12l2.499-1.055zm-1.907-1.078L4.487.752l9.073 5.242-2.968 2.873zM4.487 23.248l8.105-9.115 2.968 2.873-9.073 5.242z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-100">Android</p>
                      <p className="text-[10px] text-navy-400 dark:text-navy-500">Watch how to install the app</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-navy-300 dark:text-navy-600 group-hover:text-primary-500 transition-colors" />
                  </a>
                </motion.div>

                {/* PWA badge */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary-500/[0.05] dark:bg-primary-500/[0.08] border border-primary-500/10"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
                    <LogoMark className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[11px] text-navy-500 dark:text-navy-400">
                    BudgetWise works as a <span className="font-semibold text-navy-700 dark:text-navy-200">Progressive Web App</span>
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Install App Section ─── */

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

const INSTALL_GUIDES = {
  ios: 'https://www.youtube.com/watch?v=rXzADglUEZA',
  android: 'https://www.youtube.com/watch?v=VaQ8qL11bos',
} as const;

function InstallAppCard() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  if (isInstalled) return null;

  return (
    <div className="rounded-2xl border border-primary-500/15 dark:border-primary-500/10 bg-gradient-to-br from-primary-500/[0.04] to-accent/[0.03] dark:from-primary-500/[0.06] dark:to-accent/[0.04] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-accent/20">
          <Download className="h-4 w-4 text-primary-500" />
        </div>
        <div>
          <p className="text-[13px] font-display font-bold text-navy-800 dark:text-navy-50">Install as App</p>
          <p className="text-[10px] text-navy-400 dark:text-navy-500">Add this web app to your home screen</p>
        </div>
      </div>

      {/* Inline platform guides — direct links, no modal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={INSTALL_GUIDES.ios}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex items-center gap-2.5 rounded-xl p-2.5 transition-all active:scale-[0.98] ${
            platform === 'ios'
              ? 'bg-white/80 dark:bg-white/[0.06] border border-primary-500/20 ring-1 ring-primary-500/10'
              : 'bg-white/50 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.04] hover:border-gray-300/60 dark:hover:border-white/[0.08]'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 dark:bg-white/[0.10]">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-navy-800 dark:text-navy-100">iPhone / iPad</p>
            <p className="text-[9px] text-navy-400 dark:text-navy-500 leading-tight">Watch install guide</p>
          </div>
          <ExternalLink className="h-3 w-3 shrink-0 text-navy-300 dark:text-navy-600 group-hover:text-primary-500 transition-colors" />
        </a>

        <a
          href={INSTALL_GUIDES.android}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex items-center gap-2.5 rounded-xl p-2.5 transition-all active:scale-[0.98] ${
            platform === 'android'
              ? 'bg-white/80 dark:bg-white/[0.06] border border-primary-500/20 ring-1 ring-primary-500/10'
              : 'bg-white/50 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.04] hover:border-gray-300/60 dark:hover:border-white/[0.08]'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/90 to-teal-600/90">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.445 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 9.131l2.302-2.302 5.148 2.97c.694.4.694 1.374 0 1.774l-5.148 2.97-2.302-2.302L12 12l2.499-1.055zm-1.907-1.078L4.487.752l9.073 5.242-2.968 2.873zM4.487 23.248l8.105-9.115 2.968 2.873-9.073 5.242z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-navy-800 dark:text-navy-100">Android</p>
            <p className="text-[9px] text-navy-400 dark:text-navy-500 leading-tight">Watch install guide</p>
          </div>
          <ExternalLink className="h-3 w-3 shrink-0 text-navy-300 dark:text-navy-600 group-hover:text-primary-500 transition-colors" />
        </a>
      </div>

      {platform === 'desktop' && (
        <p className="text-[10px] text-center text-navy-400 dark:text-navy-500">
          On desktop, look for the install icon in your browser&apos;s address bar
        </p>
      )}
    </div>
  );
}

/* ─── Footer ─── */

const quickLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Budgets', href: '/budgets' },
  { label: 'Analytics', href: '/analytics' },
];

const resourceLinks = [
  { label: 'Accounts', href: '/more/accounts' },
  { label: 'Categories', href: '/more/categories' },
  { label: 'Settings', href: '/more/settings' },
];

export function AppFooter() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <footer className="relative pb-24 lg:pb-6">
        {/* Subtle top divider */}
        <div className="mx-4 lg:mx-8 h-px bg-gradient-to-r from-transparent via-gray-200/60 dark:via-white/[0.06] to-transparent" />

        <div className="px-4 lg:px-8 pt-6">
          {/* Main grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-8">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary shadow-glow-sm">
                  <LogoMark className="h-4 w-4" />
                </div>
                <span className="font-display text-[14px] font-bold text-navy-800 dark:text-navy-50">
                  Budget<span className="text-gradient">Wise</span>
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-navy-400 dark:text-navy-500 max-w-[200px]">
                AI-powered budgeting with beautiful insights. Your finances, simplified.
              </p>
            </div>

            {/* Quick links */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-300 dark:text-navy-600">
                Navigate
              </p>
              <ul className="space-y-1.5">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] text-navy-500 dark:text-navy-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resource links */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-300 dark:text-navy-600">
                Manage
              </p>
              <ul className="space-y-1.5">
                {resourceLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] text-navy-500 dark:text-navy-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get the App */}
            <div className="col-span-2 sm:col-span-1 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-300 dark:text-navy-600 flex items-center gap-1.5">
                <Smartphone className="h-3 w-3" />
                Get the App
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StoreBadge store="apple" onClick={() => setShowModal(true)} />
                <StoreBadge store="google" onClick={() => setShowModal(true)} />
              </div>
            </div>
          </div>

          {/* Install App Card */}
          <div className="mt-5">
            <InstallAppCard />
          </div>

          {/* Bottom bar */}
          <div className="mt-5 pt-4 border-t border-gray-200/30 dark:border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-navy-300 dark:text-navy-600">
              &copy; {new Date().getFullYear()} BudgetWise. All rights reserved.
            </p>
            <p className="text-[10px] text-navy-300 dark:text-navy-600 flex items-center gap-1">
              Made with <Heart className="h-2.5 w-2.5 text-expense fill-expense" /> for better finances
            </p>
          </div>
        </div>
      </footer>

      <ComingSoonModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
