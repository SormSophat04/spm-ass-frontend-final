"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarOff,
  FileText,
  GraduationCap,
  HelpCircle,
  LogOut,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  MODULE_CONFIG,
  canAccessModule,
  getAllowedModulesForRole,
  type AuthenticatedUser,
  type ModuleId,
} from "@/lib/rbac";

interface NavbarProps {
  activeTab: ModuleId;
  currentUser: AuthenticatedUser;
  onLogout: () => Promise<void> | void;
}

const MODULE_ICONS: Record<ModuleId, React.ComponentType<{ size?: number; className?: string }>> = {
  lifecycle: BookOpen,
  attendance: UserCheck,
  leaves: CalendarOff,
  notes: FileText,
  quizzes: HelpCircle,
  roles: ShieldCheck,
  audit: Activity,
};

function getRoleBadgeColors(role: string): { bg: string; color: string } {
  switch (role) {
    case "Dean":
      return { bg: "#FEF3C7", color: "#B45309" };
    case "Professor":
      return { bg: "#DBEAFE", color: "#1D4ED8" };
    case "Teaching Assistant":
      return { bg: "#E0E7FF", color: "#4338CA" };
    case "Student":
      return { bg: "#DCFCE7", color: "#15803D" };
    case "Auditor":
      return { bg: "#F1F5F9", color: "#334155" };
    default:
      return { bg: "#F1F5F9", color: "#0F172A" };
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Navbar({ activeTab, currentUser, onLogout }: NavbarProps) {
  const allowedModules = getAllowedModulesForRole(currentUser.role, currentUser.allowed_modules);
  const visibleModules = MODULE_CONFIG.filter((mod) =>
    canAccessModule(currentUser.role, mod.id, allowedModules)
  );
  const roleBadgeStyle = getRoleBadgeColors(currentUser.role);

  return (
    <aside
      aria-label="Role Navigation Sidebar"
      className="portal-sidebar-aside"
    >
      <div>
        {/* Brand Block */}
        <div
          style={{
            padding: "1.15rem 1.25rem",
            borderBottom: "2.5px solid #0F172A",
            background: "#F8FAFC",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
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
              <GraduationCap size={20} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  color: "#0F172A",
                  letterSpacing: "-0.02em",
                }}
              >
                AcadCoord
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "#64748B",
                }}
              >
                INSTITUTIONAL PORTAL
              </div>
            </div>
          </div>
        </div>

        {/* Authenticated User Identity Card (Login-Only, No Impersonation Switcher) */}
        <div
          style={{
            margin: "1rem",
            padding: "0.85rem",
            background: "#F8FAFC",
            border: "2.5px solid #0F172A",
            borderRadius: "10px",
            boxShadow: "3px 3px 0px #0F172A",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "0.55rem",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                color: "#64748B",
              }}
            >
              Authenticated Session
            </span>
            <span
              data-testid="navbar-role-badge"
              style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                border: "1.5px solid #0F172A",
                background: roleBadgeStyle.bg,
                color: roleBadgeStyle.color,
              }}
            >
              {currentUser.role}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: currentUser.avatar_color || "#2563EB",
                color: "#FFFFFF",
                border: "2px solid #0F172A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.78rem",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {getInitials(currentUser.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.86rem",
                  color: "#0F172A",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentUser.name}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentUser.institutional_id} · {currentUser.department}
              </div>
              {currentUser.email_verified && (
                <div
                  style={{
                    marginTop: "0.25rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.64rem",
                    fontWeight: 800,
                    color: "#166534",
                    background: "#DCFCE7",
                    border: "1px solid #166534",
                    borderRadius: "4px",
                    padding: "1px 5px",
                  }}
                >
                  OTP Verified · {currentUser.email}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: "0.6rem",
              paddingTop: "0.5rem",
              borderTop: "1.5px dashed #CBD5E1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.7rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            <span>Visible Routes</span>
            <span className="code-pill" style={{ fontSize: "0.68rem" }}>
              {visibleModules.length} / {MODULE_CONFIG.length} Modules
            </span>
          </div>
        </div>

        {/* Role-Filtered Navigation Links */}
        <nav aria-label="Module Navigation" style={{ padding: "0 0.85rem 1rem" }}>
          <div
            style={{
              fontSize: "0.66rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#64748B",
              padding: "0.25rem 0.35rem 0.5rem",
            }}
          >
            Authorized Modules ({currentUser.role})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {visibleModules.map((tab) => {
              const Icon = MODULE_ICONS[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  data-testid={`nav-link-${tab.id}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.65rem",
                    padding: "0.65rem 0.75rem",
                    borderRadius: "10px",
                    textDecoration: "none",
                    background: isActive ? "#2563EB" : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : "#0F172A",
                    border: "2px solid #0F172A",
                    boxShadow: isActive ? "3px 3px 0px #0F172A" : "2px 2px 0px #CBD5E1",
                    transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  }}
                >
                  <div
                    style={{
                      marginTop: "0.1rem",
                      color: isActive ? "#FFFFFF" : "#2563EB",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        lineHeight: 1.25,
                      }}
                    >
                      {tab.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        marginTop: "0.15rem",
                        color: isActive ? "#DBEAFE" : "#64748B",
                        fontWeight: 500,
                      }}
                    >
                      {tab.desc}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Sign Out Bar */}
      <div
        style={{
          padding: "0.9rem 1rem",
          borderTop: "2.5px solid #0F172A",
          background: "#F8FAFC",
        }}
      >
        <button
          type="button"
          onClick={() => void onLogout()}
          data-testid="navbar-signout-btn"
          className="btn btn-secondary"
          style={{
            width: "100%",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.8rem",
            background: "#FFFFFF",
            color: "#DC2626",
            borderColor: "#0F172A",
          }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
