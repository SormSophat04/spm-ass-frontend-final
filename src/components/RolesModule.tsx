"use client";

import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  ShieldCheck, 
  UserCheck, 
  Check, 
  X, 
  UserX, 
  Award, 
  Lock, 
  Unlock, 
  Layers,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";

interface RolesModuleProps {
  currentUser: any;
}

export default function RolesModule({ currentUser }: RolesModuleProps) {
  const [rolesMatrix, setRolesMatrix] = useState<any | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number>(1);
  const [authorities, setAuthorities] = useState<any | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState("Student dropped course before semester deadline.");

  const [newInstructorId, setNewInstructorId] = useState<number>(3); // Clara Richter
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const loadData = async (courseId: number) => {
    setLoading(true);
    try {
      const matRes = await api.roles.getMatrix();
      if (matRes.success) setRolesMatrix(matRes.roles_matrix);

      const authRes = await api.roles.getCourseAuthorities(courseId);
      if (authRes.success) setAuthorities(authRes);

      const enrRes = await api.roles.getEnrollments(courseId);
      if (enrRes.success) setEnrollments(enrRes.enrollments);

      const uRes = await api.auth.getUsers();
      if (uRes.success) setAllUsers(uRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedCourseId);
  }, [selectedCourseId]);

  // Toggle TA Permission Scopes
  const handleToggleTAScope = async (scope: any, field: string) => {
    try {
      const updated = {
        ...scope,
        [field]: !scope[field],
        actor_id: currentUser?.id || 2
      };
      await api.roles.updateTAScope(scope.id, updated);
      loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Assign Primary Instructor
  const handleAssignAuthority = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.roles.assignAuthority(selectedCourseId, Number(newInstructorId), currentUser?.id || 1);
      setShowAssignModal(false);
      loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Revoke Enrollment Access
  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    try {
      await api.roles.revokeAccess(selectedEnrollment.id, revokeReason, currentUser?.id || 1);
      setShowRevokeModal(false);
      loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{
              background: "#FFE600",
              color: "#000000",
              fontWeight: 800,
              fontSize: "0.78rem",
              padding: "4px 10px",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
              borderRadius: "4px",
              letterSpacing: "0.03em"
            }}>
              MODULE 6 SPECIFICATION
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4B5563" }}>
              Institutional Governance & Scopes
            </span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.03em" }}>
            Roles & Permissions Management
          </h1>
          <p style={{ color: "#4B5563", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px", fontWeight: 500 }}>
            Governs institutional access tiers across Dean, Professor, Teaching Assistant, Student, and Auditor credentials.
          </p>
        </div>

        {/* Global Action */}
        <button 
          className="btn btn-primary"
          onClick={() => setShowAssignModal(true)}
          style={{
            background: "#FFE600",
            color: "#000000",
            border: "2.5px solid #000000",
            boxShadow: "3px 3px 0px #000000",
            fontWeight: 800
          }}
        >
          <Award size={16} /> Assign Course Authority
        </button>
      </div>

      {/* Institutional Roles Matrix Table */}
      <div style={{
        background: "#FFFFFF",
        border: "2.5px solid #000000",
        boxShadow: "4px 4px 0px #000000",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "28px"
      }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#000000", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={20} color="#000000" /> Academic Role Authority Matrix
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#FEF08A", borderBottom: "2.5px solid #000000", color: "#000000" }}>
                <th style={{ padding: "12px 14px", fontWeight: 900 }}>ROLE TIER</th>
                <th style={{ padding: "12px 14px", fontWeight: 900 }}>DESCRIPTION</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900 }}>SCHEDULE SESSIONS</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900 }}>OVERRIDE ATTENDANCE</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900 }}>PUBLISH GRADES</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900 }}>LOCK SYLLABUS MOM</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900 }}>AUDIT TRAIL</th>
              </tr>
            </thead>
            <tbody>
              {rolesMatrix && Object.entries(rolesMatrix).map(([roleName, perm]: [string, any]) => (
                <tr key={roleName} style={{ borderBottom: "1.5px solid #000000" }}>
                  <td style={{ padding: "14px", fontWeight: 800, color: "#000000" }}>
                    <span style={{
                      background: "#EDE9FE",
                      border: "1.5px solid #000000",
                      borderRadius: "4px",
                      padding: "4px 10px",
                      fontWeight: 800,
                      color: "#000000",
                      display: "inline-block"
                    }}>
                      {roleName}
                    </span>
                  </td>
                  <td style={{ padding: "14px", color: "#374151", maxWidth: "340px", lineHeight: 1.4, fontWeight: 500 }}>
                    {perm.description}
                  </td>
                  <td style={{ padding: "14px", textAlign: "center" }}>
                    {perm.can_schedule_sessions ? (
                      <span style={{ display: "inline-flex", background: "#86EFAC", border: "1.5px solid #000000", borderRadius: "50%", padding: "3px" }}>
                        <Check size={14} color="#000000" strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", background: "#F3F4F6", border: "1px solid #9CA3AF", borderRadius: "50%", padding: "3px" }}>
                        <X size={14} color="#9CA3AF" strokeWidth={2.5} />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px", textAlign: "center" }}>
                    {perm.can_override_attendance ? (
                      <span style={{ display: "inline-flex", background: "#86EFAC", border: "1.5px solid #000000", borderRadius: "50%", padding: "3px" }}>
                        <Check size={14} color="#000000" strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", background: "#F3F4F6", border: "1px solid #9CA3AF", borderRadius: "50%", padding: "3px" }}>
                        <X size={14} color="#9CA3AF" strokeWidth={2.5} />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px", textAlign: "center" }}>
                    {perm.can_publish_grades ? (
                      <span style={{ display: "inline-flex", background: "#86EFAC", border: "1.5px solid #000000", borderRadius: "50%", padding: "3px" }}>
                        <Check size={14} color="#000000" strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", background: "#FEE2E2", border: "1.5px solid #EF4444", borderRadius: "50%", padding: "3px" }}>
                        <X size={14} color="#EF4444" strokeWidth={3} />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px", textAlign: "center" }}>
                    {perm.can_seal_notes ? (
                      <span style={{ display: "inline-flex", background: "#86EFAC", border: "1.5px solid #000000", borderRadius: "50%", padding: "3px" }}>
                        <Check size={14} color="#000000" strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", background: "#F3F4F6", border: "1px solid #9CA3AF", borderRadius: "50%", padding: "3px" }}>
                        <X size={14} color="#9CA3AF" strokeWidth={2.5} />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px", textAlign: "center" }}>
                    {perm.can_view_audit_trail ? (
                      <span style={{ display: "inline-flex", background: "#86EFAC", border: "1.5px solid #000000", borderRadius: "50%", padding: "3px" }}>
                        <Check size={14} color="#000000" strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", background: "#F3F4F6", border: "1px solid #9CA3AF", borderRadius: "50%", padding: "3px" }}>
                        <X size={14} color="#9CA3AF" strokeWidth={2.5} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column: TA Scopes & Enrolment Management */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Column 1: Teaching Assistant Privilege Scopes */}
        <div style={{
          background: "#FFFFFF",
          border: "2.5px solid #000000",
          boxShadow: "4px 4px 0px #000000",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#000000" }}>
                Teaching Assistant Permission Scopes
              </h3>
              <div style={{ fontSize: "0.82rem", color: "#4B5563", fontWeight: 600 }}>
                Course: CS-401 • Delegated Privileges
              </div>
            </div>
            <span style={{
              background: "#7DD3FC",
              color: "#000000",
              border: "1.5px solid #000000",
              borderRadius: "4px",
              padding: "3px 8px",
              fontWeight: 800,
              fontSize: "0.75rem"
            }}>
              TA Delegation
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {authorities?.ta_scopes?.map((scope: any) => (
              <div key={scope.id} style={{
                background: "#F9FAFB",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px #000000",
                borderRadius: "10px",
                padding: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontWeight: 900, color: "#000000", fontSize: "0.98rem" }}>{scope.ta_name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#4B5563", fontWeight: 600 }}>{scope.ta_email}</div>
                  </div>
                  <span style={{
                    background: "#FFE600",
                    border: "1.5px solid #000000",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#000000"
                  }}>
                    TA Delegate
                  </span>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, color: "#1F2937" }}>
                    <span>Can Take & Verify Attendance:</span>
                    <input 
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#000000", cursor: "pointer" }}
                      checked={scope.can_take_attendance}
                      onChange={() => handleToggleTAScope(scope, "can_take_attendance")}
                    />
                  </label>

                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, color: "#1F2937" }}>
                    <span>Can Co-Edit Lecture Minutes:</span>
                    <input 
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#000000", cursor: "pointer" }}
                      checked={scope.can_coedit_notes}
                      onChange={() => handleToggleTAScope(scope, "can_coedit_notes")}
                    />
                  </label>

                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, color: "#1F2937" }}>
                    <span>Can Formulate & Launch Polls:</span>
                    <input 
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#000000", cursor: "pointer" }}
                      checked={scope.can_launch_polls}
                      onChange={() => handleToggleTAScope(scope, "can_launch_polls")}
                    />
                  </label>

                  <label style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    cursor: "pointer", 
                    borderTop: "1.5px solid #000000", 
                    paddingTop: "10px",
                    marginTop: "2px"
                  }}>
                    <div>
                      <span style={{ color: "#E11D48", fontWeight: 800 }}>Can Publish Final Grades:</span>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280", fontWeight: 600 }}>Restricted by default as per Module 6</div>
                    </div>
                    <input 
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#E11D48", cursor: "pointer" }}
                      checked={scope.can_publish_grades}
                      onChange={() => handleToggleTAScope(scope, "can_publish_grades")}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Manage Student Enrolment Scopes & Access Revocation */}
        <div style={{
          background: "#FFFFFF",
          border: "2.5px solid #000000",
          boxShadow: "4px 4px 0px #000000",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#000000" }}>
                Enrolment Scopes & Access Termination
              </h3>
              <div style={{ fontSize: "0.82rem", color: "#4B5563", fontWeight: 600 }}>
                Restricts visibility strictly to enrolled section members
              </div>
            </div>
            <span style={{
              background: "#FEF08A",
              border: "1.5px solid #000000",
              borderRadius: "4px",
              padding: "3px 8px",
              fontWeight: 800,
              fontSize: "0.75rem",
              color: "#000000"
            }}>
              {enrollments.length} Active Records
            </span>
          </div>

          <div style={{ maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {enrollments.map((enr) => {
              const isRevoked = enr.status === "revoked";
              return (
                <div key={enr.id} style={{
                  background: isRevoked ? "#FEE2E2" : "#F9FAFB",
                  border: isRevoked ? "2px solid #EF4444" : "1.5px solid #000000",
                  boxShadow: isRevoked ? "none" : "2px 2px 0px #000000",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "#000000", fontSize: "0.88rem" }}>{enr.user_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#4B5563", fontWeight: 600, marginTop: "2px" }}>
                      {enr.institutional_id} • Scope: <strong style={{ color: "#000000" }}>{enr.role_scope.toUpperCase()}</strong>
                    </div>
                  </div>

                  <div>
                    {isRevoked ? (
                      <span style={{
                        background: "#FF6584",
                        color: "#000000",
                        border: "1.5px solid #000000",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontWeight: 900,
                        fontSize: "0.72rem"
                      }}>
                        REVOKED
                      </span>
                    ) : (
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ 
                          fontSize: "0.75rem", 
                          padding: "5px 10px",
                          background: "#FF6584",
                          color: "#000000",
                          border: "1.5px solid #000000",
                          boxShadow: "1.5px 1.5px 0px #000000",
                          fontWeight: 800
                        }}
                        onClick={() => {
                          setSelectedEnrollment(enr);
                          setShowRevokeModal(true);
                        }}
                      >
                        <UserX size={12} /> Revoke Access
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: Assign Primary Course Authority */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            background: "#FFFFFF",
            border: "3px solid #000000",
            boxShadow: "8px 8px 0px #000000",
            borderRadius: "12px",
            color: "#000000"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Assign Primary Course Authority
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Designates the faculty instructor with full gradebook management and attendance override certification rights.
            </p>

            <form onSubmit={handleAssignAuthority}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Select Primary Instructor
                </label>
                <select 
                  className="form-select"
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  value={newInstructorId}
                  onChange={(e) => setNewInstructorId(Number(e.target.value))}
                >
                  {allUsers.filter((u) => u.role === "Professor").map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.institutional_id} - {u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                  style={{
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800,
                    color: "#000000"
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{
                    background: "#FFE600",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800,
                    color: "#000000"
                  }}
                >
                  Assign Full Authority
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Revoke Access */}
      {showRevokeModal && selectedEnrollment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            background: "#FFFFFF",
            border: "3px solid #000000",
            boxShadow: "8px 8px 0px #000000",
            borderRadius: "12px",
            color: "#000000"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Revoke Course Access
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Terminates access for <strong style={{ color: "#000000" }}>{selectedEnrollment.user_name}</strong> upon course drop or semester completion.
            </p>

            <form onSubmit={handleRevokeSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Revocation Justification (Logged to Audit Trail)
                </label>
                <textarea 
                  className="form-textarea"
                  rows={3}
                  required
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 600
                  }}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowRevokeModal(false)}
                  style={{
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800,
                    color: "#000000"
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  style={{
                    background: "#FF6584",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800,
                    color: "#000000"
                  }}
                >
                  Confirm Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
