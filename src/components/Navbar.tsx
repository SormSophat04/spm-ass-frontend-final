"use client";

import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  ShieldCheck, 
  ChevronDown, 
  Layers, 
  Clock, 
  FileText, 
  Vote, 
  Sliders, 
  History,
  Radio,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  onUserChanged: () => void;
}

export default function Navbar({ activeTab, setActiveTab, currentUser, onUserChanged }: NavbarProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    api.auth.getUsers().then((res) => {
      if (res.success) setUsers(res.users);
    }).catch(console.error);
  }, []);

  const handleSwitchUser = async (userId: number) => {
    setSwitching(true);
    try {
      await api.auth.switchUser(userId);
      setDropdownOpen(false);
      onUserChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBg = (role: string) => {
    switch (role) {
      case "Dean": return "#C4B5FD";
      case "Professor": return "#FFDE59";
      case "Teaching Assistant": return "#7DD3FC";
      case "Student": return "#86EFAC";
      case "Auditor": return "#FDBA74";
      default: return "#E2E8F0";
    }
  };

  const tabs = [
    { id: "lifecycle", label: "1. Lifecycle & Gates", short: "Lifecycle", icon: Layers, tag: "Gate Alpha", color: "#FFE600" },
    { id: "attendance", label: "2. Attendance & Duration", short: "Attendance", icon: Clock, tag: "Live Sync", color: "#86EFAC" },
    { id: "leaves", label: "3. Excused Leaves", short: "Leaves", icon: ShieldCheck, tag: "Routing", color: "#C4B5FD" },
    { id: "notes", label: "4. Syllabus MOM & Notes", short: "MOM Notes", icon: FileText, tag: "PDF Docs", color: "#7DD3FC" },
    { id: "quizzes", label: "5. Live Polling & Quiz", short: "Live Quizzes", icon: Vote, tag: "Real-time", color: "#FDA4AF" },
    { id: "roles", label: "6. Roles & Scopes", short: "Roles", icon: Sliders, tag: "5 Tiers", color: "#FDE047" },
    { id: "audit", label: "7. Audit & Compliance", short: "Audit Trail", icon: History, tag: "Accredited", color: "#A7F3D0" },
  ];

  return (
    <aside style={{
      width: "295px",
      minWidth: "295px",
      maxWidth: "295px",
      height: "100vh",
      background: "#FFFDF7",
      borderRight: "3px solid #000000",
      boxShadow: "4px 0 0 #000000",
      display: "flex",
      flexDirection: "column",
      zIndex: 100,
      flexShrink: 0,
      overflow: "hidden"
    }}>
      {/* 1. University Brand Header */}
        <div style={{
          padding: "20px 18px",
          borderBottom: "3px solid #000000",
          background: "#FFE600",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            borderRadius: "8px",
            background: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "3px 3px 0px rgba(0, 0, 0, 0.4)",
            border: "2px solid #000000"
          }}>
            <GraduationCap size={24} color="#FFE600" />
          </div>

          <div>
            <div style={{ fontSize: "1rem", fontWeight: 900, color: "#000000", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Academic Coordinator
            </div>
            <div style={{ fontSize: "0.75rem", color: "#000000", fontWeight: 700, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Faculty SIS Portal</span>
              <span>•</span>
              <span className="code-pill" style={{ padding: "1px 6px", fontSize: "0.7rem", background: "#FFFFFF" }}>
                Fall 2026
              </span>
            </div>
          </div>
        </div>

        {/* User Persona Switcher Card */}
        <div style={{ 
          padding: "16px 16px", 
          borderBottom: "2.5px solid #000000", 
          background: "#F5F2EB",
          flexShrink: 0,
          position: "relative",
          zIndex: 110
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#000000", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
            ⚡ Active Simulation Persona
          </div>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#FFFFFF",
                border: "2.5px solid #000000",
                boxShadow: "3px 3px 0px #000000",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "#000000",
                cursor: "pointer",
                transition: "all 0.12s ease",
                textAlign: "left"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "4px 4px 0px #000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "3px 3px 0px #000000";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  borderRadius: "6px",
                  background: getRoleBg(currentUser?.role || ""),
                  border: "2px solid #000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  color: "#000000"
                }}>
                  {currentUser?.name ? currentUser.name.charAt(0) : "U"}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#000000", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                    {currentUser?.name || "Loading..."}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#1F2937", fontWeight: 700 }}>
                    {currentUser?.role} • {currentUser?.institutional_id}
                  </div>
                </div>
              </div>
              <ChevronDown size={16} color="#000000" style={{ marginLeft: "4px" }} />
            </button>

            {/* Dropdown Menu for quick role switching */}
            {dropdownOpen && (
              <div style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "110%",
                background: "#FFFFFF",
                border: "3px solid #000000",
                borderRadius: "10px",
                boxShadow: "6px 6px 0px #000000",
                padding: "8px",
                zIndex: 300
              }}>
                <div style={{ padding: "6px 8px", fontSize: "0.72rem", fontWeight: 800, color: "#000000", borderBottom: "2px solid #000000", textTransform: "uppercase" }}>
                  Select persona to test workflows:
                </div>
                <div style={{ maxHeight: "240px", overflowY: "auto", marginTop: "6px" }}>
                  {users.map((u) => {
                    const isCurrent = u.id === currentUser?.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSwitchUser(u.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          background: isCurrent ? "#FEF08A" : "transparent",
                          border: isCurrent ? "2px solid #000000" : "2px solid transparent",
                          marginBottom: "4px",
                          transition: "all 0.1s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) {
                            e.currentTarget.style.background = "#F3F4F6";
                            e.currentTarget.style.border = "2px solid #000000";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.border = "2px solid transparent";
                          }
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#000000" }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#4B5563", fontWeight: 600 }}>
                            {u.role}
                          </div>
                        </div>
                        <span className="badge" style={{ background: getRoleBg(u.role), fontSize: "0.65rem", padding: "2px 6px" }}>
                          {u.institutional_id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vertical Navigation Menu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#000000", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px 8px" }}>
            Modules & Specifications
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: isActive ? tab.color : "#FFFFFF",
                    border: "2.5px solid #000000",
                    boxShadow: isActive ? "4px 4px 0px #000000" : "2px 2px 0px #000000",
                    transform: isActive ? "translate(-1.5px, -1.5px)" : "none",
                    color: "#000000",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#FFFBEB";
                      e.currentTarget.style.transform = "translate(-1px, -1px)";
                      e.currentTarget.style.boxShadow = "3px 3px 0px #000000";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#FFFFFF";
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "2px 2px 0px #000000";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      padding: "4px",
                      background: "#000000",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Icon size={14} color="#FFFFFF" />
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>
                      {tab.label}
                    </span>
                  </div>

                  <span className="code-pill" style={{
                    fontSize: "0.68rem",
                    padding: "2px 6px",
                    background: isActive ? "#FFFFFF" : "#FEF9C3",
                    border: "1.5px solid #000000",
                    boxShadow: "1px 1px 0px #000000"
                  }}>
                    {tab.tag}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

      {/* Bottom Area: Institutional Compliance Status */}
      <div style={{
        padding: "16px",
        borderTop: "3px solid #000000",
        background: "#F5F2EB",
        flexShrink: 0
      }}>
        <div style={{
          background: "#FFFFFF",
          border: "2px solid #000000",
          boxShadow: "3px 3px 0px #000000",
          borderRadius: "8px",
          padding: "10px 12px"
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#000000", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22C55E", border: "1px solid #000000" }} />
            Accreditation Protocol Active
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.7rem", fontWeight: 700, color: "#374151" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>API (Flask):</span>
              <span className="code-pill" style={{ padding: "1px 4px", fontSize: "0.65rem", background: "#86EFAC" }}>Port 5000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Database:</span>
              <span className="code-pill" style={{ padding: "1px 4px", fontSize: "0.65rem", background: "#7DD3FC" }}>PostgreSQL Sync</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Integrity:</span>
              <span className="code-pill" style={{ padding: "1px 4px", fontSize: "0.65rem", background: "#C4B5FD" }}>99.4% Verified</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
