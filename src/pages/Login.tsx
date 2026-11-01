import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, Mail, Lock, AlertCircle, X, CheckCircle2, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const COOLDOWN_KEY = "plawza_pwd_reset_cooldown";

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Initialize and tick cooldown timer
  useEffect(() => {
    const checkCooldown = () => {
      const stored = localStorage.getItem(COOLDOWN_KEY);
      if (stored) {
        const expiry = parseInt(stored, 10);
        const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
        setCooldownRemaining(remaining);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMessage(error.message || "Invalid email or password.");
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch {
      setErrorMessage("Failed to connect to authentication server. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgot = () => {
    setForgotEmail(email.trim());
    setForgotError(null);
    setForgotSuccess(false);
    setShowForgotModal(true);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0 || forgotLoading) return;

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: redirectUrl
      });

      if (resetErr) {
        setForgotError(resetErr.message || "Failed to send reset email. Please try again.");
      } else {
        setForgotSuccess(true);
        const expiry = Date.now() + 60 * 1000;
        localStorage.setItem(COOLDOWN_KEY, expiry.toString());
        setCooldownRemaining(60);
        toast.success("Password reset link sent to your email!");
      }
    } catch {
      setForgotError("Failed to reach server. Please check your internet connection.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-12 p-6 sm:p-8 bg-surface rounded-2xl border border-border shadow-xs">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-3 border border-brand-200 dark:border-brand-900">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Sign In to Plawza</h1>
        <p className="text-xs text-muted mt-1">
          Manage your accommodation listings, roommate profile, or campus shop.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-danger-600 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="login-email">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. you@example.com"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-foreground" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              onClick={handleOpenForgot}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted">
        Don't have an account yet?{" "}
        <Link
          to={`/register${redirectPath !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
          className="font-bold text-brand-700 dark:text-brand-300 hover:underline"
        >
          Create Free Account
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center border border-brand-200 dark:border-brand-900">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Enter your registered email address below. We'll send you a secure link to create a new password.
            </p>

            {forgotError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-danger-600 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-success-600 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                  Reset Link Dispatched
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Check your inbox (and spam folder) at <strong>{forgotEmail}</strong>. Click the link inside to set your new password.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-lg bg-brand-700 text-white text-xs font-bold hover:bg-brand-900 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="forgot-email">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[40px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || cooldownRemaining > 0}
                    className="px-4 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[40px] disabled:opacity-50 cursor-pointer"
                  >
                    {cooldownRemaining > 0
                      ? `Resend in ${cooldownRemaining}s`
                      : forgotLoading
                        ? "Sending Link..."
                        : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Login;
