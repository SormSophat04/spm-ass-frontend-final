"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Lock, LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  MODULE_CONFIG,
  canAccessModule,
  getAllowedModulesForRole,
  getDefaultModulePath,
  getModuleLabel,
  hasAnyRole,
  type AcademicRole,
  type ModuleId,
} from "@/lib/rbac";

interface ProtectedRouteProps {
  requiredModule?: ModuleId;
  allowedRoles?: AcademicRole[];
  children: React.ReactNode;
}

const fullCenterStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  overflowY: "auto",
  padding: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function ProtectedRoute({
  requiredModule,
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const nextTarget = pathname && pathname !== "/login" ? pathname : "/";
      router.replace(`/login?next=${encodeURIComponent(nextTarget)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div style={fullCenterStyle}>
        <div
          className="glass-panel"
          style={{
            maxWidth: "430px",
            width: "100%",
            padding: "32px",
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
            <Lock size={24} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 900, color: "#0F172A" }}>
            {loading ? "Validating Institutional Session..." : "Authentication Required"}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>
            {loading
              ? "Loading your role permissions and module access policy."
              : "Redirecting to the institutional sign-in portal..."}
          </p>
        </div>
      </div>
    );
  }

  const modulePermitted = requiredModule
    ? canAccessModule(user.role, requiredModule, user.allowed_modules)
    : true;
  const rolePermitted = allowedRoles ? hasAnyRole(user.role, allowedRoles) : true;

  if (!modulePermitted || !rolePermitted) {
    const allowedModuleIds = getAllowedModulesForRole(user.role, user.allowed_modules);
    const permittedModules = MODULE_CONFIG.filter((m) => allowedModuleIds.includes(m.id));
    const defaultPath = getDefaultModulePath(user.role, user.allowed_modules);

    return (
      <div style={fullCenterStyle}>
        <div
          role="alert"
          data-testid="route-access-denied"
          className="glass-panel"
          style={{
            maxWidth: "640px",
            width: "100%",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              paddingBottom: "16px",
              borderBottom: "2px solid #E2E8F0",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  background: "#FEE2E2",
                  color: "#DC2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2.5px solid #0F172A",
                  boxShadow: "3px 3px 0px #0F172A",
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={24} />
              </div>
              <div>
                <span className="badge badge-absent" style={{ marginBottom: "6px" }}>
                  HTTP 403 · ROUTE PROTECTED
                </span>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0F172A" }}>
                  Access Restricted for {user.role}
                </h1>
              </div>
            </div>
            <span className="code-pill" style={{ fontSize: "0.78rem" }}>
              {user.institutional_id}
            </span>
          </div>

          <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.55, fontWeight: 500 }}>
            Your signed-in role (<strong style={{ color: "#0F172A" }}>{user.role}</strong>) does not
            have institutional authorization to view{" "}
            <strong style={{ color: "#0F172A" }}>
              {requiredModule ? getModuleLabel(requiredModule) : pathname}
            </strong>
            . Choose an authorized route below or sign out to switch credentials.
          </p>

          <div
            style={{
              background: "#F8FAFC",
              padding: "16px",
              borderRadius: "10px",
              border: "2px solid #0F172A",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                marginBottom: "10px",
              }}
            >
              Authorized Routes for {user.role} ({permittedModules.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {permittedModules.map((mod) => (
                <Link
                  key={mod.id}
                  href={mod.path}
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: "none" }}
                >
                  {mod.label}
                </Link>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              paddingTop: "4px",
            }}
          >
            <Link href={defaultPath} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              Return to Authorized Portal <ArrowRight size={15} />
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="btn btn-secondary btn-sm"
              style={{ color: "#DC2626" }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
