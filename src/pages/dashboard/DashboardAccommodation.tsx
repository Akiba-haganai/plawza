import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ArrowLeft,
  Plus,
  Edit3,
  Archive,
  RefreshCw,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Calendar,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useReferenceData } from "@/hooks/useReferenceData";
import { toZambianE164 } from "@/lib/phone";
import { compressImage } from "@/lib/imageCompression";
import { getPublicStorageUrl } from "@/lib/storage";
import { LISTING_TYPES, AMENITIES_VOCABULARY, UTILITIES_VOCABULARY } from "@/lib/constants";
import { isConfirmationOverdue, calculateDaysSince } from "@/lib/differentiators";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface OwnerListing {
  id: string;
  owner_id: string;
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
  status: "draft" | "pending" | "active" | "rejected" | "archived" | "suspended";
  rejection_reason: string | null;
  last_confirmed_at: string;
  created_at: string;
  updated_at: string;
  accommodation_images?: Array<{ id: string; storage_path: string; sort_order: number }>;
}

const DRAFT_FORM_STORAGE_KEY = "plawza_draft_listing_form_v1";

export const DashboardAccommodation: React.FC = () => {
  const { user, profile } = useAuth();
  const { towns, campuses } = useReferenceData();

  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<OwnerListing | null>(null);
  const [quickPostMode, setQuickPostMode] = useState(true);
  const [showMoreOptional, setShowMoreOptional] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listingType, setListingType] = useState<string>("room");
  const [rentZmw, setRentZmw] = useState<string>("");
  const [depositZmw, setDepositZmw] = useState<string>("");
  const [townId, setTownId] = useState<string>("");
  const [area, setArea] = useState("");
  const [campusId, setCampusId] = useState<string>("");
  const [distanceNote, setDistanceNote] = useState("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [furnished, setFurnished] = useState(false);
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [contactShared, setContactShared] = useState(true);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerWhatsApp, setOwnerWhatsApp] = useState("");

  // Existing & New Images
  const [existingImages, setExistingImages] = useState<Array<{ id: string; storage_path: string; sort_order: number }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Autosave new listing draft fields to localStorage so accidental modal close doesn't lose work
  useEffect(() => {
    if (!showModal || editingListing) return;
    try {
      localStorage.setItem(
        DRAFT_FORM_STORAGE_KEY,
        JSON.stringify({
          title,
          description,
          listingType,
          rentZmw,
          depositZmw,
          townId,
          area,
          campusId,
          distanceNote,
          ownerPhone,
          ownerWhatsApp,
          selectedAmenities,
          selectedUtilities
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
    showModal,
    editingListing,
    title,
    description,
    listingType,
    rentZmw,
    depositZmw,
    townId,
    area,
    campusId,
    distanceNote,
    ownerPhone,
    ownerWhatsApp,
    selectedAmenities,
    selectedUtilities
  ]);

  // Differentiator: Unconfirmed listings nudge (14+ days)
  const overdueListings = listings.filter(
    (l) => l.status === "active" && isConfirmationOverdue(l.last_confirmed_at, l.created_at, 14)
  );

  // Load owner's listings
  const loadListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("accommodation_listings")
        .select(`
          *,
          accommodation_images(id, storage_path, sort_order)
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setListings((data as unknown as OwnerListing[]) || []);
    } catch (err) {
      console.error("Failed to load owner listings:", err);
      setError("Unable to load your properties.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Open Create Form (restoring any unsaved local draft or prefilling from profile)
  const handleOpenCreate = () => {
    setEditingListing(null);
    setQuickPostMode(true);
    setShowMoreOptional(false);

    let restored = false;
    try {
      const raw = localStorage.getItem(DRAFT_FORM_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && (draft.area || draft.rentZmw || draft.title || draft.description)) {
          setTitle(draft.title || "");
          setDescription(draft.description || "");
          setListingType(draft.listingType || "room");
          setRentZmw(draft.rentZmw || "");
          setDepositZmw(draft.depositZmw || "");
          setTownId(draft.townId || profile?.town_id || towns[0]?.id || "");
          setArea(draft.area || "");
          setCampusId(draft.campusId || profile?.campus_id || "");
          setDistanceNote(draft.distanceNote || "");
          setOwnerPhone(draft.ownerPhone || profile?.phone || "");
          setOwnerWhatsApp(draft.ownerWhatsApp || profile?.phone || "");
          setSelectedAmenities(Array.isArray(draft.selectedAmenities) ? draft.selectedAmenities : []);
          setSelectedUtilities(Array.isArray(draft.selectedUtilities) ? draft.selectedUtilities : []);
          restored = true;
        }
      }
    } catch {
      // ignore
    }

    if (!restored) {
      setTitle("");
      setDescription("");
      setListingType("room");
      setRentZmw("");
      setDepositZmw("");
      setTownId(profile?.town_id || towns[0]?.id || "");
      setArea("");
      setCampusId(profile?.campus_id || "");
      setDistanceNote("");
      setBedrooms("");
      setBathrooms("");
      setFurnished(false);
      setSelectedUtilities([]);
      setSelectedAmenities([]);
      setContactShared(true);
      setOwnerPhone(profile?.phone || "");
      setOwnerWhatsApp(profile?.phone || "");
    }

    setExistingImages([]);
    setShowModal(true);
  };

  // Open Edit Form
  const handleOpenEdit = async (listing: OwnerListing) => {
    setEditingListing(listing);
    setQuickPostMode(false);
    setShowMoreOptional(true);
    setTitle(listing.title);
    setDescription(listing.description);
    setListingType(listing.listing_type);
    setRentZmw(String(listing.rent_zmw));
    setDepositZmw(listing.deposit_zmw !== null ? String(listing.deposit_zmw) : "");
    setTownId(listing.town_id);
    setArea(listing.area);
    setCampusId(listing.campus_id || "");
    setDistanceNote(listing.distance_note || "");
    setBedrooms(listing.bedrooms !== null ? String(listing.bedrooms) : "");
    setBathrooms(listing.bathrooms !== null ? String(listing.bathrooms) : "");
    setFurnished(listing.furnished);
    setSelectedUtilities(listing.utilities_included);
    setSelectedAmenities(listing.amenities);
    setContactShared(listing.contact_shared);
    setExistingImages(listing.accommodation_images || []);

    // Fetch existing private contact
    if (user) {
      const { data: contact } = await supabase
        .from("private_contacts")
        .select("phone, whatsapp_phone")
        .eq("listing_id", listing.id)
        .maybeSingle();

      if (contact) {
        setOwnerPhone(contact.phone);
        setOwnerWhatsApp(contact.whatsapp_phone || "");
      }
    }

    setShowModal(true);
  };

  // Quick Action: Confirm Still Available (Clamp to Now)
  const handleConfirmAvailable = async (listingId: string) => {
    try {
      const { error: err } = await supabase
        .from("accommodation_listings")
        .update({ last_confirmed_at: new Date().toISOString() })
        .eq("id", listingId);

      if (err) throw err;
      toast.success("Availability confirmed for another 30 days!");
      loadListings();
    } catch (err: unknown) {
      console.error("Error confirming availability:", err);
      toast.error("Failed to update availability date");
    }
  };

  // Quick Action: Change Availability
  const handleUpdateAvailability = async (listingId: string, newAvail: "available" | "pending" | "occupied") => {
    try {
      const { error: err } = await supabase
        .from("accommodation_listings")
        .update({ availability: newAvail })
        .eq("id", listingId);

      if (err) throw err;
      toast.success(`Marked as ${newAvail}`);
      loadListings();
    } catch (err: unknown) {
      console.error("Error updating availability:", err);
      toast.error("Failed to update status");
    }
  };

  // Quick Action: Archive Listing
  const handleArchive = async (listingId: string) => {
    if (!confirm("Are you sure you want to archive this listing? It will no longer appear on public search.")) return;
    try {
      const { error: err } = await supabase
        .from("accommodation_listings")
        .update({ status: "archived" })
        .eq("id", listingId);

      if (err) throw err;
      toast.success("Listing archived");
      loadListings();
    } catch (err: unknown) {
      console.error("Error archiving listing:", err);
      toast.error("Failed to archive listing");
    }
  };

  // Handle Multi-Image Upload with Client-Side Compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !user) return;

    const remainingSlots = 10 - existingImages.length;
    if (remainingSlots <= 0) {
      toast.error("A maximum of 10 photos is permitted per listing.");
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      toast.info(`Uploading first ${remainingSlots} photos (max 10 per listing).`);
    }

    setUploadingImage(true);
    try {
      toast.info(
        selectedFiles.length > 1
          ? `Compressing & uploading ${selectedFiles.length} photos...`
          : "Compressing photo for mobile network..."
      );

      const newUploadedRows: Array<{ id: string; storage_path: string; sort_order: number }> = [];
      const listingId = editingListing?.id || "temp";

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file) continue;

        const compressed = await compressImage(file, 1280, 1280, 0.82);
        const storagePath = `${user.id}/${listingId}/${compressed.fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("listing-images")
          .upload(storagePath, compressed.blob, {
            contentType: "image/webp",
            upsert: false
          });

        if (uploadErr) throw uploadErr;

        const sortOrder = existingImages.length + newUploadedRows.length;

        if (editingListing) {
          const { data: imgRow, error: imgErr } = await supabase
            .from("accommodation_images")
            .insert({
              listing_id: editingListing.id,
              storage_path: storagePath,
              sort_order: sortOrder
            })
            .select()
            .single();

          if (imgErr) throw imgErr;
          newUploadedRows.push(imgRow);
        } else {
          newUploadedRows.push({
            id: `temp-${Date.now()}-${i}`,
            storage_path: storagePath,
            sort_order: sortOrder
          });
        }
      }

      setExistingImages((prev) => [...prev, ...newUploadedRows]);
      toast.success(
        newUploadedRows.length > 1
          ? `${newUploadedRows.length} photos uploaded!`
          : "Photo ready!"
      );
    } catch (err: unknown) {
      console.error("Image upload failed:", err);
      const message = err instanceof Error ? err.message : "Image upload failed";
      toast.error(message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Delete image
  const handleDeleteImage = async (imgId: string, storagePath: string) => {
    try {
      if (!imgId.startsWith("temp-")) {
        await supabase.from("accommodation_images").delete().eq("id", imgId);
      }
      await supabase.storage.from("listing-images").remove([storagePath]);
      setExistingImages((prev) => prev.filter((i) => i.id !== imgId));
      toast.success("Photo removed");
    } catch (err) {
      console.error("Error removing photo:", err);
      toast.error("Failed to remove photo");
    }
  };

  // Submit Listing Form (Save / Update & Submit for review)
  const handleSubmitForm = async (e: React.FormEvent, targetStatus: "draft" | "pending") => {
    e.preventDefault();
    if (!user) return;

    const rentNum = parseFloat(rentZmw);
    if (isNaN(rentNum) || rentNum < 0) {
      toast.error("Monthly rent must be 0 ZMW or greater.");
      return;
    }
    const depositNum = depositZmw.trim() ? parseFloat(depositZmw) : null;
    if (depositNum !== null && (isNaN(depositNum) || depositNum < 0)) {
      toast.error("Deposit must be a positive number if provided.");
      return;
    }
    if (area.trim().length < 2 || area.trim().length > 80) {
      toast.error("Area / neighbourhood must be between 2 and 80 characters.");
      return;
    }
    if (!townId) {
      toast.error("Please select a town.");
      return;
    }

    // Validate Phone Number
    const normalizedPhone = toZambianE164(ownerPhone);
    if (!normalizedPhone) {
      toast.error("Please enter a valid Zambian phone number (+260... or 097...).");
      return;
    }
    const normalizedWa = ownerWhatsApp.trim() ? toZambianE164(ownerWhatsApp) : normalizedPhone;

    // Auto-generate clean Title & Description if left blank in Quick Post mode
    const typeLabel = LISTING_TYPES.find((t) => t.value === listingType)?.label || "Accommodation";
    const townName = towns.find((t) => t.id === townId)?.name || "";
    const campusLabel = campuses.find((c) => c.id === campusId)?.short_name || "";

    const finalTitle =
      title.trim().length >= 8
        ? title.trim().slice(0, 100)
        : `${typeLabel} in ${area.trim()}${townName ? `, ${townName}` : ""}${
            campusLabel ? ` (Near ${campusLabel})` : ""
          }`.slice(0, 100);

    const finalDescription =
      description.trim().length >= 20
        ? description.trim().slice(0, 3000)
        : `${typeLabel} available in ${area.trim()}${townName ? `, ${townName}` : ""} for ZMW ${rentNum.toLocaleString()} per month.${
            campusLabel ? ` Located convenient to ${campusLabel}.` : ""
          } Contact the landlord via Plawza to arrange an in-person viewing before paying any deposit.`;

    if (finalTitle.length < 8 || finalTitle.length > 100) {
      toast.error("Title must be between 8 and 100 characters.");
      return;
    }
    if (finalDescription.length < 20 || finalDescription.length > 3000) {
      toast.error("Description must be between 20 and 3,000 characters.");
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        owner_id: user.id,
        title: finalTitle,
        description: finalDescription,
        listing_type: listingType,
        rent_zmw: rentNum,
        deposit_zmw: depositNum,
        town_id: townId,
        area: area.trim(),
        campus_id: campusId || null,
        distance_note: distanceNote.trim() || null,
        bedrooms: bedrooms.trim() ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms.trim() ? parseInt(bathrooms, 10) : null,
        furnished,
        utilities_included: selectedUtilities,
        amenities: selectedAmenities,
        contact_shared: contactShared,
        status: targetStatus
      };

      let listingId = editingListing?.id;

      if (editingListing) {
        const { error: updateErr } = await supabase
          .from("accommodation_listings")
          .update(payload)
          .eq("id", editingListing.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: newListing, error: insertErr } = await supabase
          .from("accommodation_listings")
          .insert(payload)
          .select()
          .single();

        if (insertErr) throw insertErr;
        listingId = newListing.id;

        // Associate temp images
        if (existingImages.length > 0) {
          const imageInserts = existingImages.map((img, idx) => ({
            listing_id: newListing.id,
            storage_path: img.storage_path,
            sort_order: idx
          }));
          await supabase.from("accommodation_images").insert(imageInserts);
        }
      }

      // Upsert Private Contact number
      if (listingId) {
        const { error: contactErr } = await supabase.from("private_contacts").upsert(
          {
            owner_id: user.id,
            listing_id: listingId,
            phone: normalizedPhone,
            whatsapp_phone: normalizedWa
          },
          { onConflict: "listing_id" }
        );

        if (contactErr) console.warn("Error updating private contact:", contactErr);
      }

      try {
        localStorage.removeItem(DRAFT_FORM_STORAGE_KEY);
      } catch {
        // ignore
      }

      toast.success(
        targetStatus === "pending"
          ? "Listing submitted for moderator review!"
          : "Listing saved as draft."
      );

      setShowModal(false);
      loadListings();
    } catch (err: unknown) {
      console.error("Failed to save accommodation listing:", err);
      const message = err instanceof Error ? err.message : "Error saving property";
      toast.error(message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getStatusBadge = (status: OwnerListing["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active (Public)
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold">
            <Archive className="w-3.5 h-3.5" /> Archived
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 text-xs font-bold">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-700" /> My Accommodation Properties
          </h1>
          <p className="text-xs text-muted">Manage your student boarding houses, flats, and rooms.</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px] w-fit cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Quick Post Property
        </button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl bg-surface border border-border animate-pulse flex items-center gap-4"
            >
              <div className="w-24 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadListings} />
      ) : listings.length === 0 ? (
        <Empty
          title="No properties listed yet"
          description="You haven't added any accommodation properties yet. Use Quick Post to list your boarding house or room in under 60 seconds."
          actionLabel="Quick Post Your First Property"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="space-y-4">
          {/* "Still available?" Landlord Nudge Banner for listings unconfirmed >= 14 days */}
          {overdueListings.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    "Still available?" Action Required: {overdueListings.length} {overdueListings.length === 1 ? "property hasn't" : "properties haven't"} been confirmed in 14+ days
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Unconfirmed listings lose search ranking priority. After 30 days, they receive a public "Not recently confirmed" tag. Click to confirm your listing remains available.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {overdueListings.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleConfirmAvailable(l.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-2xs transition-colors min-h-[44px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirm "{l.title.slice(0, 16)}..."</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {listings.map((item) => {
            const firstImg = item.accommodation_images?.[0];
            const imgUrl = firstImg ? getPublicStorageUrl("listing-images", firstImg.storage_path) : "";

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col sm:flex-row gap-4 justify-between"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-border">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(item.status)}
                      <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                        ZMW {item.rent_zmw.toLocaleString()} /mo
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-foreground line-clamp-1">{item.title}</h2>
                    <p className="text-xs text-muted">
                      {item.area} • {LISTING_TYPES.find((t) => t.value === item.listing_type)?.label}
                    </p>

                    {item.status === "rejected" && item.rejection_reason && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200">
                        <strong>Rejection Reason from Moderator:</strong> {item.rejection_reason}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Last confirmed: {new Date(item.last_confirmed_at).toLocaleDateString()}</span>
                      </span>

                      {item.status === "active" && isConfirmationOverdue(item.last_confirmed_at, item.created_at, 14) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Unconfirmed for {calculateDaysSince(item.last_confirmed_at || item.created_at)} days</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Listing Action Controls */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                  {/* Availability quick switcher */}
                  <select aria-label="Listing availability"
                    value={item.availability}
                    onChange={(e) =>
                      handleUpdateAvailability(item.id, e.target.value as "available" | "pending" | "occupied")
                    }
                    className="text-base sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-background min-h-[44px]"
                  >
                    <option value="available">Mark Available</option>
                    <option value="pending">Mark Pending</option>
                    <option value="occupied">Mark Occupied</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    {/* Reconfirm Available Button */}
                    <button
                      type="button"
                      onClick={() => handleConfirmAvailable(item.id)}
                      title="Confirm still available as of today"
                      className={`p-2 rounded-lg text-xs font-semibold min-h-[44px] flex items-center gap-1 transition-colors ${
                        item.status === "active" && isConfirmationOverdue(item.last_confirmed_at, item.created_at, 14)
                          ? "bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-2xs"
                          : "border border-border hover:bg-slate-100 text-brand-700"
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Confirm Today</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-lg border border-border hover:bg-slate-100 text-xs font-semibold text-foreground min-h-[44px] flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {item.status === "active" && (
                      <Link
                        to={`/accommodation/${item.id}`}
                        className="p-2 rounded-lg border border-border hover:bg-slate-100 text-xs font-semibold text-muted hover:text-foreground min-h-[44px]"
                        title="View Public Page"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {item.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchive(item.id)}
                        className="p-2 rounded-lg border border-border hover:bg-slate-100 text-xs font-semibold text-muted hover:text-danger-600 min-h-[44px]"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl p-5 sm:p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3 gap-2">
              <div>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-700" />
                  {editingListing ? "Edit Accommodation" : "Post Accommodation"}
                </h2>
                {!editingListing && (
                  <p className="text-xs text-muted mt-0.5">
                    Drafts autosave on your phone. In Quick Post mode, only Photos, Type, Rent, Area & Phone are needed.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-3 text-muted hover:text-foreground rounded-md shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Post vs Full Details Toggle */}
            {!editingListing && (
              <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setQuickPostMode(true);
                    setShowMoreOptional(false);
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors min-h-[40px] cursor-pointer ${
                    quickPostMode
                      ? "bg-brand-700 text-white shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Quick Post (Fast 5 Fields)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickPostMode(false);
                    setShowMoreOptional(true);
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors min-h-[40px] cursor-pointer ${
                    !quickPostMode
                      ? "bg-brand-700 text-white shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <span>Full Details</span>
                </button>
              </div>
            )}

            {/* Crucial Security & Re-Review Warning */}
            {editingListing?.status === "active" && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Moderation Safety Notice:</strong>
                  <p className="mt-0.5">
                    Modifying photos or details of an active listing will automatically return it to <em>Pending Review</em> by our moderators before public changes go live.
                  </p>
                </div>
              </div>
            )}

            <form className="space-y-4">
              {/* 1. Multi-Photo Upload with Compression (First in Quick Post!) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-foreground">
                    1. Property Photos (Select multiple at once • Max 10)
                  </span>
                  <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300">
                    {existingImages.length}/10 uploaded
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Tap "Add Photos" to pick multiple photos from your phone gallery or camera. Compressed automatically for 3G/4G.
                </p>

                <div className="flex flex-wrap gap-2 items-center pt-1">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative w-20 h-16 rounded-lg overflow-hidden border border-border group"
                    >
                      <img
                        src={getPublicStorageUrl("listing-images", img.storage_path)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id, img.storage_path)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  ))}

                  {existingImages.length < 10 && (
                    <label className="px-4 h-16 rounded-lg border-2 border-dashed border-brand-600/60 hover:border-brand-700 bg-surface flex flex-col items-center justify-center cursor-pointer text-brand-700 dark:text-brand-300 transition-colors">
                      <Upload className="w-4 h-4 mb-1" />
                      <span className="text-[11px] font-bold">
                        {uploadingImage ? "Uploading..." : "+ Add Photos"}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingImage}
                        onChange={handleImageFileChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 2. Type, Monthly Rent & Town */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-type">
                    2. Listing Type *
                  </label>
                  <select
                    id="p-type"
                    value={listingType}
                    onChange={(e) => setListingType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                  >
                    {LISTING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-rent">
                    3. Monthly Rent (ZMW) *
                  </label>
                  <input
                    id="p-rent"
                    type="number"
                    inputMode="numeric"
                    required
                    min="0"
                    step="50"
                    value={rentZmw}
                    onChange={(e) => setRentZmw(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-town">
                    4. City / Town *
                  </label>
                  <select
                    id="p-town"
                    value={townId}
                    onChange={(e) => setTownId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                  >
                    <option value="">Select town</option>
                    {towns.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4b. Area & Nearby Campus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-area">
                    Area / Neighbourhood *
                  </label>
                  <input
                    id="p-area"
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Riverside, Parklands, Kalingalinga"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                  />
                  <span className="text-[10px] text-muted mt-1 block">
                    Approximate neighbourhood only (keep exact house number private).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-campus">
                    Nearby Campus (Optional)
                  </label>
                  <select
                    id="p-campus"
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                  >
                    <option value="">None / Off-campus</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. Contact Phone (Stored in private_contacts) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  5. Landlord Phone / WhatsApp Number *
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1" htmlFor="p-phone">
                      Phone Number (+260 or 097...) *
                    </label>
                    <input
                      id="p-phone"
                      type="tel"
                      required
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g. 0971234567"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1" htmlFor="p-wa">
                      WhatsApp Number (Defaults to Phone if blank)
                    </label>
                    <input
                      id="p-wa"
                      type="tel"
                      value={ownerWhatsApp}
                      onChange={(e) => setOwnerWhatsApp(e.target.value)}
                      placeholder="e.g. 0971234567"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Consent Toggle */}
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactShared}
                    onChange={(e) => setContactShared(e.target.checked)}
                    className="mt-0.5 rounded-sm border-border text-brand-700 focus:ring-brand-700"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Allow signed-in students to reveal my phone/WhatsApp number directly on the listing.
                  </span>
                </label>
              </div>

              {/* Collapsible Optional Details Toggle in Quick Post Mode */}
              {quickPostMode && !editingListing && (
                <button
                  type="button"
                  onClick={() => setShowMoreOptional((prev) => !prev)}
                  className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-bold text-foreground flex items-center justify-between transition-colors min-h-[44px] cursor-pointer"
                >
                  <span>
                    Optional Details (Custom Title, Description, Solar/Borehole Amenities, Deposit)
                  </span>
                  {showMoreOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}

              {(!quickPostMode || showMoreOptional || editingListing) && (
                <div className="space-y-4 pt-2 border-t border-border">
                  {/* Custom Title */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-title">
                      Custom Listing Title {quickPostMode ? "(Auto-generated if left blank)" : "(8 to 100 chars) *"}
                    </label>
                    <input
                      id="p-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Spacious Self-Contained Room near CBU Gate"
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground focus:ring-2 focus:ring-brand-700 min-h-[44px]"
                    />
                  </div>

                  {/* Custom Description */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-desc">
                      Detailed Description {quickPostMode ? "(Auto-generated if left blank)" : "(20 to 3,000 chars) *"}
                    </label>
                    <textarea
                      id="p-desc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe room rules, distance to campus gate, curfews, etc..."
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground"
                    />
                  </div>

                  {/* Deposit & Distance Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-dep">
                        Security Deposit in ZMW (Optional)
                      </label>
                      <input
                        id="p-dep"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="50"
                        value={depositZmw}
                        onChange={(e) => setDepositZmw(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1" htmlFor="p-dist">
                        Distance Note to Campus (Optional)
                      </label>
                      <input
                        id="p-dist"
                        type="text"
                        value={distanceNote}
                        onChange={(e) => setDistanceNote(e.target.value)}
                        placeholder="e.g. 5 min walk from main gate"
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base sm:text-sm text-foreground min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Amenities Checkboxes */}
                  <div>
                    <span className="block text-xs font-bold text-foreground mb-1.5">Amenities Available</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                      {AMENITIES_VOCABULARY.map((amenity) => {
                        const checked = selectedAmenities.includes(amenity.value);
                        return (
                          <label
                            key={amenity.value}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                              checked
                                ? "bg-brand-50 border-brand-300 text-brand-900 dark:bg-brand-950 dark:text-brand-100 font-bold"
                                : "border-border text-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity.value));
                                } else {
                                  setSelectedAmenities([...selectedAmenities, amenity.value]);
                                }
                              }}
                              className="rounded-sm border-border text-brand-700 focus:ring-brand-700"
                            />
                            <span className="truncate">{amenity.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Utilities Checkboxes */}
                  <div>
                    <span className="block text-xs font-bold text-foreground mb-1.5">Utilities Included in Rent</span>
                    <div className="flex flex-wrap gap-2">
                      {UTILITIES_VOCABULARY.map((util) => {
                        const checked = selectedUtilities.includes(util.value);
                        return (
                          <label
                            key={util.value}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                              checked
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 font-bold"
                                : "border-border text-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedUtilities(selectedUtilities.filter((u) => u !== util.value));
                                } else {
                                  setSelectedUtilities([...selectedUtilities, util.value]);
                                }
                              }}
                              className="rounded-sm border-border text-emerald-600 focus:ring-emerald-600"
                            />
                            <span>{util.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={(e) => handleSubmitForm(e, "draft")}
                  disabled={formSubmitting}
                  className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-slate-100 min-h-[44px] disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmitForm(e, "pending")}
                  disabled={formSubmitting}
                  className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
                >
                  {formSubmitting ? "Submitting..." : "Publish for Moderator Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
