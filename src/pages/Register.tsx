import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase, getAuthRedirectUrl } from "@/lib/supabase";

const RESEND_COOLDOWN_KEY = "plawza_signup_resend_cooldown";

export const Register: React.FC = () => {
  const { user, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectPath = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<"idle" | "verify_email" | "auto_confirmed">("idle");
  const [resending, setResending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Redirect authenticated users immediately
  useEffect(() => {
    if (user && confirmationState === "idle") {
      navigate(redirectPath, { replace: true });
    }
  }, [user, confirmationState, navigate, redirectPath]);

  useEffect(() => {
    const checkCooldown = () => {
      const stored = localStorage.getItem(RESEND_COOLDOWN_KEY);
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

  const startResendCooldown = () => {
    const expiry = Date.now() + 60 * 1000;
    localStorage.setItem(RESEND_COOLDOWN_KEY, expiry.toString());
    setCooldownRemaining(60);
  };

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

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error, needsEmailConfirmation } = await signUp(
        email.trim(),
        password,
        fullName,
        redirectPath
      );

      if (error) {
        setErrorMessage(error.message || "Failed to create account.");
      } else if (needsEmailConfirmation) {
        setConfirmationState("verify_email");
        startResendCooldown();
        toast.success("Confirmation email sent! Please check your inbox.");
      } else {
        setConfirmationState("auto_confirmed");
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1800);
      }
    } catch {
      setErrorMessage("Network error during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resending || cooldownRemaining > 0 || !email.trim()) return;
    setResending(true);

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
        startResendCooldown();
        toast.success("Confirmation link resent! Check your inbox and spam folder.");
      }
    } catch {
      toast.error("Network error while resending email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-12 p-6 sm:p-8 bg-surface rounded-2xl border border-border shadow-xs">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mx-auto mb-3 border border-brand-200 dark:border-brand-900">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Create Account</h1>
        <p className="text-xs text-muted mt-1">
          Join Plawza to post accommodation, find student roommates, or list your campus business.
        </p>
      </div>

      {confirmationState === "verify_email" ? (
        <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
          <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-emerald-950 dark:text-emerald-100">
            Check Your Email to Confirm
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            We have sent a confirmation link to{" "}
            <strong className="font-bold text-foreground break-all">{email.trim()}</strong>.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Open the email and tap <strong>Confirm your mail</strong>—it will verify your account and bring you right back into Plawza. Don't forget to check your <strong>Spam / Junk</strong> folder.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending || cooldownRemaining > 0}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[42px] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              {cooldownRemaining > 0
                ? `Resend Confirmation Email (${cooldownRemaining}s)`
                : resending
                  ? "Sending..."
                  : "Resend Confirmation Email"}
            </button>

            <button
              type="button"
              onClick={() => setConfirmationState("idle")}
              className="w-full py-2 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground transition-colors min-h-[38px] cursor-pointer"
            >
              Entered the wrong email? Go back
            </button>
          </div>

          <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-800/70 text-xs text-muted">
            Already clicked the confirmation link?{" "}
            <Link
              to={`/login${redirectPath !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="font-bold text-brand-700 dark:text-brand-300 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      ) : confirmationState === "auto_confirmed" ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
          <CheckCircle2 className="w-8 h-8 text-success-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Account Created!</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Setting up your profile and redirecting you to your dashboard...
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
              <span className="bg-surface px-2.5 text-muted font-semibold">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="register-name">
                Full Name or Organization
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mwamba Mwape"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="register-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                <input
                  id="register-email"
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
              <label className="block text-xs font-bold text-foreground mb-1.5" htmlFor="register-password">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="register-terms"
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-brand-700 focus:ring-brand-700"
              />
              <label htmlFor="register-terms" className="text-xs text-muted leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
                  Privacy Policy
                </Link>
                , and confirm I am 18 years or older (or have guardian consent).
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading || !agreedToTerms}
              className="w-full py-3 px-4 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted">
            Already have an account?{" "}
            <Link
              to={`/login${redirectPath !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
              className="font-bold text-brand-700 dark:text-brand-300 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
export default Register;
