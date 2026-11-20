"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LogIn,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  UserCheck,
  WifiOff,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";
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

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

interface OtpServiceStatus {
  configured: boolean;
  provider: string | null;
  expiry_minutes: number;
  resend_cooldown_seconds: number;
  otp_length: number;
}

interface ActiveOtpMeta {
  email: string;
  maskedEmail: string;
  accountExists: boolean;
  existingRole: string | null;
  existingName: string | null;
  provider: string;
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

const EMPTY_OTP_DIGITS = ["", "", "", "", "", ""];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login, verifyEmailOtp } = useAuth();
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);
  const otpEmailInputRef = useRef<HTMLInputElement | null>(null);
  const otpDigitRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Tab switch: Real Email OTP (default) vs Institutional Password / ID
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");

  // Email OTP flow state
  const [otpStep, setOtpStep] = useState<"email" | "verify">("email");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpName, setOtpName] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(EMPTY_OTP_DIGITS);
  const [otpStatus, setOtpStatus] = useState<OtpServiceStatus | null>(null);
  const [otpMeta, setOtpMeta] = useState<ActiveOtpMeta | null>(null);
  const [otpExpiryLeft, setOtpExpiryLeft] = useState(0);
  const [otpResendLeft, setOtpResendLeft] = useState(0);
  const [otpInfoMsg, setOtpInfoMsg] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);

  // Password login state
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

  // Load OTP delivery status & demo accounts from backend
  useEffect(() => {
    let active = true;

    api.auth
      .getOtpStatus()
      .then((res) => {
        if (!active || !res) return;
        setOtpStatus({
          configured: Boolean(res.configured),
          provider: res.provider ?? null,
          expiry_minutes: res.expiry_minutes ?? 5,
          resend_cooldown_seconds: res.resend_cooldown_seconds ?? 45,
          otp_length: res.otp_length ?? 6,
        });
      })
      .catch(() => {
        // Ignore status check error if backend is booting
      });

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

  // Countdown tick for OTP expiration and resend cooldown
  useEffect(() => {
    if (otpExpiryLeft <= 0 && otpResendLeft <= 0) return;
    const timer = window.setInterval(() => {
      setOtpExpiryLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpResendLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiryLeft, otpResendLeft]);

  useEffect(() => {
    if (!loading && user) {
      const target = resolvePostLoginPath(nextParam, user);
      router.replace(target);
    }
  }, [loading, user, nextParam, router]);

  const executeLogin = async (rawIdentifier: string, rawPassword: string) => {
    setErrorMsg(null);
    setOtpInfoMsg(null);
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(identifier, password);
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setOtpInfoMsg(null);

    const trimmedEmail = otpEmail.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Enter a valid real email address (e.g. you@gmail.com).");
      otpEmailInputRef.current?.focus();
      return;
    }

    setOtpBusy(true);
    try {
      const res = await api.auth.requestEmailOtp(trimmedEmail, otpName.trim() || undefined);
      setOtpMeta({
        email: res.email,
        maskedEmail: res.masked_email,
        accountExists: res.account_exists,
        existingRole: res.existing_role,
        existingName: res.existing_name,
        provider: res.provider,
      });
      setOtpDigits([...EMPTY_OTP_DIGITS]);
      setOtpExpiryLeft(res.expires_in_seconds || 300);
      setOtpResendLeft(res.resend_cooldown_seconds || 45);
      setOtpStep("verify");
      setOtpInfoMsg(res.message);
      window.setTimeout(() => {
        otpDigitRefs.current[0]?.focus();
      }, 60);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.retryAfterSeconds) {
        setOtpResendLeft(err.retryAfterSeconds);
      }
      const message =
        err instanceof Error
          ? err.message
          : "Unable to send OTP verification email. Please check backend email configuration.";
      setErrorMsg(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const submitOtpCode = async (codeValue: string) => {
    setErrorMsg(null);
    const targetEmail = (otpMeta?.email || otpEmail).trim().toLowerCase();
    const cleanedCode = codeValue.replace(/\D/g, "");
    if (cleanedCode.length !== 6) {
      setErrorMsg("Enter all 6 digits from your verification email.");
      return;
    }

    setOtpBusy(true);
    try {
      const { user: authenticatedUser } = await verifyEmailOtp(
        targetEmail,
        cleanedCode,
        otpName.trim() || undefined
      );
      const target = resolvePostLoginPath(nextParam, authenticatedUser);
      router.replace(target);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "OTP verification failed. Please check the code and try again.";
      setErrorMsg(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitOtpCode(otpDigits.join(""));
  };

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    setErrorMsg(null);
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    if (digitsOnly.length > 1) {
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6 && i < digitsOnly.length; i += 1) {
        const targetIdx = index + i < 6 ? index + i : i;
        if (targetIdx < 6) {
          nextDigits[targetIdx] = digitsOnly[i];
        }
      }
      setOtpDigits(nextDigits);
      const focusIdx = Math.min(5, index + digitsOnly.length);
      otpDigitRefs.current[focusIdx]?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = digitsOnly[0];
    setOtpDigits(updated);
    if (index < 5) {
      otpDigitRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpDigits[index]) {
        const updated = [...otpDigits];
        updated[index] = "";
        setOtpDigits(updated);
      } else if (index > 0) {
        const updated = [...otpDigits];
        updated[index - 1] = "";
        setOtpDigits(updated);
        otpDigitRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpDigitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpDigitRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const nextDigits = [...EMPTY_OTP_DIGITS];
    for (let i = 0; i < pasted.length; i += 1) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    setErrorMsg(null);
    const focusIdx = Math.min(5, Math.max(0, pasted.length - 1));
    otpDigitRefs.current[focusIdx]?.focus();
  };

  const handleChangeOtpEmail = () => {
    setOtpStep("email");
    setOtpDigits([...EMPTY_OTP_DIGITS]);
    setErrorMsg(null);
    setOtpInfoMsg(null);
    window.setTimeout(() => {
      otpEmailInputRef.current?.focus();
    }, 40);
  };

  const handleSwitchMode = (mode: "otp" | "password") => {
    setLoginMode(mode);
    setErrorMsg(null);
    setOtpInfoMsg(null);
  };

  const handlePresetFill = (institutionalId: string, email: string) => {
    setLoginMode("password");
    setIdentifier(email);
    setPassword(defaultPassHint);
    setSelectedPresetId(institutionalId);
    setErrorMsg(null);
    setOtpInfoMsg(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handlePresetSignIn = async (institutionalId: string, email: string) => {
    setLoginMode("password");
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

  const anyBusy = submitting || otpBusy;
  const otpCodeJoined = otpDigits.join("");

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
                EMAIL OTP VERIFICATION &amp; ROLE-GATED ATTENDANCE PWA
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                background: otpStatus?.configured ? "#DCFCE7" : "#FEF3C7",
                color: otpStatus?.configured ? "#166534" : "#92400E",
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
              <Mail size={13} />
              {otpStatus?.configured
                ? `EMAIL OTP · ${(otpStatus.provider || "SMTP").toUpperCase()} READY`
                : "EMAIL OTP · SETUP NEEDED"}
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
          {/* Left: Login Form with Email OTP & Password Tabs */}
          <div ref={formCardRef} className="glass-panel login-form-card">
            {/* Mode Switcher */}
            <div className="login-mode-tabs" role="tablist" aria-label="Sign-in method">
              <button
                type="button"
                role="tab"
                aria-selected={loginMode === "otp"}
                className={`login-mode-tab${loginMode === "otp" ? " active" : ""}`}
                onClick={() => handleSwitchMode("otp")}
                disabled={anyBusy}
              >
                <Mail size={15} />
                Email OTP Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMode === "password"}
                className={`login-mode-tab${loginMode === "password" ? " active" : ""}`}
                onClick={() => handleSwitchMode("password")}
                disabled={anyBusy}
              >
                <KeyRound size={15} />
                Password / Demo ID
              </button>
            </div>

            <div
              style={{
                marginBottom: "18px",
                paddingBottom: "14px",
                borderBottom: "2px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <span
                  className="badge"
                  style={{
                    background: loginMode === "otp" ? "#DCFCE7" : "#DBEAFE",
                    color: loginMode === "otp" ? "#166534" : "#1E3A8A",
                  }}
                >
                  {loginMode === "otp" ? (
                    <>
                      <ShieldCheck size={12} /> 6-Digit Email OTP
                    </>
                  ) : (
                    <>
                      <KeyRound size={12} /> Institutional Sign In
                    </>
                  )}
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
                {loginMode === "otp"
                  ? otpStep === "email"
                    ? "Sign In with Real Email"
                    : "Enter Verification Code"
                  : "Sign In with Password"}
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
                {loginMode === "otp"
                  ? otpStep === "email"
                    ? "We will send a real 6-digit OTP to your inbox. New emails are automatically provisioned & enrolled as a Student."
                    : `Check your inbox for the 6-digit verification code sent to ${otpMeta?.email || otpEmail}.`
                  : "Enter your institutional email or university ID and password."}
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

            {otpInfoMsg && loginMode === "otp" && (
              <div
                role="status"
                style={{
                  marginBottom: "14px",
                  padding: "11px 13px",
                  borderRadius: "8px",
                  background: "#DCFCE7",
                  border: "2px solid #16A34A",
                  fontSize: "0.8rem",
                  color: "#166534",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{otpInfoMsg}</span>
              </div>
            )}

            {/* TAB 1: REAL EMAIL + OTP VERIFICATION */}
            {loginMode === "otp" ? (
              <>
                {otpStatus && !otpStatus.configured && (
                  <div
                    style={{
                      marginBottom: "15px",
                      padding: "11px 13px",
                      borderRadius: "8px",
                      background: "#FEF3C7",
                      border: "2px solid #0F172A",
                      boxShadow: "2px 2px 0px #0F172A",
                      fontSize: "0.77rem",
                      color: "#92400E",
                      lineHeight: 1.45,
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: "4px", color: "#78350F" }}>
                      Email SMTP / Resend Not Configured Yet
                    </div>
                    Copy <code style={{ fontFamily: "var(--font-mono)" }}>backend/.env.example</code> to{" "}
                    <code style={{ fontFamily: "var(--font-mono)" }}>backend/.env</code>, add your Gmail App Password
                    (or <code style={{ fontFamily: "var(--font-mono)" }}>RESEND_API_KEY</code>), and restart the backend
                    to deliver real OTP emails.
                  </div>
                )}

                {otpStep === "email" ? (
                  <form
                    onSubmit={handleRequestOtp}
                    noValidate
                    style={{ display: "flex", flexDirection: "column", gap: "15px" }}
                  >
                    <div>
                      <label htmlFor="otp-email-input" className="form-label">
                        Real Email Address
                      </label>
                      <input
                        ref={otpEmailInputRef}
                        id="otp-email-input"
                        name="email"
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        value={otpEmail}
                        onChange={(e) => {
                          setOtpEmail(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="e.g. your.name@gmail.com"
                        className="form-input"
                        disabled={otpBusy}
                      />
                    </div>

                    <div>
                      <label htmlFor="otp-name-input" className="form-label">
                        Full Name{" "}
                        <span style={{ fontWeight: 600, color: "#64748B", textTransform: "none" }}>
                          (Optional — for first-time Student profile)
                        </span>
                      </label>
                      <input
                        id="otp-name-input"
                        name="name"
                        type="text"
                        autoComplete="name"
                        enterKeyHint="send"
                        value={otpName}
                        onChange={(e) => setOtpName(e.target.value)}
                        placeholder="e.g. Alex Nguyen"
                        className="form-input"
                        disabled={otpBusy}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={otpBusy}
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        minHeight: "48px",
                        padding: "12px 18px",
                        fontSize: "0.9rem",
                        marginTop: "2px",
                      }}
                    >
                      <Send size={16} />
                      {otpBusy ? "Sending OTP Email..." : "Send 6-Digit OTP Code"}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleVerifyOtpSubmit}
                    noValidate
                    style={{ display: "flex", flexDirection: "column", gap: "15px" }}
                  >
                    {/* Target Email & Timer Summary */}
                    <div
                      style={{
                        padding: "11px 13px",
                        borderRadius: "10px",
                        background: "#F8FAFC",
                        border: "2px solid #0F172A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            color: "#475569",
                            textTransform: "uppercase",
                          }}
                        >
                          Code Sent To
                        </div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 800,
                            color: "#0F172A",
                            wordBreak: "break-all",
                          }}
                        >
                          {otpMeta?.email || otpEmail}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 600, marginTop: "2px" }}>
                          {otpMeta?.accountExists
                            ? `Registered ${otpMeta.existingRole || "Account"}${otpMeta.existingName ? ` · ${otpMeta.existingName}` : ""}`
                            : "New email · Will auto-enroll as Student"}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          className="code-pill"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: otpExpiryLeft > 0 ? "#DBEAFE" : "#FEE2E2",
                            fontSize: "0.72rem",
                          }}
                        >
                          <Clock size={12} />
                          {otpExpiryLeft > 0 ? formatCountdown(otpExpiryLeft) : "Expired"}
                        </span>
                        <button
                          type="button"
                          onClick={handleChangeOtpEmail}
                          disabled={otpBusy}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "5px 9px", fontSize: "0.7rem" }}
                        >
                          <ArrowLeft size={12} /> Change
                        </button>
                      </div>
                    </div>

                    {/* 6-Digit OTP Boxes */}
                    <div>
                      <label htmlFor="otp-digit-0" className="form-label">
                        6-Digit Verification Code
                      </label>
                      <div className="otp-digit-grid" role="group" aria-label="6-digit verification code">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpDigitRefs.current[idx] = el;
                            }}
                            id={`otp-digit-${idx}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete={idx === 0 ? "one-time-code" : "off"}
                            aria-label={`Verification code digit ${idx + 1}`}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpDigitKeyDown(idx, e)}
                            onPaste={handleOtpPaste}
                            disabled={otpBusy}
                            className="otp-digit-input"
                          />
                        ))}
                      </div>
                    </div>

                    {otpMeta && !otpMeta.accountExists && !otpName.trim() && (
                      <div>
                        <label htmlFor="otp-verify-name" className="form-label">
                          Your Display Name{" "}
                          <span style={{ fontWeight: 600, color: "#64748B", textTransform: "none" }}>
                            (Optional)
                          </span>
                        </label>
                        <input
                          id="otp-verify-name"
                          type="text"
                          value={otpName}
                          onChange={(e) => setOtpName(e.target.value)}
                          placeholder="Leave blank to use email prefix"
                          className="form-input"
                          disabled={otpBusy}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={otpBusy || otpCodeJoined.length !== 6}
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        minHeight: "48px",
                        padding: "12px 18px",
                        fontSize: "0.9rem",
                      }}
                    >
                      <ShieldCheck size={17} />
                      {otpBusy ? "Verifying OTP..." : "Verify Code & Sign In"}
                    </button>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        flexWrap: "wrap",
                        fontSize: "0.76rem",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      <span>Didn&apos;t receive the email? Check Spam/Junk or resend.</span>
                      <button
                        type="button"
                        onClick={() => void handleRequestOtp()}
                        disabled={otpBusy || otpResendLeft > 0}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "5px 10px", fontSize: "0.72rem" }}
                      >
                        <RefreshCw size={12} />
                        {otpResendLeft > 0 ? `Resend in ${otpResendLeft}s` : "Resend OTP"}
                      </button>
                    </div>
                  </form>
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
                    Verified real emails sign in with their assigned role, or auto-provision as an enrolled Student.
                  </span>
                </div>
              </>
            ) : (
              /* TAB 2: INSTITUTIONAL PASSWORD / DEMO LOGIN */
              <>
                <form
                  onSubmit={handlePasswordSubmit}
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
                      <div
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Smartphone size={13} /> STUDENT PHONE CHECK-IN
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "#334155", fontWeight: 600, marginTop: "2px" }}>
                        {studentPreset.name} · {studentPreset.institutionalId}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={anyBusy}
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
                    Prefer passwordless login? Switch to the Email OTP tab to sign in with any real email.
                  </span>
                </div>
              </>
            )}
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
                  Fill the password form or sign in directly to test faculty &amp; student roles.
                </p>
              </div>
              <span className="code-pill" style={{ fontSize: "0.72rem" }}>
                Pass: {defaultPassHint}
              </span>
            </div>

            <div className="login-presets-list">
              {liveAccounts.map((preset) => {
                const isSelected = selectedPresetId === preset.institutionalId && loginMode === "password";
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
                        disabled={anyBusy}
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
                        disabled={anyBusy}
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
