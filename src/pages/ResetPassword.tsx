import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user arrived via recovery link or is in a password recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasValidSession(Boolean(session));
    };

    checkSession();

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasValidSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and re-type.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message || "Failed to update password.");
      } else {
        setIsSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 2500);
      }
    } catch {
      setErrorMessage("Failed to connect to authentication server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-14 p-6 sm:p-8 bg-surface rounded-2xl border border-border shadow-xs">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-3 border border-brand-200 dark:border-brand-900">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Set New Password</h1>
        <p className="text-xs text-muted mt-1">
          Choose a secure password for your Plawza account.
        </p>
      </div>

      {hasValidSession === false ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
          <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">
            Recovery Session Expired or Missing
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            The password reset link may have expired or was already used. Please request a new link.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-700 text-white text-xs font-bold hover:bg-brand-900 transition-colors"
          >
            Go to Sign In <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : isSuccess ? (
        <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-success-600 mx-auto" />
          <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
            Password Updated!
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Your password has been securely updated. Redirecting you to your Plawza dashboard...
          </p>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-danger-600 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="new-password">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-11 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1.5 p-2 rounded-md text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="confirm-new-password">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-11 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1.5 p-2 rounded-md text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </>
      )}

      <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted">
        Remember your password?{" "}
        <Link to="/login" className="font-bold text-brand-700 dark:text-brand-300 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};
export default ResetPassword;
