"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  Smartphone,
  UserCheck,
  WifiOff,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  DEMO_ACCOUNT_PRESETS,
  DEMO_LOGIN_PASSWORD,
  MODULE_CONFIG,
  canAccessModule,
  getDefaultModulePath,
  type AcademicRole,
  type AuthenticatedUser,
  type DemoAccountPreset,
} from "@/lib/rbac";

function normalizeAcademicRole(rawRole?: string): AcademicRole {
  if (rawRole === "Dean") return "Dean";
  if (rawRole === "Professor") return "Professor";
  if (rawRole === "Teaching Assistant" || rawRole === "TA") return "Teaching Assistant";
  if (rawRole === "Auditor") return "Auditor";
  return "Student";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface DemoAccountApiItem {
  name: string;
  email: string;
  institutional_id: string;
  role?: string;
  department?: string;
  allowed_modules?: string[];
}

function resolvePostLoginPath(nextParam: string | null, user: AuthenticatedUser): string {
  const defaultPath = getDefaultModulePath(user.role, user.allowed_modules);
  if (!nextParam || !nextParam.startsWith("/") || nextParam === "/" || nextParam.startsWith("/login")) {
    return defaultPath;
  }
  const matchedModule = MODULE_CONFIG.find(
    (mod) => nextParam === mod.path || nextParam.startsWith(`${mod.path}/`)
  );
  if (!matchedModule) {
    return defaultPath;
  }
  if (canAccessModule(user.role, matchedModule.id, user.allowed_modules)) {
    return nextParam;
  }
  return defaultPath;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuth();
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [liveAccounts, setLiveAccounts] = useState<DemoAccountPreset[]>(DEMO_ACCOUNT_PRESETS);
  const [defaultPassHint, setDefaultPassHint] = useState<string>(DEMO_LOGIN_PASSWORD);

  // PWA awareness right on the sign-in screen
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showInstallModal, setShowInstallModal] = useState(false);

  const nextParam = useMemo(() => searchParams.get("next"), [searchParams]);
  const studentPreset = useMemo(
    () => liveAccounts.find((acc) => acc.role === "Student") || null,
    [liveAccounts]
  );

  // Register SW & track online/installable PWA state on /login
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
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-blocking in browsers without SW support
      });
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

  useEffect(() => {
    let active = true;
    api.auth
      .getDemoAccounts()
      .then((res) => {
        if (!active || !res?.accounts?.length) return;
        const mapped: DemoAccountPreset[] = (res.accounts as DemoAccountApiItem[]).map((acc) => {
          const role = normalizeAcademicRole(acc.role);
          const taSummary = `${acc.department || "TA"} · Sessions, Attendance, Notes & Quizzes`;
          const styleMap: Record<AcademicRole, { bg: string; text: string; scope: string }> = {
            Dean: {
              bg: "#FEE2E2",
              text: "#991B1B",
              scope: `Full governance across all ${(acc.allowed_modules || []).length || 7} institutional modules`,
            },
            Professor: {
              bg: "#DBEAFE",
              text: "#1E3A8A",
              scope: `${acc.department || "Faculty"} · Sessions, Attendance, Leaves, MOM & Live Quizzes`,
            },
            "Teaching Assistant": {
              bg: "#FEF3C7",
              text: "#92400E",
              scope: taSummary,
            },
            Auditor: {
              bg: "#F1F5F9",
              text: "#334155",
              scope: `${acc.department || "Compliance"} · Read-Only Oversight & Accreditation Audit Logs`,
            },
            Student: {
              bg: "#DCFCE7",
              text: "#166534",
              scope: `Mobile PWA · 1-Tap Phone Attendance Gate, Live Polls, Leaves & Notes`,
            },
          };
          const s = styleMap[role];
          return {
            name: acc.name,
            email: acc.email,
            institutionalId: acc.institutional_id,
            role,
            scopeSummary: s.scope,
            accentBg: s.bg,
            accentText: s.text,
          };
        });
        setLiveAccounts(mapped);
        if (res.default_password) {
          setDefaultPassHint(res.default_password);
        }
      })
      .catch(() => {
        // Keep static fallback presets if backend is unreachable
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const target = resolvePostLoginPath(nextParam, user);
      router.replace(target);
    }
  }, [loading, user, nextParam, router]);

  const executeLogin = async (rawIdentifier: string, rawPassword: string) => {
    setErrorMsg(null);
    const trimmedIdentifier = rawIdentifier.trim();
    if (!trimmedIdentifier) {
      setErrorMsg("Enter your institutional email address or university ID.");
      identifierInputRef.current?.focus();
      return;
    }
    if (!rawPassword) {
      setErrorMsg("Enter your institutional password.");
      return;
    }

    setSubmitting(true);
    try {
      const authenticatedUser = await login(trimmedIdentifier, rawPassword);
      const target = resolvePostLoginPath(nextParam, authenticatedUser);
      router.replace(target);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Authentication failed. Please check your credentials.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(identifier, password);
  };

  const handlePresetFill = (institutionalId: string, email: string) => {
    setIdentifier(email);
    setPassword(defaultPassHint);
    setSelectedPresetId(institutionalId);
    setErrorMsg(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handlePresetSignIn = async (institutionalId: string, email: string) => {
    setIdentifier(email);
    setPassword(defaultPassHint);
    setSelectedPresetId(institutionalId);
    await executeLogin(email, defaultPassHint);
  };

  const handleInstallPwaClick = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDeferredInstallPrompt(null);
        setIsStandalonePwa(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  if (loading || user) {
    return (
      <div className="login-centered-shell">
        <div
          className="glass-panel"
          style={{
            maxWidth: "420px",
            width: "100%",
            margin: "auto 0",
            padding: "28px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: "#DBEAFE",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              display: "inline-flex",
            }}
          >
            <ShieldCheck size={28} color="#2563EB" />
          </div>
          <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0F172A" }}>
            {user ? "Authenticated — Routing to your role portal..." : "Checking institutional session..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-scroll">
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        {/* Offline status notice when network is unavailable */}
        {!isOnline && (
          <div
            role="status"
            style={{
              marginBottom: "14px",
              padding: "9px 12px",
              borderRadius: "8px",
              background: "#FEF3C7",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.78rem",
              fontWeight: 800,
              color: "#92400E",
            }}
          >
            <WifiOff size={15} style={{ flexShrink: 0 }} />
            <span>
              You are offline. Reconnect to Wi-Fi or cellular data before signing in.
            </span>
          </div>
        )}

        {/* Top Institutional Banner */}
        <div className="login-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "2.5px solid #0F172A",
                boxShadow: "3px 3px 0px #0F172A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="login-brand-title">AcadCoord // Institutional Portal</h1>
              <p
                style={{
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "#475569",
                  marginTop: "2px",
                }}
              >
                ROLE-GATED UNIVERSITY GOVERNANCE &amp; ATTENDANCE PWA
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                background: "#FEF3C7",
                color: "#92400E",
                fontSize: "0.72rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                border: "2px solid #0F172A",
                boxShadow: "2px 2px 0px #0F172A",
                letterSpacing: "0.02em",
              }}
            >
              <Lock size={13} />
              PROVISIONED ONLY
            </div>

            {!isStandalonePwa && (
              <button
                type="button"
                onClick={handleInstallPwaClick}
                className="btn btn-secondary btn-sm"
                style={{
                  minHeight: "34px",
                  padding: "6px 10px",
                  fontSize: "0.72rem",
                  background: "#DBEAFE",
                  color: "#1E3A8A",
                }}
                title="Install AcadCoord Student Mobile App"
              >
                <Download size={13} /> Install App
              </button>
            )}
          </div>
        </div>

        {/* Main Split Panel */}
        <div className="login-split-grid">
          {/* Left: Login Form */}
          <div ref={formCardRef} className="glass-panel login-form-card">
            <div
              style={{
                marginBottom: "18px",
                paddingBottom: "14px",
                borderBottom: "2px solid #E2E8F0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                <span
                  className="badge"
                  style={{
                    background: "#DBEAFE",
                    color: "#1E3A8A",
                  }}
                >
                  <KeyRound size={12} /> Institutional Sign In
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: "#166534",
                    background: "#DCFCE7",
                    border: "1.5px solid #0F172A",
                    borderRadius: "5px",
                    padding: "2px 7px",
                  }}
                >
                  <Smartphone size={11} /> Mobile PWA Ready
                </span>
              </div>
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 900,
                  color: "#0F172A",
                }}
              >
                Sign In to Your Workspace
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#475569",
                  marginTop: "4px",
                  lineHeight: 1.45,
                  fontWeight: 500,
                }}
              >
                Enter your university email or ID. Students open directly into the Mobile Attendance Gate PWA.
              </p>
            </div>

            {nextParam && nextParam !== "/" && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "#EFF6FF",
                  border: "2px solid #2563EB",
                  fontSize: "0.79rem",
                  color: "#1E3A8A",
                  fontWeight: 600,
                  wordBreak: "break-word",
                }}
              >
                Sign in to continue to{" "}
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                  {nextParam}
                </span>
                .
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                style={{
                  marginBottom: "14px",
                  padding: "11px 13px",
                  borderRadius: "8px",
                  background: "#FEE2E2",
                  border: "2px solid #DC2626",
                  fontSize: "0.81rem",
                  color: "#991B1B",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label htmlFor="login-identifier" className="form-label">
                  Institutional Email or ID
                </label>
                <input
                  ref={identifierInputRef}
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (selectedPresetId) setSelectedPresetId(null);
                  }}
                  placeholder="e.g. j.miller@student.edu or STU-2026-104"
                  className="form-input"
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="go"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (selectedPresetId) setSelectedPresetId(null);
                    }}
                    placeholder="Enter institutional password"
                    className="form-input"
                    style={{ paddingRight: "48px" }}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "4px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "40px",
                      height: "40px",
                      background: "transparent",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "12px 18px",
                  fontSize: "0.9rem",
                  marginTop: "2px",
                }}
              >
                <LogIn size={17} />
                {submitting ? "Verifying Credentials..." : "Sign In to Portal"}
              </button>
            </form>

            {/* Student 1-Tap Phone Shortcut */}
            {studentPreset && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "11px 12px",
                  borderRadius: "10px",
                  background: "#F0FDF4",
                  border: "2px solid #0F172A",
                  boxShadow: "2px 2px 0px #0F172A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 900, color: "#166534", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Smartphone size={13} /> STUDENT PHONE CHECK-IN
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "#334155", fontWeight: 600, marginTop: "2px" }}>
                    {studentPreset.name} · {studentPreset.institutionalId}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    void handlePresetSignIn(studentPreset.institutionalId, studentPreset.email)
                  }
                  className="btn btn-success btn-sm"
                  style={{ minHeight: "38px", padding: "7px 12px", fontSize: "0.74rem" }}
                >
                  <LogIn size={13} /> 1-Tap Student Sign In
                </button>
              </div>
            )}

            <div
              style={{
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "2px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.76rem",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={15} color="#16A34A" style={{ flexShrink: 0 }} />
              <span>
                Self-registration is disabled. Accounts are provisioned by the Registrar / Dean.
              </span>
            </div>
          </div>

          {/* Right: Seeded Role Quick-Fill Directory */}
          <div className="glass-panel login-presets-card">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "14px",
                paddingBottom: "12px",
                borderBottom: "2px solid #E2E8F0",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 900,
                    color: "#0F172A",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                  }}
                >
                  <UserCheck size={17} color="#2563EB" />
                  All Role Test Accounts
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "3px", fontWeight: 500 }}>
                  Fill the form or sign in directly to switch between faculty and student roles.
                </p>
              </div>
              <span className="code-pill" style={{ fontSize: "0.72rem" }}>
                Pass: {defaultPassHint}
              </span>
            </div>

            <div className="login-presets-list">
              {liveAccounts.map((preset) => {
                const isSelected = selectedPresetId === preset.institutionalId;
                return (
                  <div
                    key={preset.institutionalId}
                    className="login-preset-row"
                    style={{
                      background: isSelected ? "#EFF6FF" : "#F8FAFC",
                      border: isSelected ? "2.5px solid #2563EB" : "2px solid #0F172A",
                      boxShadow: isSelected ? "3px 3px 0px #2563EB" : "2px 2px 0px #0F172A",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            border: "1.5px solid #0F172A",
                            background: preset.accentBg,
                            color: preset.accentText,
                            letterSpacing: "0.03em",
                          }}
                        >
                          {preset.role}
                        </span>
                        <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#0F172A" }}>
                          {preset.name}
                        </span>
                        {preset.role === "Student" && (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              fontWeight: 900,
                              padding: "1px 5px",
                              borderRadius: "4px",
                              background: "#DCFCE7",
                              color: "#166534",
                              border: "1px solid #166534",
                            }}
                          >
                            MOBILE PWA
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontFamily: "var(--font-mono)",
                          color: "#475569",
                          marginTop: "5px",
                          fontWeight: 600,
                          wordBreak: "break-word",
                        }}
                      >
                        {preset.institutionalId} · {preset.email}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748B",
                          marginTop: "3px",
                          fontWeight: 500,
                          lineHeight: 1.35,
                        }}
                      >
                        {preset.scopeSummary}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handlePresetFill(preset.institutionalId, preset.email)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          minHeight: "36px",
                          padding: "6px 10px",
                          fontSize: "0.72rem",
                          background: isSelected ? "#DBEAFE" : "#FFFFFF",
                          color: isSelected ? "#1E3A8A" : "#0F172A",
                        }}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 size={13} /> Filled
                          </>
                        ) : (
                          "Fill"
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          void handlePresetSignIn(preset.institutionalId, preset.email)
                        }
                        className="btn btn-primary btn-sm"
                        style={{
                          minHeight: "36px",
                          padding: "6px 10px",
                          fontSize: "0.72rem",
                        }}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PWA Install Instructions Modal */}
      {showInstallModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowInstallModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-login-install-title"
        >
          <div
            className="modal-content"
            style={{ maxWidth: "430px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={20} color="#2563EB" />
                <h3 id="pwa-login-install-title" style={{ fontSize: "1.02rem", fontWeight: 900 }}>
                  Install Student Attendance PWA
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setShowInstallModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ width: "36px", height: "36px", padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#334155", lineHeight: 1.5, marginBottom: "14px" }}>
              Install <strong>AcadCoord</strong> to your phone home screen for full-screen mobile
              check-ins, quick quizzes, and cached lecture notes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.81rem", color: "#0F172A" }}>
              <div style={{ padding: "10px 12px", background: "#EFF6FF", border: "2px solid #0F172A", borderRadius: "8px" }}>
                <strong>iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> icon, then select{" "}
                <strong>Add to Home Screen</strong>.
              </div>
              <div style={{ padding: "10px 12px", background: "#ECFDF5", border: "2px solid #0F172A", borderRadius: "8px" }}>
                <strong>Android (Chrome):</strong> Open the <strong>⋮ menu</strong> and tap{" "}
                <strong>Install app</strong> / <strong>Add to Home screen</strong>.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "16px", minHeight: "44px" }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-centered-shell">
          <div className="glass-panel" style={{ margin: "auto 0", padding: "24px 28px", fontSize: "0.9rem", fontWeight: 800 }}>
            Loading Institutional Sign In...
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
