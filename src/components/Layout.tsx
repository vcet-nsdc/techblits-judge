"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Swords, Trophy, Menu, X } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Dynamic Background Noise */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-60">
        <div className="absolute inset-0 speed-lines opacity-20"></div>
      </div>

      <header className="border-b-4 border-black bg-white sticky top-0 z-50 comic-shadow">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl md:text-4xl text-[#ff1a1a] hover:-rotate-2 hover:scale-105 transition-transform inline-block">
            BATTLE<span className="text-black">HACK</span>
          </Link>
          
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="font-heading text-xl hover:text-[#ff1a1a] transition-colors flex items-center gap-2">
              <Home size={20} /> HOME
            </Link>
            <Link href="/leaderboard" className="font-heading text-xl hover:text-[#ff1a1a] transition-colors flex items-center gap-2">
              <Trophy size={20} /> LEADERBOARD
            </Link>
            <Link href="/standings" className="font-heading text-xl hover:text-[#ff1a1a] transition-colors flex items-center gap-2">
              <Swords size={20} /> STANDINGS
            </Link>
          </nav>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden p-2 comic-border bg-black text-white hover:bg-[#ff1a1a] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t-4 border-black bg-white overflow-hidden"
            >
              <div className="px-4 py-4 space-y-3">
                <Link href="/" className="font-heading text-lg hover:text-[#ff1a1a] transition-colors flex items-center gap-2 p-2">
                  <Home size={18} /> HOME
                </Link>
                <Link href="/leaderboard" className="font-heading text-lg hover:text-[#ff1a1a] transition-colors flex items-center gap-2 p-2">
                  <Trophy size={18} /> LEADERBOARD
                </Link>
                <Link href="/standings" className="font-heading text-lg hover:text-[#ff1a1a] transition-colors flex items-center gap-2 p-2">
                  <Swords size={18} /> STANDINGS
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 relative">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {children}
        </motion.div>
      </main>

      <footer className="border-t-4 border-black bg-black text-white py-6 md:py-8 mt-8 md:mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-heading text-lg md:text-2xl">© {new Date().getFullYear()} TECHBLITZ INITIATIVE</p>
          <p className="font-body mt-2 text-gray-400 font-bold text-sm md:text-base">ALL SYSTEMS OPERATIONAL // PREPARE FOR BATTLE</p>
        </div>
      </footer>
    </div>
  );
}
