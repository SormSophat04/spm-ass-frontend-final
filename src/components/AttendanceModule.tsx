"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, 
  UserCheck, 
  AlertCircle, 
  FileSpreadsheet, 
  LogIn, 
  LogOut, 
  Edit3, 
  Download, 
  Upload, 
  ShieldAlert, 
  Activity
} from "lucide-react";
import { api } from "@/lib/api";

interface AttendanceModuleProps {
  currentUser: any;
}

export default function AttendanceModule({ currentUser }: AttendanceModuleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(2); // Default to live session
  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    verified_status: "present",
    verification_reason: ""
  });

  // SIS Roster Import Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterText, setRosterText] = useState(
    "STU-2026-107, Brandon Cole, brandon.cole@student.university.edu\nSTU-2026-108, Chloe Bennett, chloe.b@student.university.edu"
  );

  // Full Course Registrar Matrix Modal
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [matrixData, setMatrixData] = useState<any | null>(null);

  // Simulated Student for Gate Entrance Testing
  const [simulatedStudentId, setSimulatedStudentId] = useState<number>(7); // Jordan Miller

  const loadAttendance = async (sessionId: number) => {
    setLoading(true);
    try {
      const res = await api.attendance.getSessionAttendance(sessionId);
      if (res.success) setAttendanceData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.sessions.getAll().then((res) => {
      if (res.success && res.sessions.length > 0) {
        setSessions(res.sessions);
        const live = res.sessions.find((s: any) => s.status === "in_progress");
        const defaultId = live ? live.id : res.sessions[0].id;
        setSelectedSessionId(defaultId);
        loadAttendance(defaultId);
      }
    });
  }, []);

  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    loadAttendance(id);
  };

  // Simulate Gate Actions
  const handleSimulateJoin = async () => {
    try {
      const res = await api.attendance.joinGate(selectedSessionId, simulatedStudentId);
      if (res.success) {
        alert(
          `Admitted through virtual gate!\nLate Arrival: ${res.is_late ? `YES (+${res.late_minutes}m)` : "NO (On-time)"}`
        );
        loadAttendance(selectedSessionId);
      }
    } catch (err: any) {
      alert(`Gate Rejection: ${err.message}`);
    }
  };

  const handleSimulateLeave = async () => {
    try {
      const res = await api.attendance.leaveGate(selectedSessionId, simulatedStudentId, "student_left_tab");
      if (res.success) {
        alert(
          `Exit recorded.\nEarly Exit Flag: ${res.is_early_exit ? `YES (-${res.early_exit_minutes}m before dismissal)` : "Normal Exit"}`
        );
        loadAttendance(selectedSessionId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSimulateHeartbeat = async () => {
    try {
      const res = await api.attendance.heartbeat(selectedSessionId, simulatedStudentId, 60);
      if (res.success) {
        alert(`Heartbeat recorded (+1 minute duration). Coverage now: ${res.coverage_pct}%`);
        loadAttendance(selectedSessionId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Override
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await api.attendance.overrideVerifiedStatus({
        record_id: selectedRecord.id,
        verified_status: overrideForm.verified_status,
        verification_reason: overrideForm.verification_reason,
        actor_id: currentUser?.id || 2
      });
      setShowOverrideModal(false);
      loadAttendance(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Import SIS Roster
  const handleRosterImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rosterText.split("\n");
    const students = lines
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          return {
            institutional_id: parts[0],
            name: parts[1],
            email: parts[2] || `${parts[0].toLowerCase()}@student.university.edu`
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
      const res = await api.attendance.enrollRoster(1, students, currentUser?.id || 1);
      alert(res.message);
      setShowRosterModal(false);
      loadAttendance(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // View Registrar Compliance Sheet
  const handleOpenRegistrarMatrix = async () => {
    try {
      const res = await api.attendance.getCourseAttendanceSheet(1);
      if (res.success) {
        setMatrixData(res);
        setShowMatrixModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="code-pill" style={{ background: "#86EFAC" }}>MODULE 2 SPECIFICATION</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4B5563" }}>Accreditation & Coverage Intelligence</span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.02em" }}>
            Student Attendance & Session Engagement
          </h1>
          <p style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 600, maxWidth: "800px", marginTop: "4px" }}>
            Automatically records student join/exit times, computes lecture coverage percentages, identifies truancy, and facilitates verified overrides.
          </p>
        </div>

        {/* Global Module Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowRosterModal(true)}
          >
            <Upload size={16} /> Enroll SIS Roster
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleOpenRegistrarMatrix}
          >
            <FileSpreadsheet size={16} /> Generate Registrar Sheet
          </button>
        </div>
      </div>

      {/* Session Selector & Gate Simulator Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
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
          <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "0.82rem", fontWeight: 700, color: "#4B5563" }}>
            <span>Status: <strong style={{ color: "#000000" }}>{attendanceData?.status}</strong></span>
            <span>•</span>
            <span>Enrolled Students: <strong style={{ color: "#000000" }}>{attendanceData?.metrics?.total_enrolled ?? 0}</strong></span>
            <span>•</span>
            <span>Attendance Rate: <strong style={{ color: "#16A34A" }}>{attendanceData?.metrics?.attendance_rate_pct ?? 0}%</strong></span>
          </div>
        </div>

        {/* Real-Time Virtual Gate Admittance Simulator */}
        <div className="glass-panel" style={{ padding: "20px", background: "#FEF9C3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#000000", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={18} /> Interactive Gate Admittance Simulator
            </span>
            <span className="badge badge-present">Live Hardware Gate</span>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select 
              className="form-select" 
              style={{ flex: 1 }}
              value={simulatedStudentId}
              onChange={(e) => setSimulatedStudentId(Number(e.target.value))}
            >
              <option value={7}>Jordan Miller (STU-2026-101)</option>
              <option value={8}>Maya Lin (STU-2026-102)</option>
              <option value={9}>Liam O'Connor (STU-2026-103)</option>
              <option value={10}>Sophia Patel (STU-2026-104)</option>
              <option value={11}>Lucas Meyer (STU-2026-105)</option>
              <option value={12}>Emma Watson-Lee (STU-2026-106)</option>
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
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "18px", background: "#DCFCE7" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>Present</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#000000", marginTop: "4px" }}>
            {attendanceData?.metrics?.present_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>On-time compliance</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#FEF08A" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#854D0E", textTransform: "uppercase" }}>Late Arrivals</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#000000", marginTop: "4px" }}>
            {attendanceData?.metrics?.late_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#854D0E" }}>Past 10m grace period</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#FFEDD5" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#9A3412", textTransform: "uppercase" }}>Early Disconnects</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#000000", marginTop: "4px" }}>
            {attendanceData?.metrics?.partial_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9A3412" }}>Dropped before dismissal</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#EDE9FE" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5B21B6", textTransform: "uppercase" }}>Excused Leave</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#000000", marginTop: "4px" }}>
            {attendanceData?.metrics?.excused_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5B21B6" }}>Official medical / leave</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: "#FFE4E6" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#9F1239", textTransform: "uppercase" }}>Unexcused Absent</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#000000", marginTop: "4px" }}>
            {attendanceData?.metrics?.absent_count ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9F1239" }}>Truancy risk tracker</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "2.5px solid #000000", background: "#FFFBEB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 900, color: "#000000" }}>
            Session Roster & Gate Compliance Registry
          </h3>
          <span className="code-pill">UTC Timestamps Verified</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F5F2EB", borderBottom: "2px solid #000000", color: "#000000", fontWeight: 900 }}>
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
              {attendanceData?.records?.map((r: any) => {
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
                      {r.last_exit_time ? new Date(r.last_exit_time).toLocaleTimeString() : (r.first_join_time ? "Active in Gate" : "—")}
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
                        <div style={{ width: "65px", height: "10px", background: "#E5E7EB", border: "1.5px solid #000000", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min(100, r.lecture_coverage_pct)}%`,
                            height: "100%",
                            background: r.lecture_coverage_pct >= 75 ? "#4ADE80" : (r.lecture_coverage_pct > 0 ? "#FDE047" : "#FF6584")
                          }} />
                        </div>
                        <span style={{ fontSize: "0.8rem", fontWeight: 900 }}>{r.lecture_coverage_pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`badge badge-${r.automated_status}`}>
                        {r.automated_status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {r.verified_status !== "pending" && r.verified_status ? (
                        <div>
                          <span className={`badge badge-${r.verified_status}`}>
                            {r.verified_status}
                          </span>
                          {r.verified_by_name && (
                            <div style={{ fontSize: "0.72rem", color: "#4B5563", fontWeight: 700, marginTop: "2px" }}>
                              By {r.verified_by_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#6B7280", fontSize: "0.8rem", fontWeight: 700 }}>Pending Review</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      {r.id ? (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedRecord(r);
                            setOverrideForm({
                              verified_status: r.verified_status || r.automated_status,
                              verification_reason: r.verification_reason || ""
                            });
                            setShowOverrideModal(true);
                          }}
                        >
                          <Edit3 size={13} /> Override
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Not registered</span>
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
              Update Verified Status & Attendance Override
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Reconciles automated sensor attendance with faculty validation for student: <strong style={{ color: "#000000" }}>{selectedRecord.student_name}</strong>
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
              Bulk registers student rosters from the campus Student Information System into this course section.
            </p>

            <form onSubmit={handleRosterImport}>
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
                  Import & Whitelist Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Academic Attendance Sheet (Registrar Compliance Matrix) */}
      {showMatrixModal && matrixData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "900px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#000000" }}>
                  Academic Registrar Compliance Sheet
                </h2>
                <div style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 700 }}>
                  Course: {matrixData.course_code} • Contact Hours & Truancy Index
                </div>
              </div>

              <a 
                href={`/api/export/courses/${matrixData.course_id}/attendance-csv`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
              >
                <Download size={14} /> Download Official Registrar CSV
              </a>
            </div>

            <div style={{ maxHeight: "450px", overflowY: "auto", border: "2.5px solid #000000", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F5F2EB", borderBottom: "2px solid #000000", color: "#000000", fontWeight: 900 }}>
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
