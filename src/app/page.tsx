"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import LifecycleModule from "@/components/LifecycleModule";
import AttendanceModule from "@/components/AttendanceModule";
import LeavesModule from "@/components/LeavesModule";
import NotesModule from "@/components/NotesModule";
import QuizzesModule from "@/components/QuizzesModule";
import RolesModule from "@/components/RolesModule";
import AuditModule from "@/components/AuditModule";
import { api } from "@/lib/api";
import { Radio, CheckCircle2, ChevronRight } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("lifecycle");
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.auth.getCurrentUser();
      if (res.success) {
        setCurrentUser(res.user);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const getActiveModuleTitle = (tab: string) => {
    switch (tab) {
      case "lifecycle": return "Module 1: Lecture & Seminar Lifecycle Management";
      case "attendance": return "Module 2: Student Attendance & Session Engagement";
      case "leaves": return "Module 3: Academic Leave & Absence Approval";
      case "notes": return "Module 4: Structured Lecture Minutes & Study Notes";
      case "quizzes": return "Module 5: Live In-Class Polling & Quiz Tracker";
      case "roles": return "Module 6: Roles & Permissions Management";
      case "audit": return "Module 7: Activity Log & Audit Trail";
      default: return "Academic Module";
    }
  };

  return (
    <div style={{ height: "100vh", maxHeight: "100vh", overflow: "hidden", display: "flex", flexDirection: "row", background: "var(--nb-bg)" }}>
      {/* Left Vertical Neo-Brutalist Navigation Bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onUserChanged={fetchCurrentUser}
      />

      {/* Main Content Column */}
      <div style={{ flex: 1, minWidth: 0, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Neo-Brutalist Context Header Bar (FROZEN / NON-SCROLLING) */}
        <header style={{
          flexShrink: 0,
          padding: "14px 28px",
          borderBottom: "3px solid #000000",
          background: "#FFFDF7",
          boxShadow: "0 3px 0 #000000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 80
        }}>
          {/* Breadcrumb Context */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700 }}>
            <span className="code-pill" style={{ background: "#E0F2FE" }}>FACULTY PORTAL</span>
            <span style={{ color: "#000000", fontWeight: 900 }}>/</span>
            <span className="code-pill" style={{ background: "#FEF08A" }}>CS-401: DISTRIBUTED SYSTEMS</span>
            <span style={{ color: "#000000", fontWeight: 900 }}>/</span>
            <span style={{ fontWeight: 900, color: "#000000", fontSize: "0.92rem" }}>
              {getActiveModuleTitle(activeTab)}
            </span>
          </div>

          {/* Quick Status Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.8rem" }}>
            <span className="code-pill" style={{ background: "#C4B5FD" }}>ACADEMIC YEAR 2026-2027</span>
            <span className="badge" style={{ background: "#86EFAC" }}>
              <Radio size={12} /> LIVE SYNC ONLINE
            </span>
          </div>
        </header>

        {/* Scrollable Content Container (ONLY THIS CONTAINER SCROLLS) */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Dynamic Module Component */}
          <main style={{ flex: 1, padding: "8px 0" }}>
            {activeTab === "lifecycle" && (
              <LifecycleModule currentUser={currentUser} />
            )}

            {activeTab === "attendance" && (
              <AttendanceModule currentUser={currentUser} />
            )}

            {activeTab === "leaves" && (
              <LeavesModule currentUser={currentUser} />
            )}

            {activeTab === "notes" && (
              <NotesModule currentUser={currentUser} />
            )}

            {activeTab === "quizzes" && (
              <QuizzesModule currentUser={currentUser} />
            )}

            {activeTab === "roles" && (
              <RolesModule currentUser={currentUser} />
            )}

            {activeTab === "audit" && (
              <AuditModule currentUser={currentUser} />
            )}
          </main>

          {/* Neo-Brutalist Institutional Footer */}
          <footer style={{
            flexShrink: 0,
            borderTop: "3px solid #000000",
            background: "#FFFDF7",
            boxShadow: "0 -3px 0 #000000",
            padding: "20px 28px",
            marginTop: "40px"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              fontSize: "0.82rem",
              color: "#000000"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <span>ACADEMIC LECTURE & INSTITUTIONAL SEMINAR COORDINATOR</span>
                <span>•</span>
                <span style={{ color: "#4B5563" }}>HIGHER EDUCATION COMPLIANCE PROTOCOL</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="code-pill" style={{ background: "#E0F2FE" }}>NEXT.JS 16</span>
                <span className="code-pill" style={{ background: "#FEF08A" }}>PYTHON FLASK API</span>
                <span className="code-pill" style={{ background: "#C4B5FD" }}>POSTGRESQL / SQLALCHEMY</span>
                <span className="badge" style={{ background: "#86EFAC" }}>
                  <CheckCircle2 size={13} /> ALL 7 MODULES ACTIVE
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
