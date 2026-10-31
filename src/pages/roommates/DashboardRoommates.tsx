import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ArrowLeft,
  Upload,
  Save,
  Phone,
  Info,
  Eye,
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useReferenceData } from "@/hooks/useReferenceData";
import { toZambianE164 } from "@/lib/phone";
import { compressImage } from "@/lib/imageCompression";
import { getPublicStorageUrl } from "@/lib/storage";
import {
  ROOM_SHARING_OPTIONS,
  NOISE_LEVEL_OPTIONS,
  STUDY_ROUTINE_OPTIONS,
  TIDINESS_OPTIONS,
  GUESTS_OPTIONS,
  GENDER_OPTIONS,
  GENDER_PREF_OPTIONS
} from "@/lib/constants";
import { Loading } from "@/components/common/Loading";

interface ExistingProfile {
  id: string;
  owner_id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  gender: "female" | "male" | "prefer_not_to_say" | null;
  gender_pref: "any" | "same";
  campus_id: string | null;
  preferred_areas: string[];
  budget_min_zmw: number | null;
  budget_max_zmw: number | null;
  move_in_date: string | null;
  room_sharing: "own_room" | "share_room" | "either" | null;
  noise_level: "quiet" | "moderate" | "lively" | null;
  study_routine: "early" | "night" | "flexible" | null;
  tidiness: "relaxed" | "average" | "very_tidy" | null;
  guests: "rarely" | "sometimes" | "often" | null;
  contact_shared: boolean;
  status: "active" | "draft" | "archived" | "suspended" | "rejected";
}

export const DashboardRoommates: React.FC = () => {
  const { user } = useAuth();
  const { campuses } = useReferenceData();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [campusId, setCampusId] = useState("");
  const [preferredAreas, setPreferredAreas] = useState<string[]>([]);
  const [areaInput, setAreaInput] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [roomSharing, setRoomSharing] = useState<string>("either");
  const [noiseLevel, setNoiseLevel] = useState<string>("moderate");
  const [studyRoutine, setStudyRoutine] = useState<string>("flexible");
  const [tidiness, setTidiness] = useState<string>("average");
  const [guests, setGuests] = useState<string>("sometimes");
  const [gender, setGender] = useState<string>("");
  const [genderPref, setGenderPref] = useState<string>("any");
  const [contactShared, setContactShared] = useState(true);
  const [status, setStatus] = useState<"active" | "draft">("active");

  // Private Contact
  const [phone, setPhone] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load existing roommate profile
  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error: err } = await supabase
        .from("roommate_profiles")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (err) throw err;

      if (data) {
        const p = data as ExistingProfile;
        setExistingProfile(p);
        setDisplayName(p.display_name);
        setBio(p.bio || "");
        setAvatarPath(p.avatar_path);
        setCampusId(p.campus_id || "");
        setPreferredAreas(p.preferred_areas || []);
        setBudgetMin(p.budget_min_zmw !== null ? String(p.budget_min_zmw) : "");
        setBudgetMax(p.budget_max_zmw !== null ? String(p.budget_max_zmw) : "");
        setMoveInDate(p.move_in_date || "");
        setRoomSharing(p.room_sharing || "either");
        setNoiseLevel(p.noise_level || "moderate");
        setStudyRoutine(p.study_routine || "flexible");
        setTidiness(p.tidiness || "average");
        setGuests(p.guests || "sometimes");
        setGender(p.gender || "");
        setGenderPref(p.gender_pref || "any");
        setContactShared(p.contact_shared);
        setStatus(p.status === "draft" ? "draft" : "active");

        // Fetch private contact
        const { data: contact } = await supabase
          .from("private_contacts")
          .select("phone, whatsapp_phone")
          .eq("roommate_id", p.id)
          .maybeSingle();

        if (contact) {
          setPhone(contact.phone);
          setWhatsApp(contact.whatsapp_phone || "");
        }
      }
    } catch (err) {
      console.error("Failed to load roommate profile:", err);
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle area tag addition
  const handleAddArea = () => {
    const trimmed = areaInput.trim();
    if (!trimmed) return;
    if (preferredAreas.length >= 10) {
      toast.error("You can add up to 10 preferred areas.");
      return;
    }
    if (!preferredAreas.includes(trimmed)) {
      setPreferredAreas([...preferredAreas, trimmed]);
    }
    setAreaInput("");
  };

  const handleRemoveArea = (areaToRemove: string) => {
    setPreferredAreas(preferredAreas.filter((a) => a !== areaToRemove));
  };

  // Avatar Upload with Compression
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploadingAvatar(true);
    try {
      const file = files[0];
      if (!file) return;

      toast.info("Compressing profile photo...");
      const compressed = await compressImage(file, 600, 600, 0.85);

      const storagePath = `${user.id}/avatar_${Date.now()}.webp`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(storagePath, compressed.blob, {
          contentType: "image/webp",
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      setAvatarPath(storagePath);
      toast.success("Profile photo uploaded!");
    } catch (err: unknown) {
      console.error("Avatar upload failed:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  // Save / Update Profile
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Client-side validations
    if (displayName.trim().length < 2 || displayName.trim().length > 40) {
      toast.error("Display name must be between 2 and 40 characters.");
      return;
    }
    if (bio.trim().length > 500) {
      toast.error("Bio cannot exceed 500 characters.");
      return;
    }

    const bMin = budgetMin.trim() ? parseFloat(budgetMin) : null;
    const bMax = budgetMax.trim() ? parseFloat(budgetMax) : null;

    if (bMin !== null && (isNaN(bMin) || bMin < 0)) {
      toast.error("Minimum budget cannot be negative.");
      return;
    }
    if (bMax !== null && (isNaN(bMax) || bMax < 0)) {
      toast.error("Maximum budget cannot be negative.");
      return;
    }
    if (bMin !== null && bMax !== null && bMax < bMin) {
      toast.error("Maximum budget must be greater than or equal to minimum budget.");
      return;
    }

    const normalizedPhone = toZambianE164(phone);
    if (!normalizedPhone) {
      toast.error("Please enter a valid Zambian phone number (+260... or 097...).");
      return;
    }
    const normalizedWa = whatsApp.trim() ? toZambianE164(whatsApp) : null;

    setSubmitting(true);
    try {
      const payload = {
        owner_id: user.id,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_path: avatarPath,
        campus_id: campusId || null,
        preferred_areas: preferredAreas,
        budget_min_zmw: bMin,
        budget_max_zmw: bMax,
        move_in_date: moveInDate || null,
        room_sharing: (roomSharing as "own_room" | "share_room" | "either") || null,
        noise_level: (noiseLevel as "quiet" | "moderate" | "lively") || null,
        study_routine: (studyRoutine as "early" | "night" | "flexible") || null,
        tidiness: (tidiness as "relaxed" | "average" | "very_tidy") || null,
        guests: (guests as "rarely" | "sometimes" | "often") || null,
        gender: (gender as "female" | "male" | "prefer_not_to_say") || null,
        gender_pref: (genderPref as "any" | "same") || "any",
        contact_shared: contactShared,
        status: status
      };

      let roommateProfileId = existingProfile?.id;

      if (existingProfile) {
        const { error: updateErr } = await supabase
          .from("roommate_profiles")
          .update(payload)
          .eq("id", existingProfile.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: created, error: insertErr } = await supabase
          .from("roommate_profiles")
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw insertErr;
        roommateProfileId = created.id;
      }

      // Upsert Private Contact
      if (roommateProfileId) {
        const { error: contactErr } = await supabase.from("private_contacts").upsert(
          {
            owner_id: user.id,
            roommate_id: roommateProfileId,
            phone: normalizedPhone,
            whatsapp_phone: normalizedWa
          },
          { onConflict: "roommate_id" }
        );

        if (contactErr) console.warn("Error updating private contact:", contactErr);
      }

      toast.success(
        status === "active"
          ? "Roommate profile updated and active!"
          : "Roommate profile saved as draft."
      );

      loadProfile();
    } catch (err: unknown) {
      console.error("Failed to save roommate profile:", err);
      const message = err instanceof Error ? err.message : "Error saving profile";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading your roommate profile..." />;
  }

  const avatarUrl = avatarPath ? getPublicStorageUrl("avatars", avatarPath) : "";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back & Title Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground mb-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-700" /> My Roommate Profile
            </h1>
            <p className="text-xs text-muted">
              Configure your budget and lifestyle preferences to match with other campus students.
            </p>
          </div>

          <Link
            to="/roommates"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline w-fit"
          >
            <Eye className="w-4 h-4" /> View Public Matches
          </Link>
        </div>
      </div>

      {/* Transparent Privacy & Public Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-950 dark:text-blue-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm text-brand-900 dark:text-brand-200">
          <Info className="w-4 h-4 text-brand-700 shrink-0" />
          <span>Public Board Transparency Notice</span>
        </div>
        <p className="leading-relaxed">
          Your <strong>display name</strong>, <strong>bio</strong>, <strong>photo</strong>, <strong>campus</strong>, <strong>budget range</strong>, and <strong>lifestyle habits</strong> are visible to all students browsing the Roommates section.
        </p>
        <p className="leading-relaxed">
          Your <strong>phone number</strong> is stored in an encrypted private table and is never public. It is revealed only to signed-in students when you enable the <em>Contact Sharing</em> toggle below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-surface border border-border shadow-2xs space-y-5">
        {/* Profile Status Switcher */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
          <div>
            <span className="text-xs font-bold text-foreground block">Profile Visibility</span>
            <span className="text-[11px] text-muted">
              {status === "active" ? "Active: Visible on public roommates board" : "Draft / Inactive: Hidden from public matching"}
            </span>
          </div>

          <select aria-label="Profile visibility status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "draft")}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground min-h-[44px]"
          >
            <option value="active">Active (Visible)</option>
            <option value="draft">Inactive (Draft)</option>
          </select>
        </div>

        {/* Avatar & Display Name */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-brand-700 shrink-0 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-8 h-8 text-muted opacity-50" />
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-slate-100 text-xs font-bold text-foreground cursor-pointer min-h-[44px]">
                <Upload className="w-3.5 h-3.5 text-brand-700" />
                <span>{uploadingAvatar ? "Uploading..." : "Upload Photo"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingAvatar}
                  onChange={handleAvatarChange}
                  className="sr-only"
                />
              </label>

              {avatarPath && (
                <button
                  type="button"
                  onClick={() => setAvatarPath(null)}
                  className="text-xs text-danger-600 hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-name">
                Display Name (2 to 40 characters) *
              </label>
              <input
                id="r-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Kondwani C."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-bio">
            Short Student Bio & Introduction (Max 500 chars)
          </label>
          <textarea
            id="r-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. 3rd year Engineering student looking for a quiet, organised flatmate near campus..."
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground resize-none"
          />
        </div>

        {/* Campus & Move-In Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-campus">
              Preferred Campus
            </label>
            <select
              id="r-campus"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
            >
              <option value="">Any Campus / Off-campus</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.short_name || ""})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-movein">
              Desired Move-In Date
            </label>
            <input
              id="r-movein"
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
            />
          </div>
        </div>

        {/* Monthly Budget Range (ZMW) */}
        <div>
          <span className="block text-xs font-bold text-foreground mb-1">
            Monthly Budget Range per Person (ZMW)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Minimum monthly budget in ZMW"
              type="number"
              min="0"
              step="50"
              placeholder="Min ZMW (e.g. 800)"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
            />
            <input aria-label="Maximum monthly budget in ZMW"
              type="number"
              min="0"
              step="50"
              placeholder="Max ZMW (e.g. 1500)"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
            />
          </div>
        </div>

        {/* Preferred Areas Tags */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-area-input">
            Preferred Neighbourhoods / Areas (Max 10)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              id="r-area-input"
              type="text"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddArea();
                }
              }}
              placeholder="e.g. Town Centre, North End..."
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
            />
            <button
              type="button"
              onClick={handleAddArea}
              className="px-4 py-2 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold min-h-[44px]"
            >
              Add Area
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {preferredAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-800 dark:text-brand-200 text-xs font-semibold border border-brand-200 dark:border-brand-900"
              >
                {area}
                <button type="button" onClick={() => handleRemoveArea(area)}>
                  <X className="w-3 h-3 text-muted hover:text-foreground" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Practical Lifestyle Preferences (Used deterministically by match_roommates) */}
        <div className="pt-2 border-t border-border space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Lifestyle & Living Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Room Sharing */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-sharing">
                Room Sharing Preference
              </label>
              <select
                id="r-sharing"
                value={roomSharing}
                onChange={(e) => setRoomSharing(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              >
                {ROOM_SHARING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Noise Level */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-noise">
                Noise Preference
              </label>
              <select
                id="r-noise"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              >
                {NOISE_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Study Routine */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-study">
                Study Routine
              </label>
              <select
                id="r-study"
                value={studyRoutine}
                onChange={(e) => setStudyRoutine(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              >
                {STUDY_ROUTINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tidiness */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-tidy">
                Tidiness Preference
              </label>
              <select
                id="r-tidy"
                value={tidiness}
                onChange={(e) => setTidiness(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              >
                {TIDINESS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Guests */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-guests">
                Approach to Guests / Visitors
              </label>
              <select
                id="r-guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              >
                {GUESTS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender & Gender Preference (Optional) */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1" htmlFor="r-gender">
                My Gender & Match Preference (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  id="r-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="px-2 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                >
                  <option value="">Gender...</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <select aria-label="Preferred roommate gender"
                  value={genderPref}
                  onChange={(e) => setGenderPref(e.target.value)}
                  className="px-2 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                >
                  {GENDER_PREF_OPTIONS.map((gp) => (
                    <option key={gp.value} value={gp.value}>
                      {gp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Private Contact Details */}
        <div className="pt-3 border-t border-border p-4 rounded-xl bg-slate-50 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand-700" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Private Contact Information
            </h2>
          </div>
          <p className="text-[11px] text-muted">
            Saved securely in the database. Only signed-in students who have confirmed matching compatibility can view these if you permit contact sharing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1" htmlFor="r-phone">
                Phone Number (+260...) *
              </label>
              <input
                id="r-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0971234567"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1" htmlFor="r-wa">
                WhatsApp Number (Optional)
              </label>
              <input
                id="r-wa"
                type="tel"
                value={whatsApp}
                onChange={(e) => setWhatsApp(e.target.value)}
                placeholder="e.g. 0971234567"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={contactShared}
              onChange={(e) => setContactShared(e.target.checked)}
              className="mt-0.5 rounded-sm border-border text-brand-700 focus:ring-brand-700"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300">
              Allow signed-in students who match my roommate profile to reveal my contact details.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-900 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving profile..." : "Save Roommate Profile"}
          </button>
        </div>
      </form>
    </div>
  );
};
