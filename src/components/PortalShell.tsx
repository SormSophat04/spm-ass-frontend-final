"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarOff,
  CheckCircle2,
  Database,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import LifecycleModule from "@/components/LifecycleModule";
import AttendanceModule from "@/components/AttendanceModule";
import LeavesModule from "@/components/LeavesModule";
import NotesModule from "@/components/NotesModule";
import QuizzesModule from "@/components/QuizzesModule";
import RolesModule from "@/components/RolesModule";
import AuditModule from "@/components/AuditModule";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  MODULE_CONFIG,
  canAccessModule,
  getAllowedModulesForRole,
  getMobileModuleShortLabel,
  getModuleLabel,
  getRolePortalBadge,
  type ModuleId,
} from "@/lib/rbac";

interface PortalShellProps {
  activeTab: ModuleId;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface SystemStats {
  live_sessions?: number;
  pending_leaves?: number;
  live_quizzes?: number;
}

const STUDENT_TAB_ORDER: ModuleId[] = [
  "attendance",
  "quizzes",
  "lifecycle",
  "leaves",
  "notes",
];

const MODULE_ICONS: Record<ModuleId, React.ComponentType<{ size?: number; className?: string }>> = {
  lifecycle: BookOpen,
  attendance: UserCheck,
  leaves: CalendarOff,
  notes: FileText,
  quizzes: HelpCircle,
  roles: ShieldCheck,
  audit: Activity,
};

function PortalShellContent({ activeTab }: PortalShellProps) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [seeding, setSeeding] = useState(false);

  // PWA Service Worker, Online Status & Install Prompt State
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistered, setSwRegistered] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.system.getStats();
      setStats(res);
    } catch {
      // Non-blocking telemetry
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialTimer = setTimeout(() => {
      if (active) {
        void loadStats();
      }
    }, 0);
    const interval = setInterval(() => {
      void loadStats();
    }, 15000);
    return () => {
      active = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [loadStats, activeTab]);

  // Register PWA Service Worker & listen for install/network events
  useEffect(() => {
    if (typeof window === "undefined") return;

    queueMicrotask(() => {
      setIsOnline(navigator.onLine);
      const nav = window.navigator as NavigatorWithStandalone;
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches || nav.standalone === true;
      setIsStandalonePwa(Boolean(standalone));
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => setSwRegistered(true))
        .catch(() => setSwRegistered(false));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwaClick = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDeferredInstallPrompt(null);
        setIsStandalonePwa(true);
      }
    } else {
      setShowPwaModal(true);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm("Re-seed the institutional database with fresh baseline academic records?")) {
      return;
    }
    setSeeding(true);
    try {
      await api.system.seedDatabase();
      await loadStats();
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to re-seed database.";
      window.alert(msg);
    } finally {
      setSeeding(false);
    }
  };

  if (!user) return null;

  const allowedModules = getAllowedModulesForRole(user.role, user.allowed_modules);
  const allowedCount = allowedModules.length;
  const roleBadgeText = getRolePortalBadge(user.role);
  const isStudentRole = user.role === "Student";

  const mobileTabs = (
    isStudentRole
      ? STUDENT_TAB_ORDER.map((id) => MODULE_CONFIG.find((m) => m.id === id)).filter(Boolean)
      : MODULE_CONFIG
  ).filter(
    (mod): mod is NonNullable<typeof mod> =>
      Boolean(mod) && canAccessModule(user.role, mod!.id, allowedModules)
  );

  const renderActiveModule = () => (
    <>
      {activeTab === "lifecycle" && <LifecycleModule currentUser={user} />}
      {activeTab === "attendance" && <AttendanceModule currentUser={user} />}
      {activeTab === "leaves" && <LeavesModule currentUser={user} />}
      {activeTab === "notes" && <NotesModule currentUser={user} />}
      {activeTab === "quizzes" && <QuizzesModule currentUser={user} />}
      {activeTab === "roles" && <RolesModule currentUser={user} />}
      {activeTab === "audit" && <AuditModule currentUser={user} />}
    </>
  );

  return (
    <div className="portal-shell-root">
      {/* Desktop / Tablet Navigation Sidebar (auto-hidden on <= 768px mobile) */}
      <div className="portal-sidebar-slot">
        <Navbar activeTab={activeTab} currentUser={user} onLogout={logout} />
      </div>

      {/* Main Fluid Content Column */}
      <div className="portal-content-col">
        {/* Desktop / Tablet Top Header (hidden on <= 768px mobile) */}
        <header className="portal-desktop-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span
              className="code-pill"
              style={{
                background: isStudentRole ? "#DCFCE7" : "#DBEAFE",
                color: isStudentRole ? "#166534" : "#1D4ED8",
                fontWeight: 800,
                fontSize: "0.72rem",
              }}
            >
              {roleBadgeText}
            </span>
            <h1
              style={{
                fontSize: "1.02rem",
                fontWeight: 800,
                color: "#0F172A",
                margin: 0,
              }}
            >
              {getModuleLabel(activeTab)}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
            {stats && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                <span
                  className="code-pill"
                  style={{
                    fontSize: "0.68rem",
                    background: (stats.live_sessions ?? 0) > 0 ? "#DCFCE7" : "#F8FAFC",
                    color: (stats.live_sessions ?? 0) > 0 ? "#166534" : "#475569",
                  }}
                  title="Active Live Lecture Sessions"
                >
                  LIVE ROOMS: {stats.live_sessions ?? 0}
                </span>
                {!isStudentRole && (
                  <span
                    className="code-pill"
                    style={{
                      fontSize: "0.68rem",
                      background: (stats.pending_leaves ?? 0) > 0 ? "#FEF3C7" : "#F8FAFC",
                      color: (stats.pending_leaves ?? 0) > 0 ? "#92400E" : "#475569",
                    }}
                    title="Pending Student Leave Applications"
                  >
                    PENDING LEAVES: {stats.pending_leaves ?? 0}
                  </span>
                )}
                <span
                  className="code-pill"
                  style={{
                    fontSize: "0.68rem",
                    background: (stats.live_quizzes ?? 0) > 0 ? "#DBEAFE" : "#F8FAFC",
                    color: (stats.live_quizzes ?? 0) > 0 ? "#1E40AF" : "#475569",
                  }}
                  title="Active Live Quizzes"
                >
                  LIVE QUIZZES: {stats.live_quizzes ?? 0}
                </span>
              </div>
            )}

            {isStudentRole && !isStandalonePwa && (
              <button
                type="button"
                onClick={handleInstallPwaClick}
                className="btn btn-success btn-sm"
                style={{
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                }}
                title="Install AcadCoord Student PWA App"
              >
                <Download size={12} /> Install PWA
              </button>
            )}

            {user.role === "Dean" && (
              <button
                type="button"
                onClick={handleSeedDatabase}
                disabled={seeding}
                className="btn btn-secondary"
                style={{
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
                title="Reset and re-seed baseline institutional database"
              >
                {seeding ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
                {seeding ? "Seeding..." : "Reset Demo DB"}
              </button>
            )}

            <span
              className="badge"
              style={{
                background: "#DCFCE7",
                color: "#166534",
                borderColor: "#0F172A",
                fontSize: "0.72rem",
              }}
            >
              <ShieldCheck size={13} />
              {user.name} ({user.institutional_id})
            </span>

            <button
              type="button"
              onClick={() => void logout()}
              className="btn btn-secondary"
              style={{
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#DC2626",
              }}
              title="Sign out of current session"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Sticky PWA Top App Bar (visible only on <= 768px) */}
        <header className="pwa-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "2px solid #0F172A",
                boxShadow: "2px 2px 0px #0F172A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GraduationCap size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: "0.92rem",
                    color: "#0F172A",
                    letterSpacing: "-0.02em",
                  }}
                >
                  AcadCoord
                </span>
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "999px",
                    border: "1.5px solid #0F172A",
                    background: isStudentRole ? "#DCFCE7" : "#DBEAFE",
                    color: isStudentRole ? "#15803D" : "#1D4ED8",
                  }}
                >
                  {user.role}
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "#475569",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.name} · {user.institutional_id}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {!isStandalonePwa && (
              <button
                type="button"
                onClick={handleInstallPwaClick}
                className="btn btn-success btn-sm"
                style={{
                  padding: "5px 8px",
                  fontSize: "0.66rem",
                  minHeight: "34px",
                }}
                title="Install AcadCoord Mobile PWA"
              >
                <Download size={12} /> Install
              </button>
            )}

            <span
              className="code-pill"
              style={{
                fontSize: "0.62rem",
                padding: "3px 6px",
                background: isOnline ? "#DCFCE7" : "#FFE4E6",
                color: isOnline ? "#166534" : "#9F1239",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
              title={isOnline ? "Connected" : "Offline"}
            >
              {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>

            <button
              type="button"
              onClick={() => void logout()}
              className="btn btn-secondary btn-sm"
              style={{
                padding: "5px 8px",
                fontSize: "0.68rem",
                color: "#DC2626",
                minWidth: "34px",
                minHeight: "34px",
              }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Offline PWA Status Banner */}
        {!isOnline && (
          <div
            role="status"
            style={{
              background: "#FEF3C7",
              borderBottom: "2px solid #0F172A",
              padding: "6px 14px",
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "#92400E",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <WifiOff size={14} style={{ flexShrink: 0 }} />
            <span>Offline mode — cached pages load cleanly; reconnect to sync attendance &amp; quizzes.</span>
          </div>
        )}

        {/* Mobile Quick Live Telemetry Strip for Student */}
        {isStudentRole && stats && ((stats.live_sessions ?? 0) > 0 || (stats.live_quizzes ?? 0) > 0) && (
          <div
            className="pwa-mobile-only-strip"
            style={{
              background: "#EFF6FF",
              borderBottom: "2px solid #0F172A",
              padding: "6px 12px",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "6px",
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "#1E3A8A",
              flexShrink: 0,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10B981",
                  border: "1.5px solid #0F172A",
                  display: "inline-block",
                }}
              />
              {stats.live_sessions ?? 0} Live Class Gate(s) Open
            </span>
            {(stats.live_quizzes ?? 0) > 0 && (
              <Link
                href="/quizzes"
                style={{
                  background: "#60A5FA",
                  color: "#0F172A",
                  border: "1.5px solid #0F172A",
                  borderRadius: "4px",
                  padding: "1px 7px",
                  textDecoration: "none",
                  fontSize: "0.66rem",
                  fontWeight: 900,
                }}
              >
                {stats.live_quizzes} LIVE POLL NOW →
              </Link>
            )}
          </div>
        )}

        {/* Responsive Scrollable Viewport */}
        <main className="portal-main-scroll">{renderActiveModule()}</main>

        {/* Mobile Bottom Thumb Navigation Bar (visible only on <= 768px) */}
        <nav aria-label="Mobile Navigation" className="pwa-bottom-nav">
          {mobileTabs.map((tab) => {
            const Icon = MODULE_ICONS[tab.id];
            const isActive = activeTab === tab.id;
            const hasLiveBadge =
              (tab.id === "attendance" && (stats?.live_sessions ?? 0) > 0) ||
              (tab.id === "quizzes" && (stats?.live_quizzes ?? 0) > 0);

            return (
              <Link
                key={tab.id}
                href={tab.path}
                data-testid={`mobile-nav-link-${tab.id}`}
                className={`pwa-bottom-tab ${isActive ? "active" : ""}`}
              >
                <div style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={18} />
                  {hasLiveBadge && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-3px",
                        right: "-5px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#34D399",
                        border: "1.5px solid #0F172A",
                      }}
                    />
                  )}
                </div>
                <span>{getMobileModuleShortLabel(tab.id)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Role-Scoped Status Footer (hidden on <= 768px mobile) */}
        <footer className="portal-desktop-footer">
          <span>AcadCoord // Responsive Role-Based Workspace ({user.department})</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontWeight: 700,
              color: "#15803D",
            }}
          >
            <CheckCircle2 size={13} /> {allowedCount} AUTHORIZED MODULES ACTIVE ({user.role.toUpperCase()})
          </span>
        </footer>
      </div>

      {/* PWA Install / Mobile Home Screen Instructions Modal */}
      {showPwaModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPwaModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-shell-install-title"
        >
          <div
            className="modal-content"
            style={{ maxWidth: "430px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#DBEAFE",
                    border: "2px solid #0F172A",
                    boxShadow: "2px 2px 0px #0F172A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <QrCode size={22} color="#2563EB" />
                </div>
                <div>
                  <h3 id="pwa-shell-install-title" style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0F172A" }}>
                    Install AcadCoord App (PWA)
                  </h3>
                  <div style={{ fontSize: "0.74rem", color: "#475569", fontWeight: 700 }}>
                    {swRegistered ? "Offline Service Worker Active" : "1-Tap Home Screen Gate"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setShowPwaModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ width: "36px", height: "36px", padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "0.84rem", color: "#334155", lineHeight: 1.5, fontWeight: 600, marginBottom: "14px" }}>
              AcadCoord runs seamlessly on both desktop browsers and smartphones. Install it as a PWA for 1-tap attendance check-ins and offline cached notes:
            </p>

            <div
              style={{
                background: "#F8FAFC",
                border: "2px solid #0F172A",
                borderRadius: "10px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "0.8rem",
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              <div>
                <span className="code-pill" style={{ background: "#DBEAFE", marginRight: "6px" }}>
                  iOS Safari
                </span>
                Tap <strong>Share (↑)</strong> → <strong>&ldquo;Add to Home Screen&rdquo;</strong>
              </div>
              <div>
                <span className="code-pill" style={{ background: "#D1FAE5", marginRight: "6px" }}>
                  Android Chrome
                </span>
                Tap <strong>Menu (⋮)</strong> → <strong>&ldquo;Install App / Add to Home Screen&rdquo;</strong>
              </div>
              <div>
                <span className="code-pill" style={{ background: "#FEF3C7", marginRight: "6px" }}>
                  Desktop Chrome/Edge
                </span>
                Click the <strong>Install icon</strong> in the browser address bar.
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", minHeight: "44px" }}
              onClick={() => setShowPwaModal(false)}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalShell({ activeTab }: PortalShellProps) {
  return (
    <ProtectedRoute requiredModule={activeTab}>
      <PortalShellContent activeTab={activeTab} />
    </ProtectedRoute>
  );
}
