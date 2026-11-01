import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase, getAuthRedirectUrl } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

const POST_AUTH_REDIRECT_KEY = "plawza_post_auth_redirect";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  staffRole: AppRole | null;
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    redirectTo?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  uploadAvatar: (file: File) => Promise<{ error: Error | null; path?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffRole, setStaffRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch verified profile and staff role from database (never trust client claims)
  const fetchUserData = async (currentUser: User) => {
    try {
      const [profileRes, staffRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
        supabase.from("staff_roles").select("role").eq("user_id", currentUser.id).maybeSingle()
      ]);

      if (profileRes.data) {
        let currentProf = profileRes.data;
        const metaName =
          (currentUser.user_metadata?.full_name as string | undefined)?.trim() ||
          (currentUser.user_metadata?.name as string | undefined)?.trim();
        const metaAvatar =
          (currentUser.user_metadata?.avatar_url as string | undefined)?.trim() ||
          (currentUser.user_metadata?.picture as string | undefined)?.trim();

        // Auto-backfill name and avatar from Google OAuth if empty
        const updatesToApply: Partial<Profile> = {};
        if (!currentProf.full_name && metaName) {
          updatesToApply.full_name = metaName.slice(0, 100);
        }
        if (!currentProf.avatar_path && !currentProf.avatar_url && metaAvatar) {
          updatesToApply.avatar_url = metaAvatar.slice(0, 1000);
        }

        if (Object.keys(updatesToApply).length > 0) {
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .update(updatesToApply)
            .eq("id", currentUser.id)
            .select("*")
            .maybeSingle();
          if (updatedProfile) {
            currentProf = updatedProfile;
          }
        }
        setProfile(currentProf);
      } else {
        setProfile(null);
      }

      if (staffRes.data) {
        setStaffRole(staffRes.data.role);
      } else {
        setStaffRole(null);
      }
    } catch (err) {
      console.error("Error fetching user profile/staff data:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";

    const isRecoveryCallback =
      hash.includes("type=recovery") || search.includes("type=recovery");

    const isEmailConfirmationCallback =
      hash.includes("type=signup") || hash.includes("type=email");

    const isAuthCallback =
      isRecoveryCallback ||
      isEmailConfirmationCallback ||
      hash.includes("access_token=") ||
      search.includes("code=");

    const handlePostAuthRedirect = () => {
      if (typeof window === "undefined") return;

      if (isRecoveryCallback && window.location.pathname !== "/reset-password") {
        window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
        return;
      }

      const savedRedirect = localStorage.getItem(POST_AUTH_REDIRECT_KEY);
      if (savedRedirect) {
        localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        if (
          isAuthCallback &&
          savedRedirect.startsWith("/") &&
          window.location.pathname !== savedRedirect &&
          window.location.pathname !== "/reset-password"
        ) {
          window.history.replaceState(null, "", savedRedirect);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } else if (isAuthCallback && window.location.hash.includes("access_token=")) {
        // Clean up OAuth/email token hash from the address bar
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (isEmailConfirmationCallback) {
          toast.success("Email confirmed! Welcome to Plawza.");
        }
        handlePostAuthRedirect();
        fetchUserData(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Single subscription to auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || event === "INITIAL_SESSION") return;
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined") {
        if (window.location.pathname !== "/reset-password") {
          window.history.replaceState(null, "", "/reset-password");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      }

      if (session?.user) {
        if (event === "SIGNED_IN") {
          handlePostAuthRedirect();
        }
        await fetchUserData(session.user);
      } else {
        setProfile(null);
        setStaffRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const cleanRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    if (typeof window !== "undefined") {
      localStorage.setItem(POST_AUTH_REDIRECT_KEY, cleanRedirect);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(cleanRedirect),
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string, redirectTo?: string) => {
    const cleanRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    if (typeof window !== "undefined") {
      localStorage.setItem(POST_AUTH_REDIRECT_KEY, cleanRedirect);
    }
    const emailRedirectTo = getAuthRedirectUrl(cleanRedirect);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName?.trim() || ""
        }
      }
    });

    if (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        error: new Error("An account with this email already exists. Please sign in instead."),
        needsEmailConfirmation: false
      };
    }

    const needsEmailConfirmation = !error && Boolean(data?.user) && !data?.session;
    return { error, needsEmailConfirmation };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setStaffRole(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) return { error };
      setProfile(data);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error("Not authenticated") };
    try {
      const { compressImage } = await import("@/lib/imageCompression");
      const { blob } = await compressImage(file, 400, 400, 0.85);
      const fileName = `${user.id}/avatar-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType: "image/webp",
          upsert: true
        });
      if (uploadError) return { error: uploadError };

      const { error: updateError } = await updateProfile({
        avatar_path: fileName
      });
      if (updateError) return { error: updateError };

      return { error: null, path: fileName };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const isStaff = staffRole === "admin" || staffRole === "moderator";
  const isAdmin = staffRole === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        staffRole,
        isStaff,
        isAdmin,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        uploadAvatar
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
