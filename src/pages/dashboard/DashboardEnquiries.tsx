import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
  Save
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { whatsAppUrl } from "@/lib/phone";
import { calculateMedianResponseHours, formatResponseTime } from "@/lib/differentiators";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface EnquiryItem {
  id: string;
  listing_id: string;
  requester_id: string;
  owner_id: string;
  requester_name: string;
  requester_phone: string | null;
  message: string | null;
  preferred_viewing_at: string | null;
  status: "new" | "contacted" | "closed";
  owner_note: string | null;
  created_at: string;
  updated_at: string;
  accommodation_listings?: {
    id: string;
    title: string;
    area: string;
  };
}

export const DashboardEnquiries: React.FC = () => {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Track active owner notes being edited
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const loadEnquiries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("accommodation_enquiries")
        .select(`
          *,
          accommodation_listings(id, title, area)
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (err) throw err;

      const typedData = (data as unknown as EnquiryItem[]) || [];
      setEnquiries(typedData);

      // Pre-populate editing notes
      const notesMap: Record<string, string> = {};
      typedData.forEach((enq) => {
        notesMap[enq.id] = enq.owner_note || "";
      });
      setEditingNotes(notesMap);
    } catch (err) {
      console.error("Error loading viewing enquiries:", err);
      setError("Unable to load tenant viewing requests.");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      setEnquiries((prev) =>
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
      setEnquiries((prev) =>
        prev.map((e) => (e.id === enquiryId ? { ...e, owner_note: noteText.trim() || null } : e))
      );
    } catch (err) {
      console.error("Error saving note:", err);
      toast.error("Failed to save note");
    } finally {
      setSavingNoteId(null);
    }
  };

  const filteredEnquiries = enquiries.filter((e) => {
    if (statusFilter === "all") return true;
    return e.status === statusFilter;
  });

  // Phase 7 Differentiator: Landlord reliability (private to owner, median response time)
  const medianResponseHours = calculateMedianResponseHours(enquiries);
  const actedEnquiriesCount = enquiries.filter((e) => e.status !== "new" && e.updated_at).length;

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
            <MessageSquare className="w-6 h-6 text-brand-700" /> Viewing Requests
          </h1>
          <p className="text-xs text-muted">
            Manage viewing appointments and enquiries from students interested in your boarding houses.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border text-xs font-bold w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === "all" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            All ({enquiries.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("new")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === "new" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            New ({enquiries.filter((e) => e.status === "new").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("contacted")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === "contacted" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Contacted ({enquiries.filter((e) => e.status === "contacted").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("closed")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === "closed" ? "bg-brand-700 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Closed ({enquiries.filter((e) => e.status === "closed").length})
          </button>
        </div>
      </div>

      {/* Landlord Reliability Metric (Private to Owner - Phase 7 Differentiator) */}
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

      {loading ? (
        <Loading fullScreen message="Loading viewing enquiries..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadEnquiries} />
      ) : filteredEnquiries.length === 0 ? (
        <Empty
          icon={MessageSquare}
          title={statusFilter === "all" ? "No viewing enquiries yet" : `No ${statusFilter} enquiries`}
          description={
            statusFilter === "all"
              ? "When prospective tenants submit viewing requests for your active listings, they will appear here."
              : `There are currently no enquiries marked as ${statusFilter}.`
          }
        />
      ) : (
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Contacted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 text-xs font-bold">
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
                    <select aria-label="Enquiry status"
                      value={enq.status}
                      onChange={(e) =>
                        handleUpdateStatus(enq.id, e.target.value as "new" | "contacted" | "closed")
                      }
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-border bg-background min-h-[44px]"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs min-h-[44px]"
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
                  <input aria-label="Private note about this enquiry"
                    type="text"
                    value={editingNotes[enq.id] ?? ""}
                    onChange={(e) =>
                      setEditingNotes({ ...editingNotes, [enq.id]: e.target.value })
                    }
                    placeholder="Add private note (e.g. Viewed on Tuesday, wants to move in Sept 1st)..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveNote(enq.id)}
                    disabled={savingNoteId === enq.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-xs min-h-[44px] disabled:opacity-50"
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
