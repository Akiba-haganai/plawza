import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Upload,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useReferenceData } from "@/hooks/useReferenceData";
import { toZambianE164 } from "@/lib/phone";
import { compressImage } from "@/lib/imageCompression";
import { getPublicStorageUrl } from "@/lib/storage";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface CatalogueItem {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  item_category: string | null;
  price_zmw: number | null;
  image_path: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_updated_at: string;
  sort_order: number;
}

interface BusinessRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  town_id: string;
  area: string;
  opening_hours: unknown;
  phone: string | null;
  whatsapp_phone: string | null;
  logo_path: string | null;
  cover_path: string | null;
  status: "draft" | "pending" | "active" | "rejected" | "archived" | "suspended";
  rejection_reason: string | null;
  catalogue_items?: CatalogueItem[];
}

export const DashboardBusinesses: React.FC = () => {
  const { user } = useAuth();
  const { towns, categories } = useReferenceData();

  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Business Modal state
  const [showBizModal, setShowBizModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<BusinessRow | null>(null);
  const [bizSubmitting, setBizSubmitting] = useState(false);

  // Business Form fields
  const [bizName, setBizName] = useState("");
  const [bizSlug, setBizSlug] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizCategoryId, setBizCategoryId] = useState("");
  const [bizTownId, setBizTownId] = useState("");
  const [bizArea, setBizArea] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizWhatsApp, setBizWhatsApp] = useState("");
  const [bizLogoPath, setBizLogoPath] = useState<string | null>(null);
  const [bizCoverPath, setBizCoverPath] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Catalogue Item Modal state
  const [activeCatalogueBiz, setActiveCatalogueBiz] = useState<BusinessRow | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);

  // Catalogue Item Form fields
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStock, setItemStock] = useState<"in_stock" | "low_stock" | "out_of_stock">("in_stock");
  const [itemImagePath, setItemImagePath] = useState<string | null>(null);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);

  // Load Owner's Businesses & their catalogues
  const loadBusinesses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("businesses")
        .select(`
          *,
          catalogue_items(*)
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      const bList = (data as unknown as BusinessRow[]) || [];
      // Sort each shop's items by sort_order
      bList.forEach((b) => {
        b.catalogue_items?.sort((x, y) => x.sort_order - y.sort_order);
      });
      setBusinesses(bList);
    } catch (err) {
      console.error("Failed to load businesses:", err);
      setError("Unable to load your business listings.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  // Generate URL slug from business name
  const handleNameChange = (val: string) => {
    setBizName(val);
    if (!editingBiz) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 80);
      setBizSlug(generated);
    }
  };

  // Open Create Business
  const handleOpenCreateBiz = () => {
    setEditingBiz(null);
    setBizName("");
    setBizSlug("");
    setBizDescription("");
    setBizCategoryId(categories[0]?.id || "");
    setBizTownId(towns[0]?.id || "");
    setBizArea("");
    setBizPhone("");
    setBizWhatsApp("");
    setBizLogoPath(null);
    setBizCoverPath(null);
    setShowBizModal(true);
  };

  // Open Edit Business
  const handleOpenEditBiz = (biz: BusinessRow) => {
    setEditingBiz(biz);
    setBizName(biz.name);
    setBizSlug(biz.slug);
    setBizDescription(biz.description || "");
    setBizCategoryId(biz.category_id || "");
    setBizTownId(biz.town_id);
    setBizArea(biz.area);
    setBizPhone(biz.phone || "");
    setBizWhatsApp(biz.whatsapp_phone || "");
    setBizLogoPath(biz.logo_path);
    setBizCoverPath(biz.cover_path);
    setShowBizModal(true);
  };

  // Upload Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploadingLogo(true);
    try {
      const file = files[0];
      if (!file) return;

      toast.info("Compressing logo image...");
      const compressed = await compressImage(file, 400, 400, 0.85);
      const storagePath = `${user.id}/logo_${Date.now()}.webp`;

      const { error: uploadErr } = await supabase.storage
        .from("business-images")
        .upload(storagePath, compressed.blob, { contentType: "image/webp", upsert: true });

      if (uploadErr) throw uploadErr;
      setBizLogoPath(storagePath);
      toast.success("Logo uploaded!");
    } catch (err: unknown) {
      console.error("Logo upload error:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  // Upload Cover Photo
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploadingCover(true);
    try {
      const file = files[0];
      if (!file) return;

      toast.info("Compressing cover image...");
      const compressed = await compressImage(file, 1280, 600, 0.8);
      const storagePath = `${user.id}/cover_${Date.now()}.webp`;

      const { error: uploadErr } = await supabase.storage
        .from("business-images")
        .upload(storagePath, compressed.blob, { contentType: "image/webp", upsert: true });

      if (uploadErr) throw uploadErr;
      setBizCoverPath(storagePath);
      toast.success("Cover photo uploaded!");
    } catch (err: unknown) {
      console.error("Cover upload error:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  // Submit Business Profile (Draft or Pending)
  const handleSubmitBiz = async (e: React.FormEvent, targetStatus: "draft" | "pending") => {
    e.preventDefault();
    if (!user) return;

    if (bizName.trim().length < 2 || bizName.trim().length > 80) {
      toast.error("Business name must be between 2 and 80 characters.");
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(bizSlug) || bizSlug.length > 80) {
      toast.error("Slug must be lowercase alphanumeric with hyphens (e.g. campus-stationery-hub).");
      return;
    }
    if (!bizTownId) {
      toast.error("Please select a town.");
      return;
    }
    if (bizArea.trim().length < 2 || bizArea.trim().length > 80) {
      toast.error("Area must be between 2 and 80 characters.");
      return;
    }

    const normPhone = bizPhone.trim() ? toZambianE164(bizPhone) : null;
    const normWa = bizWhatsApp.trim() ? toZambianE164(bizWhatsApp) : null;

    if (bizPhone.trim() && !normPhone) {
      toast.error("Please enter a valid Zambian phone number (+260...).");
      return;
    }
    if (bizWhatsApp.trim() && !normWa) {
      toast.error("Please enter a valid Zambian WhatsApp number (+260...).");
      return;
    }

    setBizSubmitting(true);
    try {
      const payload = {
        owner_id: user.id,
        name: bizName.trim(),
        slug: bizSlug.trim(),
        description: bizDescription.trim() || null,
        category_id: bizCategoryId || null,
        town_id: bizTownId,
        area: bizArea.trim(),
        phone: normPhone,
        whatsapp_phone: normWa,
        logo_path: bizLogoPath,
        cover_path: bizCoverPath,
        status: targetStatus
      };

      if (editingBiz) {
        const { error: updateErr } = await supabase
          .from("businesses")
          .update(payload)
          .eq("id", editingBiz.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("businesses").insert(payload);
        if (insertErr) throw insertErr;
      }

      toast.success(
        targetStatus === "pending"
          ? "Shop submitted for moderator approval!"
          : "Shop saved as draft."
      );
      setShowBizModal(false);
      loadBusinesses();
    } catch (err: unknown) {
      console.error("Failed to save business:", err);
      const message = err instanceof Error ? err.message : "Error saving business";
      toast.error(message);
    } finally {
      setBizSubmitting(false);
    }
  };

  // Catalogue Management Handlers
  const handleOpenAddCatalogueItem = (biz: BusinessRow) => {
    setActiveCatalogueBiz(biz);
    setEditingItem(null);
    setItemName("");
    setItemDescription("");
    setItemCategory("");
    setItemPrice("");
    setItemStock("in_stock");
    setItemImagePath(null);
    setShowItemModal(true);
  };

  const handleOpenEditCatalogueItem = (biz: BusinessRow, item: CatalogueItem) => {
    setActiveCatalogueBiz(biz);
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemCategory(item.item_category || "");
    setItemPrice(item.price_zmw !== null ? String(item.price_zmw) : "");
    setItemStock(item.stock_status);
    setItemImagePath(item.image_path);
    setShowItemModal(true);
  };

  // Upload item photo
  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !activeCatalogueBiz) return;

    setUploadingItemImage(true);
    try {
      const file = files[0];
      if (!file) return;

      toast.info("Compressing product photo...");
      const compressed = await compressImage(file, 800, 800, 0.82);
      const storagePath = `${user.id}/${activeCatalogueBiz.id}/item_${Date.now()}.webp`;

      const { error: uploadErr } = await supabase.storage
        .from("business-images")
        .upload(storagePath, compressed.blob, { contentType: "image/webp", upsert: true });

      if (uploadErr) throw uploadErr;
      setItemImagePath(storagePath);
      toast.success("Product photo ready!");
    } catch (err: unknown) {
      console.error("Item photo upload failed:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploadingItemImage(false);
      e.target.value = "";
    }
  };

  // Submit Catalogue Item
  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCatalogueBiz) return;

    if (itemName.trim().length < 2 || itemName.trim().length > 100) {
      toast.error("Item name must be between 2 and 100 characters.");
      return;
    }
    const priceVal = itemPrice.trim() ? parseFloat(itemPrice) : null;
    if (priceVal !== null && (isNaN(priceVal) || priceVal < 0)) {
      toast.error("Price cannot be negative.");
      return;
    }

    setItemSubmitting(true);
    try {
      const payload = {
        business_id: activeCatalogueBiz.id,
        name: itemName.trim(),
        description: itemDescription.trim() || null,
        item_category: itemCategory.trim() || null,
        price_zmw: priceVal,
        stock_status: itemStock,
        image_path: itemImagePath
      };

      if (editingItem) {
        const { error: updateErr } = await supabase
          .from("catalogue_items")
          .update(payload)
          .eq("id", editingItem.id);

        if (updateErr) throw updateErr;
        toast.success("Item updated!");
      } else {
        const { error: insertErr } = await supabase.from("catalogue_items").insert({
          ...payload,
          sort_order: activeCatalogueBiz.catalogue_items?.length || 0
        });

        if (insertErr) throw insertErr;
        toast.success("Item added to catalogue!");
      }

      setShowItemModal(false);
      loadBusinesses();
    } catch (err: unknown) {
      console.error("Error saving catalogue item:", err);
      const message = err instanceof Error ? err.message : "Error saving item";
      toast.error(message);
    } finally {
      setItemSubmitting(false);
    }
  };

  // Quick Stock Status Switcher
  const handleQuickStockToggle = async (itemId: string, newStock: "in_stock" | "low_stock" | "out_of_stock") => {
    try {
      const { error: err } = await supabase
        .from("catalogue_items")
        .update({ stock_status: newStock })
        .eq("id", itemId);

      if (err) throw err;
      toast.success(`Stock updated to ${newStock.replace("_", " ")}`);
      loadBusinesses();
    } catch (err) {
      console.error("Failed to update stock:", err);
      toast.error("Failed to update stock");
    }
  };

  // Delete Catalogue Item
  const handleDeleteItem = async (itemId: string, imagePath: string | null) => {
    if (!confirm("Are you sure you want to delete this catalogue item?")) return;

    try {
      await supabase.from("catalogue_items").delete().eq("id", itemId);
      if (imagePath) {
        await supabase.storage.from("business-images").remove([imagePath]);
      }
      toast.success("Item removed");
      loadBusinesses();
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Failed to delete item");
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
            <Store className="w-6 h-6 text-brand-700" /> My Campus Businesses
          </h1>
          <p className="text-xs text-muted">
            Manage your campus shop pages, opening hours, catalogues, and WhatsApp contact.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateBiz}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors min-h-[44px] w-fit"
        >
          <Plus className="w-4 h-4" />
          Register New Business
        </button>
      </div>

      {loading ? (
        <Loading fullScreen message="Loading your businesses..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadBusinesses} />
      ) : businesses.length === 0 ? (
        <Empty
          icon={Store}
          title="No campus businesses listed yet"
          description="Register your print shop, electronics kiosk, food service, or salon to publish your catalogue and receive orders on WhatsApp."
          actionLabel="Register My Business"
          onAction={handleOpenCreateBiz}
        />
      ) : (
        <div className="space-y-6">
          {businesses.map((biz) => {
            const logoUrl = biz.logo_path ? getPublicStorageUrl("business-images", biz.logo_path) : "";
            const items = biz.catalogue_items || [];

            return (
              <div
                key={biz.id}
                className="p-6 rounded-2xl bg-surface border border-border shadow-2xs space-y-5"
              >
                {/* Shop Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-brand-700 shrink-0 flex items-center justify-center">
                      {logoUrl ? (
                        <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-brand-700" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-foreground">{biz.name}</h2>
                        {biz.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active (Public)
                          </span>
                        ) : biz.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 text-[10px] font-bold">
                            {biz.status}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <span>slug: /shops/{biz.slug}</span>
                        <span>• {biz.area}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddCatalogueItem(biz)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-700 hover:bg-accent-500 text-white rounded-lg text-xs font-bold shadow-xs min-h-[44px]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditBiz(biz)}
                      className="p-2 border border-border rounded-lg text-xs font-semibold hover:bg-slate-100 min-h-[44px] flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Shop</span>
                    </button>

                    {biz.status === "active" && (
                      <Link
                        to={`/shops/${biz.slug}`}
                        className="p-2 border border-border rounded-lg text-xs font-semibold hover:bg-slate-100 text-brand-700 min-h-[44px]"
                        title="View Public Catalogue"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Catalogue Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-brand-700" />
                      Catalogue Products ({items.length})
                    </h3>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted">
                      No products added yet. Click <strong>Add Product</strong> to publish items and prices to your WhatsApp catalogue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item) => {
                        const itemImg = item.image_path ? getPublicStorageUrl("business-images", item.image_path) : "";

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-border bg-background space-y-2.5 flex flex-col justify-between"
                          >
                            <div className="flex gap-3">
                              {itemImg ? (
                                <img
                                  src={itemImg}
                                  alt=""
                                  className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border shrink-0 flex items-center justify-center text-muted text-[10px]">
                                  No photo
                                </div>
                              )}

                              <div className="space-y-0.5 flex-1 min-w-0">
                                <h4 className="text-xs font-black text-foreground truncate">{item.name}</h4>
                                <p className="text-xs font-bold text-brand-700 dark:text-brand-300">
                                  {item.price_zmw !== null ? `ZMW ${item.price_zmw.toLocaleString()}` : "Price on req"}
                                </p>
                                {item.item_category && (
                                  <span className="text-[10px] text-muted block truncate">
                                    {item.item_category}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stock Quick Toggle & Edit/Delete Buttons */}
                            <div className="pt-2 border-t border-border flex items-center justify-between gap-1 text-[11px]">
                              {/* Stock Switcher */}
                              <select aria-label="Stock status"
                                value={item.stock_status}
                                onChange={(e) =>
                                  handleQuickStockToggle(item.id, e.target.value as "in_stock" | "low_stock" | "out_of_stock")
                                }
                                className="px-2 py-1 rounded-md border border-border bg-surface text-[11px] font-bold"
                              >
                                <option value="in_stock">In Stock</option>
                                <option value="low_stock">Low Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                              </select>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCatalogueItem(biz, item)}
                                  className="p-3.5 text-muted hover:text-foreground"
                                  title="Edit Item"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id, item.image_path)}
                                  className="p-3.5 text-muted hover:text-danger-600"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Business Modal (Create / Edit) */}
      {showBizModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <Store className="w-5 h-5 text-brand-700" />
                {editingBiz ? "Edit Campus Business" : "Register Campus Business"}
              </h2>
              <button
                type="button"
                onClick={() => setShowBizModal(false)}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crucial Public Phone Disclosure */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200">
              <strong>Public Phone Number Notice:</strong> Business phone numbers and WhatsApp links provided here are <strong>published openly</strong> on your public shop catalogue so customers can contact you immediately to place orders.
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-name">
                  Business Name (2 to 80 chars) *
                </label>
                <input
                  id="b-name"
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Campus Tech & Printing Hub"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-slug">
                  URL Slug (/shops/...) *
                </label>
                <input
                  id="b-slug"
                  type="text"
                  required
                  value={bizSlug}
                  onChange={(e) => setBizSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="e.g. campus-tech-hub"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-cat">
                    Category *
                  </label>
                  <select
                    id="b-cat"
                    value={bizCategoryId}
                    onChange={(e) => setBizCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-town">
                    City / Town *
                  </label>
                  <select
                    id="b-town"
                    value={bizTownId}
                    onChange={(e) => setBizTownId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
                  >
                    <option value="">Select Town</option>
                    {towns.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-area">
                  Area / Campus Location *
                </label>
                <input
                  id="b-area"
                  type="text"
                  required
                  value={bizArea}
                  onChange={(e) => setBizArea(e.target.value)}
                  placeholder="e.g. Campus commercial centre, East Gate"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-phone">
                    Calling Phone Number (+260...)
                  </label>
                  <input
                    id="b-phone"
                    type="tel"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    placeholder="e.g. 0971234567"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-wa">
                    WhatsApp Phone Number (+260...)
                  </label>
                  <input
                    id="b-wa"
                    type="tel"
                    value={bizWhatsApp}
                    onChange={(e) => setBizWhatsApp(e.target.value)}
                    placeholder="e.g. 0971234567"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="b-desc">
                  Shop Description
                </label>
                <textarea
                  id="b-desc"
                  rows={3}
                  value={bizDescription}
                  onChange={(e) => setBizDescription(e.target.value)}
                  placeholder="Describe your services, products, turnaround times..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                />
              </div>

              {/* Logo & Cover Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Business Logo</label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:border-brand-700 cursor-pointer text-xs">
                    <Upload className="w-4 h-4 text-brand-700" />
                    <span>{uploadingLogo ? "Uploading..." : bizLogoPath ? "Change Logo" : "Upload Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={handleLogoUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Cover Photo</label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border hover:border-brand-700 cursor-pointer text-xs">
                    <Upload className="w-4 h-4 text-brand-700" />
                    <span>{uploadingCover ? "Uploading..." : bizCoverPath ? "Change Cover" : "Upload Cover"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCover}
                      onChange={handleCoverUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={(e) => handleSubmitBiz(e, "draft")}
                  disabled={bizSubmitting}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-border text-xs font-bold hover:bg-slate-100 min-h-[44px] disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmitBiz(e, "pending")}
                  disabled={bizSubmitting}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
                >
                  {bizSubmitting ? "Submitting..." : "Submit for Moderator Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catalogue Item Modal (Add / Edit) */}
      {showItemModal && activeCatalogueBiz && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-700" />
                {editingItem ? "Edit Catalogue Item" : "Add Product to Catalogue"}
              </h2>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="it-name">
                  Product / Service Name *
                </label>
                <input
                  id="it-name"
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Scientific Calculator FX-991"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="it-cat">
                  Category Tag (e.g. Electronics, Snacks, Printing)
                </label>
                <input
                  id="it-cat"
                  type="text"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  placeholder="e.g. Electronics"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="it-price">
                    Price in ZMW (Optional)
                  </label>
                  <input
                    id="it-price"
                    type="number"
                    min="0"
                    step="5"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="it-stock">
                    Live Stock Status *
                  </label>
                  <select
                    id="it-stock"
                    value={itemStock}
                    onChange={(e) =>
                      setItemStock(e.target.value as "in_stock" | "low_stock" | "out_of_stock")
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-bold text-foreground min-h-[44px]"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1" htmlFor="it-desc">
                  Description
                </label>
                <textarea
                  id="it-desc"
                  rows={2}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Condition, brand, warranty or details..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Product Photo</label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border hover:border-brand-700 cursor-pointer text-xs">
                  <Upload className="w-4 h-4 text-brand-700" />
                  <span>{uploadingItemImage ? "Uploading..." : itemImagePath ? "Change Photo" : "Upload Product Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingItemImage}
                    onChange={handleItemImageUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-border text-xs font-bold hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={itemSubmitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
                >
                  {itemSubmitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
