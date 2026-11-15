"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  UserCheck,
  Clock,
  Paperclip,
  Plus,
  ShieldAlert,
  Filter,
  ExternalLink,
  BookCheck,
} from "lucide-react";
import { api, buildAuthenticatedUrl } from "@/lib/api";

interface LeavesModuleProps {
  currentUser: any;
}

export default function LeavesModule({ currentUser }: LeavesModuleProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any | null>(null);

  // Filters
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  const isStudentRole = currentUser?.role === "Student";
  const canReviewLeaves = ["Dean", "Professor"].includes(currentUser?.role || "");

  // Form States
  const [submitForm, setSubmitForm] = useState(() => ({
    student_id: currentUser?.role === "Student" && currentUser?.id ? currentUser.id : 10,
    course_id: 1,
    session_id: 0,
    category: "medical",
    start_date: "2026-10-18T09:00",
    end_date: "2026-10-19T17:00",
    reason: "",
    document_filename: "Official_Medical_Certificate_Hospital.pdf",
    document_url: "",
    note_proxy_id: 7,
  }));

  const [reviewForm, setReviewForm] = useState({
    status: "approved" as "approved" | "rejected",
    review_comment: "",
  });

  const [proxyForm, setProxyForm] = useState({
    note_proxy_id: 7,
  });

  const [allUsers, setAllUsers] = useState<any[]>([]);

  const loadLeaves = async () => {
    try {
      const [leavesRes, coursesRes, sessRes, uRes] = await Promise.all([
        api.leaves.getAll(),
        api.sessions.getCourses(),
        api.sessions.getAll(),
        api.auth.getUsers(),
      ]);
      if (leavesRes.success) setLeaves(leavesRes.leaves);
      if (coursesRes.success) setCourses(coursesRes.courses);
      if (sessRes.success) setSessions(sessRes.sessions);
      if (uRes.success) {
        setAllUsers(uRes.users);
        const selfId = isStudentRole && currentUser?.id ? currentUser.id : submitForm.student_id;
        const firstPeer = uRes.users.find((u: any) => u.role === "Student" && u.id !== selfId);
        if (firstPeer) {
          setSubmitForm((prev) =>
            prev.note_proxy_id === selfId || !uRes.users.some((u: any) => u.id === prev.note_proxy_id && u.role === "Student" && u.id !== selfId)
              ? { ...prev, note_proxy_id: firstPeer.id }
              : prev
          );
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
        void loadLeaves();
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courseSessionsForModal = useMemo(() => {
    return sessions.filter((s) => s.course_id === Number(submitForm.course_id));
  }, [sessions, submitForm.course_id]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      if (courseFilter !== "all" && String(leave.course_id) !== courseFilter) return false;
      if (statusFilter !== "all" && leave.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStudent = (leave.student_name || "").toLowerCase().includes(q);
        const matchId = (leave.institutional_id || "").toLowerCase().includes(q);
        const matchReason = (leave.reason || "").toLowerCase().includes(q);
        const matchCat = (leave.category || "").toLowerCase().includes(q);
        if (!matchStudent && !matchId && !matchReason && !matchCat) return false;
      }
      return true;
    });
  }, [leaves, courseFilter, statusFilter, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const res = await api.system.uploadFile(file);
      if (res.success) {
        setSubmitForm((prev) => ({
          ...prev,
          document_filename: res.filename || file.name,
          document_url: res.file_url,
        }));
      }
    } catch (err: any) {
      alert(err.message || "File upload failed.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.leaves.submit({
        student_id: isStudentRole && currentUser?.id ? currentUser.id : Number(submitForm.student_id),
        course_id: Number(submitForm.course_id),
        session_id: submitForm.session_id ? Number(submitForm.session_id) : null,
        category: submitForm.category,
        start_date: submitForm.start_date,
        end_date: submitForm.end_date,
        reason: submitForm.reason,
        document_filename: submitForm.document_filename,
        document_url: submitForm.document_url || `/uploads/${submitForm.document_filename}`,
        note_proxy_id: submitForm.note_proxy_id ? Number(submitForm.note_proxy_id) : null,
      });
      setShowSubmitModal(false);
      setSubmitForm({
        ...submitForm,
        reason: "",
      });
      await loadLeaves();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    try {
      await api.leaves.review(
        selectedLeave.id,
        reviewForm.status,
        reviewForm.review_comment,
        currentUser?.id || 2
      );
      setShowReviewModal(false);
      await loadLeaves();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignProxySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    try {
      await api.leaves.assignProxy(selectedLeave.id, Number(proxyForm.note_proxy_id));
      setShowProxyModal(false);
      await loadLeaves();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeliverProxyNotes = async (leaveId: number) => {
    try {
      await api.leaves.deliverProxyNotes(leaveId);
      await loadLeaves();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewStudentHistory = async (studentId: number) => {
    try {
      const res = await api.leaves.getStudentHistory(studentId);
      if (res.success) {
        setSelectedStudentHistory(res);
        setShowHistoryModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="responsive-module-shell">
      {/* Header */}
      <div className="responsive-module-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span className="code-pill" style={{ background: "#60A5FA", fontSize: "0.72rem" }}>
              {isStudentRole ? "ABSENCE & PEER PROXY" : "MODULE 3 SPECIFICATION"}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>Absence Routing &amp; Peer Proxy</span>
          </div>
          <h1 className="responsive-module-title">
            Academic Leave &amp; Absence Approval
          </h1>
          {!isStudentRole && (
            <p style={{ color: "#334155", fontSize: "0.95rem", fontWeight: 600, maxWidth: "800px", marginTop: "4px" }}>
              Routes student medical and excused absence forms to faculty/administrators for formal validation, reconciles attendance, and pairs note proxies.
            </p>
          )}
        </div>

        {/* Global Action */}
        <button
          className="btn btn-primary responsive-action-mobile-full"
          onClick={() => {
            const defaultCid = courses[0]?.id || 1;
            const activeSid = isStudentRole && currentUser?.id ? currentUser.id : submitForm.student_id;
            const firstPeer = allUsers.find((u) => u.role === "Student" && u.id !== activeSid);
            setSubmitForm((prev) => ({
              ...prev,
              course_id: defaultCid,
              student_id: activeSid,
              note_proxy_id: firstPeer && (prev.note_proxy_id === activeSid || !prev.note_proxy_id) ? firstPeer.id : prev.note_proxy_id,
            }));
            setShowSubmitModal(true);
          }}
        >
          <Plus size={16} /> Submit Leave Request
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel responsive-filter-card">
        <div className="responsive-filter-group">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 800, color: "#0F172A" }}>
            <Filter size={15} color="#2563EB" /> Filter Requests:
          </span>
          <select
            className="form-select responsive-select-auto"
            style={{ padding: "7px 12px", fontSize: "0.82rem" }}
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
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
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved &amp; Reconciled</option>
            <option value="rejected">Dismissed / Rejected</option>
          </select>
        </div>

        <div className="responsive-filter-group">
          <input
            type="text"
            className="form-input responsive-search-input"
            style={{ padding: "6px 12px", fontSize: "0.82rem" }}
            placeholder="Search student, ID, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="code-pill" style={{ fontSize: "0.75rem" }}>
            {filteredLeaves.length} Request(s)
          </span>
        </div>
      </div>

      {/* Leaves Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {filteredLeaves.map((leave) => {
          const isPending = leave.status === "pending";
          const isApproved = leave.status === "approved";
          const isRejected = leave.status === "rejected";
          const docUrl = buildAuthenticatedUrl(
            leave.document_url || `/uploads/${leave.document_filename || "Official_Medical_Certificate.pdf"}`
          );
          const canDeliverNotes =
            leave.note_proxy_id &&
            !leave.proxy_notes_delivered &&
            (canReviewLeaves ||
              currentUser?.id === leave.note_proxy_id ||
              currentUser?.id === leave.student_id);

          return (
            <div key={leave.id} className="glass-panel responsive-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span className="code-pill">{leave.course_code || "CS-401"}</span>
                    <span className="badge" style={{ background: "#DBEAFE" }}>
                      Category: {leave.category.replace("_", " ").toUpperCase()}
                    </span>
                    {isPending && <span className="badge badge-late"><Clock size={12} /> PENDING REVIEW</span>}
                    {isApproved && <span className="badge badge-present"><CheckCircle size={12} /> APPROVED &amp; RECONCILED</span>}
                    {isRejected && <span className="badge badge-absent"><XCircle size={12} /> DISMISSED</span>}
                    {leave.proxy_notes_delivered && (
                      <span className="badge" style={{ background: "#DCFCE7", color: "#166534" }}>
                        <BookCheck size={12} /> PROXY STUDY NOTES DELIVERED
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0F172A", marginBottom: "4px" }}>
                    {leave.student_name} ({leave.institutional_id})
                  </h3>

                  <p style={{ color: "#1E293B", fontSize: "0.92rem", fontWeight: 600, maxWidth: "800px", lineHeight: 1.5, marginBottom: "14px" }}>
                    &ldquo;{leave.reason}&rdquo;
                  </p>

                  <div style={{ display: "flex", gap: "18px", fontSize: "0.82rem", fontWeight: 700, color: "#475569", flexWrap: "wrap", alignItems: "center" }}>
                    <span>
                      Leave Window:{" "}
                      <strong style={{ color: "#0F172A" }}>
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </strong>
                    </span>
                    <span>•</span>
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#2563EB", textDecoration: "underline", fontWeight: 800 }}
                      title="Open official attached verification document"
                    >
                      <Paperclip size={14} /> {leave.document_filename || "Verification_Certificate.pdf"}{" "}
                      <ExternalLink size={12} />
                    </a>
                    <span>•</span>
                    <span>
                      Designated Note Proxy:{" "}
                      {leave.note_proxy_name ? (
                        <strong style={{ color: "#059669" }}>
                          {leave.note_proxy_name} ({leave.proxy_notes_delivered ? "Delivered" : "Paired"})
                        </strong>
                      ) : (
                        <span style={{ color: "#64748B" }}>Unassigned</span>
                      )}
                    </span>
                  </div>

                  {/* Review commentary if processed */}
                  {leave.reviewed_by_name && (
                    <div style={{ marginTop: "14px", background: "#EFF6FF", border: "2px solid #0F172A", padding: "10px 14px", borderRadius: "8px", fontSize: "0.82rem" }}>
                      <span style={{ color: "#475569", fontWeight: 700 }}>Faculty Reviewer: </span>
                      <strong style={{ color: "#0F172A" }}>{leave.reviewed_by_name}</strong>
                      <span style={{ margin: "0 8px" }}>—</span>
                      <span style={{ color: "#0F172A", fontWeight: 600 }}>
                        &ldquo;{leave.review_comment || "Validated against institutional standards."}&rdquo;
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewStudentHistory(leave.student_id)}
                  >
                    View Leave History
                  </button>

                  {canDeliverNotes && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleDeliverProxyNotes(leave.id)}
                      title="Confirm that peer proxy study notes have been shared with the absent student"
                    >
                      <BookCheck size={14} /> Mark Proxy Notes Delivered
                    </button>
                  )}

                  {canReviewLeaves && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedLeave(leave);
                          setProxyForm({ note_proxy_id: leave.note_proxy_id || 7 });
                          setShowProxyModal(true);
                        }}
                      >
                        <UserCheck size={14} /> Assign Proxy
                      </button>

                      {isPending && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setReviewForm({
                              status: "approved",
                              review_comment: "Official medical documentation validated.",
                            });
                            setShowReviewModal(true);
                          }}
                        >
                          Validate / Reject
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Submit Leave Request */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Submit Excused Absence Request
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Applies for formalized excused absence with category classification, session linking, and credential attachment.
            </p>

            <form onSubmit={handleSubmitLeave}>
              <div className="responsive-2col-grid" style={{ marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Student Applying</label>
                  {isStudentRole && currentUser ? (
                    <div
                      className="form-input"
                      style={{
                        background: "#F8FAFC",
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      {currentUser.name} ({currentUser.institutional_id})
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={submitForm.student_id}
                      onChange={(e) => setSubmitForm({ ...submitForm, student_id: Number(e.target.value) })}
                    >
                      {allUsers
                        .filter((u) => u.role === "Student")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.institutional_id})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="form-label">Absence Category Tag</label>
                  <select
                    className="form-select"
                    value={submitForm.category}
                    onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })}
                  >
                    <option value="medical">Medical (Clinic / Hospital note)</option>
                    <option value="university_competition">Official University Athletics / Competition</option>
                    <option value="academic_conference">Academic Conference / Research Presentation</option>
                    <option value="bereavement">Bereavement &amp; Family Emergency</option>
                    <option value="emergency">Personal Emergency</option>
                  </select>
                </div>
              </div>

              <div className="responsive-2col-grid" style={{ marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Course Section</label>
                  <select
                    className="form-select"
                    value={submitForm.course_id}
                    onChange={(e) =>
                      setSubmitForm({
                        ...submitForm,
                        course_id: Number(e.target.value),
                        session_id: 0,
                      })
                    }
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Affected Session (Optional)</label>
                  <select
                    className="form-select"
                    value={submitForm.session_id}
                    onChange={(e) => setSubmitForm({ ...submitForm, session_id: Number(e.target.value) })}
                  >
                    <option value={0}>All Sessions in Date Window</option>
                    {courseSessionsForModal.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({new Date(s.scheduled_start).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="responsive-2col-grid" style={{ marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={submitForm.start_date}
                    onChange={(e) => setSubmitForm({ ...submitForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={submitForm.end_date}
                    onChange={(e) => setSubmitForm({ ...submitForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Reason &amp; Institutional Explanation</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Provide precise details regarding the necessity of the absence."
                  value={submitForm.reason}
                  onChange={(e) => setSubmitForm({ ...submitForm, reason: e.target.value })}
                />
              </div>

              <div className="responsive-2col-grid" style={{ marginBottom: "24px" }}>
                <div>
                  <label className="form-label">Upload or Name Verification Doc</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                    className="form-input"
                    style={{ marginBottom: "8px", padding: "6px" }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={submitForm.document_filename}
                    onChange={(e) => setSubmitForm({ ...submitForm, document_filename: e.target.value })}
                    placeholder="Document filename"
                  />
                  {uploadingDoc && (
                    <span style={{ fontSize: "0.75rem", color: "#2563EB", fontWeight: 700 }}>
                      Uploading verification document...
                    </span>
                  )}
                </div>
                <div>
                  <label className="form-label">Pair Classmate Note Proxy</label>
                  <select
                    className="form-select"
                    value={submitForm.note_proxy_id}
                    onChange={(e) => setSubmitForm({ ...submitForm, note_proxy_id: Number(e.target.value) })}
                  >
                    {allUsers
                      .filter(
                        (u) =>
                          u.role === "Student" &&
                          u.id !== (isStudentRole && currentUser?.id ? currentUser.id : submitForm.student_id)
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.institutional_id}) - Enrolled Peer
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingDoc}>
                  Submit for Formal Validation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Approve / Reject Absence */}
      {showReviewModal && selectedLeave && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Validate Excused Absence Request
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Evaluating request for <strong style={{ color: "#000000" }}>{selectedLeave.student_name}</strong> ({selectedLeave.category})
            </p>

            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Faculty Determination</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button
                    type="button"
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "2.5px solid #0F172A",
                      boxShadow: reviewForm.status === "approved" ? "4px 4px 0px #0F172A" : "2px 2px 0px #0F172A",
                      background: reviewForm.status === "approved" ? "#34D399" : "#FFFFFF",
                      color: "#0F172A",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onClick={() => setReviewForm({ ...reviewForm, status: "approved" })}
                  >
                    <CheckCircle size={18} color="#0F172A" /> Approve Absence
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "2.5px solid #0F172A",
                      boxShadow: reviewForm.status === "rejected" ? "4px 4px 0px #0F172A" : "2px 2px 0px #0F172A",
                      background: reviewForm.status === "rejected" ? "#FB7185" : "#FFFFFF",
                      color: "#0F172A",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onClick={() => setReviewForm({ ...reviewForm, status: "rejected" })}
                  >
                    <XCircle size={18} color="#0F172A" /> Dismiss / Reject
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Official Academic Review Commentary</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Specify confirmation of doctor note or reasons for rejection."
                  value={reviewForm.review_comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_comment: e.target.value })}
                />
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#166534", marginTop: "6px" }}>
                  ✓ Approving will automatically reconcile affected lecture session attendance records to &lsquo;Excused&rsquo;.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Finalize Determination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign Note Proxy */}
      {showProxyModal && selectedLeave && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Pair Designated Note Proxy
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 600, marginBottom: "20px" }}>
              Assign an enrolled peer note-taker to deliver official lecture study summaries to absent student:{" "}
              <strong style={{ color: "#000000" }}>{selectedLeave.student_name}</strong>
            </p>

            <form onSubmit={handleAssignProxySubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Select Peer Classmate Note-Taker</label>
                <select
                  className="form-select"
                  value={proxyForm.note_proxy_id}
                  onChange={(e) => setProxyForm({ note_proxy_id: Number(e.target.value) })}
                >
                  {allUsers
                    .filter((u) => u.role === "Student" && u.id !== selectedLeave.student_id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.institutional_id}) - Enrolled Peer
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProxyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Pair Note Proxy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Student Leave History & Truancy Warning */}
      {showHistoryModal && selectedStudentHistory && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "720px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#000000" }}>
                  Cumulative Absence History: {selectedStudentHistory.student?.name}
                </h2>
                <div style={{ fontSize: "0.85rem", color: "#4B5563", fontWeight: 700 }}>
                  ID: {selectedStudentHistory.student?.institutional_id} • {selectedStudentHistory.student?.department}
                </div>
              </div>
            </div>

            {/* Threshold Warning Banner */}
            <div style={{
              background: selectedStudentHistory.summary?.threshold_warning ? "#FEE2E2" : "#DCFCE7",
              border: "2.5px solid #000000",
              boxShadow: "3px 3px 0px #000000",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}>
              {selectedStudentHistory.summary?.threshold_warning ? (
                <ShieldAlert size={28} color="#EF4444" />
              ) : (
                <CheckCircle size={28} color="#16A34A" />
              )}
              <div>
                <div style={{ fontWeight: 900, color: "#000000", fontSize: "0.95rem" }}>
                  {selectedStudentHistory.summary?.threshold_warning ? "ACADEMIC TRUANCY ALERT" : "ATTENDANCE COMPLIANCE VERIFIED"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#1F2937", fontWeight: 600, marginTop: "2px" }}>
                  {selectedStudentHistory.summary?.warning_message}
                </div>
              </div>
            </div>

            {/* Summary Stat Grid */}
            <div className="responsive-stats-grid" style={{ marginBottom: "20px" }}>
              <div style={{ background: "#FFFFFF", border: "2px solid #0F172A", boxShadow: "2px 2px 0px #0F172A", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800 }}>SESSIONS</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F172A" }}>{selectedStudentHistory.summary?.total_records}</div>
              </div>
              <div style={{ background: "#DBEAFE", border: "2px solid #0F172A", boxShadow: "2px 2px 0px #0F172A", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#1E40AF", fontWeight: 800 }}>EXCUSED</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F172A" }}>{selectedStudentHistory.summary?.excused_count}</div>
              </div>
              <div style={{ background: "#FFE4E6", border: "2px solid #0F172A", boxShadow: "2px 2px 0px #0F172A", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#9F1239", fontWeight: 800 }}>UNEXCUSED</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F172A" }}>
                  {selectedStudentHistory.summary?.unexcused_count}
                </div>
              </div>
              <div style={{ background: "#D1FAE5", border: "2px solid #0F172A", boxShadow: "2px 2px 0px #0F172A", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#065F46", fontWeight: 800 }}>ABSENCE RATE</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0F172A" }}>{selectedStudentHistory.summary?.absence_rate_pct}%</div>
              </div>
            </div>

            {/* Requests List */}
            <h4 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#000000", marginBottom: "10px" }}>
              Historical Absence Submissions
            </h4>
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "2px solid #000000", borderRadius: "8px", padding: "10px", background: "#FFFFFF" }}>
              {selectedStudentHistory.leave_requests?.map((l: any) => (
                <div key={l.id} style={{ padding: "8px 0", borderBottom: "1.5px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#000000" }}>
                      [{l.course_code}] {l.category.toUpperCase()}: {l.reason}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>
                      {new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`badge badge-${l.status === "approved" ? "present" : l.status === "rejected" ? "absent" : "late"}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
