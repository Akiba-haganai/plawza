import React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  Building2,
  Users,
  Store,
  User,
  Zap,
  ShieldCheck,
  Plus
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDataModeStore } from "@/stores/dataMode";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { PwaReloadPrompt } from "@/components/common/PwaReloadPrompt";
import { DialogA11y } from "@/components/common/DialogA11y";

export const AppLayout: React.FC = () => {
  const { user, isStaff } = useAuth();
  const { isLowData, toggleLowData } = useDataModeStore();
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
        <div className="max-w-7xl mx-auto px-4 h-15 flex items-center justify-between gap-3">
          {/* Logo & Pilot Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-11 h-11 rounded-xl bg-brand-700 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-brand-900 transition-colors">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-brand-950 dark:text-brand-100 leading-none">
                  PLAWZA
                </span>
                <span className="text-[10px] font-semibold text-accent-700 dark:text-accent-400 leading-none mt-0.5">
                  Stays, roommates and shops
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
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
              Accommodation
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
              Local Shops
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
          <div className="flex items-center gap-2">
            {/* Low-Data Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleLowData}
              title={isLowData ? "Low-data mode is ON. Tap to load standard images." : "Turn on Low-Data mode to save mobile data"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-colors min-h-[44px] ${
                isLowData
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
                  : "bg-surface text-muted border-border hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              aria-pressed={isLowData}
            >
              <Zap className={`w-3.5 h-3.5 ${isLowData ? "fill-amber-500 text-amber-600" : ""}`} />
              <span className="hidden sm:inline">Data Saver:</span>
              <span>{isLowData ? "ON" : "OFF"}</span>
            </button>

            {/* Post Listing / Dashboard Link */}
            {user ? (
              <Link
                to="/dashboard/accommodation"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent-700 hover:bg-accent-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                Post Listing
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors min-h-[44px]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <Outlet />
      </main>

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
