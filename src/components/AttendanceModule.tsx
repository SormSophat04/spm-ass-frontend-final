"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  AlertCircle,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Edit3,
  Download,
  Upload,
  ShieldAlert,
  Activity,
  Radio,
  Filter,
  Smartphone,
  CheckCircle2,
  QrCode,
  Wifi,
  Users,
} from "lucide-react";
import { api, buildAuthenticatedUrl } from "@/lib/api";

interface AttendanceModuleProps {
  currentUser: any;
}

export default function AttendanceModule({ currentUser }: AttendanceModuleProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(2);
  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Table Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Live Auto-Heartbeat Simulator
  const [autoHeartbeat, setAutoHeartbeat] = useState<boolean>(false);
  const [gateFeedback, setGateFeedback] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [showClassRosterMobile, setShowClassRosterMobile] = useState<boolean>(false);

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    verified_status: "present",
    verification_reason: "",
  });

  // SIS Roster Import Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterCourseId, setRosterCourseId] = useState<number>(1);
  const [rosterText, setRosterText] = useState(
    "STU-2026-107, Brandon Cole, brandon.cole@student.university.edu\nSTU-2026-108, Chloe Bennett, chloe.b@student.university.edu"
  );

  // Full Course Registrar Matrix Modal
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [matrixCourseId, setMatrixCourseId] = useState<number>(1);
  const [matrixData, setMatrixData] = useState<any | null>(null);

  const isStudentRole = currentUser?.role === "Student";
  const canManageRoster = ["Dean", "Professor"].includes(currentUser?.role || "");
  const canOverrideAttendance = ["Dean", "Professor", "TA", "Teaching Assistant"].includes(
    currentUser?.role || ""
  );

  // Simulated Student for Gate Entrance Testing
  const [simulatedStudentId, setSimulatedStudentId] = useState<number>(() =>
    currentUser?.role === "Student" && currentUser?.id ? currentUser.id : 7
  );
  const activeGateStudentId = isStudentRole && currentUser?.id ? currentUser.id : simulatedStudentId;

  const loadAttendance = async (sessionId: number) => {
    setLoading(true);
    try {
      const res = await api.attendance.getSessionAttendance(sessionId);
      if (res.success) {
        setAttendanceData(res);
        if (res.course_id) {
          setRosterCourseId(res.course_id);
          setMatrixCourseId(res.course_id);
        }
        if (!isStudentRole && res.records?.length > 0) {
          const exists = res.records.some((r: any) => r.student_id === simulatedStudentId);
          if (!exists) {
            setSimulatedStudentId(res.records[0].student_id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.sessions.getCourses(),
      api.sessions.getAll(),
      !isStudentRole
        ? api.auth.getUsers("Student").catch(() => ({ success: false, users: [] }))
        : Promise.resolve({ success: false, users: [] }),
    ]).then(([coursesRes, sessRes, stuRes]) => {
      if (coursesRes.success) {
        setCourses(coursesRes.courses);
      }
      if (stuRes.success) {
        setAllStudents(stuRes.users);
      }
      if (sessRes.success && sessRes.sessions.length > 0) {
        setSessions(sessRes.sessions);
        const live = sessRes.sessions.find((s: any) => s.status === "in_progress");
        const defaultId = live ? live.id : sessRes.sessions[0].id;
        setSelectedSessionId(defaultId);
        void loadAttendance(defaultId);
      }
    });
  }, []);

  // Live Auto-Heartbeat effect
  useEffect(() => {
    if (!autoHeartbeat || !selectedSessionId || !activeGateStudentId) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.attendance.heartbeat(selectedSessionId, activeGateStudentId, 60);
        if (res.success) {
          setGateFeedback(
            `Live mobile pulse (+1m) -> Attended: ${res.total_duration_minutes}m | Coverage: ${res.coverage_pct}%`
          );
          await loadAttendance(selectedSessionId);
        }
      } catch {
        setAutoHeartbeat(false);
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [autoHeartbeat, selectedSessionId, activeGateStudentId]);

  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    setGateFeedback(null);
    setGateError(null);
    void loadAttendance(id);
  };

  const gateStudentOptions = useMemo(() => {
    const enrolledRecords = attendanceData?.records || [];
    if (enrolledRecords.length > 0) {
      return enrolledRecords.map((r: any) => ({
        id: r.student_id,
        name: r.student_name,
        institutional_id: r.institutional_id,
        tag: "Enrolled",
      }));
    }
    return allStudents.map((u: any) => ({
      id: u.id,
      name: u.name,
      institutional_id: u.institutional_id,
      tag: "Directory",
    }));
  }, [attendanceData, allStudents]);

  // Own student attendance record for the active session
  const myAttendanceRecord = useMemo(() => {
    const records = attendanceData?.records || [];
    return (
      records.find(
        (r: any) =>
          r.student_id === activeGateStudentId ||
          (currentUser?.institutional_id && r.institutional_id === currentUser.institutional_id)
      ) || null
    );
  }, [attendanceData, activeGateStudentId, currentUser]);

  const isCurrentlyInGate = Boolean(
    myAttendanceRecord?.first_join_time && !myAttendanceRecord?.last_exit_time
  );

  const filteredRecords = useMemo(() => {
    const records = attendanceData?.records || [];
    return records.filter((r: any) => {
      const effectiveStatus =
        r.verified_status && r.verified_status !== "pending" ? r.verified_status : r.automated_status;
      if (statusFilter !== "all" && effectiveStatus !== statusFilter && r.automated_status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (r.student_name || "").toLowerCase().includes(q);
        const matchId = (r.institutional_id || "").toLowerCase().includes(q);
        const matchEmail = (r.student_email || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchEmail) return false;
      }
      return true;
    });
  }, [attendanceData, statusFilter, searchQuery]);

  // Simulate Gate Actions
  const handleSimulateJoin = async () => {
    setCheckingIn(true);
    setGateError(null);
    try {
      const res = await api.attendance.joinGate(selectedSessionId, activeGateStudentId);
      if (res.success) {
        if (isStudentRole) {
          setAutoHeartbeat(true);
        }
        setGateFeedback(
          `Checked in via Mobile Gate! ${
            res.is_late ? `Late arrival (+${res.late_minutes}m)` : "On-time arrival verified"
          }`
        );
        await loadAttendance(selectedSessionId);
      }
    } catch (err: any) {
      const msg = err?.message || "Unable to enter gate — check campus connection.";
      if (isStudentRole) {
        setGateError(msg);
      } else {
        alert(`Gate Rejection: ${msg}`);
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSimulateLeave = async () => {
    setGateError(null);
    try {
      const res = await api.attendance.leaveGate(selectedSessionId, activeGateStudentId, "student_left_tab");
      if (res.success) {
        setAutoHeartbeat(false);
        setGateFeedback(
          `Exit recorded. ${
            res.is_early_exit ? `Early exit flag (-${res.early_exit_minutes}m before dismissal)` : "Normal dismissal exit"
          }`
        );
        await loadAttendance(selectedSessionId);
      }
    } catch (err: any) {
      const msg = err?.message || "Unable to record gate exit.";
      if (isStudentRole) {
        setGateError(msg);
      } else {
        alert(msg);
      }
    }
  };

  const handleSimulateHeartbeat = async () => {
    setGateError(null);
    try {
      const res = await api.attendance.heartbeat(selectedSessionId, activeGateStudentId, 60);
      if (res.success) {
        setGateFeedback(`Heartbeat pulse recorded (+1m). Coverage now: ${res.coverage_pct}%`);
        await loadAttendance(selectedSessionId);
      }
    } catch (err: any) {
      const msg = err?.message || "Tap Check-In first to start heartbeat pulses.";
      if (isStudentRole) {
        setGateError(msg);
      } else {
        alert(msg);
      }
    }
  };

  // Submit Override (works even if r.id is null by passing session_id + student_id)
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await api.attendance.overrideVerifiedStatus({
        record_id: selectedRecord.id,
        session_id: selectedSessionId,
        student_id: selectedRecord.student_id,
        verified_status: overrideForm.verified_status,
        verification_reason: overrideForm.verification_reason,
        actor_id: currentUser?.id || 2,
      });
      setShowOverrideModal(false);
      await loadAttendance(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCsvFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setRosterText(reader.result.trim());
      }
    };
    reader.readAsText(file);
  };

  // Import SIS Roster
  const handleRosterImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rosterText.split("\n");
    const students = lines
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2 && parts[0] && !parts[0].toLowerCase().startsWith("institutional_id")) {
          return {
            institutional_id: parts[0],
            name: parts[1],
            email: parts[2] || `${parts[0].toLowerCase()}@student.university.edu`,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (students.length === 0) {
      alert("No valid student lines found. Format: STU-ID, Full Name, Email");
      return;
    }

    try {
      const res = await api.attendance.enrollRoster(Number(rosterCourseId), students, currentUser?.id || 1);
      alert(res.message);
      setShowRosterModal(false);
      await loadAttendance(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // View Registrar Compliance Sheet
  const loadRegistrarMatrix = async (courseId: number) => {
    try {
      const res = await api.attendance.getCourseAttendanceSheet(courseId);
      if (res.success) {
        setMatrixData(res);
        setMatrixCourseId(courseId);
        setShowMatrixModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ==========================================================================
  // DEDICATED MOBILE-FIRST PWA VIEW FOR STUDENT ROLE
  // ==========================================================================
  if (isStudentRole) {
    const activeSessionObj = sessions.find((s) => s.id === selectedSessionId);
    const activeStatus = attendanceData?.status || activeSessionObj?.status || "scheduled";
    const isSessionLive = activeStatus === "in_progress";
    const isSessionClosed = activeStatus === "completed" || activeStatus === "cancelled";
    const myCoveragePct = myAttendanceRecord?.lecture_coverage_pct ?? 0;
    const myDurationMins = myAttendanceRecord?.total_duration_minutes ?? 0;
    const myEffectiveStatus =
      myAttendanceRecord?.verified_status && myAttendanceRecord.verified_status !== "pending"
        ? myAttendanceRecord.verified_status
        : myAttendanceRecord?.automated_status || "absent";
    const sortedSessionsForStudent = [...sessions].sort((a, b) => {
      const rank = (s: any) => (s.status === "in_progress" ? 0 : s.status === "scheduled" ? 1 : 2);
      return rank(a) - rank(b);
    });

    return (
      <div className="responsive-module-shell">
        {/* Responsive Header */}
        <div className="responsive-module-header">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span className="code-pill" style={{ background: "#DBEAFE", fontSize: "0.72rem" }}>
                STUDENT ATTENDANCE GATE
              </span>
              <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#15803D" }}>
                ● Campus Wi-Fi Verified
              </span>
            </div>
            <h1 className="responsive-module-title">
              1-Tap Lecture Gate Check-In
            </h1>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#EFF6FF",
              border: "2.5px solid #0F172A",
              boxShadow: "3px 3px 0px #0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Smartphone size={20} color="#2563EB" />
          </div>
        </div>

        <div className="student-attendance-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
            {/* Session Selector Card */}
            <div className="glass-panel responsive-panel" style={{ padding: "14px 16px" }}>
              <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: "6px" }}>
                Select Lecture Session
              </label>
              <select
                className="form-select"
                style={{ padding: "9px 10px", fontSize: "0.86rem", fontWeight: 800, maxWidth: "100%" }}
                value={selectedSessionId}
                onChange={(e) => handleSelectSession(Number(e.target.value))}
              >
                {sortedSessionsForStudent.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status === "in_progress" ? "[LIVE] " : s.status === "completed" ? "[ENDED] " : ""}
                    [{s.course_code}] {s.title}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "10px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#475569",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <span>
                  Gate Code:{" "}
                  <strong style={{ fontFamily: "var(--font-mono)", color: "#0F172A" }}>
                    {attendanceData?.virtual_room_code || "GATE-READY"}
                  </strong>
                </span>
                <span className={`badge badge-${isSessionLive ? "live" : "completed"}`}>
                  {loading && !attendanceData
                    ? "SYNCING..."
                    : isSessionLive
                    ? "LIVE GATE OPEN"
                    : activeStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {/* HERO CARD: 1-Tap Check-In & Heartbeat Telemetry */}
            <div
              className="glass-panel responsive-panel"
              style={{
                background: isSessionClosed ? "#F1F5F9" : isCurrentlyInGate ? "#D1FAE5" : "#DBEAFE",
                border: "3px solid #0F172A",
                boxShadow: "5px 5px 0px #0F172A",
              }}
            >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <QrCode size={18} color="#0F172A" />
              <span style={{ fontSize: "0.8rem", fontWeight: 900, color: "#0F172A", textTransform: "uppercase" }}>
                {isSessionClosed
                  ? "Gate Closed · Session Finalized"
                  : isCurrentlyInGate
                  ? "Checked In · Gate Active"
                  : "Ready for Gate Entry"}
              </span>
            </div>

            {!isSessionClosed && (
              <button
                type="button"
                onClick={() => setAutoHeartbeat((prev) => !prev)}
                className={autoHeartbeat ? "badge badge-live" : "badge badge-present"}
                style={{ cursor: "pointer", fontSize: "0.65rem" }}
              >
                <Radio size={11} />
                {autoHeartbeat ? "AUTO-PULSE ON" : "AUTO-PULSE OFF"}
              </button>
            )}
          </div>

          {/* Primary 1-Tap Action Button or Finalized State */}
          {isSessionClosed ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "2.5px solid #0F172A",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0F172A" }}>
                Attendance Gate Closed
              </div>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginTop: "3px" }}>
                This lecture session has ended. Recorded presence: <strong>{myDurationMins}m</strong> ({myCoveragePct}% coverage).
              </div>
            </div>
          ) : !isCurrentlyInGate ? (
            <button
              type="button"
              disabled={checkingIn}
              onClick={handleSimulateJoin}
              className="pwa-checkin-cta"
              style={{
                background: "#34D399",
                color: "#0F172A",
              }}
            >
              <LogIn size={21} strokeWidth={2.8} />
              <span>
                {checkingIn
                  ? "Verifying Student Gate..."
                  : myAttendanceRecord?.first_join_time
                  ? "Re-Enter Lecture Gate"
                  : "Tap to Check In Now"}
              </span>
            </button>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                border: "2.5px solid #0F172A",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={22} color="#15803D" />
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0F172A" }}>
                      You Are Checked In!
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700 }}>
                      Joined at{" "}
                      {myAttendanceRecord?.first_join_time
                        ? new Date(myAttendanceRecord.first_join_time).toLocaleTimeString()
                        : "Just now"}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.1rem",
                    fontWeight: 900,
                    color: "#2563EB",
                  }}
                >
                  {myDurationMins}m
                </span>
              </div>
            </div>
          )}

          {/* Secondary Mobile Controls: +1m Heartbeat & Leave Gate */}
          {!isSessionClosed && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                disabled={!isCurrentlyInGate}
                onClick={handleSimulateHeartbeat}
                className="btn btn-secondary"
                style={{
                  padding: "11px 10px",
                  fontSize: "0.76rem",
                  width: "100%",
                  opacity: isCurrentlyInGate ? 1 : 0.45,
                  cursor: isCurrentlyInGate ? "pointer" : "not-allowed",
                }}
              >
                <Clock size={15} /> +1m Heartbeat
              </button>
              <button
                type="button"
                disabled={!isCurrentlyInGate}
                onClick={handleSimulateLeave}
                className="btn btn-danger"
                style={{
                  padding: "11px 10px",
                  fontSize: "0.76rem",
                  width: "100%",
                  opacity: isCurrentlyInGate ? 1 : 0.45,
                  cursor: isCurrentlyInGate ? "pointer" : "not-allowed",
                }}
              >
                <LogOut size={15} /> Leave Gate
              </button>
            </div>
          )}

          {gateError && (
            <div
              role="alert"
              style={{
                marginTop: "10px",
                padding: "9px 10px",
                borderRadius: "8px",
                background: "#FEE2E2",
                border: "2px solid #DC2626",
                fontSize: "0.74rem",
                fontWeight: 800,
                color: "#991B1B",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <AlertCircle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{gateError}</span>
            </div>
          )}

          {gateFeedback && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "#FFFFFF",
                border: "2px solid #0F172A",
                fontSize: "0.74rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                color: "#1E3A8A",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Wifi size={13} color="#2563EB" style={{ flexShrink: 0 }} />
              <span>{gateFeedback}</span>
            </div>
          )}
        </div>

        {/* Personal Coverage & Accreditation Progress Card */}
        <div className="glass-panel responsive-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 900, color: "#0F172A", textTransform: "uppercase" }}>
              My Session Compliance &amp; Coverage
            </span>
            <span className={`badge badge-${myEffectiveStatus}`}>{myEffectiveStatus}</span>
          </div>

          {/* Coverage Progress Bar */}
          <div style={{ marginBottom: "14px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                fontWeight: 800,
                marginBottom: "5px",
              }}
            >
              <span style={{ color: "#334155" }}>Lecture Coverage Progress</span>
              <span style={{ color: myCoveragePct >= 75 ? "#15803D" : "#1D4ED8", fontFamily: "var(--font-mono)" }}>
                {myCoveragePct}% / 75% Min
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "14px",
                background: "#E2E8F0",
                border: "2px solid #0F172A",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, myCoveragePct)}%`,
                  height: "100%",
                  background:
                    myCoveragePct >= 75 ? "#34D399" : myCoveragePct > 0 ? "#60A5FA" : "#FB7185",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569", marginTop: "5px" }}>
              {myCoveragePct >= 75
                ? "✓ Accreditation threshold (75%) achieved for this session."
                : "Stay checked in or tap '+1m Heartbeat' to reach the 75% full-credit threshold."}
            </div>
          </div>

          {/* 3-Column Personal Telemetry Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
            <div
              style={{
                background: "#F8FAFC",
                border: "1.5px solid #0F172A",
                borderRadius: "8px",
                padding: "8px 4px",
                textAlign: "center",
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748B" }}>FIRST JOIN</div>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>
                {myAttendanceRecord?.first_join_time
                  ? new Date(myAttendanceRecord.first_join_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1.5px solid #0F172A",
                borderRadius: "8px",
                padding: "8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748B" }}>DURATION</div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 900,
                  color: "#0F172A",
                  fontFamily: "var(--font-mono)",
                  marginTop: "2px",
                }}
              >
                {myDurationMins} min
              </div>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1.5px solid #0F172A",
                borderRadius: "8px",
                padding: "8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748B" }}>VERIFICATION</div>
              <div style={{ fontSize: "0.74rem", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>
                {myAttendanceRecord?.verified_status && myAttendanceRecord.verified_status !== "pending"
                  ? "Faculty Verified"
                  : "Auto Sensor"}
              </div>
            </div>
          </div>
        </div>
          </div>

          {/* Right / Second Column: Course Sessions & Personal Attendance Record */}
          <div className="glass-panel responsive-panel" style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 900, color: "#0F172A", textTransform: "uppercase" }}>
              {showClassRosterMobile
                ? `My Attendance Record (${filteredRecords.length})`
                : `Course Sessions (${sessions.length})`}
            </span>
            <button
              type="button"
              onClick={() => setShowClassRosterMobile((prev) => !prev)}
              className="btn btn-secondary btn-sm"
              style={{ padding: "4px 8px", fontSize: "0.68rem" }}
            >
              <Users size={12} />
              {showClassRosterMobile ? "Show Sessions" : "My Record"}
            </button>
          </div>

          {!showClassRosterMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sortedSessionsForStudent.map((s) => {
                const isSelected = s.id === selectedSessionId;
                const isLive = s.status === "in_progress";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSession(s.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: isSelected ? "2.5px solid #2563EB" : "1.5px solid #0F172A",
                      background: isSelected ? "#EFF6FF" : "#F8FAFC",
                      boxShadow: isSelected ? "2.5px 2.5px 0px #2563EB" : "1.5px 1.5px 0px #0F172A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="code-pill" style={{ fontSize: "0.65rem", padding: "1px 6px", flexShrink: 0 }}>
                          {s.course_code}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            color: "#0F172A",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {s.title}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 600, marginTop: "3px" }}>
                        {s.room || "Hall"} · Gate: {s.virtual_room_code || "Active"}
                      </div>
                    </div>
                    <span className={`badge badge-${isLive ? "live" : s.status}`} style={{ fontSize: "0.62rem", flexShrink: 0 }}>
                      {isLive ? "LIVE" : s.status}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredRecords.map((r: any) => {
                const isMe = r.student_id === activeGateStudentId;
                const effectiveStatus =
                  r.verified_status && r.verified_status !== "pending" ? r.verified_status : r.automated_status;
                return (
                  <div
                    key={r.student_id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: isMe ? "2px solid #2563EB" : "1.5px solid #0F172A",
                      background: isMe ? "#EFF6FF" : "#F8FAFC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0F172A" }}>
                        {r.student_name} {isMe ? "(You)" : ""}
                      </div>
                      <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "#475569" }}>
                        {r.institutional_id} · {r.total_duration_minutes}m ({r.lecture_coverage_pct}%)
                      </div>
                    </div>
                    <span className={`badge badge-${effectiveStatus}`} style={{ fontSize: "0.64rem", flexShrink: 0 }}>
                      {effectiveStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // INSTITUTIONAL DESKTOP VIEW (Dean, Professor, Teaching Assistant, Auditor)
  // ==========================================================================
  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="code-pill" style={{ background: "#60A5FA" }}>MODULE 2 SPECIFICATION</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Accreditation &amp; Coverage Intelligence</span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.02em" }}>
            Student Attendance &amp; Session Engagement
          </h1>
          <p style={{ color: "#334155", fontSize: "0.95rem", fontWeight: 600, maxWidth: "800px", marginTop: "4px" }}>
            Automatically records student join/exit times, computes lecture coverage percentages, identifies truancy, and facilitates verified overrides.
          </p>
        </div>

        {/* Global Module Actions */}
        {(canManageRoster || canOverrideAttendance) && (
          <div style={{ display: "flex", gap: "12px" }}>
            {canManageRoster && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setRosterCourseId(attendanceData?.course_id || courses[0]?.id || 1);
                  setShowRosterModal(true);
                }}
              >
                <Upload size={16} /> Enroll SIS Roster
              </button>
            )}
            {canOverrideAttendance && (
              <button
                className="btn btn-primary"
                onClick={() => void loadRegistrarMatrix(attendanceData?.course_id || courses[0]?.id || 1)}
              >
                <FileSpreadsheet size={16} /> Generate Registrar Sheet
              </button>
            )}
          </div>
        )}
      </div>

      {/* Session Selector & Gate Simulator Bar */}
      <div className="responsive-2col-grid" style={{ marginBottom: "24px" }}>
        {/* Session Filter Dropdown */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <label className="form-label">Select Active or Completed Session</label>
          <select
            className="form-select"
            value={selectedSessionId}
            onChange={(e) => handleSelectSession(Number(e.target.value))}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.course_code}] {s.title} ({s.status.toUpperCase()})
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "14px", marginTop: "14px", fontSize: "0.82rem", fontWeight: 700, color: "#475569", flexWrap: "wrap" }}>
            <span>Course: <strong style={{ color: "#0F172A" }}>{attendanceData?.course_code || "—"}</strong></span>
            <span>•</span>
            <span>Status: <strong style={{ color: "#0F172A" }}>{attendanceData?.status}</strong></span>
            <span>•</span>
            <span>Enrolled: <strong style={{ color: "#0F172A" }}>{attendanceData?.metrics?.total_enrolled ?? 0}</strong></span>
            <span>•</span>
            <span>Attendance Rate: <strong style={{ color: "#2563EB" }}>{attendanceData?.metrics?.attendance_rate_pct ?? 0}%</strong></span>
          </div>
        </div>

        {/* Real-Time Virtual Gate Admittance Simulator */}
        <div className="glass-panel" style={{ padding: "20px", background: "#DBEAFE" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={18} /> Interactive Gate Admittance Simulator
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setAutoHeartbeat((prev) => !prev)}
                className={autoHeartbeat ? "badge badge-live" : "badge badge-present"}
                style={{ cursor: "pointer" }}
                title="Toggle automatic real-time heartbeat pulses every 4.5 seconds"
              >
                <Radio size={11} />
                {autoHeartbeat ? "AUTO-PULSE ON (4.5s)" : "Auto-Pulse Off"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="form-select"
              style={{ flex: 1, minWidth: "210px" }}
              value={simulatedStudentId}
              onChange={(e) => setSimulatedStudentId(Number(e.target.value))}
            >
              {gateStudentOptions.map((stu: any) => (
                <option key={stu.id} value={stu.id}>
                  {stu.name} ({stu.institutional_id})
                </option>
              ))}
            </select>

            <button
              className="btn btn-success btn-sm"
              title="Enter Virtual Gate"
              onClick={handleSimulateJoin}
            >
              <LogIn size={14} /> Enter
            </button>
            <button
              className="btn btn-secondary btn-sm"
              title="Send Connection Heartbeat"
              onClick={handleSimulateHeartbeat}
            >
              <Clock size={14} /> +1m Heartbeat
            </button>
            <button
              className="btn btn-danger btn-sm"
              title="Early Disconnect"
              onClick={handleSimulateLeave}
            >
              <LogOut size={14} /> Drop
            </button>
          </div>

          {gateFeedback && (
            <div
              style={{
                marginTop: "10px",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "#FFFFFF",
                border: "1.5px solid #0F172A",
                fontSize: "0.76rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "#1E3A8A",
              }}
            >
              {gateFeedback}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="responsive-5col-metrics" style={{ marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "18px", background: "#D1FAE5" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#065F46", textTransform: "uppercase" }}>Present</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
            {attendanceData?.metrics?.present_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065F46" }}>On-time compliance</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#DBEAFE" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1E40AF", textTransform: "uppercase" }}>Late Arrivals</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
            {attendanceData?.metrics?.late_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1E40AF" }}>
            Past {attendanceData?.room_security_config?.grace_period_mins ?? 10}m grace period
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#EFF6FF" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1D4ED8", textTransform: "uppercase" }}>Early Disconnects</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
            {attendanceData?.metrics?.partial_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1D4ED8" }}>Dropped before dismissal</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#E0F2FE" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0369A1", textTransform: "uppercase" }}>Excused Leave</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
            {attendanceData?.metrics?.excused_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0369A1" }}>Official medical / leave</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#FFE4E6" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#9F1239", textTransform: "uppercase" }}>Unexcused Absent</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
            {attendanceData?.metrics?.absent_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9F1239" }}>Truancy risk tracker</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "2.5px solid #0F172A", background: "#EFF6FF", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0F172A" }}>
              Session Roster &amp; Gate Compliance Registry ({attendanceData?.course_code || "Course"})
            </h3>
            <div style={{ fontSize: "0.76rem", color: "#475569", fontWeight: 600 }}>
              Virtual Gate: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>{attendanceData?.virtual_room_code || "—"}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Filter size={15} color="#2563EB" />
            <select
              className="form-select"
              style={{ width: "auto", padding: "6px 10px", fontSize: "0.8rem" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="partial">Partial / Early Drop</option>
              <option value="excused">Excused</option>
              <option value="absent">Absent</option>
              <option value="override_approved">Override Approved</option>
            </select>
            <input
              type="text"
              className="form-input"
              style={{ width: "220px", padding: "6px 10px", fontSize: "0.8rem" }}
              placeholder="Search student or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="code-pill">UTC Timestamps Verified</span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#DBEAFE", borderBottom: "2px solid #0F172A", color: "#0F172A", fontWeight: 900 }}>
                <th style={{ padding: "12px 18px" }}>STUDENT</th>
                <th style={{ padding: "12px 18px" }}>INSTITUTIONAL ID</th>
                <th style={{ padding: "12px 18px" }}>FIRST JOIN</th>
                <th style={{ padding: "12px 18px" }}>LAST EXIT</th>
                <th style={{ padding: "12px 18px" }}>DURATION</th>
                <th style={{ padding: "12px 18px" }}>COVERAGE</th>
                <th style={{ padding: "12px 18px" }}>AUTOMATED</th>
                <th style={{ padding: "12px 18px" }}>VERIFIED STATUS</th>
                <th style={{ padding: "12px 18px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r: any) => {
                return (
                  <tr key={r.student_id} style={{ borderBottom: "1.5px solid #000000" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: 800, color: "#000000" }}>{r.student_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#4B5563", fontWeight: 600 }}>{r.student_email}</div>
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", color: "#000000", fontWeight: 800 }}>
                      <span className="code-pill" style={{ background: "#E0F2FE" }}>{r.institutional_id}</span>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 700, color: "#000000" }}>
                      {r.first_join_time ? new Date(r.first_join_time).toLocaleTimeString() : "—"}
                      {r.is_late && (
                        <span style={{ display: "block", fontSize: "0.72rem", color: "#B45309", fontWeight: 800 }}>
                          Late (+{r.late_minutes}m)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 700, color: "#000000" }}>
                      {r.last_exit_time ? new Date(r.last_exit_time).toLocaleTimeString() : r.first_join_time ? "Active in Gate" : "—"}
                      {r.is_early_exit && (
                        <span style={{ display: "block", fontSize: "0.72rem", color: "#C2410C", fontWeight: 800 }}>
                          Early Drop (-{r.early_exit_minutes}m)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                      {r.total_duration_minutes} min
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "65px", height: "10px", background: "#E2E8F0", border: "1.5px solid #0F172A", borderRadius: "4px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, r.lecture_coverage_pct)}%`,
                              height: "100%",
                              background:
                                r.lecture_coverage_pct >= 75
                                  ? "#34D399"
                                  : r.lecture_coverage_pct > 0
                                  ? "#60A5FA"
                                  : "#FB7185",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.8rem", fontWeight: 900 }}>{r.lecture_coverage_pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge badge-${r.automated_status}`}>{r.automated_status}</span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {r.verified_status !== "pending" && r.verified_status ? (
                        <div>
                          <span className={`badge badge-${r.verified_status}`}>{r.verified_status}</span>
                          {r.verified_by_name && (
                            <div style={{ fontSize: "0.72rem", color: "#4B5563", fontWeight: 700, marginTop: "2px" }}>
                              By {r.verified_by_name}
                            </div>
                          )}
                          {r.verification_reason && (
                            <div style={{ fontSize: "0.7rem", color: "#64748B", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.verification_reason}>
                              “{r.verification_reason}”
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#6B7280", fontSize: "0.8rem", fontWeight: 700 }}>Pending Review</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      {canOverrideAttendance ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedRecord(r);
                            setOverrideForm({
                              verified_status:
                                r.verified_status && r.verified_status !== "pending"
                                  ? r.verified_status
                                  : r.automated_status || "present",
                              verification_reason: r.verification_reason || "",
                            });
                            setShowOverrideModal(true);
                          }}
                        >
                          <Edit3 size={13} /> Override
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>
                          {r.verified_status && r.verified_status !== "pending" ? "Faculty Verified" : "Automated Gate"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Professor Manual Override */}
      {showOverrideModal && selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Update Verified Status &amp; Attendance Override
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Reconciles automated sensor attendance with faculty validation for student:{" "}
              <strong style={{ color: "#000000" }}>{selectedRecord.student_name}</strong> ({selectedRecord.institutional_id})
            </p>

            <form onSubmit={handleOverrideSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Verified Compliance Status</label>
                <select
                  className="form-select"
                  value={overrideForm.verified_status}
                  onChange={(e) => setOverrideForm({ ...overrideForm, verified_status: e.target.value })}
                >
                  <option value="present">Present (Full Credit)</option>
                  <option value="late">Late Arrival (Grace Acknowledged)</option>
                  <option value="excused">Excused Absence (Medical / Official Sanction)</option>
                  <option value="override_approved">Override Approved (Special Faculty Dispensation)</option>
                  <option value="absent">Unexcused Absent (Penalized)</option>
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Mandatory Academic Justification Log</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="State the institutional basis for manual override."
                  value={overrideForm.verification_reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, verification_reason: e.target.value })}
                />
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#854D0E", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={14} /> This justification is permanently bound to the Module 7 compliance audit trail.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Override Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SIS Roster Import */}
      {showRosterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Enroll Student Roster from SIS
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Bulk registers student rosters from the campus Student Information System into the selected course section.
            </p>

            <form onSubmit={handleRosterImport}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Target Course Section</label>
                <select
                  className="form-select"
                  value={rosterCourseId}
                  onChange={(e) => setRosterCourseId(Number(e.target.value))}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label className="form-label">Load CSV / Text Roster File (Optional)</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileLoad}
                  className="form-input"
                  style={{ padding: "8px" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">CSV / Text Roster (Institutional ID, Name, Email)</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRosterModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Import &amp; Whitelist Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Academic Attendance Sheet (Registrar Compliance Matrix) */}
      {showMatrixModal && matrixData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "940px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#000000" }}>
                  Academic Registrar Compliance Sheet
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 700 }}>Course Section:</span>
                  <select
                    className="form-select"
                    style={{ width: "auto", padding: "4px 10px", fontSize: "0.82rem", fontWeight: 800 }}
                    value={matrixCourseId}
                    onChange={(e) => void loadRegistrarMatrix(Number(e.target.value))}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <a
                href={buildAuthenticatedUrl(`/api/export/courses/${matrixData.course_id}/attendance-csv`)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
              >
                <Download size={14} /> Download Official Registrar CSV
              </a>
            </div>

            <div style={{ maxHeight: "450px", overflowY: "auto", border: "2.5px solid #0F172A", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#DBEAFE", borderBottom: "2px solid #0F172A", color: "#0F172A", fontWeight: 900 }}>
                    <th style={{ padding: "10px 14px" }}>STUDENT</th>
                    <th style={{ padding: "10px 14px" }}>TOTAL HOURS</th>
                    <th style={{ padding: "10px 14px" }}>UNEXCUSED</th>
                    <th style={{ padding: "10px 14px" }}>EXCUSED</th>
                    <th style={{ padding: "10px 14px" }}>COMPLIANCE STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.attendance_matrix?.map((row: any) => (
                    <tr key={row.student_id} style={{ borderBottom: "1.5px solid #000000" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 800, color: "#000000" }}>{row.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#4B5563", fontWeight: 700 }}>{row.institutional_id}</div>
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                        {row.total_attended_hours} hrs
                      </td>
                      <td style={{ padding: "10px 14px", color: row.unexcused_absences >= 3 ? "#EF4444" : "#000000", fontWeight: 900 }}>
                        {row.unexcused_absences}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6D28D9", fontWeight: 800 }}>
                        {row.excused_absences}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {row.unexcused_absences >= 3 ? (
                          <span className="badge badge-absent" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ShieldAlert size={12} /> Truancy Warning
                          </span>
                        ) : (
                          <span className="badge badge-present">Compliant</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowMatrixModal(false)}
              >
                Close Compliance View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
