import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Store,
  MessageSquare,
  LogOut,
  ShieldCheck,
  User,
  Clock,
  Trash2,
  Sun,
  Moon,
  Laptop,
  Zap,
  AlertTriangle,
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useThemeStore } from "@/stores/theme";
import { useDataModeStore } from "@/stores/dataMode";
import { calculateMedianResponseHours, formatResponseTime } from "@/lib/differentiators";

export const DashboardOverview: React.FC = () => {
  const { user, profile, isStaff, signOut } = useAuth();
  const { theme, setTheme } = useThemeStore();
  const { isLowData, toggleLowData } = useDataModeStore();
  const navigate = useNavigate();

  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [respondedCount, setRespondedCount] = useState<number>(0);

  // Self-service account deletion state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ownerId: string = user.id;

    async function loadReliability(id: string) {
      try {
        const { data } = await supabase
          .from("accommodation_enquiries")
          .select("created_at, updated_at, status")
          .eq("owner_id", id);

        if (data && data.length > 0) {
          const hours = calculateMedianResponseHours(data);
          setResponseHours(hours);
          const count = data.filter((e) => e.status !== "new" && e.updated_at).length;
          setRespondedCount(count);
        }
      } catch (err) {
        console.error("Failed to load landlord reliability metrics:", err);
      }
    }
    loadReliability(ownerId);
  }, [user]);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmationText.trim().toUpperCase() !== "DELETE") {
      toast.error("Please type DELETE to confirm account deletion.");
      return;
    }

    setDeleting(true);
    try {
      const { error: err } = await supabase.rpc("delete_my_account");
      if (err) throw err;

      toast.success("Your account and all associated data have been permanently deleted.");
      await signOut();
      navigate("/");
    } catch (err: unknown) {
      console.error("Account deletion failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Header Profile Summary */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">
              {profile?.full_name || "My Account"}
            </h1>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4" />
              Staff Moderation
            </Link>
          )}

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-danger-600 transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Landlord Reliability Summary (Phase 7 Differentiator: Private to owner, no public score) */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-700 dark:text-brand-300" />
            Landlord Response Reliability
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted">
            Private to You • No Public Score
          </span>
        </div>
        <div className="text-xl font-black text-foreground">
          Median Response Time: {formatResponseTime(responseHours)}
        </div>
        <p className="text-xs text-muted">
          Median time from receiving an accommodation viewing request to updating its status ({respondedCount} answered {respondedCount === 1 ? "enquiry" : "enquiries"}). Fast response helps retain prospective student tenants.
        </p>
      </div>

      {/* Dashboard Feature Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/dashboard/accommodation"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              My Accommodation Listings
            </h2>
            <p className="text-xs text-muted mt-1">
              Add and manage your boarding houses, apartments, and rooms. Update availability status.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/roommates"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Roommate Profile
            </h2>
            <p className="text-xs text-muted mt-1">
              Manage your budget, campus preference, lifestyle habits, and contact visibility.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/businesses"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              My Campus Business
            </h2>
            <p className="text-xs text-muted mt-1">
              Set up business pages and manage your product catalogue, pricing, and stock status.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/enquiries"
          className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 transition-colors group flex items-start gap-4 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground group-hover:text-brand-700 transition-colors">
              Viewing Enquiries
            </h2>
            <p className="text-xs text-muted mt-1">
              Track viewing requests sent by prospective student tenants for your properties.
            </p>
          </div>
        </Link>
      </div>

      {/* Account Preferences Card */}
      <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
        <h2 className="text-base font-bold text-foreground">Preferences & Display</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider block">
              Color Theme
            </label>
            <div className="inline-flex rounded-xl border border-border p-1 bg-background gap-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                  theme === "light"
                    ? "bg-surface shadow-xs text-brand-700 font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                  theme === "dark"
                    ? "bg-surface shadow-xs text-brand-300 font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] ${
                  theme === "system"
                    ? "bg-surface shadow-xs text-foreground font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                System
              </button>
            </div>
          </div>

          {/* Data Saver Preference */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider block">
              Mobile Data Mode
            </label>
            <button
              type="button"
              onClick={toggleLowData}
              className={`flex items-center justify-between w-full p-2.5 rounded-xl border transition-colors min-h-[44px] ${
                isLowData
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                  : "bg-background border-border text-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${isLowData ? "fill-amber-500 text-amber-600" : "text-muted"}`} />
                <span className="text-xs font-bold">Data Saver Mode</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface border border-border">
                {isLowData ? "ACTIVE" : "DISABLED"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Account & Data Deletion (Zambia DPA 2021) */}
      <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
        <div className="flex items-center gap-2 text-danger-700 dark:text-red-400 font-bold text-sm">
          <Trash2 className="w-4 h-4" />
          <span>Privacy & Data Erasure (Zambia DPA 2021)</span>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          In accordance with the Republic of Zambia Data Protection Act 2021, you have the right to request permanent erasure of your personal data. Permanently deleting your account erases your authentication credentials, accommodation listings, roommate profile, shop catalogues, and private phone numbers. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmationText("");
            setDeleteConfirmOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors min-h-[44px]"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account & All Data
        </button>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {deleteConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-danger-700 dark:text-red-400 font-bold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-black">Confirm Permanent Deletion</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close dialog"
                data-dialog-close
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              This will permanently delete your account (<strong>{user?.email}</strong>) and erase all your listings, businesses, and roommate profiles from our database.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="delete-confirm-input">
                  Type <span className="text-danger-600 font-black">DELETE</span> to confirm:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  required
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-red-600 min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
