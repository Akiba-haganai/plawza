import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  Lock,
  Shield,
  Upload,
  Trash2,
    AlertCircle,
  Smartphone,
    Download,
    MapPin,
  School,
  Eye,
  EyeOff,
      RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/common/Avatar";
import { toZambianE164 } from "@/lib/phone";
import {
  getPushSubscriptionState,
  subscribeToPush,
  unsubscribeFromPush
} from "@/lib/pushNotifications";
import type { Database } from "@/types/database";

type Town = Database["public"]["Tables"]["towns"]["Row"];
type Campus = Database["public"]["Tables"]["campuses"]["Row"];

export const DashboardSettings: React.FC = () => {
  const { user, profile, updateProfile, uploadAvatar, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "security">("profile");

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [townId, setTownId] = useState<string>("");
  const [campusId, setCampusId] = useState<string>("");
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "call" | "sms">("whatsapp");
  const [contactVisibility, setContactVisibility] = useState<"public" | "verified_only" | "on_request">("public");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Reference data
  const [towns, setTowns] = useState<Town[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);

  // Notifications State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushUpdating, setPushUpdating] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    email_enquiries: true,
    email_confirmations: true,
    email_marketing: false,
    push_enquiries: true,
    push_reminders: true,
    push_announcements: true,
    in_app_sound: true
  });
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Security Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Export & Deletion
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Populate profile fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setPhone(profile.phone || "");
      setTownId(profile.town_id || "");
      setCampusId(profile.campus_id || "");
      setContactMethod((profile.preferred_contact_method as any) || "whatsapp");
      setContactVisibility((profile.contact_visibility as any) || "public");
    }
  }, [profile]);

  // Load towns and campuses
  useEffect(() => {
    async function loadRefData() {
      const [townsRes, campusesRes] = await Promise.all([
        supabase.from("towns").select("*").order("name"),
        supabase.from("campuses").select("*").order("name")
      ]);
      if (townsRes.data) setTowns(townsRes.data);
      if (campusesRes.data) setCampuses(campusesRes.data);
    }
    loadRefData();
  }, []);

  // Check push subscription status and load notification preferences
  useEffect(() => {
    if (!user) return;

    async function checkPush() {
      const state = await getPushSubscriptionState();
      setPushSupported(state.supported);
      setPushSubscribed(state.subscribed);
      setPushPermission(state.permission);
    }
    checkPush();

    async function loadPrefs() {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (data) {
        setNotifPrefs({
          email_enquiries: data.email_enquiries,
          email_confirmations: data.email_confirmations,
          email_marketing: data.email_marketing,
          push_enquiries: data.push_enquiries,
          push_reminders: data.push_reminders,
          push_announcements: data.push_announcements,
          in_app_sound: data.in_app_sound
        });
      }
    }
    loadPrefs();
  }, [user]);

  // Handle Avatar Upload
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    setAvatarUploading(true);
    try {
      const { error } = await uploadAvatar(file);
      if (error) throw error;
      toast.success("Profile photo updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo.";
      toast.error(msg);
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      const { error } = await updateProfile({ avatar_path: null, avatar_url: null });
      if (error) throw error;
      toast.success("Profile photo removed.");
    } catch {
      toast.error("Failed to remove photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let formattedPhone: string | null = null;
    if (phone.trim()) {
      const e164 = toZambianE164(phone.trim());
      if (!e164) {
        toast.error("Please enter a valid Zambian phone number (+26097... or 097...).");
        return;
      }
      formattedPhone = e164;
    }

    setProfileSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        phone: formattedPhone,
        town_id: townId || null,
        campus_id: campusId || null,
        preferred_contact_method: contactMethod,
        contact_visibility: contactVisibility
      });

      if (error) throw error;
      toast.success("Profile details saved!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile.";
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  // Toggle Web Push
  const handleTogglePush = async () => {
    if (!user) return;
    setPushUpdating(true);
    try {
      if (pushSubscribed) {
        const { success, error } = await unsubscribeFromPush(user.id);
        if (success) {
          setPushSubscribed(false);
          toast.success("Push notifications turned off on this device.");
        } else {
          toast.error(error || "Could not unsubscribe from push.");
        }
      } else {
        const { success, error } = await subscribeToPush(user.id);
        if (success) {
          setPushSubscribed(true);
          setPushPermission("granted");
          toast.success("Push notifications enabled! You will now receive instant alerts.");
        } else {
          toast.error(error || "Could not enable push notifications.");
        }
      }
    } catch {
      toast.error("An error occurred while updating push settings.");
    } finally {
      setPushUpdating(false);
    }
  };

  // Save Notification Preferences
  const handleSaveNotifPrefs = async () => {
    if (!user) return;
    setPrefsSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: user.id,
        ...notifPrefs,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      toast.success("Notification preferences saved!");
    } catch {
      toast.error("Failed to save notification preferences.");
    } finally {
      setPrefsSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Sign out other devices
  const handleSignOutOtherDevices = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out of all other devices.");
    } catch {
      toast.error("Failed to sign out of other devices.");
    }
  };

  // Download My Data (GDPR / Zambian Data Protection Act compliance)
  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profileData, stays, businesses, enquiries, favs] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("accommodation_listings").select("*").eq("owner_id", user.id),
        supabase.from("businesses").select("*").eq("owner_id", user.id),
        supabase.from("accommodation_enquiries").select("*").or(`owner_id.eq.${user.id},requester_id.eq.${user.id}`),
        supabase.from("favourites").select("*").eq("user_id", user.id)
      ]);

      const exportPayload = {
        plawza_account_export: {
          exported_at: new Date().toISOString(),
          user_id: user.id,
          email: user.email,
          profile: profileData.data,
          accommodation_listings: stays.data || [],
          campus_businesses: businesses.data || [],
          enquiries: enquiries.data || [],
          saved_favourites: favs.data || []
        }
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plawza-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Your data export has been downloaded!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to compile data export.");
    } finally {
      setExporting(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;

      toast.success("Your account and listings have been permanently deleted.");
      await signOut();
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account.";
      toast.error(msg);
      setDeleting(false);
    }
  };

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "User";
  const avatarSource = profile?.avatar_path || profile?.avatar_url;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Settings Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-black text-foreground">Profile & Settings</h1>
        <p className="text-xs text-muted mt-1">
          Manage your personal details, public contact preferences, notifications, and security.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "profile"
              ? "border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-300"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Bio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "notifications"
              ? "border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-300"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications & Push</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "security"
              ? "border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-300"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & Privacy</span>
        </button>
      </div>

      {/* TAB 1: PROFILE & BIO */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Avatar management card */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <Avatar src={avatarSource} name={displayName} size="2xl" showBorder />
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-base font-bold text-foreground">Profile Picture</h3>
              <p className="text-xs text-muted leading-relaxed">
                Photos help students, landlords and roommates recognize you. Photos are compressed to save mobile bandwidth.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold transition-colors cursor-pointer min-h-[38px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{avatarSource ? "Change Photo" : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarFile}
                    disabled={avatarUploading}
                  />
                </label>

                {avatarSource && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-danger-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors min-h-[38px] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile details form */}
          <form onSubmit={handleSaveProfile} className="p-6 bg-surface rounded-2xl border border-border shadow-xs space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Full Name / Organization
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mwamba Mwape"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Phone Number (for enquiries)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +260971234567"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Accepted formats: +260 97X XXX XXX or 097X XXX XXX
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Short Bio / About You
                </label>
                <span className="text-[10px] text-muted">{bio.length}/250</span>
              </div>
              <textarea
                value={bio}
                maxLength={250}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. 3rd-year CS student at UNZA looking for quiet, studious accommodation..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-brand-700 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted" />
                  <span>Primary Town</span>
                </label>
                <select
                  value={townId}
                  onChange={(e) => setTownId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                >
                  <option value="">Select your town...</option>
                  {towns.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.province})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-muted" />
                  <span>Associated Campus / University</span>
                </label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                >
                  <option value="">Select campus (optional)...</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.short_name ? `(${c.short_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Preferences */}
            <div className="pt-4 border-t border-border space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Contact & Enquiry Preferences
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Preferred Contact Method
                  </label>
                  <select
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                  >
                    <option value="whatsapp">WhatsApp Message (Recommended)</option>
                    <option value="call">Phone Call</option>
                    <option value="sms">SMS Text</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Phone Number Visibility
                  </label>
                  <select
                    value={contactVisibility}
                    onChange={(e) => setContactVisibility(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                  >
                    <option value="public">Public on listings</option>
                    <option value="verified_only">Verified members only</option>
                    <option value="on_request">Only after responding to enquiry</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors min-h-[42px] disabled:opacity-50 cursor-pointer"
              >
                {profileSaving ? "Saving..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: NOTIFICATIONS & PUSH */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          {/* Web Push Card */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Web Push Notifications</h3>
                  <p className="text-xs text-muted">
                    Receive instant alerts on this device when students enquire about your listings or roommates connect.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTogglePush}
                disabled={pushUpdating || !pushSupported || pushPermission === "denied"}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  pushSubscribed
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                    : "bg-brand-700 hover:bg-brand-900 text-white shadow-xs"
                } disabled:opacity-50`}
              >
                {pushUpdating
                  ? "Updating..."
                  : pushSubscribed
                    ? "Subscribed ✓"
                    : "Enable Push"}
              </button>
            </div>

            {pushPermission === "denied" && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Push notifications are blocked in your browser settings. Please click the padlock icon in your browser address bar and allow notifications.
                </span>
              </div>
            )}
          </div>

          {/* Granular Preferences */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-foreground">Notification Channels</h3>

            <div className="space-y-4 divide-y divide-border">
              {/* Push Enquiries */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="text-xs font-bold text-foreground">New Enquiry Alerts</p>
                  <p className="text-[11px] text-muted">Instant push notification when someone enquires about your stay or shop.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.push_enquiries}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, push_enquiries: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-brand-700 focus:ring-brand-700 cursor-pointer"
                />
              </div>

              {/* Push Reminders */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Listing Expiry & Confirmation Reminders</p>
                  <p className="text-[11px] text-muted">Alerts when a listing hasn't been confirmed in 25+ days so your search rank stays high.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.push_reminders}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, push_reminders: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-brand-700 focus:ring-brand-700 cursor-pointer"
                />
              </div>

              {/* Email Enquiries */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Email Notifications for Enquiries</p>
                  <p className="text-[11px] text-muted">Receive enquiry summaries in your email inbox at {user?.email}.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.email_enquiries}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, email_enquiries: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-brand-700 focus:ring-brand-700 cursor-pointer"
                />
              </div>

              {/* In-app sound */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="text-xs font-bold text-foreground">In-App Chime Sound</p>
                  <p className="text-[11px] text-muted">Play a subtle audio tone when new notifications arrive while browsing Plawza.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.in_app_sound}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, in_app_sound: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-brand-700 focus:ring-brand-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotifPrefs}
                disabled={prefsSaving}
                className="px-5 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors min-h-[42px] disabled:opacity-50 cursor-pointer"
              >
                {prefsSaving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & PRIVACY */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="p-6 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Lock className="w-5 h-5 text-brand-700 dark:text-brand-300" />
              <h3 className="text-sm font-bold text-foreground">Change Password</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 p-1 text-muted hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors min-h-[42px] disabled:opacity-50 cursor-pointer"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>

          {/* Device Sessions & Privacy */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground">Session Control & Data Privacy</h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">Sign Out of Other Devices</p>
                <p className="text-[11px] text-muted">Revoke all active sessions on other phones or laptops.</p>
              </div>
              <button
                type="button"
                onClick={handleSignOutOtherDevices}
                className="px-3.5 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                Sign Out Other Sessions
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">Download Your Plawza Data</p>
                <p className="text-[11px] text-muted">
                  Export a full machine-readable JSON copy of your profile, stays, and enquiries (Zambia Data Protection Act 2021).
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="px-3.5 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? "Exporting..." : "Download JSON"}</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-danger-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Danger Zone: Delete Account</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently delete your user profile, accommodation listings, roommate profile, and business listings. This action cannot be reversed.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-2xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-black text-danger-600 dark:text-red-400">
              Delete Account Permanently?
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              This will permanently delete your user account and purge all your listings, images, enquiries, and roommate profiles from Plawza.
            </p>
            <p className="text-xs font-bold text-foreground">
              Please type <span className="text-danger-600">DELETE</span> below to confirm:
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="text"
                required
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2.5 rounded-lg border border-red-300 dark:border-red-800 bg-background text-sm font-bold text-foreground focus:ring-2 focus:ring-red-600 min-h-[44px]"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Permanently Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardSettings;
