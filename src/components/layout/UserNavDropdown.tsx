import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Store,
  MessageSquare,
  Heart,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/common/Avatar";

export const UserNavDropdown: React.FC = () => {
  const { user, profile, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!user) return null;

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate("/");
  };

  const displayName = profile?.full_name?.trim() || user.email?.split("@")[0] || "User";
  const avatarSource = profile?.avatar_path || profile?.avatar_url;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
        aria-label="User account menu"
      >
        <Avatar src={avatarSource} name={displayName} size="sm" showBorder />
        <span className="hidden lg:inline text-xs font-bold text-foreground max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface rounded-2xl border border-border shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 divide-y divide-border">
          {/* User Profile Card Header */}
          <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <Avatar src={avatarSource} name={displayName} size="md" showBorder />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                {isStaff && (
                  <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-300 text-[9px] font-black uppercase">
                    Staff
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted truncate">{user.email}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-1.5 space-y-0.5 text-xs font-semibold">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-muted" />
              <span>Overview</span>
            </Link>

            <Link
              to="/dashboard/favourites"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Saved Favourites</span>
            </Link>

            <Link
              to="/dashboard/enquiries"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-muted" />
              <span>Enquiries</span>
            </Link>

            <Link
              to="/dashboard/accommodation"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Building2 className="w-4 h-4 text-muted" />
              <span>My Stays</span>
            </Link>

            <Link
              to="/dashboard/roommates"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Users className="w-4 h-4 text-muted" />
              <span>My Roommate Profile</span>
            </Link>

            <Link
              to="/dashboard/businesses"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Store className="w-4 h-4 text-muted" />
              <span>My Campus Shops</span>
            </Link>

            {isStaff && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-accent-700 dark:text-accent-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Moderation Portal</span>
              </Link>
            )}
          </div>

          {/* Settings & Sign Out */}
          <div className="p-1.5 space-y-0.5 text-xs font-semibold">
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-muted" />
              <span>Profile & Settings</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-danger-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
