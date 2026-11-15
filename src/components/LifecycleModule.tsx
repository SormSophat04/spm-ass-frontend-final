"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  BookOpen,
  Trash2,
  Sparkles,
  FolderPlus,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";

interface LifecycleModuleProps {
  currentUser: any;
  onSessionUpdated?: () => void;
}

export default function LifecycleModule({ currentUser, onSessionUpdated }: LifecycleModuleProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Filters
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [timetableCourseId, setTimetableCourseId] = useState<number>(1);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showCoHostModal, setShowCoHostModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);

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
    lock_gate: false,
  });

  const [timetableForm, setTimetableForm] = useState({
    course_id: 1,
    day_of_week: "Monday",
    start_time: "10:00",
    end_time: "11:30",
    room_or_gate: "Auditorium Hall B & Virtual Gate Alpha",
  });

  const [coHostForm, setCoHostForm] = useState({
    user_id: 5,
    host_role: "teaching_assistant",
  });

  const [archiveForm, setArchiveForm] = useState({
    recording_url: "https://media.university.edu/archives/2026/session_archive.mp4",
    recording_duration_mins: 90,
    recording_notes: "Synchronized lecture capture with automatic transcript.",
  });

  const [newCourseForm, setNewCourseForm] = useState({
    code: "",
    title: "",
    semester: "Fall 2026",
    department: currentUser?.department || "Computer Science & Engineering",
    initial_module_title: "Module 1: Foundations & Core Architecture",
  });

  const [newModuleForm, setNewModuleForm] = useState({
    course_id: 1,
    module_number: 1,
    title: "",
    description: "",
  });

  const [timetables, setTimetables] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [generatingSessions, setGeneratingSessions] = useState(false);

  const isStudentRole = currentUser?.role === "Student";
  const canManage = ["Dean", "Professor"].includes(currentUser?.role || "");

  const loadData = async (activeTimetableCourse = timetableCourseId) => {
    try {
      const [coursesRes, sessRes, ttRes] = await Promise.all([
        api.sessions.getCourses(),
        api.sessions.getAll(),
        api.sessions.getRecurringTimetables(activeTimetableCourse),
      ]);

      if (coursesRes.success) {
        setCourses(coursesRes.courses);
        if (coursesRes.courses.length > 0) {
          const defaultCid = coursesRes.courses[0].id;
          const validTimetableCourse = coursesRes.courses.some((c: any) => c.id === activeTimetableCourse)
            ? activeTimetableCourse
            : defaultCid;
          if (validTimetableCourse !== activeTimetableCourse) {
            setTimetableCourseId(validTimetableCourse);
            const fallbackTt = await api.sessions.getRecurringTimetables(validTimetableCourse);
            if (fallbackTt.success) setTimetables(fallbackTt.timetables);
          }
        }
      }
      if (sessRes.success) setSessions(sessRes.sessions);
      if (ttRes.success) setTimetables(ttRes.timetables);

      if (canManage) {
        try {
          const uRes = await api.auth.getUsers();
          if (uRes.success) {
            setAllUsers(uRes.users);
            const taOrFaculty = uRes.users.filter((u: any) =>
              ["TA", "Teaching Assistant", "Professor", "Dean"].includes(u.role)
            );
            if (taOrFaculty.length > 0) {
              setCoHostForm((prev) => ({ ...prev, user_id: taOrFaculty[0].id }));
            }
          }
        } catch {
          // Non-blocking if user list restricted
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      if (active) {
        void loadData(timetableCourseId);
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableCourseId]);

  const selectedScheduleCourse = useMemo(() => {
    return courses.find((c) => c.id === Number(scheduleForm.course_id)) || courses[0] || null;
  }, [courses, scheduleForm.course_id]);

  const availableScheduleModules = useMemo(() => {
    return selectedScheduleCourse?.modules || [];
  }, [selectedScheduleCourse]);

  const effectiveScheduleModuleId = useMemo(() => {
    if (availableScheduleModules.length === 0) return 0;
    const exists = availableScheduleModules.some((m: any) => m.id === Number(scheduleForm.module_id));
    return exists ? Number(scheduleForm.module_id) : availableScheduleModules[0].id;
  }, [availableScheduleModules, scheduleForm.module_id]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      if (courseFilter !== "all" && String(sess.course_id) !== courseFilter) return false;
      if (statusFilter !== "all" && sess.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (sess.title || "").toLowerCase().includes(q);
        const matchCode = (sess.course_code || "").toLowerCase().includes(q);
        const matchRoom = (sess.virtual_room_code || "").toLowerCase().includes(q);
        const matchMod = (sess.module_title || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchRoom && !matchMod) return false;
      }
      return true;
    });
  }, [sessions, courseFilter, statusFilter, searchQuery]);

  const activeTimetableCourseObj = useMemo(() => {
    return courses.find((c) => c.id === timetableCourseId) || courses[0] || null;
  }, [courses, timetableCourseId]);

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

  const handleDeleteSession = async (sessionId: number, title: string) => {
    if (!window.confirm(`Delete scheduled session "${title}"?`)) return;
    try {
      await api.sessions.deleteSession(sessionId);
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
        module_id: effectiveScheduleModuleId ? Number(effectiveScheduleModuleId) : null,
        scheduled_start: scheduleForm.scheduled_start,
        scheduled_end: scheduleForm.scheduled_end,
        created_by_id: currentUser?.id || 2,
        room_security_config: {
          restrict_to_enrolled: scheduleForm.restrict_to_enrolled,
          require_institutional_email: scheduleForm.require_institutional_email,
          grace_period_mins: Number(scheduleForm.grace_period_mins),
        },
      });
      setShowScheduleModal(false);
      setScheduleForm({
        ...scheduleForm,
        title: "",
      });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.sessions.createCourse(newCourseForm);
      setShowCreateCourseModal(false);
      setNewCourseForm({
        code: "",
        title: "",
        semester: "Fall 2026",
        department: currentUser?.department || "Computer Science & Engineering",
        initial_module_title: "Module 1: Foundations & Core Architecture",
      });
      if (res?.course?.id) {
        setTimetableCourseId(res.course.id);
      }
      await loadData(res?.course?.id || timetableCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sessions.createCourseModule(Number(newModuleForm.course_id), {
        module_number: Number(newModuleForm.module_number),
        title: newModuleForm.title,
        description: newModuleForm.description,
      });
      setShowCreateModuleModal(false);
      setNewModuleForm((prev) => ({
        ...prev,
        module_number: prev.module_number + 1,
        title: "",
        description: "",
      }));
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
      await api.sessions.setRecurringTimetable(Number(timetableForm.course_id), timetableForm);
      setShowTimetableModal(false);
      setTimetableCourseId(Number(timetableForm.course_id));
      await loadData(Number(timetableForm.course_id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTimetable = async (timetableId: number) => {
    try {
      await api.sessions.deleteRecurringTimetable(timetableId);
      await loadData(timetableCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateFromTimetable = async () => {
    setGeneratingSessions(true);
    try {
      const res = await api.sessions.generateFromTimetable(timetableCourseId, { weeks_ahead: 1 });
      await loadData(timetableCourseId);
      if (res.sessions?.length > 0) {
        alert(`Projected ${res.sessions.length} upcoming lecture session(s) from recurring timetable.`);
      } else {
        alert(res.message || "All timetable slots for the upcoming week are already scheduled.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingSessions(false);
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

  const handleRemoveCoHost = async (sessionId: number, userId: number) => {
    try {
      await api.sessions.removeCoHost(sessionId, userId);
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
    <div className="responsive-module-shell">
      {/* Module Header */}
      <div className="responsive-module-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span className="code-pill" style={{ background: "#60A5FA", fontSize: "0.72rem" }}>
              {isStudentRole ? "TIMETABLE & SESSIONS" : "MODULE 1 SPECIFICATION"}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>Institutional Lifecycle Management</span>
          </div>
          <h1 className="responsive-module-title">
            Lecture &amp; Seminar Lifecycle Management
          </h1>
          {!isStudentRole && (
            <p style={{ color: "#334155", fontSize: "0.95rem", fontWeight: 600, maxWidth: "800px", marginTop: "4px" }}>
              Manages recurring academic timetables, dynamic courses &amp; syllabus modules, virtual classroom gates, security policies, and teaching assistant delegations.
            </p>
          )}
        </div>

        {/* Action Triggers */}
        {canManage && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateCourseModal(true)}
            >
              <FolderPlus size={15} /> New Course
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const defaultCid = courses[0]?.id || 1;
                const targetCourse = courses.find((c) => c.id === defaultCid);
                setNewModuleForm({
                  course_id: defaultCid,
                  module_number: (targetCourse?.modules?.length || 0) + 1,
                  title: "",
                  description: "",
                });
                setShowCreateModuleModal(true);
              }}
            >
              <BookOpen size={15} /> Add Syllabus Module
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setTimetableForm((prev) => ({ ...prev, course_id: timetableCourseId }));
                setShowTimetableModal(true);
              }}
            >
              <Calendar size={15} /> Set Recurring Timetable
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const cid = courseFilter !== "all" ? Number(courseFilter) : courses[0]?.id || 1;
                const cObj = courses.find((c) => c.id === cid);
                setScheduleForm((prev) => ({
                  ...prev,
                  course_id: cid,
                  module_id: cObj?.modules?.[0]?.id || 0,
                }));
                setShowScheduleModal(true);
              }}
            >
              <Plus size={15} /> Schedule Lecture Session
            </button>
          </div>
        )}
      </div>

      {/* Recurring Timetable Ribbon */}
      <div className="glass-panel responsive-filter-card" style={{ background: "#DBEAFE" }}>
        <div className="responsive-filter-group" style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ background: "#2563EB", padding: "8px", borderRadius: "8px", border: "2px solid #0F172A", flexShrink: 0 }}>
            <Calendar size={20} color="#FFFFFF" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 900, color: "#0F172A" }}>
                Active Recurring Timetable:
              </span>
              <select
                className="form-select responsive-select-auto"
                style={{ padding: "5px 10px", fontSize: "0.82rem", fontWeight: 800, background: "#FFFFFF" }}
                value={timetableCourseId}
                onChange={(e) => setTimetableCourseId(Number(e.target.value))}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.title})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600, marginTop: "3px" }}>
              Term-long class blocks projected onto semester calendar ({activeTimetableCourseObj?.semester || "Fall 2026"}).
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {timetables.length === 0 ? (
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
              No recurring blocks configured for this course yet.
            </span>
          ) : (
            timetables.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "#FFFFFF",
                  border: "2px solid #0F172A",
                  boxShadow: "2px 2px 0px #0F172A",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                <span style={{ color: "#0F172A" }}>{t.day_of_week}</span>
                <span>•</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "#2563EB" }}>
                  {t.start_time} - {t.end_time}
                </span>
                {t.room_or_gate && (
                  <span style={{ fontSize: "0.72rem", color: "#64748B" }}>({t.room_or_gate})</span>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTimetable(t.id)}
                    title="Delete timetable block"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#DC2626",
                      cursor: "pointer",
                      padding: "2px",
                      display: "inline-flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))
          )}

          {canManage && timetables.length > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={generatingSessions}
              onClick={handleGenerateFromTimetable}
              title="Automatically project recurring timetable blocks into upcoming scheduled lecture sessions"
            >
              <Sparkles size={14} />
              {generatingSessions ? "Projecting..." : "Project & Generate Sessions"}
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Filter Bar */}
      <div className="glass-panel responsive-filter-card">
        <div className="responsive-filter-group">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 800, color: "#0F172A" }}>
            <Filter size={15} color="#2563EB" /> Filter Sessions:
          </span>
          <select
            className="form-select responsive-select-auto"
            style={{ padding: "7px 12px", fontSize: "0.82rem" }}
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.code}: {c.title}
              </option>
            ))}
          </select>

          <select
            className="form-select responsive-select-auto"
            style={{ padding: "7px 12px", fontSize: "0.82rem" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Lifecycle States</option>
            <option value="in_progress">Live In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="responsive-filter-group" style={{ flex: "1 1 240px", justifyContent: "space-between" }}>
          <input
            type="text"
            className="form-input responsive-search-input"
            style={{ flex: "1 1 180px", padding: "7px 12px", fontSize: "0.82rem" }}
            placeholder="Search title, course code, module, or room code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="code-pill" style={{ fontSize: "0.75rem" }}>
            Showing {filteredSessions.length} / {sessions.length}
          </span>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="responsive-sessions-grid">
        {filteredSessions.map((sess) => {
          const isLive = sess.status === "in_progress";
          const isCompleted = sess.status === "completed";
          const isScheduled = sess.status === "scheduled";

          return (
            <div key={sess.id} className="glass-panel responsive-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="code-pill">{sess.course_code}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{sess.session_type}</span>
                  </div>
                  <div>
                    {isLive && <span className="badge badge-live"><Radio size={12} /> LIVE IN PROGRESS</span>}
                    {isCompleted && <span className="badge badge-completed"><CheckCircle size={12} /> COMPLETED</span>}
                    {isScheduled && <span className="badge badge-scheduled"><Clock size={12} /> SCHEDULED</span>}
                  </div>
                </div>

                {/* Session Title */}
                <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0F172A", marginBottom: "8px", lineHeight: 1.35 }}>
                  {sess.title}
                </h3>

                {/* Module Link */}
                {sess.module_title && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#2563EB", fontWeight: 700, marginBottom: "14px" }}>
                    <BookOpen size={15} />
                    <span>Module {sess.module_number}: {sess.module_title}</span>
                  </div>
                )}

                {/* Info block */}
                <div style={{
                  background: "#EFF6FF",
                  border: "2px solid #0F172A",
                  boxShadow: "2px 2px 0px #0F172A",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#475569" }}>Virtual Gate Code:</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A", fontWeight: 800 }}>{sess.virtual_room_code}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ color: "#475569" }}>Scheduled Window:</span>
                    <span style={{ color: "#0F172A", fontWeight: 700 }}>
                      {new Date(sess.scheduled_start).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                      {new Date(sess.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {new Date(sess.scheduled_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ color: "#475569" }}>Grace Window:</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#0F172A", fontWeight: 800 }}>
                      {sess.room_security_config?.grace_period_mins ?? 10} mins
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ color: "#475569" }}>Security Policy:</span>
                    <span className="code-pill" style={{ fontSize: "0.72rem", background: sess.room_security_config?.restrict_to_enrolled ? "#6EE7B7" : "#DBEAFE" }}>
                      {sess.room_security_config?.restrict_to_enrolled ? "Enrolled Whitelist" : "Institutional Domain"}
                    </span>
                  </div>
                </div>

                {/* Archival Recording Info if present */}
                {sess.recording_url && (
                  <div style={{
                    background: "#F0FDF4",
                    border: "1.5px solid #166534",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    marginBottom: "14px",
                    fontSize: "0.76rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span style={{ fontWeight: 700, color: "#166534" }}>
                      Archived Recording ({sess.recording_duration_mins || 85}m)
                    </span>
                    <a
                      href={sess.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#15803D", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      Stream <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Co-hosts list */}
                {sess.co_hosts && sess.co_hosts.length > 0 && (
                  <div style={{ marginBottom: "16px", fontSize: "0.8rem" }}>
                    <div style={{ color: "#475569", fontWeight: 700, marginBottom: "4px" }}>Delegated Co-Hosts &amp; TAs:</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {sess.co_hosts.map((ch: any) => (
                        <span key={ch.id} className="badge" style={{ background: "#DBEAFE", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {ch.user_name} ({ch.host_role.replace("_", " ")})
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCoHost(sess.id, ch.user_id)}
                              title="Revoke co-host delegation"
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#DC2626", padding: 0, display: "inline-flex" }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: "2px solid #0F172A", paddingTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {canManage ? (
                  <>
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
                        <Square size={14} /> End Session &amp; Compute Attendance
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
                          lock_gate: false,
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
                            recording_notes: sess.recording_notes || "Archived high-definition lecture capture.",
                          });
                          setShowArchiveModal(true);
                        }}
                      >
                        <Video size={14} /> Archive
                      </button>
                    )}

                    {isScheduled && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: "#DC2626", marginLeft: "auto" }}
                        onClick={() => handleDeleteSession(sess.id, sess.title)}
                        title="Delete scheduled session"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="badge" style={{ background: "#F1F5F9", color: "#475569", borderColor: "#0F172A", fontSize: "0.72rem" }}>
                    View-Only Access ({currentUser?.role || "Member"})
                  </span>
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
                    onChange={(e) => {
                      const nextCid = Number(e.target.value);
                      const nextCourse = courses.find((c) => c.id === nextCid);
                      setScheduleForm({
                        ...scheduleForm,
                        course_id: nextCid,
                        module_id: nextCourse?.modules?.[0]?.id || 0,
                      });
                    }}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
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
                <label className="form-label">Map to Syllabus Module ({selectedScheduleCourse?.code})</label>
                <select
                  className="form-select"
                  value={effectiveScheduleModuleId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, module_id: Number(e.target.value) })}
                >
                  {availableScheduleModules.length === 0 ? (
                    <option value={0}>Unmapped / General Course Session</option>
                  ) : (
                    availableScheduleModules.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        Module {m.module_number}: {m.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: "16px", marginBottom: "20px" }}>
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
                <div>
                  <label className="form-label">Grace (Mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    max={60}
                    value={scheduleForm.grace_period_mins}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, grace_period_mins: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Gate Security Toggles */}
              <div style={{ background: "#EFF6FF", border: "2px solid #0F172A", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
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
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Configure Academic Room Security
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "20px" }}>
              Adjust virtual classroom gate parameters for: <strong style={{ color: "#0F172A" }}>{selectedSession.title}</strong>
            </p>

            <form onSubmit={handleSecuritySubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "#EFF6FF", border: "2px solid #0F172A", padding: "14px", borderRadius: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={securityForm.restrict_to_enrolled}
                    onChange={(e) => setSecurityForm({ ...securityForm, restrict_to_enrolled: e.target.checked })}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: "#0F172A", fontSize: "0.9rem" }}>Whitelist Enrolled Roster Only</div>
                    <div style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                      Automatically blocks non-enrolled students and guest auditors unless explicitly invited.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "#EFF6FF", border: "2px solid #0F172A", padding: "14px", borderRadius: "8px", cursor: "pointer" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Course Section</label>
                  <select
                    className="form-select"
                    value={timetableForm.course_id}
                    onChange={(e) => setTimetableForm({ ...timetableForm, course_id: Number(e.target.value) })}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
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
              Assign Guest Lecturers &amp; Teaching Assistants
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
                  {allUsers
                    .filter((u) => ["TA", "Teaching Assistant", "Professor", "Dean"].includes(u.role))
                    .map((u) => (
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
                  <option value="teaching_assistant">Teaching Assistant (Take Attendance &amp; Co-edit Notes)</option>
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
                  Seal &amp; Archive Recording
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Create New Course */}
      {showCreateCourseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Provision New Academic Course
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "20px" }}>
              Creates a new institutional course section, enrolls you as lead instructor, and initializes Module 1.
            </p>

            <form onSubmit={handleCreateCourseSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Course Code</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. SE-405"
                    value={newCourseForm.code}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Academic Term</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newCourseForm.semester}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, semester: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Course Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Software Project Management & Governance"
                  value={newCourseForm.title}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newCourseForm.department}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, department: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Initial Syllabus Module 1 Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newCourseForm.initial_module_title}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, initial_module_title: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: Add Syllabus Module */}
      {showCreateModuleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Add Course Syllabus Module
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "20px" }}>
              Adds a new learning module to a course syllabus so lectures, notes, and quizzes can be mapped to it.
            </p>

            <form onSubmit={handleCreateModuleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Course</label>
                  <select
                    className="form-select"
                    value={newModuleForm.course_id}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      const cObj = courses.find((c) => c.id === cid);
                      setNewModuleForm({
                        ...newModuleForm,
                        course_id: cid,
                        module_number: (cObj?.modules?.length || 0) + 1,
                      });
                    }}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Module Number</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    required
                    value={newModuleForm.module_number}
                    onChange={(e) => setNewModuleForm({ ...newModuleForm, module_number: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Syllabus Module Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Zero-Knowledge Proofs & Verifiable Computation"
                  value={newModuleForm.title}
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, title: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Learning Objectives / Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Key topics covered in this syllabus unit..."
                  value={newModuleForm.description}
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Syllabus Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
