"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, 
  Square, 
  Calendar, 
  Shield, 
  UserPlus, 
  Video, 
  Clock, 
  Plus, 
  CheckCircle, 
  Radio,
  BookOpen
} from "lucide-react";
import { api } from "@/lib/api";

interface LifecycleModuleProps {
  currentUser: any;
  onSessionUpdated?: () => void;
}

export default function LifecycleModule({ currentUser, onSessionUpdated }: LifecycleModuleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showCoHostModal, setShowCoHostModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Form States
  const [scheduleForm, setScheduleForm] = useState({
    course_id: 1,
    title: "",
    session_type: "Lecture",
    module_id: 1,
    scheduled_start: "2026-10-17T10:00",
    scheduled_end: "2026-10-17T11:30",
    grace_period_mins: 10,
    restrict_to_enrolled: true,
    require_institutional_email: true,
  });

  const [securityForm, setSecurityForm] = useState({
    restrict_to_enrolled: true,
    require_institutional_email: true,
    grace_period_mins: 10,
    lock_gate: false
  });

  const [timetableForm, setTimetableForm] = useState({
    course_id: 1,
    day_of_week: "Monday",
    start_time: "10:00",
    end_time: "11:30",
    room_or_gate: "Auditorium Hall B & Virtual Gate Alpha"
  });

  const [coHostForm, setCoHostForm] = useState({
    user_id: 5,
    host_role: "teaching_assistant"
  });

  const [archiveForm, setArchiveForm] = useState({
    recording_url: "https://media.university.edu/archives/2026/session_archive.mp4",
    recording_duration_mins: 90,
    recording_notes: "Synchronized lecture capture with automatic transcript."
  });

  const [timetables, setTimetables] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessRes = await api.sessions.getAll();
      if (sessRes.success) setSessions(sessRes.sessions);

      const ttRes = await api.sessions.getRecurringTimetables(1);
      if (ttRes.success) setTimetables(ttRes.timetables);

      const uRes = await api.auth.getUsers();
      if (uRes.success) setAllUsers(uRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartSession = async (sessionId: number) => {
    try {
      await api.sessions.start(sessionId);
      await loadData();
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEndSession = async (sessionId: number) => {
    try {
      await api.sessions.end(sessionId);
      await loadData();
      if (onSessionUpdated) onSessionUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sessions.schedule({
        course_id: Number(scheduleForm.course_id),
        title: scheduleForm.title,
        session_type: scheduleForm.session_type,
        module_id: Number(scheduleForm.module_id),
        scheduled_start: scheduleForm.scheduled_start,
        scheduled_end: scheduleForm.scheduled_end,
        created_by_id: currentUser?.id || 2,
        room_security_config: {
          restrict_to_enrolled: scheduleForm.restrict_to_enrolled,
          require_institutional_email: scheduleForm.require_institutional_email,
          grace_period_mins: Number(scheduleForm.grace_period_mins)
        }
      });
      setShowScheduleModal(false);
      setScheduleForm({
        ...scheduleForm,
        title: ""
      });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    try {
      await api.sessions.configureSecurity(selectedSession.id, securityForm, currentUser?.id);
      setShowSecurityModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTimetableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sessions.setRecurringTimetable(timetableForm.course_id, timetableForm);
      setShowTimetableModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCoHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    try {
      await api.sessions.assignCoHost(selectedSession.id, Number(coHostForm.user_id), coHostForm.host_role);
      setShowCoHostModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    try {
      await api.sessions.archiveRecording(selectedSession.id, archiveForm);
      setShowArchiveModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Module Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="code-pill" style={{ background: "#FFE600" }}>MODULE 1 SPECIFICATION</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4B5563" }}>Institutional Lifecycle Management</span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.02em" }}>
            Lecture & Seminar Lifecycle Management
          </h1>
          <p style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 600, maxWidth: "800px", marginTop: "4px" }}>
            Manages recurring academic timetables, virtual classroom gates, security policies, and teaching assistant delegations.
          </p>
        </div>

        {/* Action Triggers */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowTimetableModal(true)}
          >
            <Calendar size={16} /> Set Recurring Timetable
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowScheduleModal(true)}
          >
            <Plus size={16} /> Schedule Lecture Session
          </button>
        </div>
      </div>

      {/* Recurring Timetable Ribbon */}
      <div className="glass-panel" style={{ padding: "18px 22px", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", background: "#FEF9C3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ background: "#000000", padding: "8px", borderRadius: "8px" }}>
            <Calendar size={22} color="#FFE600" />
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 900, color: "#000000" }}>
              Active Recurring Timetable: CS-401 (Distributed Systems)
            </div>
            <div style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 600 }}>
              Term-long class blocks projected onto semester calendar automatically.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {timetables.map((t) => (
            <div key={t.id} style={{
              background: "#FFFFFF",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
              borderRadius: "6px",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.8rem",
              fontWeight: 700
            }}>
              <span style={{ color: "#000000" }}>{t.day_of_week}</span>
              <span>•</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "#1D4ED8" }}>{t.start_time} - {t.end_time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "24px" }}>
        {sessions.map((sess) => {
          const isLive = sess.status === "in_progress";
          const isCompleted = sess.status === "completed";
          const isScheduled = sess.status === "scheduled";

          return (
            <div key={sess.id} className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="code-pill">{sess.course_code}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4B5563" }}>{sess.session_type}</span>
                  </div>
                  <div>
                    {isLive && <span className="badge badge-live"><Radio size={12} /> LIVE IN PROGRESS</span>}
                    {isCompleted && <span className="badge badge-completed"><CheckCircle size={12} /> COMPLETED</span>}
                    {isScheduled && <span className="badge badge-scheduled"><Clock size={12} /> SCHEDULED</span>}
                  </div>
                </div>

                {/* Session Title */}
                <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#000000", marginBottom: "8px", lineHeight: 1.35 }}>
                  {sess.title}
                </h3>

                {/* Module Link */}
                {sess.module_title && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#4338CA", fontWeight: 700, marginBottom: "14px" }}>
                    <BookOpen size={15} />
                    <span>Module {sess.module_number}: {sess.module_title}</span>
                  </div>
                )}

                {/* Info block */}
                <div style={{
                  background: "#F5F2EB",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px #000000",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#4B5563" }}>Virtual Gate Code:</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#000000", fontWeight: 800 }}>{sess.virtual_room_code}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#4B5563" }}>Scheduled Window:</span>
                    <span style={{ color: "#000000", fontWeight: 700 }}>
                      {new Date(sess.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(sess.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#4B5563" }}>Security Policy:</span>
                    <span className="code-pill" style={{ fontSize: "0.72rem", background: sess.room_security_config?.restrict_to_enrolled ? "#86EFAC" : "#FDE047" }}>
                      {sess.room_security_config?.restrict_to_enrolled ? "Enrolled Whitelist" : "Institutional Domain"}
                    </span>
                  </div>
                </div>

                {/* Co-hosts list */}
                {sess.co_hosts && sess.co_hosts.length > 0 && (
                  <div style={{ marginBottom: "16px", fontSize: "0.8rem" }}>
                    <div style={{ color: "#4B5563", fontWeight: 700, marginBottom: "4px" }}>Delegated Co-Hosts & TAs:</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {sess.co_hosts.map((ch: any) => (
                        <span key={ch.id} className="badge" style={{ background: "#E0F2FE", fontSize: "0.72rem" }}>
                          {ch.user_name} ({ch.host_role.replace("_", " ")})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: "2px solid #000000", paddingTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {isScheduled && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleStartSession(sess.id)}
                  >
                    <Play size={14} /> Start Session
                  </button>
                )}

                {isLive && (
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleEndSession(sess.id)}
                  >
                    <Square size={14} /> End Session & Compute Attendance
                  </button>
                )}

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedSession(sess);
                    setSecurityForm({
                      restrict_to_enrolled: sess.room_security_config?.restrict_to_enrolled ?? true,
                      require_institutional_email: sess.room_security_config?.require_institutional_email ?? true,
                      grace_period_mins: sess.room_security_config?.grace_period_mins ?? 10,
                      lock_gate: false
                    });
                    setShowSecurityModal(true);
                  }}
                >
                  <Shield size={14} /> Security
                </button>

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedSession(sess);
                    setShowCoHostModal(true);
                  }}
                >
                  <UserPlus size={14} /> Co-Hosts
                </button>

                {isCompleted && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedSession(sess);
                      setArchiveForm({
                        recording_url: sess.recording_url || "https://media.university.edu/archives/2026/lecture.mp4",
                        recording_duration_mins: sess.recording_duration_mins || 85,
                        recording_notes: sess.recording_notes || "Archived high-definition lecture capture."
                      });
                      setShowArchiveModal(true);
                    }}
                  >
                    <Video size={14} /> Archive
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Schedule Lecture Session */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Schedule Lecture Session
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Maps a new lecture session to syllabus learning modules and sets initial virtual classroom gate rules.
            </p>

            <form onSubmit={handleScheduleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Course Section</label>
                  <select 
                    className="form-select"
                    value={scheduleForm.course_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, course_id: Number(e.target.value) })}
                  >
                    <option value={1}>CS-401: Distributed Systems</option>
                    <option value={2}>AI-502: Advanced Neural Architectures</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Session Type</label>
                  <select 
                    className="form-select"
                    value={scheduleForm.session_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, session_type: e.target.value })}
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Seminar">Institutional Seminar</option>
                    <option value="Lab">Technical Lab</option>
                    <option value="Colloquium">Colloquium</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Lecture Session Title</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  placeholder="e.g. Session 04: Two-Phase Commit & Quorum Consensus"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Map to Syllabus Module</label>
                <select 
                  className="form-select"
                  value={scheduleForm.module_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, module_id: Number(e.target.value) })}
                >
                  <option value={1}>Module 1: Asynchronous Systems & Logical Clocks</option>
                  <option value={2}>Module 2: Leader Election & Consensus: Paxos to Raft</option>
                  <option value={3}>Module 3: Byzantine Fault Tolerance & Cryptographic Quorums</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">Scheduled Start Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input"
                    value={scheduleForm.scheduled_start}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Scheduled End Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input"
                    value={scheduleForm.scheduled_end}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_end: e.target.value })}
                  />
                </div>
              </div>

              {/* Gate Security Toggles */}
              <div style={{ background: "#F5F2EB", border: "2px solid #000000", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#000000", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={16} /> Academic Room Security Preset
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", fontWeight: 600 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={scheduleForm.restrict_to_enrolled}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, restrict_to_enrolled: e.target.checked })}
                    />
                    <span>Restrict entrance strictly to enrolled student IDs</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={scheduleForm.require_institutional_email}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, require_institutional_email: e.target.checked })}
                    />
                    <span>Require verified institutional domain email (*@university.edu)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Configure Academic Room Security */}
      {showSecurityModal && selectedSession && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Configure Academic Room Security
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Adjust virtual classroom gate parameters for: <strong style={{ color: "#000000" }}>{selectedSession.title}</strong>
            </p>

            <form onSubmit={handleSecuritySubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "#F5F2EB", border: "2px solid #000000", padding: "14px", borderRadius: "8px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={securityForm.restrict_to_enrolled}
                    onChange={(e) => setSecurityForm({ ...securityForm, restrict_to_enrolled: e.target.checked })}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: "#000000", fontSize: "0.9rem" }}>Whitelist Enrolled Roster Only</div>
                    <div style={{ fontSize: "0.8rem", color: "#4B5563", fontWeight: 600 }}>
                      Automatically blocks non-enrolled students and guest auditors unless explicitly invited.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "#F5F2EB", border: "2px solid #000000", padding: "14px", borderRadius: "8px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={securityForm.require_institutional_email}
                    onChange={(e) => setSecurityForm({ ...securityForm, require_institutional_email: e.target.checked })}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: "#000000", fontSize: "0.9rem" }}>Require Verified Institutional SSO</div>
                    <div style={{ fontSize: "0.8rem", color: "#4B5563", fontWeight: 600 }}>
                      Enforces university Single Sign-On and verified campus email tokens.
                    </div>
                  </div>
                </label>

                <div>
                  <label className="form-label">Late Arrival Grace Period (Minutes)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={securityForm.grace_period_mins}
                    onChange={(e) => setSecurityForm({ ...securityForm, grace_period_mins: Number(e.target.value) })}
                    min={0}
                    max={60}
                  />
                  <div style={{ fontSize: "0.78rem", color: "#4B5563", fontWeight: 600, marginTop: "4px" }}>
                    Students entering past this window are automatically tagged as Late with timestamp penalties.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowSecurityModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Security Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Set Recurring Timetable */}
      {showTimetableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Set Recurring Academic Timetable
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Establishes term-long recurring schedule blocks for automatic calendar synthesis.
            </p>

            <form onSubmit={handleTimetableSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Day of Week</label>
                <select 
                  className="form-select"
                  value={timetableForm.day_of_week}
                  onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value })}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Start Time</label>
                  <input 
                    type="time" 
                    className="form-input"
                    value={timetableForm.start_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input 
                    type="time" 
                    className="form-input"
                    value={timetableForm.end_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Physical Hall / Virtual Classroom Gate</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={timetableForm.room_or_gate}
                  onChange={(e) => setTimetableForm({ ...timetableForm, room_or_gate: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowTimetableModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Establish Timetable Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Assign Guest Lecturers / TAs */}
      {showCoHostModal && selectedSession && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Assign Guest Lecturers & Teaching Assistants
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Grants co-host privileges and moderation permissions for: <strong style={{ color: "#000000" }}>{selectedSession.title}</strong>
            </p>

            <form onSubmit={handleCoHostSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Select Academic Scholar / TA</label>
                <select 
                  className="form-select"
                  value={coHostForm.user_id}
                  onChange={(e) => setCoHostForm({ ...coHostForm, user_id: Number(e.target.value) })}
                >
                  {allUsers.filter((u) => ["Teaching Assistant", "Professor", "Dean"].includes(u.role)).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.institutional_id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Co-Host Role Scope</label>
                <select 
                  className="form-select"
                  value={coHostForm.host_role}
                  onChange={(e) => setCoHostForm({ ...coHostForm, host_role: e.target.value })}
                >
                  <option value="teaching_assistant">Teaching Assistant (Take Attendance & Co-edit Notes)</option>
                  <option value="guest_lecturer">Guest Lecturer / Scholar (Co-presenter)</option>
                  <option value="co_instructor">Co-Instructor (Full Academic Privileges)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCoHostModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Grant Co-Host Rights
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Archive Recorded Session */}
      {showArchiveModal && selectedSession && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Archive Recorded Session
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Binds the recorded video lecture to the course module for asynchronous student study.
            </p>

            <form onSubmit={handleArchiveSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Video Archive Stream URL</label>
                <input 
                  type="url" 
                  className="form-input"
                  required
                  value={archiveForm.recording_url}
                  onChange={(e) => setArchiveForm({ ...archiveForm, recording_url: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Duration (Minutes)</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={archiveForm.recording_duration_mins}
                  onChange={(e) => setArchiveForm({ ...archiveForm, recording_duration_mins: Number(e.target.value) })}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Archival Notes / Indexing</label>
                <textarea 
                  className="form-textarea"
                  rows={3}
                  value={archiveForm.recording_notes}
                  onChange={(e) => setArchiveForm({ ...archiveForm, recording_notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowArchiveModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Seal & Archive Recording
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
