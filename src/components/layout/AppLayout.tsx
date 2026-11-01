import React, { Suspense } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Loading } from "@/components/common/Loading";
import {
  Home,
  Building2,
  Users,
  Store,
  User,
  Zap,
  ShieldCheck,
  Plus,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDataModeStore } from "@/stores/dataMode";
import { useThemeStore } from "@/stores/theme";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { PwaReloadPrompt } from "@/components/common/PwaReloadPrompt";
import { DialogA11y } from "@/components/common/DialogA11y";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const AppLayout: React.FC = () => {
  const { user, isStaff } = useAuth();
  const { isLowData, toggleLowData } = useDataModeStore();
  const { isDark, toggleTheme } = useThemeStore();
  const location = useLocation();

  const navItems = [
    { label: "Home", to: "/", icon: Home },
    { label: "Stays", to: "/accommodation", icon: Building2 },
    { label: "Roommates", to: "/roommates", icon: Users },
    { label: "Shops", to: "/shops", icon: Store },
    { label: "Account", to: user ? "/dashboard" : "/login", icon: User }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-20 md:pb-0">
      <DialogA11y />
      <OfflineBanner />
      <PwaReloadPrompt />

      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center group transition-transform active:scale-95" aria-label="PLAWZA Home">
              <span className="sm:hidden">
                <BrandLogo variant="full" size="sm" theme={isDark ? "white" : "color"} />
              </span>
              <span className="hidden sm:inline-flex">
                <BrandLogo variant="full" size="md" theme={isDark ? "white" : "color"} />
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <NavLink
              to="/accommodation"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"
                    : "text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              Stays
            </NavLink>
            <NavLink
              to="/roommates"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"
                    : "text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              Roommates
            </NavLink>
            <NavLink
              to="/shops"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"
                    : "text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              Shops
            </NavLink>
            {isStaff && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "bg-brand-700 text-white"
                      : "text-accent-700 dark:text-accent-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4" />
                Moderation
              </NavLink>
            )}
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors shrink-0"
            >
              {isDark ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-brand-700" />
              )}
            </button>

            {/* Low-Data Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleLowData}
              title={isLowData ? "Low-data mode is ON. Tap to load standard images." : "Turn on Low-Data mode to save mobile data"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors min-h-[44px] shrink-0 ${
                isLowData
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
                  : "bg-surface text-muted border-border hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              aria-pressed={isLowData}
            >
              <Zap className={`w-3.5 h-3.5 ${isLowData ? "fill-amber-500 text-amber-600" : ""}`} />
              <span className="hidden md:inline">Data Saver:</span>
              <span>{isLowData ? "ON" : "OFF"}</span>
            </button>

            {/* Post Listing / Dashboard Link */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/dashboard/accommodation"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent-700 hover:bg-accent-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors min-h-[44px] shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Listing</span>
                </Link>
                <Link
                  to="/dashboard"
                  aria-label="My Account"
                  title="My Account"
                  className="hidden md:inline-flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors shrink-0"
                >
                  <User className="w-4.5 h-4.5" />
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors min-h-[44px] shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <Suspense fallback={<Loading message="Loading..." />}>
          <Outlet />
        </Suspense>
      </main>

      {/* App Footer */}
      <footer className="w-full border-t border-border bg-surface text-foreground mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-sm">
              <BrandLogo variant="full" size="sm" theme={isDark ? "white" : "color"} showTagline={true} />
              <p className="text-xs text-muted leading-relaxed">
                The open digital plaza for Zambia. Discover verified accommodation, find trusted roommates, and explore local campus businesses.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-semibold text-muted">
              <div className="space-y-2">
                <span className="block font-bold text-foreground uppercase tracking-wider text-[11px]">Explore</span>
                <div className="flex flex-col gap-1.5">
                  <Link to="/accommodation" className="hover:text-brand-700 dark:hover:text-brand-300">Stays</Link>
                  <Link to="/roommates" className="hover:text-brand-700 dark:hover:text-brand-300">Roommates</Link>
                  <Link to="/shops" className="hover:text-brand-700 dark:hover:text-brand-300">Shops</Link>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block font-bold text-foreground uppercase tracking-wider text-[11px]">Account</span>
                <div className="flex flex-col gap-1.5">
                  {user ? (
                    <>
                      <Link to="/dashboard" className="hover:text-brand-700 dark:hover:text-brand-300">Dashboard</Link>
                      <Link to="/dashboard/accommodation" className="hover:text-brand-700 dark:hover:text-brand-300">My Listings</Link>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="hover:text-brand-700 dark:hover:text-brand-300">Sign In</Link>
                      <Link to="/register" className="hover:text-brand-700 dark:hover:text-brand-300">Register</Link>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block font-bold text-foreground uppercase tracking-wider text-[11px]">Legal & Safety</span>
                <div className="flex flex-col gap-1.5">
                  <Link to="/terms" className="hover:text-brand-700 dark:hover:text-brand-300">Terms of Service</Link>
                  <Link to="/privacy" className="hover:text-brand-700 dark:hover:text-brand-300">Privacy Policy</Link>
                  <Link to="/copyright" className="hover:text-brand-700 dark:hover:text-brand-300">Copyright & Takedown</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
            <p>© {new Date().getFullYear()} PLAWZA. All rights reserved.</p>
            <p>Operating in compliance with the Republic of Zambia Data Protection Act 2021.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Fixed 360px+ touch-optimized) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/98 border-t border-border backdrop-blur-md px-2 py-1 flex items-center justify-around shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center w-16 py-1 min-h-[48px] rounded-lg transition-colors ${
                isActive
                  ? "text-brand-700 dark:text-brand-200 font-bold"
                  : "text-muted hover:text-foreground font-medium"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
