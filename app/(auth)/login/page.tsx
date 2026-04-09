'use client';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Shield, Smartphone, PieChart, Wallet, ArrowRight, Zap, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/LogoMark';

const features = [
  { icon: Wallet, title: 'Track Everything', description: 'Monitor income, expenses, and budgets in one elegant place', color: '#06D6A0' },
  { icon: Sparkles, title: 'AI Assistant', description: 'Voice and text commands to manage finances with natural language', color: '#A78BFA' },
  { icon: PieChart, title: 'Visual Analytics', description: 'Beautiful charts and deep insights about your spending habits', color: '#118AB2' },
  { icon: Smartphone, title: 'Works Offline', description: 'Full functionality even without internet connection', color: '#FFD166' },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.4 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden mesh-bg">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[15%] h-[300px] w-[300px] lg:h-[500px] lg:w-[500px] rounded-full bg-primary-500/10 dark:bg-primary-500/5 blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
          className="absolute bottom-[10%] left-[10%] h-[250px] w-[250px] lg:h-[400px] lg:w-[400px] rounded-full bg-accent/10 dark:bg-accent/5 blur-[80px]"
        />
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="absolute top-[40%] left-[40%] h-[200px] w-[200px] rounded-full bg-warning/8 dark:bg-warning/3 blur-[60px]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md lg:max-w-5xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">

          {/* Left side - Hero */}
          <div className="text-center lg:text-left">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
              className="mx-auto lg:mx-0 mb-8 flex h-20 w-20 lg:h-24 lg:w-24 items-center justify-center rounded-3xl gradient-hero shadow-glow-lg"
            >
              <LogoMark className="h-12 w-12 lg:h-14 lg:w-14" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3 text-5xl lg:text-7xl font-display font-extrabold tracking-tight text-navy-900 dark:text-white"
            >
              Budget
              <span className="text-gradient">Wise</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 text-lg lg:text-xl text-navy-400 dark:text-navy-300 max-w-md mx-auto lg:mx-0 leading-relaxed"
            >
              AI-powered budgeting with beautiful insights. Manage your finances with voice commands, smart analytics, and an app that works everywhere.
            </motion.p>

            {/* Desktop features list */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="hidden lg:flex flex-col gap-4 mb-8"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 group"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-50">{feature.title}</h3>
                    <p className="text-sm text-navy-400 dark:text-navy-300">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right side - Sign in card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden">
              {/* Card background decoration */}
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative">
                {/* Mobile features grid */}
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="lg:hidden mb-8 grid grid-cols-2 gap-3"
                >
                  {features.map((feature) => (
                    <motion.div
                      key={feature.title}
                      variants={fadeUp}
                      className="rounded-2xl p-4 bg-surface-light/50 dark:bg-white/[0.03] border border-gray-100/80 dark:border-white/[0.04]"
                    >
                      <feature.icon className="mb-2 h-5 w-5" style={{ color: feature.color }} />
                      <h3 className="text-xs font-semibold text-navy-800 dark:text-navy-50">{feature.title}</h3>
                      <p className="text-[11px] mt-0.5 text-navy-400 dark:text-navy-300 leading-tight">{feature.description}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Desktop sign-in header */}
                <div className="hidden lg:block mb-6">
                  <h2 className="text-2xl font-display font-bold text-navy-900 dark:text-navy-50 mb-1">
                    Welcome aboard
                  </h2>
                  <p className="text-navy-400 dark:text-navy-300">
                    Sign in to start managing your finances smartly
                  </p>
                </div>

                {/* Stats teaser */}
                <div className="hidden lg:grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center p-3 rounded-xl bg-surface-light/50 dark:bg-white/[0.03]">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-warning" />
                    <p className="text-lg font-display font-bold text-navy-800 dark:text-navy-50">100%</p>
                    <p className="text-[11px] text-navy-400">Offline Ready</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-surface-light/50 dark:bg-white/[0.03]">
                    <Globe className="h-4 w-4 mx-auto mb-1 text-accent" />
                    <p className="text-lg font-display font-bold text-navy-800 dark:text-navy-50">18+</p>
                    <p className="text-[11px] text-navy-400">Currencies</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-surface-light/50 dark:bg-white/[0.03]">
                    <Sparkles className="h-4 w-4 mx-auto mb-1 text-violet-500" />
                    <p className="text-lg font-display font-bold text-navy-800 dark:text-navy-50">AI</p>
                    <p className="text-[11px] text-navy-400">Powered</p>
                  </div>
                </div>

                {/* Sign In Button */}
                <Button
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  size="lg"
                  className="w-full gap-3 text-base font-semibold h-14 rounded-2xl bg-navy-900 hover:bg-navy-800 dark:bg-white dark:text-navy-900 dark:hover:bg-navy-50 transition-all shadow-lg hover:shadow-xl group"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                  <ArrowRight className="h-4 w-4 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Button>

                <p className="mt-4 text-center text-xs text-navy-400 dark:text-navy-300">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
