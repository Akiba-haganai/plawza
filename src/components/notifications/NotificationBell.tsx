import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, MessageSquare, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Load notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data && isMounted) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.read_at).length);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNotifications();

    // Setup Supabase Realtime channel for instant in-app alerts
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;
          setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount((prev) => prev + 1);

          // Subtle toast notification
          toast.info(newNotif.title, {
            description: newNotif.message,
            action: newNotif.link_url
              ? {
                  label: "View",
                  onClick: () => navigate(newNotif.link_url!)
                }
              : undefined
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const markAsRead = async (id: string, linkUrl?: string | null) => {
    try {
      const now = new Date().toISOString();
      await supabase.from("notifications").update({ read_at: now }).eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (linkUrl) {
        setIsOpen(false);
        navigate(linkUrl);
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const now = new Date().toISOString();
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("user_id", user.id)
        .is("read_at", null);

      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: now })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  if (!user) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "enquiry":
        return <MessageSquare className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />;
      case "reminder":
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "verification":
        return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "moderation":
        return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-muted shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
        className="relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-colors shrink-0 cursor-pointer"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-700 text-white text-[10px] font-black leading-none animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl border border-border shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 text-[11px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-muted flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">All caught up!</p>
                <p className="text-[11px] text-muted">
                  You will be notified when people enquire about your listings or roommates connect with you.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read_at;
                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id, item.link_url)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-left ${
                      isUnread
                        ? "bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-50 dark:hover:bg-brand-950/50"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs ${isUnread ? "font-bold text-foreground" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-accent-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-muted block mt-1">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
