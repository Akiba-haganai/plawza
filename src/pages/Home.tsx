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
  GraduationCap
} from "lucide-react";
import { SafetyNotice } from "@/components/common/SafetyNotice";
import { useReferenceData } from "@/hooks/useReferenceData";

export const Home: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { campuses } = useReferenceData();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/accommodation?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate("/accommodation");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white p-6 sm:p-12 shadow-sm border border-brand-900">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-800/80 border border-brand-700/60 text-xs font-semibold text-brand-100 mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-300 animate-pulse"></span>
            <span className="tracking-widest uppercase font-bold text-[11px]">Discover • Connect • Belong</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
            A Digital Plaza for Everyone
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
            Plawza connects students, businesses, landlords, professionals and communities across Zambia with verified listings, catalogues, and direct WhatsApp contact.
          </p>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-muted absolute left-3.5 top-3.5" />
              <input aria-label="Search accommodation by area"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search area (e.g. town centre, near campus)..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface text-foreground placeholder:text-muted text-base sm:text-sm font-medium border border-border focus:outline-hidden focus:ring-2 focus:ring-accent-500 min-h-[46px]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent-700 hover:bg-accent-500 text-white font-bold text-sm shadow-xs transition-colors min-h-[46px]"
            >
              <Search className="w-4 h-4" />
              Search Stays
            </button>
          </form>

          {/* 1-Tap Campus Quick-Jump Row */}
          {campuses.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 mr-1">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                Jump to Campus:
              </span>
              {campuses.map((campus) => (
                <Link
                  key={campus.id}
                  to={`/accommodation?campus=${campus.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors min-h-[36px]"
                >
                  <span>{campus.short_name || campus.name}</span>
                  <ArrowRight className="w-3 h-3 opacity-80" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Safety Notice Banner */}
      <SafetyNotice compact />

      {/* Category Discovery Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-foreground">Explore Plawza</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Accommodation */}
          <Link
            to="/accommodation"
            className="group p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-500 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Accommodation</h3>
              <p className="text-xs text-muted mb-4">
                Boarding rooms, bedsitters, hostels, and shared flats near campus.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 group-hover:translate-x-1 transition-transform">
              Browse listings <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Card 2: Roommates */}
          <Link
            to="/roommates"
            className="group p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-500 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Roommates</h3>
              <p className="text-xs text-muted mb-4">
                Find compatible student roommates matching your budget, study routine, and area.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 group-hover:translate-x-1 transition-transform">
              Find matches <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Card 3: Shops & Catalogues */}
          <Link
            to="/shops"
            className="group p-5 rounded-2xl bg-surface border border-border hover:border-brand-700 dark:hover:border-brand-500 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Local Shops</h3>
              <p className="text-xs text-muted mb-4">
                Campus stationery, printing, electronics, meals, and student services on WhatsApp.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 group-hover:translate-x-1 transition-transform">
              View catalogues <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* Trust & Verification Pillars */}
      <section className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
          Why Plawza is Built Different for Zambia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-success-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-foreground block mb-0.5">Honest Moderation</strong>
              <p className="text-muted">
                No fake "verified" badges. Only real checks (ownership, review, phone) are explicitly displayed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-accent-700 dark:text-accent-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-foreground block mb-0.5">Data Saver Mode</strong>
              <p className="text-muted">
                Optimized for low-bandwidth 3G connections and budget Android devices. Tap to load images only when you need them.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-brand-700 dark:text-brand-300 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-foreground block mb-0.5">Fresh Availability</strong>
              <p className="text-muted">
                Each listing shows when availability was last reconfirmed by the landlord to save you wasted trips.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
