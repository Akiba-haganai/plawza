import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Archive,
  Phone,
  MessageCircle,
  Calendar,
  Building2,
  Save,
  Send,
  Inbox,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { whatsAppUrl } from "@/lib/phone";
import { calculateMedianResponseHours, formatResponseTime } from "@/lib/differentiators";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface EnquiryItem {
  id: string;
  listing_id: string;
  requester_id: string;
  owner_id?: string;
  requester_name: string;
  requester_phone: string | null;
  message: string | null;
  preferred_viewing_at: string | null;
  status: "new" | "contacted" | "closed";
  owner_note?: string | null;
  created_at: string;
  updated_at: string;
  accommodation_listings?: {
    id: string;
    title: string;
    area: string;
    rent_zmw?: number;
  };
}

export const DashboardEnquiries: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDirection = searchParams.get("tab") === "sent" ? "sent" : "received";

  const [direction, setDirection] = useState<"received" | "sent">(initialDirection);
  const [receivedEnquiries, setReceivedEnquiries] = useState<EnquiryItem[]>([]);
  const [sentEnquiries, setSentEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Track active owner notes being edited
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const switchDirection = (nextDir: "received" | "sent") => {
    setDirection(nextDir);
    const next = new URLSearchParams(searchParams);
    if (nextDir === "sent") next.set("tab", "sent");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const loadEnquiries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [receivedRes, sentRes] = await Promise.all([
        supabase
          .from("accommodation_enquiries")
          .select(`
            *,
            accommodation_listings(id, title, area, rent_zmw)
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("accommodation_enquiries")
          .select(`
            id, listing_id, requester_id, requester_name, requester_phone,
            message, preferred_viewing_at, status, created_at, updated_at,
            accommodation_listings(id, title, area, rent_zmw)
          `)
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false })
      ]);

      if (receivedRes.error) throw receivedRes.error;
      if (sentRes.error) throw sentRes.error;

      const typedReceived = (receivedRes.data as unknown as EnquiryItem[]) || [];
      const typedSent = (sentRes.data as unknown as EnquiryItem[]) || [];

      setReceivedEnquiries(typedReceived);
      setSentEnquiries(typedSent);

      // Auto-select "sent" tab if student has sent enquiries and 0 received enquiries
      if (!searchParams.get("tab") && typedReceived.length === 0 && typedSent.length > 0) {
        setDirection("sent");
      }

      // Pre-populate editing notes for received enquiries
      const notesMap: Record<string, string> = {};
      typedReceived.forEach((enq) => {
        notesMap[enq.id] = enq.owner_note || "";
      });
      setEditingNotes(notesMap);
    } catch (err) {
      console.error("Error loading viewing enquiries:", err);
      setError("Unable to load viewing enquiries.");
    } finally {
      setLoading(false);
    }
  }, [user, searchParams]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  // Update status (new / contacted / closed)
  const handleUpdateStatus = async (enquiryId: string, newStatus: "new" | "contacted" | "closed") => {
    try {
      const { error: err } = await supabase
        .from("accommodation_enquiries")
        .update({ status: newStatus })
        .eq("id", enquiryId);

      if (err) throw err;

      toast.success(`Enquiry marked as ${newStatus}`);
      setReceivedEnquiries((prev) =>
        prev.map((e) => (e.id === enquiryId ? { ...e, status: newStatus } : e))
      );
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  // Save private owner note
  const handleSaveNote = async (enquiryId: string) => {
    const noteText = editingNotes[enquiryId] ?? "";
    setSavingNoteId(enquiryId);

    try {
      const { error: err } = await supabase
        .from("accommodation_enquiries")
        .update({ owner_note: noteText.trim() || null })
        .eq("id", enquiryId);

      if (err) throw err;

      toast.success("Note saved");
      setReceivedEnquiries((prev) =>
        prev.map((e) => (e.id === enquiryId ? { ...e, owner_note: noteText.trim() || null } : e))
      );
    } catch (err) {
      console.error("Error saving note:", err);
      toast.error("Failed to save note");
    } finally {
      setSavingNoteId(null);
    }
  };

  const activeList = direction === "received" ? receivedEnquiries : sentEnquiries;
  const filteredEnquiries = activeList.filter((e) => {
    if (statusFilter === "all") return true;
    return e.status === statusFilter;
  });

  const medianResponseHours = calculateMedianResponseHours(receivedEnquiries);
  const actedEnquiriesCount = receivedEnquiries.filter((e) => e.status !== "new" && e.updated_at).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
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
            <MessageSquare className="w-6 h-6 text-brand-700" /> Viewing Enquiries
          </h1>
          <p className="text-xs text-muted">
            Track viewing requests you've received on your properties or sent to landlords.
          </p>
        </div>

        {/* Direction Switcher: Received vs Sent */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => switchDirection("received")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px] ${
              direction === "received"
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Received ({receivedEnquiries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => switchDirection("sent")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px] ${
              direction === "sent"
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent by Me ({sentEnquiries.length})</span>
          </button>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border text-xs font-bold w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "all" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            All ({activeList.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("new")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "new" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            New ({activeList.filter((e) => e.status === "new").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("contacted")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "contacted" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Contacted ({activeList.filter((e) => e.status === "contacted").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("closed")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "closed" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Closed ({activeList.filter((e) => e.status === "closed").length})
          </button>
        </div>
      </div>

      {/* Landlord Reliability Metric (Only on Received tab) */}
      {direction === "received" && (
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Your Response Speed
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-muted">
                  Private to you • No public score
                </span>
              </div>
              <div className="text-base font-black text-foreground mt-0.5">
                Median Response Time: {formatResponseTime(medianResponseHours)}
              </div>
              <p className="text-[11px] text-muted">
                Computed from time between receiving an enquiry and updating status to contacted or closed ({actedEnquiriesCount} responded {actedEnquiriesCount === 1 ? "enquiry" : "enquiries"}).
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="p-5 rounded-2xl bg-surface border border-border space-y-3 animate-pulse">
              <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadEnquiries} />
      ) : filteredEnquiries.length === 0 ? (
        <Empty
          icon={direction === "received" ? Inbox : Send}
          title={
            statusFilter === "all"
              ? direction === "received"
                ? "No viewing enquiries received yet"
                : "You haven't sent any viewing requests yet"
              : `No ${statusFilter} enquiries`
          }
          description={
            direction === "received"
              ? "When prospective tenants submit viewing requests for your active listings, they will appear here."
              : "Browse verified student stays and tap 'Send Viewing Request' on any property to arrange an inspection."
          }
          actionLabel={direction === "sent" ? "Browse Stays" : undefined}
          onAction={direction === "sent" ? () => window.location.assign("/accommodation") : undefined}
        />
      ) : direction === "sent" ? (
        /* SENT ENQUIRIES LIST (Student View) */
        <div className="space-y-4">
          {filteredEnquiries.map((enq) => (
            <div
              key={enq.id}
              className="p-5 rounded-2xl bg-surface border border-border shadow-2xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  {enq.status === "new" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-brand-700" /> Awaiting Landlord Response
                    </span>
                  ) : enq.status === "contacted" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" /> Landlord Responded / Contacted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold">
                      <Archive className="w-3.5 h-3.5" /> Closed
                    </span>
                  )}

                  <span className="text-xs text-muted">
                    Sent {new Date(enq.created_at).toLocaleDateString()} at{" "}
                    {new Date(enq.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <Link
                  to={`/accommodation/${enq.listing_id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline"
                >
                  <span>View Property</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                    Property
                  </span>
                  <Link
                    to={`/accommodation/${enq.listing_id}`}
                    className="text-sm font-black text-foreground hover:text-brand-700 flex items-center gap-1.5"
                  >
                    <Building2 className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>{enq.accommodation_listings?.title || "Accommodation Listing"}</span>
                  </Link>
                  {enq.accommodation_listings?.area && (
                    <p className="text-xs text-muted">
                      {enq.accommodation_listings.area}
                      {enq.accommodation_listings.rent_zmw
                        ? ` • ZMW ${Number(enq.accommodation_listings.rent_zmw).toLocaleString()}/mo`
                        : ""}
                    </p>
                  )}
                  {enq.preferred_viewing_at && (
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 pt-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Requested date: {new Date(enq.preferred_viewing_at).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                    Your Message
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-border italic">
                    "{enq.message || "No additional note included."}"
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* RECEIVED ENQUIRIES LIST (Landlord View) */
        <div className="space-y-4">
          {filteredEnquiries.map((enq) => {
            const waUrl = enq.requester_phone
              ? whatsAppUrl(enq.requester_phone, `Hi ${enq.requester_name}, I received your viewing request on Plawza for ${enq.accommodation_listings?.title || "my property"}.`)
              : null;

            return (
              <div
                key={enq.id}
                className="p-5 rounded-2xl bg-surface border border-border shadow-2xs space-y-4"
              >
                {/* Header row: Status & Property */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    {enq.status === "new" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-brand-700" /> New Request
                      </span>
                    ) : enq.status === "contacted" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Contacted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold">
                        <Archive className="w-3.5 h-3.5" /> Closed
                      </span>
                    )}

                    <span className="text-xs text-muted">
                      Received {new Date(enq.created_at).toLocaleDateString()} at{" "}
                      {new Date(enq.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Status Switcher Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted">Status:</span>
                    <select
                      aria-label="Enquiry status"
                      value={enq.status}
                      onChange={(e) =>
                        handleUpdateStatus(enq.id, e.target.value as "new" | "contacted" | "closed")
                      }
                      className="text-base sm:text-xs font-bold px-2.5 py-1.5 rounded-lg border border-border bg-background min-h-[44px]"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Main Enquiry Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Requester Info */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                      Prospective Tenant
                    </span>
                    <h3 className="text-sm font-black text-foreground">{enq.requester_name}</h3>
                    {enq.requester_phone && (
                      <p className="text-xs font-mono text-muted">{enq.requester_phone}</p>
                    )}

                    {/* Direct Contact Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold shadow-xs min-h-[44px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                      {enq.requester_phone && (
                        <a
                          href={`tel:${enq.requester_phone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border hover:bg-slate-100 text-foreground rounded-md text-xs font-bold min-h-[44px]"
                        >
                          <Phone className="w-3.5 h-3.5 text-brand-700" /> Call
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Property & Preferred Viewing Date */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                      Property Requested
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Building2 className="w-4 h-4 text-brand-700 shrink-0" />
                      <span>{enq.accommodation_listings?.title || "Property"}</span>
                    </div>
                    {enq.accommodation_listings?.area && (
                      <p className="text-xs text-muted">{enq.accommodation_listings.area}</p>
                    )}

                    {enq.preferred_viewing_at && (
                      <div className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 font-semibold pt-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Requested Viewing: {new Date(enq.preferred_viewing_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Student Message */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                      Message from Student
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-border italic">
                      "{enq.message || "No additional message provided."}"
                    </p>
                  </div>
                </div>

                {/* Owner Private Note Section */}
                <div className="pt-2 border-t border-border flex items-center gap-2">
                  <input
                    aria-label="Private note about this enquiry"
                    type="text"
                    value={editingNotes[enq.id] ?? ""}
                    onChange={(e) =>
                      setEditingNotes({ ...editingNotes, [enq.id]: e.target.value })
                    }
                    placeholder="Add private note (e.g. Viewed on Tuesday, wants to move in Sept 1st)..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-base sm:text-xs text-foreground min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveNote(enq.id)}
                    disabled={savingNoteId === enq.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingNoteId === enq.id ? "Saving..." : "Save Note"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default DashboardEnquiries;
