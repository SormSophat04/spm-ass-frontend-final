"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Paperclip, 
  Plus, 
  ShieldAlert
} from "lucide-react";
import { api } from "@/lib/api";

interface LeavesModuleProps {
  currentUser: any;
}

export default function LeavesModule({ currentUser }: LeavesModuleProps) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any | null>(null);

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);

  // Form States
  const [submitForm, setSubmitForm] = useState({
    student_id: 10, // Sophia Patel
    course_id: 1,
    category: "medical",
    start_date: "2026-10-18T09:00",
    end_date: "2026-10-19T17:00",
    reason: "",
    document_filename: "Official_Medical_Certificate_Hospital.pdf",
    note_proxy_id: 7 // Jordan Miller
  });

  const [reviewForm, setReviewForm] = useState({
    status: "approved" as "approved" | "rejected",
    review_comment: ""
  });

  const [proxyForm, setProxyForm] = useState({
    note_proxy_id: 7
  });

  const [allUsers, setAllUsers] = useState<any[]>([]);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.leaves.getAll();
      if (res.success) setLeaves(res.leaves);
      const uRes = await api.auth.getUsers();
      if (uRes.success) setAllUsers(uRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.leaves.submit({
        student_id: Number(submitForm.student_id),
        course_id: Number(submitForm.course_id),
        category: submitForm.category,
        start_date: submitForm.start_date,
        end_date: submitForm.end_date,
        reason: submitForm.reason,
        document_filename: submitForm.document_filename,
        note_proxy_id: Number(submitForm.note_proxy_id)
      });
      setShowSubmitModal(false);
      setSubmitForm({
        ...submitForm,
        reason: ""
      });
      loadLeaves();
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
      loadLeaves();
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
      loadLeaves();
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
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="code-pill" style={{ background: "#C4B5FD" }}>MODULE 3 SPECIFICATION</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4B5563" }}>Absence Routing & Peer Proxy</span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.02em" }}>
            Academic Leave & Absence Approval
          </h1>
          <p style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 600, maxWidth: "800px", marginTop: "4px" }}>
            Routes student medical and excused absence forms to faculty/administrators for formal validation, reconciles attendance, and pairs note proxies.
          </p>
        </div>

        {/* Global Action */}
        <button 
          className="btn btn-primary"
          onClick={() => setShowSubmitModal(true)}
        >
          <Plus size={16} /> Submit Leave Request
        </button>
      </div>

      {/* Leaves Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {leaves.map((leave) => {
          const isPending = leave.status === "pending";
          const isApproved = leave.status === "approved";
          const isRejected = leave.status === "rejected";

          return (
            <div key={leave.id} className="glass-panel" style={{ padding: "22px 26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span className="code-pill">{leave.course_code || "CS-401"}</span>
                    <span className="badge" style={{ background: "#EDE9FE" }}>
                      Category: {leave.category.replace("_", " ").toUpperCase()}
                    </span>
                    {isPending && <span className="badge badge-late"><Clock size={12} /> PENDING REVIEW</span>}
                    {isApproved && <span className="badge badge-present"><CheckCircle size={12} /> APPROVED & RECONCILED</span>}
                    {isRejected && <span className="badge badge-absent"><XCircle size={12} /> DISMISSED</span>}
                  </div>

                  <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#000000", marginBottom: "4px" }}>
                    {leave.student_name} ({leave.institutional_id})
                  </h3>

                  <p style={{ color: "#1F2937", fontSize: "0.92rem", fontWeight: 600, maxWidth: "800px", lineHeight: 1.5, marginBottom: "14px" }}>
                    "{leave.reason}"
                  </p>

                  <div style={{ display: "flex", gap: "20px", fontSize: "0.82rem", fontWeight: 700, color: "#4B5563", flexWrap: "wrap" }}>
                    <span>Leave Window: <strong style={{ color: "#000000" }}>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</strong></span>
                    <span>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#0284C7" }}>
                      <Paperclip size={14} /> Document: {leave.document_filename || "Attached Certificate"}
                    </span>
                    <span>•</span>
                    <span>
                      Designated Note Proxy: {leave.note_proxy_name ? (
                        <strong style={{ color: "#16A34A" }}>{leave.note_proxy_name} (Paired)</strong>
                      ) : (
                        <span style={{ color: "#B45309" }}>Unassigned</span>
                      )}
                    </span>
                  </div>

                  {/* Review commentary if processed */}
                  {leave.reviewed_by_name && (
                    <div style={{ marginTop: "14px", background: "#F5F2EB", border: "2px solid #000000", padding: "10px 14px", borderRadius: "8px", fontSize: "0.82rem" }}>
                      <span style={{ color: "#4B5563", fontWeight: 700 }}>Faculty Reviewer: </span>
                      <strong style={{ color: "#000000" }}>{leave.reviewed_by_name}</strong>
                      <span style={{ margin: "0 8px" }}>—</span>
                      <span style={{ color: "#111827", fontWeight: 600 }}>"{leave.review_comment || 'Validated against institutional standards.'}"</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewStudentHistory(leave.student_id)}
                  >
                    View Leave History
                  </button>

                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedLeave(leave);
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
                        setReviewForm({ status: "approved", review_comment: "Official medical documentation validated." });
                        setShowReviewModal(true);
                      }}
                    >
                      Validate / Reject
                    </button>
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
              Applies for formalized excused absence with category classification and credential attachment.
            </p>

            <form onSubmit={handleSubmitLeave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Student Applying</label>
                  <select 
                    className="form-select"
                    value={submitForm.student_id}
                    onChange={(e) => setSubmitForm({ ...submitForm, student_id: Number(e.target.value) })}
                  >
                    {allUsers.filter((u) => u.role === "Student").map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.institutional_id})
                      </option>
                    ))}
                  </select>
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
                    <option value="bereavement">Bereavement & Family Emergency</option>
                    <option value="emergency">Personal Emergency</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
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
                <label className="form-label">Reason & Institutional Explanation</label>
                <textarea 
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Provide precise details regarding the necessity of the absence."
                  value={submitForm.reason}
                  onChange={(e) => setSubmitForm({ ...submitForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div>
                  <label className="form-label">Attach Verification Doc</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={submitForm.document_filename}
                    onChange={(e) => setSubmitForm({ ...submitForm, document_filename: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Pair Classmate Note Proxy</label>
                  <select 
                    className="form-select"
                    value={submitForm.note_proxy_id}
                    onChange={(e) => setSubmitForm({ ...submitForm, note_proxy_id: Number(e.target.value) })}
                  >
                    {allUsers.filter((u) => u.role === "Student" && u.id !== submitForm.student_id).map((u) => (
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
                <button type="submit" className="btn btn-primary">
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
                      border: "2.5px solid #000000",
                      boxShadow: reviewForm.status === "approved" ? "4px 4px 0px #000000" : "2px 2px 0px #000000",
                      background: reviewForm.status === "approved" ? "#4ADE80" : "#FFFFFF",
                      color: "#000000",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                    onClick={() => setReviewForm({ ...reviewForm, status: "approved" })}
                  >
                    <CheckCircle size={18} color="#000000" /> Approve Absence
                  </button>

                  <button 
                    type="button"
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "2.5px solid #000000",
                      boxShadow: reviewForm.status === "rejected" ? "4px 4px 0px #000000" : "2px 2px 0px #000000",
                      background: reviewForm.status === "rejected" ? "#FF6584" : "#FFFFFF",
                      color: "#000000",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                    onClick={() => setReviewForm({ ...reviewForm, status: "rejected" })}
                  >
                    <XCircle size={18} color="#000000" /> Dismiss / Reject
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
                  ✓ Approving will automatically reconcile affected lecture session attendance records to 'Excused'.
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
              Assign an enrolled peer note-taker to deliver official lecture study summaries to absent student: <strong style={{ color: "#000000" }}>{selectedLeave.student_name}</strong>
            </p>

            <form onSubmit={handleAssignProxySubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Select Peer Classmate Note-Taker</label>
                <select 
                  className="form-select"
                  value={proxyForm.note_proxy_id}
                  onChange={(e) => setProxyForm({ note_proxy_id: Number(e.target.value) })}
                >
                  {allUsers.filter((u) => u.role === "Student" && u.id !== selectedLeave.student_id).map((u) => (
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
              gap: "14px"
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "#FFFFFF", border: "2px solid #000000", boxShadow: "2px 2px 0px #000000", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#6B7280", fontWeight: 800 }}>SESSIONS</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#000000" }}>{selectedStudentHistory.summary?.total_records}</div>
              </div>
              <div style={{ background: "#EDE9FE", border: "2px solid #000000", boxShadow: "2px 2px 0px #000000", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#5B21B6", fontWeight: 800 }}>EXCUSED</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#000000" }}>{selectedStudentHistory.summary?.excused_count}</div>
              </div>
              <div style={{ background: "#FEF08A", border: "2px solid #000000", boxShadow: "2px 2px 0px #000000", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#854D0E", fontWeight: 800 }}>UNEXCUSED</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#000000" }}>
                  {selectedStudentHistory.summary?.unexcused_count}
                </div>
              </div>
              <div style={{ background: "#DCFCE7", border: "2px solid #000000", boxShadow: "2px 2px 0px #000000", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 800 }}>ABSENCE RATE</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#000000" }}>{selectedStudentHistory.summary?.absence_rate_pct}%</div>
              </div>
            </div>

            {/* Requests List */}
            <h4 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#000000", marginBottom: "10px" }}>
              Historical Absence Submissions
            </h4>
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "2px solid #000000", borderRadius: "8px", padding: "10px", background: "#FFFFFF" }}>
              {selectedStudentHistory.leave_requests?.map((l: any) => (
                <div key={l.id} style={{ padding: "8px 0", borderBottom: "1.5px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#000000" }}>{l.category.toUpperCase()}: {l.reason}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>
                      {new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`badge badge-${l.status === 'approved' ? 'present' : (l.status === 'rejected' ? 'absent' : 'late')}`}>
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
