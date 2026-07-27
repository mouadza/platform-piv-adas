import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, CheckCheck, Circle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { notificationsAPI } from "../api/index";
import { normalizeRole, setActiveRole } from "../utils/roles";

const getNotificationContext = (notification) => {
  if (!notification?.target_url) {
    return {
      role: "",
      projectId: "",
      gammeId: "",
      event: "",
      path: "",
      navigationPath: "",
    };
  }

  try {
    const url = new URL(notification.target_url, window.location.origin);
    const roleParam = url.searchParams.get("role");
    const role = roleParam ? normalizeRole(roleParam) : "";
    const projectId = url.searchParams.get("project") || "";
    const gammeId = url.searchParams.get("gamme") || "";
    const event = url.searchParams.get("event") || "";

    return {
      role,
      projectId,
      gammeId,
      event,
      path: `${url.pathname}${url.search}`,
      navigationPath: url.pathname,
    };
  } catch {
    return {
      role: "",
      projectId: "",
      gammeId: "",
      event: "",
      path: notification.target_url,
      navigationPath: notification.target_url,
    };
  }
};

const getRoleBadgeClass = (role) => {
  switch (normalizeRole(role)) {
    case "PPL":
      return "bg-violet-50 text-violet-700 ring-violet-100";
    case "VALIDEUR":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "VISITEUR":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "ADMIN":
      return "bg-[#243782]/10 text-[#243782] ring-[#243782]/15";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const data = await notificationsAPI.unreadCount();
      setUnreadCount(Number(data?.count || 0));
    } catch {
      setUnreadCount(0);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.list({ limit: 8 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 120000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [open]);

  const handleToggle = () => {
    setOpen((value) => !value);
  };

  const handleReadAll = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications((items) =>
        items.map((item) => ({ ...item, is_read: true }))
      );
    } catch {
      // Keep the current UI state if the request fails.
    }
  };

  const handleNotificationClick = async (notification) => {
    const context = getNotificationContext(notification);
    const hasAction = Boolean(context.path);

    try {
      if (!notification.is_read) {
        await notificationsAPI.markRead(notification.id);
      }
    } catch {
      // Navigation is still useful even if marking read failed.
    }

    setUnreadCount((count) => Math.max(count - (notification.is_read ? 0 : 1), 0));
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );

    if (!hasAction) return;

    setOpen(false);

    if (context.role) {
      setActiveRole(context.role);
    }

    if (context.projectId) {
      localStorage.setItem("selected_project_id", context.projectId);
    }

    if (context.gammeId) {
      localStorage.setItem("selected_gamme_id", context.gammeId);
    }

    if (context.event) {
      localStorage.setItem("selected_notification_event", context.event);
    }

    if (context.navigationPath) {
      navigate(context.navigationPath);
    }
  };

  const formatDate = (value) => {
    if (!value) return "";

    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#243782]/25 hover:text-[#243782]"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Notifications
              </p>
              <p className="text-xs font-medium text-slate-500">
                Actions visibles apres connexion
              </p>
            </div>

            <button
              type="button"
              onClick={handleReadAll}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-[#243782] transition hover:bg-[#243782]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={14} />
              Tout lu
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-md bg-slate-100"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-bold text-slate-700">
                  Aucune notification
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Les nouvelles activites apparaitront ici.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const context = getNotificationContext(notification);
                  const hasAction = Boolean(context.path);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition ${
                        hasAction ? "hover:bg-[#243782]/10" : "cursor-default"
                      } ${
                        notification.is_read ? "bg-white" : "bg-[#243782]/10"
                      }`}
                    >
                      <span className="mt-1 text-[#243782]">
                        <Circle
                          size={10}
                          fill={notification.is_read ? "transparent" : "currentColor"}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-slate-900">
                          {notification.title}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-600">
                          {notification.message}
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate">
                              {notification.projet_nom || notification.type}
                            </span>
                            {context.role && (
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ring-1 ${getRoleBadgeClass(
                                  context.role
                                )}`}
                              >
                                {context.role}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0">{formatDate(notification.created_at)}</span>
                        </span>
                        <span
                          className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                            hasAction
                              ? "bg-[#243782]/10 text-[#243782]"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {hasAction ? (
                            <>
                              <ArrowUpRight size={11} />
                              Ouvrir
                            </>
                          ) : (
                            <>
                              <Info size={11} />
                              Info
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
