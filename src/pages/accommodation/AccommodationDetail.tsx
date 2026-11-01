import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Heart,
  Flag,
  Phone,
  MessageCircle,
  Eye,
  Send,
  Zap,
  Droplets,
  BatteryCharging,
  Info,
  Share2,
  Calculator,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useFavourites } from "@/hooks/useFavourites";
import { whatsAppUrl } from "@/lib/phone";
import { getPublicStorageUrl } from "@/lib/storage";
import { LISTING_TYPES, AMENITIES_VOCABULARY, UTILITIES_VOCABULARY, REPORT_REASONS } from "@/lib/constants";
import {
  isStaleConfirmation,
  calculateRentSplit,
  buildWhatsAppShareUrl
} from "@/lib/differentiators";
import { LazyImage } from "@/components/common/LazyImage";
import { Loading } from "@/components/common/Loading";
import { ErrorState } from "@/components/common/ErrorState";
import { SafetyNotice } from "@/components/common/SafetyNotice";

interface ListingDetail {
  id: string;
  owner_id?: string;
  title: string;
  description: string;
  listing_type: string;
  rent_zmw: number;
  deposit_zmw: number | null;
  town_id: string;
  area: string;
  campus_id: string | null;
  distance_note: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  utilities_included: string[];
  amenities: string[];
  available_from: string | null;
  availability: "available" | "pending" | "occupied";
  contact_shared: boolean;
  status: string;
  last_confirmed_at: string;
  created_at: string;
  updated_at: string;
  town?: { name: string; province: string };
  campus?: { name: string; short_name: string | null };
  accommodation_images?: Array<{ id: string; storage_path: string; alt_text: string | null; sort_order: number }>;
}

export const AccommodationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isFavourited, toggleFavourite } = useFavourites();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation verification badge status
  const [isModeratorReviewed, setIsModeratorReviewed] = useState(false);

  // Favourite status
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);

  // Revealed contact phone
  const [revealedPhone, setRevealedPhone] = useState<{ phone: string; whatsapp_phone: string | null } | null>(null);
  const [revealingContact, setRevealingContact] = useState(false);

  // Viewing Request Form state
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [viewingDate, setViewingDate] = useState("");
  const [viewingMessage, setViewingMessage] = useState("");
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryCooldownSeconds, setEnquiryCooldownSeconds] = useState(0);

  // Monitor enquiry cooldown for this listing
  useEffect(() => {
    if (!id) return;
    const key = `plawza_enquiry_${id}`;
    const check = () => {
      const stored = localStorage.getItem(key);
      if (stored) {
        const expiry = parseInt(stored, 10);
        const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
        setEnquiryCooldownSeconds(remaining);
        if (remaining > 0) {
          setEnquirySuccess(true);
        }
      }
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [id]);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Active selected image index for gallery
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Phase 7 Differentiator: Roommate Rent Split Estimator state
  const [splitPeople, setSplitPeople] = useState(2);
  const [splitUtilities, setSplitUtilities] = useState("");

  useEffect(() => {
    if (!id) return;
    const listingId: string = id;

    async function loadListing() {
      setLoading(true);
      setError(null);

      try {
        // Single parallel round-trip: join town, campus, and images directly, and run verifications + favourites in parallel
        const [listingRes, verifRes, favRes] = await Promise.all([
          supabase
            .from("accommodation_listings")
            .select(
              `
              id, title, description, listing_type, rent_zmw, deposit_zmw,
              town_id, area, campus_id, distance_note, bedrooms, bathrooms, furnished,
              utilities_included, amenities, available_from, availability, contact_shared,
              status, last_confirmed_at, created_at, updated_at,
              town:towns(name, province),
              campus:campuses(name, short_name),
              accommodation_images(id, storage_path, alt_text, sort_order)
            `
            )
            .eq("id", listingId)
            .maybeSingle(),
          supabase
            .from("verifications")
            .select("id")
            .eq("listing_id", listingId)
            .eq("check_type", "moderator_reviewed")
            .is("revoked_at", null)
            .maybeSingle(),
          user
            ? supabase
                .from("favourites")
                .select("id")
                .eq("user_id", user.id)
                .eq("listing_id", listingId)
                .maybeSingle()
            : Promise.resolve({ data: null })
        ]);

        if (listingRes.error) throw listingRes.error;
        if (!listingRes.data) {
          setError("Listing not found or is no longer active.");
          return;
        }

        const typedListing = listingRes.data as unknown as ListingDetail;
        setListing(typedListing);
        setIsModeratorReviewed(Boolean(verifRes.data));
        setIsFavourite(Boolean(favRes.data));
      } catch (err) {
        console.error("Failed to load listing details:", err);
        setError("Error loading property details.");
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [id, user]);

  // Toggle Favourite
  const handleToggleFavourite = async () => {
    if (!user) {
      toast.info("Please sign in to save favourites.");
      return;
    }
    if (!id || !listing || favouriteLoading) return;
    const listingId: string = id;

    setFavouriteLoading(true);
    try {
      if (isFavourite) {
        await supabase.from("favourites").delete().eq("user_id", user.id).eq("listing_id", listingId);
        setIsFavourite(false);
        toast.success("Removed from favourites");
      } else {
        await supabase.from("favourites").insert({ user_id: user.id, listing_id: listingId });
        setIsFavourite(true);
        toast.success("Saved to favourites");
      }
    } catch (err) {
      console.error("Error updating favourite:", err);
      toast.error("Failed to update favourite");
    } finally {
      setFavouriteLoading(false);
    }
  };

  // Reveal Contact details via RPC
  const handleRevealContact = async () => {
    if (!user) {
      toast.info("Sign in required to view landlord contact details.");
      return;
    }
    if (!id || revealingContact) return;
    const listingId: string = id;

    setRevealingContact(true);
    try {
      const { data, error: err } = await supabase.rpc("reveal_contact", {
        p_kind: "listing",
        p_id: listingId
      });

      if (err) throw err;

      if (data && data.length > 0 && data[0]) {
        setRevealedPhone(data[0]);
        toast.success("Contact details revealed!");
      } else {
        toast.error("Contact details are unavailable.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Contact details are unavailable";
      toast.error(message);
    } finally {
      setRevealingContact(false);
    }
  };

  // Submit Viewing Request Enquiry
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to submit a viewing request.");
      return;
    }
    if (!id || !listing) return;
    const listingId: string = id;

    if (listing.owner_id && user.id === listing.owner_id) {
      toast.error("You cannot send an enquiry to your own property.");
      return;
    }

    if (enquiryCooldownSeconds > 0) {
      toast.info(`You have already submitted an enquiry for this property. Please wait ${Math.ceil(enquiryCooldownSeconds / 60)} min before sending another.`);
      return;
    }

    if (!requesterName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setEnquirySubmitting(true);
    try {
      const { error: err } = await supabase.from("accommodation_enquiries").insert({
        listing_id: listingId,
        requester_id: user.id,
        owner_id: listing.owner_id || user.id,
        requester_name: requesterName.trim(),
        requester_phone: requesterPhone.trim() || null,
        message: viewingMessage.trim() || null,
        preferred_viewing_at: viewingDate ? new Date(viewingDate).toISOString() : null
      });

      if (err) throw err;

      if (id) {
        const expiry = Date.now() + 10 * 60 * 1000;
        localStorage.setItem(`plawza_enquiry_${id}`, expiry.toString());
        setEnquiryCooldownSeconds(600);
      }
      setEnquirySuccess(true);
      toast.success("Viewing request sent to landlord!");
    } catch (err: unknown) {
      console.error("Error submitting viewing enquiry:", err);
      const message = err instanceof Error ? err.message : "Failed to send request";
      toast.error(message);
    } finally {
      setEnquirySubmitting(false);
    }
  };

  // Submit Listing Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to report a listing.");
      return;
    }
    if (!id) return;
    const listingId: string = id;

    setReportSubmitting(true);
    try {
      const { error: err } = await supabase.from("listing_reports").insert({
        reporter_id: user.id,
        listing_id: listingId,
        reason: reportReason as "scam" | "misleading" | "unavailable" | "inappropriate" | "wrong_info" | "other",
        details: reportDetails.trim() || null
      });

      if (err) throw err;

      setShowReportModal(false);
      setReportDetails("");
      toast.success("Thank you. Report received by moderation.");
    } catch (err: unknown) {
      console.error("Error submitting report:", err);
      const message = err instanceof Error ? err.message : "Failed to submit report";
      toast.error(message);
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading property details..." />;
  }

  if (error || !listing) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <ErrorState
          title="Listing Unavailable"
          message={error || "This listing could not be found."}
          onRetry={() => window.location.reload()}
        />
        <div className="text-center">
          <Link
            to="/accommodation"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Browse all accommodation
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.accommodation_images || [];
  const currentImage = images[selectedImageIndex];
  const currentImageUrl = currentImage
    ? getPublicStorageUrl("listing-images", currentImage.storage_path)
    : "";

  const diffDays = Math.floor(
    (Date.now() - new Date(listing.last_confirmed_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button & Top Action Controls */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/accommodation"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Accommodation
        </Link>

        <div className="flex items-center gap-2">
          {/* Favourite Button */}
          <button
            type="button"
            onClick={handleToggleFavourite}
            disabled={favouriteLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-colors min-h-[44px] ${
              isFavourite
                ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-900"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
            aria-label="Save to favourites"
          >
            <Heart className={`w-4 h-4 ${isFavourite ? "fill-rose-600 text-rose-600" : ""}`} />
            <span>{isFavourite ? "Saved" : "Save"}</span>
          </button>

          {/* WhatsApp Share Button (Phase 7 differentiator) */}
          <button
            type="button"
            onClick={() => listing && toggleFavourite("listing", listing.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-bold transition-colors min-h-[44px] cursor-pointer ${
              listing && isFavourited("listing", listing.id)
                ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300"
                : "border-border bg-surface hover:bg-slate-100 text-foreground"
            }`}
            title={listing && isFavourited("listing", listing.id) ? "Remove from favourites" : "Save to favourites"}
          >
            <Heart className={`w-4 h-4 ${listing && isFavourited("listing", listing.id) ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{listing && isFavourited("listing", listing.id) ? "Saved" : "Save"}</span>
          </button>

          <a
            href={buildWhatsAppShareUrl(
              listing.title,
              `Rent: ZMW ${listing.rent_zmw.toLocaleString()}/mo • Area: ${listing.area}${listing.town ? `, ${listing.town.name}` : ""}`,
              window.location.href
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-colors min-h-[44px]"
            title="Share property on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </a>

          {/* Report Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-slate-100 text-xs font-bold text-muted hover:text-danger-600 transition-colors min-h-[44px]"
          >
            <Flag className="w-4 h-4" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery & Main Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photos Gallery & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Display */}
          <div className="rounded-2xl overflow-hidden bg-surface border border-border shadow-2xs">
            <LazyImage
              src={currentImageUrl}
              alt={listing.title}
              aspectRatio="aspect-16/10"
              className="w-full h-full object-cover"
            />

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="p-3 border-t border-border flex items-center gap-2 overflow-x-auto">
                {images.map((img, idx) => {
                  const thumbUrl = getPublicStorageUrl("listing-images", img.storage_path);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                        selectedImageIndex === idx ? "border-brand-700" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Property Overview */}
          <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Badge */}
              <span className="px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wider">
                {LISTING_TYPES.find((t) => t.value === listing.listing_type)?.label || listing.listing_type}
              </span>

              {/* Verified Badge (From verifications table only) */}
              {isModeratorReviewed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-success-600" />
                  Reviewed by Moderator
                </span>
              )}

              {/* Availability Status */}
              {listing.availability === "available" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Available Now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 text-white text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" /> {listing.availability}
                </span>
              )}

              {/* Phase 7: "Not recently confirmed" text badge after 30 days */}
              {isStaleConfirmation(listing.last_confirmed_at, listing.created_at, 30) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Not recently confirmed
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-foreground">{listing.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-accent-700 shrink-0" />
                <strong className="text-foreground">{listing.area}</strong>
                {listing.town?.name ? `, ${listing.town.name}` : ""}
              </span>
              {listing.campus?.name && (
                <span className="flex items-center gap-1">
                  • Near {listing.campus.name}
                  {listing.distance_note ? ` (${listing.distance_note})` : ""}
                </span>
              )}
            </div>

            {/* Availability Last Confirmed N Days Ago Notice */}
            <div
              className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
                diffDays > 30
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-semibold"
                  : "bg-slate-50 dark:bg-slate-900/40 border-border text-muted"
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span>
                  Availability last reconfirmed by landlord:{" "}
                  <strong>
                    {diffDays <= 0 ? "Today" : diffDays === 1 ? "Yesterday" : `${diffDays} days ago`}
                  </strong>
                </span>
                {diffDays > 30 && (
                  <p className="text-[11px] font-normal text-amber-800 dark:text-amber-300 mt-0.5">
                    Notice: This listing has not been reconfirmed in over 30 days. Confirm availability before planning a visit.
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="pt-2">
              <h2 className="text-sm font-bold text-foreground mb-2">About this Accommodation</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Privacy / Address Notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-muted">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Exact street address is kept private for resident safety. The landlord will provide precise directions upon viewing request.
              </span>
            </div>
          </div>

          {/* Amenities & Utilities */}
          <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
            <h2 className="text-sm font-bold text-foreground">Amenities & Property Features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITIES_VOCABULARY.map((amenity) => {
                const hasAmenity = listing.amenities.includes(amenity.value);
                return (
                  <div
                    key={amenity.value}
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold ${
                      hasAmenity
                        ? "bg-brand-50 dark:bg-brand-950/60 text-brand-900 dark:text-brand-100 border border-brand-200 dark:border-brand-900"
                        : "opacity-35 line-through text-muted"
                    }`}
                  >
                    {amenity.value === "solar_backup" ? (
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                    ) : amenity.value === "borehole" ? (
                      <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    ) : amenity.value === "prepaid_electricity" ? (
                      <BatteryCharging className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{amenity.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Utilities Included */}
            {listing.utilities_included.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-xs font-bold text-foreground mb-2">Included in Monthly Rent:</h3>
                <div className="flex flex-wrap gap-1.5">
                  {listing.utilities_included.map((util) => (
                    <span
                      key={util}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold"
                    >
                      ✓ {UTILITIES_VOCABULARY.find((u) => u.value === util)?.label || util}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Phase 7 Differentiator: Roommate Rent Split Estimator */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand-700 dark:text-brand-300" />
                <h3 className="text-sm font-bold text-foreground">Roommate Rent Split Estimator</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted">
                Cost Estimator
              </span>
            </div>

            <p className="text-xs text-muted">
              Planning to share this accommodation with course mates or roommates? Estimate how much each person pays per month including rent and any shared utilities.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Number of people sharing */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Number of roommates / people
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSplitPeople((p) => Math.max(1, p - 1))}
                    className="w-11 h-11 rounded-lg border border-border bg-background hover:bg-slate-100 flex items-center justify-center font-bold text-base select-none"
                    aria-label="Decrease people count"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-foreground w-8 text-center">{splitPeople}</span>
                  <button
                    type="button"
                    onClick={() => setSplitPeople((p) => Math.min(10, p + 1))}
                    className="w-11 h-11 rounded-lg border border-border bg-background hover:bg-slate-100 flex items-center justify-center font-bold text-base select-none"
                    aria-label="Increase people count"
                  >
                    +
                  </button>
                  <span className="text-xs text-muted">
                    {splitPeople === 1 ? "Solo occupant" : `${splitPeople} sharing`}
                  </span>
                </div>
              </div>

              {/* Optional Utilities */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Estimated shared utilities</span>
                  <span className="text-[10px] text-muted font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                    ZMW
                  </span>
                  <input aria-label="Estimated shared utilities in ZMW per month"
                    type="number"
                    min="0"
                    step="50"
                    value={splitUtilities}
                    onChange={(e) => setSplitUtilities(e.target.value)}
                    placeholder="e.g. 400 (power, water, wifi)"
                    className="w-full pl-12 pr-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:ring-1 focus:ring-brand-700 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Split Result */}
            <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider block">
                  Estimated Cost Per Person
                </span>
                <div className="text-2xl font-black text-brand-700 dark:text-brand-200 mt-0.5">
                  ZMW {calculateRentSplit(listing.rent_zmw, parseFloat(splitUtilities) || 0, splitPeople).toLocaleString()}
                  <span className="text-xs font-normal text-muted"> / person / month</span>
                </div>
              </div>

              <p className="text-[11px] text-muted max-w-xs text-left sm:text-right italic">
                * Clearly marked as an estimate. Actual utility bills and deposit terms depend on room agreement and usage.
              </p>
            </div>
          </div>

          {/* Safety Notice */}
          <SafetyNotice />
        </div>

        {/* Right Column: Pricing, Contact & Viewing Request Form */}
        <div className="space-y-6">
          {/* Price & Contact Card */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4 sticky top-20">
            <div>
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">Monthly Rent</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black text-brand-700 dark:text-brand-300">
                  ZMW {listing.rent_zmw.toLocaleString()}
                </span>
                <span className="text-xs text-muted">/ month</span>
              </div>
              {listing.deposit_zmw !== null && listing.deposit_zmw > 0 && (
                <p className="text-xs text-muted mt-1">
                  Required Security Deposit: <strong>ZMW {listing.deposit_zmw.toLocaleString()}</strong>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              {/* Landlord Contact Section */}
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Landlord Contact</h3>

              {revealedPhone ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Contact Details Revealed:
                  </span>
                  <div className="text-sm font-black text-foreground tracking-wide font-mono">
                    {revealedPhone.phone}
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {revealedPhone.whatsapp_phone && whatsAppUrl(revealedPhone.whatsapp_phone, `Hi, I saw your listing "${listing.title}" on Plawza. Is it still available?`) && (
                      <a
                        href={whatsAppUrl(revealedPhone.whatsapp_phone, `Hi, I saw your listing "${listing.title}" on Plawza. Is it still available?`)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px]"
                      >
                        <MessageCircle className="w-4 h-4" /> Message on WhatsApp
                      </a>
                    )}
                    <a
                      href={`tel:${revealedPhone.phone}`}
                      className="inline-flex items-center justify-center gap-2 py-2.5 px-4 border border-border bg-surface hover:bg-slate-100 text-foreground rounded-lg text-xs font-bold transition-colors min-h-[44px]"
                    >
                      <Phone className="w-4 h-4 text-brand-700" /> Direct Phone Call
                    </a>
                  </div>
                </div>
              ) : listing.contact_shared ? (
                <button
                  type="button"
                  onClick={handleRevealContact}
                  disabled={revealingContact}
                  className="w-full py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {revealingContact ? "Retrieving Contact..." : user ? "Show Landlord Phone Number" : "Sign In to View Landlord Contact"}
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-muted">
                  The landlord prefers viewing requests submitted via the form below before sharing phone contact.
                </div>
              )}
            </div>

            {/* Viewing Request Form */}
            <div className="pt-4 border-t border-border space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Request a Viewing
              </h3>
              <p className="text-xs text-muted">
                Arrange a time to inspect the property in person before paying any money.
              </p>

              {enquirySuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100">Viewing Request Sent!</p>
                  <p className="text-[11px] text-muted">The landlord has been notified and can respond with viewing directions.</p>
                  {enquiryCooldownSeconds > 0 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                      Cooldown active: {Math.floor(enquiryCooldownSeconds / 60)}m {enquiryCooldownSeconds % 60}s remaining before another note can be sent.
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitEnquiry} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1" htmlFor="req-name">
                      Your Full Name
                    </label>
                    <input
                      id="req-name"
                      type="text"
                      required
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="e.g. Chanda Mwewa"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1" htmlFor="req-phone">
                      Your Phone / WhatsApp (+260...)
                    </label>
                    <input
                      id="req-phone"
                      type="tel"
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      placeholder="e.g. 0971234567"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1" htmlFor="req-date">
                      Preferred Date & Time
                    </label>
                    <input
                      id="req-date"
                      type="datetime-local"
                      value={viewingDate}
                      onChange={(e) => setViewingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1" htmlFor="req-msg">
                      Message to Landlord (Optional)
                    </label>
                    <textarea
                      id="req-msg"
                      rows={2}
                      value={viewingMessage}
                      onChange={(e) => setViewingMessage(e.target.value)}
                      placeholder="e.g. I am a 2nd year student looking to move in next month..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enquirySubmitting}
                    className="w-full py-2.5 px-4 rounded-lg bg-accent-700 hover:bg-accent-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {enquirySubmitting ? "Sending Request..." : user ? "Submit Viewing Request" : "Sign In to Request Viewing"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-danger-600 font-bold text-base">
              <Flag className="w-5 h-5" />
              <span>Report Listing</span>
            </div>
            <p className="text-xs text-muted">
              Help keep the Plawza student community safe. Reports are immediately reviewed by platform moderators.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="rep-reason">
                  Reason for Report
                </label>
                <select
                  id="rep-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="rep-details">
                  Additional Details
                </label>
                <textarea
                  id="rep-details"
                  rows={3}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what occurred or why this listing violates community standards..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-danger-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
                >
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
