import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Store,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  History,
  Phone,
  BadgeCheck,
  X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface PendingItem {
  id: string;
  kind: "listing" | "business";
  title: string;
  owner_id: string;
  area: string;
  status: "pending" | "active" | "rejected" | "suspended" | "draft" | "archived";
  created_at: string;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  details: string;
  price?: number | null;
}

interface ModHistoryItem {
  id: string;
  actor_id: string;
  entity_kind: string;
  entity_id: string;
  action: string;
  reason: string | null;
  created_at: string;
}

interface VerificationRow {
  id: string;
  check_type: "moderator_reviewed" | "phone_checked" | "ownership_checked" | "identity_checked";
  checked_at: string;
  revoked_at: string | null;
}

export const AdminModeration: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation Action Modal state
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | "suspend" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Item History & Verifications Drawer
  const [historyItem, setHistoryItem] = useState<PendingItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ModHistoryItem[]>([]);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Verification Toggle & Note state
  const [verificationModal, setVerificationModal] = useState<{
    checkType: "phone_checked" | "ownership_checked";
    isRevoking: boolean;
  } | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [togglingCheck, setTogglingCheck] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const targetStatus = activeTab === "pending" ? "pending" : "active";

      // Query listings & businesses with target status, oldest first
      const [listingsRes, bizRes] = await Promise.all([
        supabase
          .from("accommodation_listings")
          .select("id, owner_id, title, area, listing_type, rent_zmw, status, created_at, rejection_reason, reviewed_at")
          .eq("status", targetStatus)
          .order("created_at", { ascending: true }),
        supabase
          .from("businesses")
          .select("id, owner_id, name, area, status, created_at, rejection_reason, reviewed_at, description")
          .eq("status", targetStatus)
          .order("created_at", { ascending: true })
      ]);

      if (listingsRes.error) throw listingsRes.error;
      if (bizRes.error) throw bizRes.error;

      const combined: PendingItem[] = [];

      (listingsRes.data || []).forEach((l) => {
        combined.push({
          id: l.id,
          kind: "listing",
          title: l.title,
          owner_id: l.owner_id,
          area: l.area,
          status: l.status,
          created_at: l.created_at,
          rejection_reason: l.rejection_reason,
          reviewed_at: l.reviewed_at,
          details: `${l.listing_type} • ZMW ${l.rent_zmw.toLocaleString()}/mo`,
          price: l.rent_zmw
        });
      });

      (bizRes.data || []).forEach((b) => {
        combined.push({
          id: b.id,
          kind: "business",
          title: b.name,
          owner_id: b.owner_id,
          area: b.area,
          status: b.status,
          created_at: b.created_at,
          rejection_reason: b.rejection_reason,
          reviewed_at: b.reviewed_at,
          details: b.description ? b.description.slice(0, 100) : "Campus Business"
        });
      });

      // Sort combined list oldest first
      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setItems(combined);
    } catch (err: unknown) {
      console.error("Failed to load moderation queue:", err);
      const message = err instanceof Error ? err.message : "Error loading queue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Execute Moderation Action strictly via RPC
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !modalAction) return;

    if ((modalAction === "reject" || modalAction === "suspend") && actionReason.trim().length < 5) {
      toast.error("A reason of at least 5 characters is required.");
      return;
    }

    // Client-side self-moderation check (also enforced by DB RPC)
    if (selectedItem.owner_id === user?.id) {
      toast.error("Safety policy violation: You cannot moderate your own content!");
      return;
    }

    setActionSubmitting(true);
    try {
      const { error: err } = await supabase.rpc("moderate_content", {
        p_kind: selectedItem.kind,
        p_id: selectedItem.id,
        p_action: modalAction,
        p_reason: actionReason.trim() || undefined
      });

      if (err) throw err;

      toast.success(
        modalAction === "approve"
          ? "Item approved and published publicly!"
          : modalAction === "reject"
          ? "Item rejected. Rejection reason recorded for owner."
          : "Item suspended and removed from public view."
      );

      setSelectedItem(null);
      setModalAction(null);
      setActionReason("");
      loadQueue();
    } catch (err: unknown) {
      console.error("Moderation action failed:", err);
      const message = err instanceof Error ? err.message : "Moderation action failed";
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Open Item History & Verifications
  const handleOpenHistory = async (item: PendingItem) => {
    setHistoryItem(item);
    setLoadingHistory(true);

    try {
      // 1. Fetch moderation action log
      const { data: logs, error: logErr } = await supabase
        .from("moderation_actions")
        .select("*")
        .eq("entity_id", item.id)
        .order("created_at", { ascending: false });

      if (logErr) throw logErr;
      setHistoryLogs((logs as unknown as ModHistoryItem[]) || []);

      // 2. Fetch verifications for this entity
      const idColumn = item.kind === "listing" ? "listing_id" : "business_id";
      const { data: verifs, error: verifErr } = await supabase
        .from("verifications")
        .select("id, check_type, checked_at, revoked_at")
        .eq(idColumn, item.id);

      if (verifErr) throw verifErr;
      setVerifications((verifs as unknown as VerificationRow[]) || []);
    } catch (err) {
      console.error("Failed to load history:", err);
      toast.error("Failed to load moderation history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add / Revoke Honest Verification Badges with Mandatory Staff Note
  const openVerificationModal = (checkType: "phone_checked" | "ownership_checked") => {
    const existing = verifications.find((v) => v.check_type === checkType && !v.revoked_at);
    setVerificationModal({
      checkType,
      isRevoking: !!existing
    });
    setVerificationNote("");
  };

  const confirmToggleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationModal || !historyItem || !user) return;
    const { checkType, isRevoking } = verificationModal;

    if (!verificationNote.trim() || verificationNote.trim().length < 5) {
      toast.error("Please enter a clear note on what check or document was verified (min 5 chars).");
      return;
    }

    setTogglingCheck(checkType);

    try {
      const existing = verifications.find((v) => v.check_type === checkType && !v.revoked_at);

      if (isRevoking && existing) {
        // Revoke badge
        const { error: err } = await supabase
          .from("verifications")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (err) throw err;
        toast.success(`Revoked ${checkType === "phone_checked" ? "Phone Checked" : "Ownership Checked"} badge`);
      } else {
        // Grant badge
        if (historyItem.kind === "listing") {
          const { error: err } = await supabase.from("verifications").insert({
            listing_id: historyItem.id,
            check_type: checkType,
            checked_by: user.id
          });
          if (err) throw err;
        } else {
          const { error: err } = await supabase.from("verifications").insert({
            business_id: historyItem.id,
            check_type: checkType,
            checked_by: user.id
          });
          if (err) throw err;
        }
        toast.success(`Granted ${checkType === "phone_checked" ? "Phone Checked" : "Ownership Checked"} badge`);
      }

      // Reload verifications
      const idColumn = historyItem.kind === "listing" ? "listing_id" : "business_id";
      const { data: verifs } = await supabase
        .from("verifications")
        .select("id, check_type, checked_at, revoked_at")
        .eq(idColumn, historyItem.id);

      setVerifications((verifs as unknown as VerificationRow[]) || []);
      setVerificationModal(null);
      setVerificationNote("");
    } catch (err: unknown) {
      console.error("Failed to toggle verification:", err);
      const message = err instanceof Error ? err.message : "Verification update failed";
      toast.error(message);
    } finally {
      setTogglingCheck(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-600" />
            Staff Moderation Dashboard
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Review submissions, inspect scam reports, and verify property ownership.
          </p>
        </div>

        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-slate-100 text-xs font-bold text-danger-600 transition-colors min-h-[44px] w-fit shadow-2xs"
        >
          <Flag className="w-4 h-4" />
          Review User Scam Reports
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
            activeTab === "pending"
              ? "border-orange-600 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/40"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Review Queue
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 min-h-[44px] ${
            activeTab === "active"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Active Published Directory
        </button>
      </div>

      {/* Queue Content */}
      {loading ? (
        <Loading fullScreen message="Loading moderation queue..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadQueue} />
      ) : items.length === 0 ? (
        <Empty
          icon={ShieldCheck}
          title={activeTab === "pending" ? "Queue is clean!" : "No active items"}
          description={
            activeTab === "pending"
              ? "There are currently no listings or campus businesses waiting for review."
              : "No active public listings or businesses found."
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isOwn = item.owner_id === user?.id;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {item.kind === "listing" ? (
                        <>
                          <Building2 className="w-3 h-3 text-brand-700" /> Accommodation
                        </>
                      ) : (
                        <>
                          <Store className="w-3 h-3 text-accent-700" /> Campus Shop
                        </>
                      )}
                    </span>

                    {item.status === "pending" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    )}

                    {isOwn && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 text-[10px] font-bold">
                        Your Submission (Self-Mod Blocked)
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-foreground truncate">{item.title}</h3>
                  <p className="text-xs text-muted">{item.area} • {item.details}</p>
                  <p className="text-[11px] text-muted">
                    Submitted: {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Moderation Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenHistory(item)}
                    className="p-2 border border-border rounded-lg text-xs font-semibold hover:bg-slate-100 min-h-[44px] flex items-center gap-1"
                    title="View Moderation & Verification Badges"
                  >
                    <History className="w-3.5 h-3.5 text-brand-700" />
                    <span className="hidden sm:inline">Verifications</span>
                  </button>

                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={isOwn}
                        onClick={() => {
                          setSelectedItem(item);
                          setModalAction("approve");
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-40"
                        title={isOwn ? "Cannot approve your own submission" : "Approve and publish publicly"}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>

                      <button
                        type="button"
                        disabled={isOwn}
                        onClick={() => {
                          setSelectedItem(item);
                          setModalAction("reject");
                          setActionReason("");
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-40"
                        title={isOwn ? "Cannot reject your own submission" : "Reject with reason"}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}

                  {item.status === "active" && (
                    <button
                      type="button"
                      disabled={isOwn}
                      onClick={() => {
                        setSelectedItem(item);
                        setModalAction("suspend");
                        setActionReason("");
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-40"
                      title={isOwn ? "Cannot suspend your own submission" : "Suspend and remove from public view"}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Modal (Approve / Reject / Suspend) */}
      {selectedItem && modalAction && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                Confirm {modalAction.toUpperCase()}: {selectedItem.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setModalAction(null);
                }}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-3">
              {modalAction === "approve" ? (
                <p className="text-xs text-muted leading-relaxed">
                  Approving this submission will make it visible to all students on the public directory and will record an honest <strong>"Reviewed by a moderator"</strong> badge in the database.
                </p>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1" htmlFor="action-reason">
                    Reason for {modalAction} (Required, min 5 chars) *
                  </label>
                  <textarea
                    id="action-reason"
                    rows={3}
                    required
                    minLength={5}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      modalAction === "reject"
                        ? "e.g. Please upload clear daylight photos of the room and verify the rental amount."
                        : "e.g. Multiple scam reports received regarding advance payment demands."
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    This reason will be recorded in the moderation history and displayed transparently to the owner.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setModalAction(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg border border-border text-xs font-bold hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50 ${
                    modalAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : modalAction === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {actionSubmitting ? "Processing..." : `Confirm ${modalAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History & Verifications Drawer / Modal */}
      {historyItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-black text-foreground">{historyItem.title}</h2>
                <p className="text-xs text-muted">Audited Verifications & Action Log</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <Loading message="Loading audit history..." />
            ) : (
              <div className="space-y-5">
                {/* Honest Verification Badge Controls */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-brand-700" />
                    Verified Badges Management
                  </h3>
                  <p className="text-[11px] text-muted">
                    Badges must reflect genuine checks only. Never grant a badge unless the check genuinely occurred.
                  </p>

                  <div className="space-y-2">
                    {/* Phone Checked */}
                    <div className="p-3 rounded-xl border border-border flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          <strong className="text-xs font-bold text-foreground">Phone Number Checked</strong>
                        </div>
                        <p className="text-[11px] text-muted">
                          Staff called the contact number and verbally confirmed authority to rent/sell.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={togglingCheck === "phone_checked"}
                        onClick={() => openVerificationModal("phone_checked")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[44px] transition-colors ${
                          verifications.some((v) => v.check_type === "phone_checked" && !v.revoked_at)
                            ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {verifications.some((v) => v.check_type === "phone_checked" && !v.revoked_at)
                          ? "Revoke..."
                          : "Grant..."}
                      </button>
                    </div>

                    {/* Ownership Checked */}
                    <div className="p-3 rounded-xl border border-border flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <BadgeCheck className="w-4 h-4 text-brand-700" />
                          <strong className="text-xs font-bold text-foreground">Property Ownership Checked</strong>
                        </div>
                        <p className="text-[11px] text-muted">
                          Title deed, council tenancy permit, or utility bill under landlord name was verified.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={togglingCheck === "ownership_checked"}
                        onClick={() => openVerificationModal("ownership_checked")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[44px] transition-colors ${
                          verifications.some((v) => v.check_type === "ownership_checked" && !v.revoked_at)
                            ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                            : "bg-brand-700 text-white hover:bg-brand-800"
                        }`}
                      >
                        {verifications.some((v) => v.check_type === "ownership_checked" && !v.revoked_at)
                          ? "Revoke..."
                          : "Grant..."}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Modal: Verification Note Requirement */}
                {verificationModal && (
                  <div
                    className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-brand-700" />
                          <h3 className="text-sm font-black text-foreground">
                            {verificationModal.isRevoking ? "Revoke Verification" : "Grant Honest Verification"}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerificationModal(null)}
                          className="p-3.5 text-muted hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Explicit UI Wording Explaining What Each Badge Means */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs space-y-1">
                        <span className="font-bold text-foreground block">
                          {verificationModal.checkType === "phone_checked"
                            ? "📞 Phone Number Checked Badge"
                            : "🏛️ Property Ownership Checked Badge"}
                        </span>
                        <p className="text-muted text-[11px] leading-relaxed">
                          {verificationModal.checkType === "phone_checked"
                            ? "Means: a staff member phoned the owner on the number given and the owner confirmed they may advertise this property. Nothing more is claimed."
                            : "Means: a staff member inspected a document (e.g. tenancy permit, title deed or utility bill) in the owner's name. Record exactly which one in the note."}
                        </p>
                      </div>

                      <form onSubmit={confirmToggleVerification} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Audit Note on What Was Checked (Required)</span>
                            <span className="text-[10px] text-muted">Min 5 characters</span>
                          </label>
                          <textarea aria-label="Note describing exactly what was checked"
                            rows={3}
                            required
                            minLength={5}
                            value={verificationNote}
                            onChange={(e) => setVerificationNote(e.target.value)}
                            placeholder={
                              verificationModal.checkType === "phone_checked"
                                ? "e.g. Called landlord Bwalya on +260971... confirmed NRC 294812/61/1 and room availability."
                                : "e.g. Inspected local council rate demand notice matching landlord NRC."
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                          />
                          <p className="text-[10px] text-muted">
                            {verificationModal.isRevoking
                              ? "Specify why this verification badge is being revoked."
                              : "Strict audit requirement: Badges cannot be granted without documenting what was verified."}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <button
                            type="button"
                            onClick={() => setVerificationModal(null)}
                            className="flex-1 py-2 px-3 rounded-lg border border-border text-xs font-bold hover:bg-slate-100 min-h-[44px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!verificationNote.trim() || verificationNote.trim().length < 5 || !!togglingCheck}
                            className={`flex-1 py-2 px-3 rounded-lg text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50 ${
                              verificationModal.isRevoking
                                ? "bg-rose-600 hover:bg-rose-700"
                                : "bg-brand-700 hover:bg-brand-800"
                            }`}
                          >
                            {togglingCheck ? "Updating..." : verificationModal.isRevoking ? "Confirm Revoke" : "Confirm Grant"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Moderation Actions History Log */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-brand-700" />
                    Moderation Audit Log
                  </h3>

                  {historyLogs.length === 0 ? (
                    <p className="text-xs text-muted italic">No previous moderation actions recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground uppercase">{log.action}</span>
                            <span className="text-[10px] text-muted">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-muted italic">"{log.reason}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
