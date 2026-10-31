import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Flag,
  ArrowLeft,
  Building2,
  Store,
  Users,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  X,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/common/Loading";
import { Empty } from "@/components/common/Empty";
import { ErrorState } from "@/components/common/ErrorState";

interface ReportItem {
  id: string;
  reporter_id: string;
  listing_id: string | null;
  business_id: string | null;
  roommate_id: string | null;
  reason: "scam" | "misleading" | "unavailable" | "inappropriate" | "wrong_info" | "other";
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  handled_by: string | null;
  handled_at: string | null;
  resolution_note: string | null;
  created_at: string;
  reporter?: {
    id: string;
    full_name: string | null;
  } | null;
  listing?: {
    id: string;
    title: string;
    area: string;
    rent_zmw: number;
    status: string;
  } | null;
  business?: {
    id: string;
    name: string;
    slug: string;
    area: string;
    status: string;
  } | null;
  roommate?: {
    id: string;
    display_name: string;
    status: string;
  } | null;
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

export const AdminReports: React.FC = () => {
  const { user } = useAuth();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "reviewing" | "resolved" | "dismissed">("open");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Resolve / Dismiss Action Modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [modalAction, setModalAction] = useState<"reviewing" | "resolved" | "dismissed" | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Moderation History Drawer
  const [historyTarget, setHistoryTarget] = useState<{
    title: string;
    entityKind: string;
    entityId: string;
  } | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ModHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Query listing reports oldest first
      const { data: rawReports, error: reportsErr } = await supabase
        .from("listing_reports")
        .select(`
          id,
          reporter_id,
          listing_id,
          business_id,
          roommate_id,
          reason,
          details,
          status,
          handled_by,
          handled_at,
          resolution_note,
          created_at
        `)
        .order("created_at", { ascending: true });

      if (reportsErr) throw reportsErr;

      if (!rawReports || rawReports.length === 0) {
        setReports([]);
        return;
      }

      // Collect IDs for related lookups
      const reporterIds = Array.from(new Set(rawReports.map((r) => r.reporter_id).filter(Boolean)));
      const listingIds = Array.from(new Set(rawReports.map((r) => r.listing_id).filter(Boolean) as string[]));
      const businessIds = Array.from(new Set(rawReports.map((r) => r.business_id).filter(Boolean) as string[]));
      const roommateIds = Array.from(new Set(rawReports.map((r) => r.roommate_id).filter(Boolean) as string[]));

      // Fetch related items concurrently
      const [profilesRes, listingsRes, businessesRes, roommatesRes] = await Promise.all([
        reporterIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", reporterIds)
          : Promise.resolve({ data: [] }),
        listingIds.length > 0
          ? supabase.from("accommodation_listings").select("id, title, area, rent_zmw, status").in("id", listingIds)
          : Promise.resolve({ data: [] }),
        businessIds.length > 0
          ? supabase.from("businesses").select("id, name, slug, area, status").in("id", businessIds)
          : Promise.resolve({ data: [] }),
        roommateIds.length > 0
          ? supabase.from("roommate_profiles").select("id, display_name, status").in("id", roommateIds)
          : Promise.resolve({ data: [] })
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      const listingMap = new Map((listingsRes.data || []).map((l) => [l.id, l]));
      const businessMap = new Map((businessesRes.data || []).map((b) => [b.id, b]));
      const roommateMap = new Map((roommatesRes.data || []).map((r) => [r.id, r]));

      const enriched: ReportItem[] = rawReports.map((r) => ({
        ...r,
        reason: r.reason as ReportItem["reason"],
        reporter: r.reporter_id ? profileMap.get(r.reporter_id) || null : null,
        listing: r.listing_id ? listingMap.get(r.listing_id) || null : null,
        business: r.business_id ? businessMap.get(r.business_id) || null : null,
        roommate: r.roommate_id ? roommateMap.get(r.roommate_id) || null : null
      }));

      setReports(enriched);
    } catch (err: unknown) {
      console.error("Failed to load reports:", err);
      const message = err instanceof Error ? err.message : "Failed to load reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Open History Drawer
  const handleViewHistory = async (report: ReportItem) => {
    const entityId = report.listing_id || report.business_id || report.roommate_id || report.id;
    const entityKind = report.listing_id
      ? "listing"
      : report.business_id
      ? "business"
      : report.roommate_id
      ? "roommate"
      : "report";
    const title =
      report.listing?.title ||
      report.business?.name ||
      report.roommate?.display_name ||
      `Report #${report.id.slice(0, 8)}`;

    setHistoryTarget({ title, entityKind, entityId });
    setLoadingHistory(true);

    try {
      const { data, error: histErr } = await supabase
        .from("moderation_actions")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (histErr) throw histErr;
      setHistoryLogs((data as unknown as ModHistoryItem[]) || []);
    } catch (err: unknown) {
      console.error("Failed to load history:", err);
      toast.error("Failed to load moderation history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Submit resolve/dismiss via resolve_report RPC
  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !modalAction || !user) return;

    setActionSubmitting(true);

    try {
      const { error: rpcErr } = await supabase.rpc("resolve_report", {
        p_report_id: selectedReport.id,
        p_status: modalAction,
        p_note: resolutionNote.trim() || undefined
      });

      if (rpcErr) {
        let friendly = rpcErr.message;
        if (rpcErr.message.includes("Moderator access required")) {
          friendly = "Permission denied: Staff moderator privileges required.";
        } else if (rpcErr.message.includes("Invalid report status")) {
          friendly = "Invalid report status selected.";
        } else if (rpcErr.message.includes("Report not found")) {
          friendly = "Report not found or already deleted.";
        }
        toast.error(friendly);
        return;
      }

      toast.success(
        modalAction === "resolved"
          ? "Report resolved successfully"
          : modalAction === "dismissed"
          ? "Report dismissed"
          : "Report marked as in-review"
      );

      // Close modal and refresh reports list
      setSelectedReport(null);
      setModalAction(null);
      setResolutionNote("");
      await loadReports();
    } catch (err: unknown) {
      console.error("Failed to resolve report:", err);
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (reasonFilter !== "all" && r.reason !== reasonFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const listingTitle = r.listing?.title?.toLowerCase() || "";
      const bizName = r.business?.name?.toLowerCase() || "";
      const roommateName = r.roommate?.display_name?.toLowerCase() || "";
      const details = r.details?.toLowerCase() || "";
      const note = r.resolution_note?.toLowerCase() || "";
      if (
        !listingTitle.includes(q) &&
        !bizName.includes(q) &&
        !roommateName.includes(q) &&
        !details.includes(q) &&
        !note.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const countByStatus = {
    all: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    reviewing: reports.filter((r) => r.status === "reviewing").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length
  };

  const getReasonBadge = (reason: ReportItem["reason"]) => {
    switch (reason) {
      case "scam":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/70 text-danger-700 dark:text-danger-300 border border-red-200 dark:border-red-900">
            <ShieldAlert className="w-3.5 h-3.5" /> Scam / Fraud
          </span>
        );
      case "misleading":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Misleading Info
          </span>
        );
      case "unavailable":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800">
            <Clock className="w-3.5 h-3.5" /> Already Taken / Unavailable
          </span>
        );
      case "inappropriate":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
            <Flag className="w-3.5 h-3.5" /> Inappropriate
          </span>
        );
      case "wrong_info":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Incorrect Details / Rent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <Flag className="w-3.5 h-3.5" /> Other
          </span>
        );
    }
  };

  const getStatusBadge = (status: ReportItem["status"]) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case "reviewing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" /> In Review
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case "dismissed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3 h-3" /> Dismissed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Moderation Queue
        </Link>
      </div>

      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Flag className="w-6 h-6 text-danger-600" />
            User Scam & Abuse Reports
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Investigate scam alerts, false listings, and community safety reports (oldest first).
          </p>
        </div>

        {countByStatus.open > 0 && (
          <div className="px-3.5 py-1.5 rounded-xl bg-danger-50 dark:bg-danger-950/60 border border-danger-200 dark:border-danger-900 flex items-center gap-2 text-danger-700 dark:text-danger-300 text-xs font-bold shadow-2xs">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>{countByStatus.open} open {countByStatus.open === 1 ? "report" : "reports"} require review</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors min-h-[44px] flex items-center gap-1.5 ${
                statusFilter === tab
                  ? "bg-brand-700 text-white shadow-2xs"
                  : "bg-surface border border-border text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab === "all" ? "All Reports" : tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-muted"
                }`}
              >
                {countByStatus[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Reason Selector & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <select aria-label="Filter reports by reason"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-700 min-h-[44px]"
            >
              <option value="all">All Reasons</option>
              <option value="scam">Scam / Fraud</option>
              <option value="misleading">Misleading Info</option>
              <option value="unavailable">Unavailable / Taken</option>
              <option value="inappropriate">Inappropriate</option>
              <option value="wrong_info">Incorrect Details</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Search reports"
              type="search"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-700 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <Loading message="Loading reports queue from database..." />
      ) : error ? (
        <ErrorState title="Failed to load reports" message={error} onRetry={loadReports} />
      ) : filteredReports.length === 0 ? (
        <Empty
          icon={Flag}
          title={statusFilter === "open" ? "No open scam reports" : "No reports found"}
          description={
            statusFilter === "open"
              ? "All submitted reports have been investigated and resolved."
              : "No reports match your selected status and filter criteria."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="p-5 rounded-2xl bg-surface border border-border shadow-xs hover:border-brand-700/40 transition-colors space-y-4"
            >
              {/* Report Header: Reason, Status, Date */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {getReasonBadge(report.reason)}
                  {getStatusBadge(report.status)}
                  <span className="text-[11px] text-muted">
                    Reported on {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="text-[11px] text-muted">
                  Reporter:{" "}
                  <span className="font-bold text-foreground">
                    {report.reporter?.full_name || "Community Member"}
                  </span>
                </div>
              </div>

              {/* Reported Target Item Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 text-brand-700">
                    {report.listing_id ? (
                      <Building2 className="w-5 h-5" />
                    ) : report.business_id ? (
                      <Store className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      {report.listing_id
                        ? "Reported Accommodation Listing"
                        : report.business_id
                        ? "Reported Campus Business"
                        : "Reported Roommate Profile"}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {report.listing?.title ||
                        report.business?.name ||
                        report.roommate?.display_name ||
                        "Item details not available"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted">
                      {report.listing && (
                        <>
                          <span>{report.listing.area}</span>
                          <span>•</span>
                          <span className="font-semibold text-brand-700">
                            ZMW {report.listing.rent_zmw.toLocaleString()}/mo
                          </span>
                          <span>•</span>
                          <span className="capitalize text-[11px]">
                            Status: <strong className="text-foreground">{report.listing.status}</strong>
                          </span>
                        </>
                      )}
                      {report.business && (
                        <>
                          <span>{report.business.area}</span>
                          <span>•</span>
                          <span className="capitalize text-[11px]">
                            Status: <strong className="text-foreground">{report.business.status}</strong>
                          </span>
                        </>
                      )}
                      {report.roommate && (
                        <span className="capitalize text-[11px]">
                          Profile Status: <strong className="text-foreground">{report.roommate.status}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Item View Link */}
                <div className="shrink-0 flex items-center gap-2">
                  {report.listing_id && (
                    <Link
                      to={`/accommodation/${report.listing_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-colors min-h-[44px]"
                    >
                      <span>View Listing</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted" />
                    </Link>
                  )}
                  {report.business && (
                    <Link
                      to={`/shops/${report.business.slug || report.business_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-colors min-h-[44px]"
                    >
                      <span>View Shop</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted" />
                    </Link>
                  )}
                  {report.roommate_id && (
                    <Link
                      to="/roommates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-colors min-h-[44px]"
                    >
                      <span>View Roommates</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Reporter Details / Note */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                  User Report Statement
                </span>
                <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-border text-xs text-foreground italic leading-relaxed">
                  "{report.details || "No additional comments provided by the reporter."}"
                </div>
              </div>

              {/* Handled & Resolution Info (if resolved or dismissed) */}
              {report.handled_at && (
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Handled on {new Date(report.handled_at).toLocaleString()}
                    </span>
                  </div>
                  {report.resolution_note && (
                    <p className="text-foreground text-xs">
                      <strong>Staff Note:</strong> {report.resolution_note}
                    </p>
                  )}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleViewHistory(report)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand-700 transition-colors min-h-[44px]"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Item Moderation History</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {report.status === "open" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(report);
                        setModalAction("reviewing");
                        setResolutionNote("");
                      }}
                      className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 text-xs font-bold text-amber-700 min-h-[44px] transition-colors"
                    >
                      Mark in Review
                    </button>
                  )}

                  {(report.status === "open" || report.status === "reviewing") && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(report);
                          setModalAction("dismissed");
                          setResolutionNote("");
                        }}
                        className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 min-h-[44px] transition-colors"
                      >
                        Dismiss Report
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(report);
                          setModalAction("resolved");
                          setResolutionNote("");
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs min-h-[44px] transition-colors"
                      >
                        Resolve Report
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Resolution Modal */}
      {selectedReport && modalAction && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-black text-foreground capitalize">
                {modalAction === "resolved"
                  ? "Resolve Scam / Abuse Report"
                  : modalAction === "dismissed"
                  ? "Dismiss Report"
                  : "Mark Report as In-Review"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setModalAction(null);
                }}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted">
              {modalAction === "resolved"
                ? "Record the outcome of your investigation (e.g. landlord contacted, fraudulent listing suspended, or availability updated)."
                : modalAction === "dismissed"
                ? "Record why this report is dismissed (e.g. false claim, authentic property verified, or duplicate report)."
                : "Acknowledge this report to let staff know you are currently investigating."}
            </p>

            <form onSubmit={handleSubmitAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Resolution Note {modalAction !== "reviewing" && "(Recommended)"}
                </label>
                <textarea aria-label="Resolution note"
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={
                    modalAction === "resolved"
                      ? "e.g. Spoke with landlord. Confirmed the room was already taken; updated status."
                      : modalAction === "dismissed"
                      ? "e.g. Verified with owner that listing details and pricing are genuine."
                      : "e.g. Calling landlord on +260971... to verify occupancy."
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
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
                    modalAction === "resolved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : modalAction === "dismissed"
                      ? "bg-slate-800 hover:bg-slate-900"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {actionSubmitting ? "Updating..." : `Confirm ${modalAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Moderation History Drawer */}
      {historyTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-surface rounded-2xl border border-border p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-black text-foreground">{historyTarget.title}</h2>
                <p className="text-xs text-muted">Item Moderation Audit Log</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="p-3.5 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <Loading message="Loading audit history..." />
            ) : historyLogs.length === 0 ? (
              <p className="text-xs text-muted italic py-4">No previous moderation actions recorded for this item.</p>
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

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold hover:bg-slate-100 min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
