import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Building2,
  Users,
  Store,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  GraduationCap,
  MapPin,
  Plus,
  Clock,
  ChevronDown
} from "lucide-react";
import { SafetyNotice } from "@/components/common/SafetyNotice";
import { PlazaNoticeboard } from "@/components/home/PlazaNoticeboard";
import { useReferenceData } from "@/hooks/useReferenceData";

type SearchIntent = "stays" | "shops" | "roommates";

export const Home: React.FC = () => {
  const [searchIntent, setSearchIntent] = useState<SearchIntent>("stays");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { campuses, towns } = useReferenceData();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();

    if (searchIntent === "stays") {
      if (trimmed) {
        navigate(`/accommodation?search=${encodeURIComponent(trimmed)}`);
      } else {
        navigate("/accommodation");
      }
      return;
    }

    if (searchIntent === "shops") {
      if (trimmed) {
        navigate(`/shops?search=${encodeURIComponent(trimmed)}`);
      } else {
        navigate("/shops");
      }
      return;
    }

    // Roommates intent: match typed campus name if possible, otherwise open directory
    if (trimmed) {
      const q = trimmed.toLowerCase();
      const matchedCampus = campuses.find(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.short_name && c.short_name.toLowerCase().includes(q))
      );
      if (matchedCampus) {
        navigate(`/roommates?campus=${encodeURIComponent(matchedCampus.id)}`);
        return;
      }
    }
    navigate("/roommates");
  };

  const searchConfig: Record<
    SearchIntent,
    { placeholder: string; buttonLabel: string; ariaLabel: string }
  > = {
    stays: {
      placeholder: "Search area (e.g. Marshlands, Riverside, Woodlands)...",
      buttonLabel: "Search Stays",
      ariaLabel: "Search accommodation by area"
    },
    shops: {
      placeholder: "Search electronics, meals, printing, or area...",
      buttonLabel: "Find Shops",
      ariaLabel: "Search local shops and catalogues"
    },
    roommates: {
      placeholder: "Enter campus or area (e.g. UNZA, CBU)...",
      buttonLabel: "Find Roommates",
      ariaLabel: "Search roommate profiles by campus"
    }
  };

  const currentSearch = searchConfig[searchIntent];

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* ZONE 1: Multi-Intent Hero & High-Density Search */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white p-5 sm:p-8 lg:p-10 shadow-sm border border-brand-900">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-800/80 border border-brand-700/60 text-xs font-semibold text-brand-100 mb-3">
            <span className="w-2 h-2 rounded-full bg-brand-300 animate-pulse" />
            <span className="tracking-widest uppercase font-bold text-[10px] sm:text-[11px]">
              Discover • Connect • Belong
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-2">
            A Digital Plaza for Everyone
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mb-4 sm:mb-5 leading-relaxed max-w-2xl">
            Verified stays near campuses &amp; towns, local shops with catalogues, and compatible roommates across Zambia.
          </p>

          {/* High-Density Multi-Intent Search Box */}
          <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-2">
            {/* Intent Switcher Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Search category">
              <button
                type="button"
                role="tab"
                aria-selected={searchIntent === "stays"}
                onClick={() => setSearchIntent("stays")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[36px] ${
                  searchIntent === "stays"
                    ? "bg-white text-brand-950 shadow-2xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Stays</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={searchIntent === "shops"}
                onClick={() => setSearchIntent("shops")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[36px] ${
                  searchIntent === "shops"
                    ? "bg-white text-brand-950 shadow-2xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Local Shops</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={searchIntent === "roommates"}
                onClick={() => setSearchIntent("roommates")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 min-h-[36px] ${
                  searchIntent === "roommates"
                    ? "bg-white text-brand-950 shadow-2xs"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roommates</span>
              </button>
            </div>

            {/* Compact Inline Search Input (Button inside right edge) */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-muted absolute left-3.5 pointer-events-none" />
              <input
                aria-label={currentSearch.ariaLabel}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={currentSearch.placeholder}
                className="w-full pl-10 pr-24 sm:pr-32 py-2.5 sm:py-3 rounded-xl bg-surface text-foreground placeholder:text-muted text-xs sm:text-sm font-medium border border-border focus:outline-hidden focus:ring-2 focus:ring-accent-500 min-h-[44px]"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-lg bg-accent-700 hover:bg-accent-500 text-white font-bold text-xs shadow-xs transition-colors min-h-[36px]"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentSearch.buttonLabel}</span>
                <span className="sm:hidden">Search</span>
              </button>
            </form>
          </div>

          {/* Single-Line Swipeable Quick-Jump Ribbon */}
          {searchIntent === "shops" ? (
            towns.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300 shrink-0 mr-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  Town:
                </span>
                {towns.map((town) => (
                  <Link
                    key={town.id}
                    to={`/shops?town=${town.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-bold text-white transition-colors shrink-0 min-h-[30px]"
                  >
                    <span>{town.name}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                  </Link>
                ))}
              </div>
            )
          ) : (
            campuses.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300 shrink-0 mr-1">
                  <GraduationCap className="w-3 h-3 text-amber-400" />
                  Campus:
                </span>
                {campuses.map((campus) => (
                  <Link
                    key={campus.id}
                    to={
                      searchIntent === "roommates"
                        ? `/roommates?campus=${campus.id}`
                        : `/accommodation?campus=${campus.id}`
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-bold text-white transition-colors shrink-0 min-h-[30px]"
                  >
                    <span>{campus.short_name || campus.name}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* ZONE 2: The 3 Core Pillars (Compact Bento) + Supply Action Strip */}
      <section aria-labelledby="pillars-heading" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 id="pillars-heading" className="text-base sm:text-xl font-black text-foreground tracking-tight">
            Explore Plawza
          </h2>
        </div>

        {/* 3-Column Compact Bento Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Pillar 1: Accommodation */}
          <Link
            to="/accommodation"
            className="group p-3 sm:p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-500 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-2 sm:mb-3.5 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <h3 className="text-xs sm:text-base font-bold text-foreground leading-tight mb-0.5 sm:mb-1">
                Stays
              </h3>
              <p className="text-[11px] text-muted font-medium sm:hidden line-clamp-1">
                Rooms &amp; Flats
              </p>
              <p className="hidden sm:block text-xs text-muted mb-3 leading-relaxed">
                Boarding rooms, bedsitters, hostels, and flats with power &amp; water backup tags.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-brand-700 dark:text-brand-300 group-hover:translate-x-0.5 transition-transform mt-2">
              <span className="hidden sm:inline">Browse stays</span>
              <span className="sm:hidden">Explore</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          {/* Pillar 2: Local Shops */}
          <Link
            to="/shops"
            className="group p-3 sm:p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-500 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2 sm:mb-3.5 group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <h3 className="text-xs sm:text-base font-bold text-foreground leading-tight mb-0.5 sm:mb-1">
                Local Shops
              </h3>
              <p className="text-[11px] text-muted font-medium sm:hidden line-clamp-1">
                Catalogues
              </p>
              <p className="hidden sm:block text-xs text-muted mb-3 leading-relaxed">
                Campus and town shops, electronics, meals, printing, and services on WhatsApp.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-brand-700 dark:text-brand-300 group-hover:translate-x-0.5 transition-transform mt-2">
              <span className="hidden sm:inline">View catalogues</span>
              <span className="sm:hidden">Explore</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          {/* Pillar 3: Roommates */}
          <Link
            to="/roommates"
            className="group p-3 sm:p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-500 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mb-2 sm:mb-3.5 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <h3 className="text-xs sm:text-base font-bold text-foreground leading-tight mb-0.5 sm:mb-1">
                Roommates
              </h3>
              <p className="text-[11px] text-muted font-medium sm:hidden line-clamp-1">
                Shared Living
              </p>
              <p className="hidden sm:block text-xs text-muted mb-3 leading-relaxed">
                Find compatible flatmates matching your budget, lifestyle, and preferred area.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-brand-700 dark:text-brand-300 group-hover:translate-x-0.5 transition-transform mt-2">
              <span className="hidden sm:inline">Find matches</span>
              <span className="sm:hidden">Explore</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {/* Compact Supply-Side Action Bar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p className="text-xs font-bold text-foreground">
            Have a room to let, a business to showcase, or seeking a flatmate?
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/dashboard/accommodation"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-700 hover:bg-accent-500 text-white text-xs font-bold shadow-2xs transition-colors min-h-[36px]"
            >
              <Plus className="w-3 h-3" />
              <span>List Stay</span>
            </Link>
            <Link
              to="/dashboard/businesses"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-colors min-h-[36px]"
            >
              <Store className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Open Shop</span>
            </Link>
            <Link
              to="/dashboard/roommates"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-colors min-h-[36px]"
            >
              <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Roommate Profile</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ZONE 3: Plaza Noticeboard (Live Stream with 4-Item Cap + Expand) */}
      <PlazaNoticeboard />

      {/* ZONE 4: Ethical Plaza Standard & Safety (Progressive Disclosure) */}
      <section aria-labelledby="ethical-standard-heading" className="rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border p-4 sm:p-5 transition-all">
        <details className="group">
          <summary className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer list-none select-none">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h2 id="ethical-standard-heading" className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">
                  The Plawza Ethical Standard
                </h2>
              </div>
              <p className="text-xs text-muted">
                Zero fake metrics, in-person inspection requirement, and low-data reliability.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border">No Upfront Money</span>
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border">Honest Checks</span>
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border">3G Data Saver</span>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-colors shadow-2xs min-h-[36px]">
                <span className="group-open:hidden">View Safety &amp; Trust Details</span>
                <span className="hidden group-open:inline">Hide Details</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </span>
            </div>
          </summary>

          {/* Expanded Drawer Content */}
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Integrated Safety Pledge */}
            <SafetyNotice compact />

            {/* 3 Verification & Accessibility Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-start gap-2.5">
                <ShieldCheck className="w-4.5 h-4.5 text-success-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-foreground block mb-0.5">
                    Honest, Specific Verification
                  </strong>
                  <p className="text-muted leading-relaxed">
                    No fake "verified" claims. Badges render only when ownership documents, moderator review, or phone checks are recorded.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-start gap-2.5">
                <Clock className="w-4.5 h-4.5 text-brand-700 dark:text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-foreground block mb-0.5">
                    Reconfirmed Availability
                  </strong>
                  <p className="text-muted leading-relaxed">
                    Every stay shows when availability was last confirmed by the landlord, automatically flagging unconfirmed posts after 30 days.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-start gap-2.5">
                <Smartphone className="w-4.5 h-4.5 text-accent-700 dark:text-accent-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-foreground block mb-0.5">
                    3G &amp; Data Saver Ready
                  </strong>
                  <p className="text-muted leading-relaxed">
                    Engineered for budget devices and mobile data — toggle Data Saver in the top bar anytime to load photos only on tap.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
};
