import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, Mail, Lock, AlertCircle, X, CheckCircle2, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, getAuthRedirectUrl } from "@/lib/supabase";
import { toast } from "sonner";

const COOLDOWN_KEY = "plawza_pwd_reset_cooldown";
const RESEND_VERIFY_KEY = "plawza_signup_resend_cooldown";

export const Login: React.FC = () => {
  const { user, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectPath = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const [verifyCooldown, setVerifyCooldown] = useState(0);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Redirect authenticated users immediately
  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  // Initialize and tick cooldown timers
  useEffect(() => {
    const checkCooldowns = () => {
      const storedReset = localStorage.getItem(COOLDOWN_KEY);
      if (storedReset) {
        const expiry = parseInt(storedReset, 10);
        setCooldownRemaining(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
      }
      const storedVerify = localStorage.getItem(RESEND_VERIFY_KEY);
      if (storedVerify) {
        const expiry = parseInt(storedVerify, 10);
        setVerifyCooldown(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
      }
    };

    checkCooldowns();
    const interval = setInterval(checkCooldowns, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle(redirectPath);
      if (error) {
        setErrorMessage(error.message || "Could not start Google sign-in.");
        setGoogleLoading(false);
      }
    } catch {
      setErrorMessage("Failed to connect to Google authentication. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnconfirmedEmail(false);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          setUnconfirmedEmail(true);
          setErrorMessage(
            "Your email address has not been confirmed yet. Please open the confirmation link sent to your inbox (or spam folder) before signing in."
          );
        } else {
          setErrorMessage(error.message || "Invalid email or password.");
        }
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch {
      setErrorMessage("Failed to connect to authentication server. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendingVerify || verifyCooldown > 0 || !email.trim()) return;
    setResendingVerify(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl(redirectPath)
        }
      });

      if (error) {
        toast.error(error.message || "Could not resend confirmation email.");
      } else {
        const expiry = Date.now() + 60 * 1000;
        localStorage.setItem(RESEND_VERIFY_KEY, expiry.toString());
        setVerifyCooldown(60);
        toast.success("Confirmation link sent! Please check your email inbox and spam folder.");
      }
    } catch {
      toast.error("Network error while resending confirmation email.");
    } finally {
      setResendingVerify(false);
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
      const redirectUrl = getAuthRedirectUrl("/reset-password");
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
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-danger-600 dark:text-red-300 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          {unconfirmedEmail && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendingVerify || verifyCooldown > 0}
              className="w-full py-2 px-3 rounded-md bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendingVerify ? "animate-spin" : ""}`} />
              {verifyCooldown > 0
                ? `Resend Confirmation Link (${verifyCooldown}s)`
                : resendingVerify
                  ? "Sending..."
                  : "Resend Confirmation Email"}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="w-full py-2.5 px-4 rounded-lg border border-border bg-background hover:bg-neutral-50 dark:hover:bg-neutral-900 text-foreground font-bold text-sm shadow-2xs transition-colors flex items-center justify-center gap-2.5 min-h-[44px] disabled:opacity-50 cursor-pointer"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.49 12.275c0-.85-.075-1.665-.215-2.45H12v4.635h6.445c-.28 1.49-1.12 2.755-2.385 3.6v2.99h3.86c2.26-2.08 3.57-5.145 3.57-8.775z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.86-2.99c-1.075.72-2.45 1.145-4.08 1.145-3.135 0-5.79-2.115-6.74-4.96H1.27v3.09C3.245 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.26 14.285c-.24-.72-.38-1.49-.38-2.285s.14-1.565.38-2.285v-3.09H1.27C.46 8.235 0 10.065 0 12s.46 3.765 1.27 5.375l3.99-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12 4.755c1.76 0 3.34.605 4.585 1.795l3.435-3.435C17.95 1.185 15.235 0 12 0 7.31 0 3.245 2.7 1.27 6.625l3.99 3.09c.95-2.845 3.605-4.96 6.74-4.96z"
          />
        </svg>
        <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
          <span className="bg-surface px-2.5 text-muted font-semibold">or sign in with email</span>
        </div>
      </div>

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
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={loading || googleLoading}
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
