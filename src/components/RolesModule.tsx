"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Check,
  X,
  UserX,
  Award,
  UserPlus,
  RotateCcw,
  Trash2,
  Users,
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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showAssignTAModal, setShowAssignTAModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showProvisionUserModal, setShowProvisionUserModal] = useState(false);

  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState(
    "Student dropped course before semester deadline."
  );

  const [newInstructorId, setNewInstructorId] = useState<number>(3);
  const [newTAForm, setNewTAForm] = useState({
    ta_id: 5,
    can_take_attendance: true,
    can_coedit_notes: true,
    can_launch_polls: true,
    can_grade_quizzes: true,
    can_approve_leaves: false,
    can_publish_grades: false,
  });

  const [enrollForm, setEnrollForm] = useState({
    user_id: 7,
    role_scope: "student",
  });

  const [provisionForm, setProvisionForm] = useState({
    name: "",
    email: "",
    institutional_id: "",
    role: "Student",
    department: "Computer Science & Engineering",
    password: "AcadCoord2026!",
  });

  const loadData = async (courseId: number) => {
    setLoading(true);
    try {
      const [matRes, coursesRes, authRes, enrRes, uRes] = await Promise.all([
        api.roles.getMatrix(),
        api.sessions.getCourses(true),
        api.roles.getCourseAuthorities(courseId),
        api.roles.getEnrollments(courseId),
        api.auth.getUsers(),
      ]);

      if (matRes.success) setRolesMatrix(matRes.roles_matrix);
      if (coursesRes.success) setCourses(coursesRes.courses);
      if (authRes.success) setAuthorities(authRes);
      if (enrRes.success) setEnrollments(enrRes.enrollments);
      if (uRes.success) {
        setAllUsers(uRes.users);
        const profs = uRes.users.filter((u: any) => ["Professor", "Dean"].includes(u.role));
        if (profs.length > 0 && !profs.some((p: any) => p.id === newInstructorId)) {
          setNewInstructorId(profs[0].id);
        }
        const tas = uRes.users.filter((u: any) => ["TA", "Teaching Assistant"].includes(u.role));
        if (tas.length > 0) {
          setNewTAForm((prev) => ({ ...prev, ta_id: tas[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(selectedCourseId);
  }, [selectedCourseId]);

  // Toggle TA Permission Scopes
  const handleToggleTAScope = async (scope: any, field: string) => {
    try {
      const updated = {
        ...scope,
        [field]: !scope[field],
        actor_id: currentUser?.id || 2,
      };
      await api.roles.updateTAScope(scope.id, updated);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignTASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.roles.assignTAScope(selectedCourseId, {
        ...newTAForm,
        ta_id: Number(newTAForm.ta_id),
      });
      setShowAssignTAModal(false);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveTAScope = async (scopeId: number) => {
    if (!window.confirm("Remove this TA permission scope from the course?")) return;
    try {
      await api.roles.removeTAScope(scopeId);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Assign Primary Instructor
  const handleAssignAuthority = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.roles.assignAuthority(
        selectedCourseId,
        Number(newInstructorId),
        currentUser?.id || 1
      );
      setShowAssignModal(false);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Revoke Enrollment Access
  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    try {
      await api.roles.revokeAccess(
        selectedEnrollment.id,
        revokeReason,
        currentUser?.id || 1
      );
      setShowRevokeModal(false);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Restore Enrollment Access
  const handleRestoreAccess = async (enrollmentId: number) => {
    try {
      await api.roles.restoreAccess(enrollmentId);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Enroll User in Course
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.roles.enrollUser(
        selectedCourseId,
        Number(enrollForm.user_id),
        enrollForm.role_scope
      );
      setShowEnrollModal(false);
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Provision New Institutional User
  const handleProvisionUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.roles.provisionUser(provisionForm);
      setShowProvisionUserModal(false);
      setProvisionForm({
        name: "",
        email: "",
        institutional_id: "",
        role: "Student",
        department: "Computer Science & Engineering",
        password: "AcadCoord2026!",
      });
      await loadData(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update User Role
  const handleChangeUserRole = async (userId: number, nextRole: string) => {
    try {
      await api.roles.updateUserRole(userId, nextRole);
      await loadData(selectedCourseId);
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
              background: "#60A5FA",
              color: "#0F172A",
              fontWeight: 800,
              fontSize: "0.78rem",
              padding: "4px 10px",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              borderRadius: "4px",
              letterSpacing: "0.03em",
            }}>
              MODULE 6 SPECIFICATION
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
              Institutional Governance &amp; Scopes
            </span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>
            Roles &amp; Permissions Management
          </h1>
          <p style={{ color: "#475569", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px", fontWeight: 500 }}>
            Governs institutional access tiers across Dean, Professor, Teaching Assistant, Student, and Auditor credentials.
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowProvisionUserModal(true)}
          >
            <UserPlus size={16} /> Provision Institutional Account
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAssignModal(true)}
          >
            <Award size={16} /> Assign Course Authority
          </button>
        </div>
      </div>

      {/* Institutional Roles Matrix Table */}
      <div style={{
        background: "#FFFFFF",
        border: "2.5px solid #0F172A",
        boxShadow: "4px 4px 0px #0F172A",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={20} color="#2563EB" /> Academic Role Authority Matrix
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#DBEAFE", borderBottom: "2.5px solid #0F172A", color: "#0F172A" }}>
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
              {rolesMatrix &&
                Object.entries(rolesMatrix).map(([roleName, perm]: [string, any]) => (
                  <tr key={roleName} style={{ borderBottom: "1.5px solid #0F172A" }}>
                    <td style={{ padding: "14px", fontWeight: 800, color: "#0F172A" }}>
                      <span style={{
                        background: "#EFF6FF",
                        border: "1.5px solid #0F172A",
                        borderRadius: "4px",
                        padding: "4px 10px",
                        fontWeight: 800,
                        color: "#0F172A",
                        display: "inline-block",
                      }}>
                        {roleName}
                      </span>
                    </td>
                    <td style={{ padding: "14px", color: "#334155", maxWidth: "340px", lineHeight: 1.4, fontWeight: 500 }}>
                      {perm.description}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      {perm.can_schedule_sessions ? (
                        <span style={{ display: "inline-flex", background: "#6EE7B7", border: "1.5px solid #0F172A", borderRadius: "50%", padding: "3px" }}>
                          <Check size={14} color="#0F172A" strokeWidth={3} />
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", background: "#F1F5F9", border: "1px solid #94A3B8", borderRadius: "50%", padding: "3px" }}>
                          <X size={14} color="#94A3B8" strokeWidth={2.5} />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      {perm.can_override_attendance ? (
                        <span style={{ display: "inline-flex", background: "#6EE7B7", border: "1.5px solid #0F172A", borderRadius: "50%", padding: "3px" }}>
                          <Check size={14} color="#0F172A" strokeWidth={3} />
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", background: "#F1F5F9", border: "1px solid #94A3B8", borderRadius: "50%", padding: "3px" }}>
                          <X size={14} color="#94A3B8" strokeWidth={2.5} />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      {perm.can_publish_grades ? (
                        <span style={{ display: "inline-flex", background: "#6EE7B7", border: "1.5px solid #0F172A", borderRadius: "50%", padding: "3px" }}>
                          <Check size={14} color="#0F172A" strokeWidth={3} />
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", background: "#FFE4E6", border: "1.5px solid #F43F5E", borderRadius: "50%", padding: "3px" }}>
                          <X size={14} color="#F43F5E" strokeWidth={3} />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      {perm.can_seal_notes ? (
                        <span style={{ display: "inline-flex", background: "#6EE7B7", border: "1.5px solid #0F172A", borderRadius: "50%", padding: "3px" }}>
                          <Check size={14} color="#0F172A" strokeWidth={3} />
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", background: "#F1F5F9", border: "1px solid #94A3B8", borderRadius: "50%", padding: "3px" }}>
                          <X size={14} color="#94A3B8" strokeWidth={2.5} />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      {perm.can_view_audit_trail ? (
                        <span style={{ display: "inline-flex", background: "#6EE7B7", border: "1.5px solid #0F172A", borderRadius: "50%", padding: "3px" }}>
                          <Check size={14} color="#0F172A" strokeWidth={3} />
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", background: "#F1F5F9", border: "1px solid #94A3B8", borderRadius: "50%", padding: "3px" }}>
                          <X size={14} color="#94A3B8" strokeWidth={2.5} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Course Selector & Authorities Bar */}
      <div className="glass-panel" style={{ padding: "16px 22px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", background: "#DBEAFE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <label style={{ fontWeight: 900, fontSize: "0.9rem", color: "#0F172A" }}>
            Active Course Governance Scope:
          </label>
          <select
            className="form-select"
            style={{ width: "auto", padding: "6px 14px", fontWeight: 800, background: "#FFFFFF" }}
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(Number(e.target.value))}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.title} ({c.semester})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0F172A" }}>
            Primary Instructors:
          </span>
          {authorities?.instructors?.length ? (
            authorities.instructors.map((inst: any) => (
              <span key={inst.id} className="badge" style={{ background: "#FFFFFF" }}>
                {inst.user_name} ({inst.institutional_id})
              </span>
            ))
          ) : (
            <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>Unassigned</span>
          )}
        </div>
      </div>

      {/* Two Column: TA Scopes & Enrolment Management */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        {/* Column 1: Teaching Assistant Privilege Scopes */}
        <div style={{
          background: "#FFFFFF",
          border: "2.5px solid #0F172A",
          boxShadow: "4px 4px 0px #0F172A",
          borderRadius: "12px",
          padding: "24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A" }}>
                Teaching Assistant Permission Scopes
              </h3>
              <div style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                Course: {authorities?.course_code || "CS-401"} • Delegated Privileges
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAssignTAModal(true)}
            >
              <UserPlus size={14} /> Assign TA to Course
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {authorities?.ta_scopes?.length === 0 && (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748B", fontWeight: 600, fontSize: "0.85rem" }}>
                No Teaching Assistants delegated to {authorities?.course_code} yet.
              </div>
            )}
            {authorities?.ta_scopes?.map((scope: any) => (
              <div
                key={scope.id}
                style={{
                  background: "#EFF6FF",
                  border: "2px solid #0F172A",
                  boxShadow: "2px 2px 0px #0F172A",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontWeight: 900, color: "#0F172A", fontSize: "0.98rem" }}>{scope.ta_name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 600 }}>{scope.ta_email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      background: "#DBEAFE",
                      border: "1.5px solid #0F172A",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "#0F172A",
                    }}>
                      TA Delegate
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTAScope(scope.id)}
                      title="Remove TA delegation"
                      style={{
                        background: "#FFFFFF",
                        border: "1.5px solid #0F172A",
                        borderRadius: "4px",
                        padding: "3px 6px",
                        color: "#DC2626",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, color: "#0F172A" }}>
                    <span>Can Take &amp; Verify Attendance:</span>
                    <input
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#2563EB", cursor: "pointer" }}
                      checked={scope.can_take_attendance}
                      onChange={() => handleToggleTAScope(scope, "can_take_attendance")}
                    />
                  </label>

                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, color: "#0F172A" }}>
                    <span>Can Co-Edit Lecture Minutes:</span>
                    <input
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#2563EB", cursor: "pointer" }}
                      checked={scope.can_coedit_notes}
                      onChange={() => handleToggleTAScope(scope, "can_coedit_notes")}
                    />
                  </label>

                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 700, color: "#0F172A" }}>
                    <span>Can Formulate &amp; Launch Polls:</span>
                    <input
                      type="checkbox"
                      style={{ width: "18px", height: "18px", accentColor: "#2563EB", cursor: "pointer" }}
                      checked={scope.can_launch_polls}
                      onChange={() => handleToggleTAScope(scope, "can_launch_polls")}
                    />
                  </label>

                  <label style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    borderTop: "1.5px solid #0F172A",
                    paddingTop: "10px",
                    marginTop: "2px",
                  }}>
                    <div>
                      <span style={{ color: "#E11D48", fontWeight: 800 }}>Can Publish Final Grades:</span>
                      <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 600 }}>Restricted by default as per Module 6</div>
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
          border: "2.5px solid #0F172A",
          boxShadow: "4px 4px 0px #0F172A",
          borderRadius: "12px",
          padding: "24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A" }}>
                Enrolment Scopes &amp; Access Termination
              </h3>
              <div style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                Course: {authorities?.course_code || "CS-401"} ({enrollments.length} Records)
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowEnrollModal(true)}
            >
              <UserPlus size={14} /> Enroll Member
            </button>
          </div>

          <div style={{ maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {enrollments.map((enr) => {
              const isRevoked = enr.status === "revoked";
              return (
                <div
                  key={enr.id}
                  style={{
                    background: isRevoked ? "#FFE4E6" : "#F8FAFC",
                    border: isRevoked ? "2px solid #F43F5E" : "1.5px solid #0F172A",
                    boxShadow: isRevoked ? "none" : "2px 2px 0px #0F172A",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: "#0F172A", fontSize: "0.88rem" }}>{enr.user_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginTop: "2px" }}>
                      {enr.institutional_id} • Scope:{" "}
                      <strong style={{ color: "#0F172A" }}>{enr.role_scope.toUpperCase()}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {isRevoked ? (
                      <>
                        <span style={{
                          background: "#FB7185",
                          color: "#0F172A",
                          border: "1.5px solid #0F172A",
                          borderRadius: "4px",
                          padding: "3px 8px",
                          fontWeight: 900,
                          fontSize: "0.72rem",
                        }}>
                          REVOKED
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                          onClick={() => handleRestoreAccess(enr.id)}
                          title="Reinstate enrollment access"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        style={{
                          fontSize: "0.75rem",
                          padding: "5px 10px",
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

      {/* Institutional Directory & Live Role Reassignment */}
      <div className="glass-panel" style={{ padding: "24px", background: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={19} color="#2563EB" /> Provisioned Institutional Identity Directory ({allUsers.length})
            </h3>
            <div style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
              Modify any user&apos;s institutional role tier dynamically or provision new accounts.
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto", maxHeight: "340px", overflowY: "auto", border: "2px solid #0F172A", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#DBEAFE", borderBottom: "2px solid #0F172A", fontWeight: 900 }}>
                <th style={{ padding: "10px 14px" }}>NAME</th>
                <th style={{ padding: "10px 14px" }}>INSTITUTIONAL ID</th>
                <th style={{ padding: "10px 14px" }}>EMAIL</th>
                <th style={{ padding: "10px 14px" }}>DEPARTMENT</th>
                <th style={{ padding: "10px 14px" }}>ASSIGNED ROLE TIER</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #CBD5E1" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0F172A" }}>{u.name}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{u.institutional_id}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "#475569" }}>{u.email}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{u.department}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <select
                      className="form-select"
                      style={{ width: "auto", padding: "4px 10px", fontSize: "0.78rem", fontWeight: 800 }}
                      value={u.role === "Teaching Assistant" ? "TA" : u.role}
                      onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                    >
                      <option value="Dean">Dean</option>
                      <option value="Professor">Professor</option>
                      <option value="TA">TA (Teaching Assistant)</option>
                      <option value="Student">Student</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Assign Primary Course Authority */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Assign Primary Course Authority ({authorities?.course_code})
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Designates the faculty instructor with full gradebook management and attendance override certification rights.
            </p>

            <form onSubmit={handleAssignAuthority}>
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Select Primary Instructor</label>
                <select
                  className="form-select"
                  value={newInstructorId}
                  onChange={(e) => setNewInstructorId(Number(e.target.value))}
                >
                  {allUsers
                    .filter((u) => ["Professor", "Dean"].includes(u.role))
                    .map((u) => (
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
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
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
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Revoke Course Access
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "20px", fontWeight: 500 }}>
              Terminates access for <strong style={{ color: "#0F172A" }}>{selectedEnrollment.user_name}</strong> upon course drop or semester completion.
            </p>

            <form onSubmit={handleRevokeSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Revocation Justification (Logged to Audit Trail)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRevokeModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Confirm Termination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign TA to Course */}
      {showAssignTAModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Delegate TA to {authorities?.course_code}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "20px", fontWeight: 500 }}>
              Assigns a Teaching Assistant to this course section and initializes their permission matrix.
            </p>

            <form onSubmit={handleAssignTASubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">Select Teaching Assistant / Scholar</label>
                <select
                  className="form-select"
                  value={newTAForm.ta_id}
                  onChange={(e) => setNewTAForm({ ...newTAForm, ta_id: Number(e.target.value) })}
                >
                  {allUsers
                    .filter((u) => ["TA", "Teaching Assistant", "Student"].includes(u.role))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - {u.institutional_id})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignTAModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Delegate TA Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Enroll Member in Course */}
      {showEnrollModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Enroll Institutional User in {authorities?.course_code}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "20px", fontWeight: 500 }}>
              Grants course section membership with student, TA, or instructor scope.
            </p>

            <form onSubmit={handleEnrollSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Select User</label>
                <select
                  className="form-select"
                  value={enrollForm.user_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, user_id: Number(e.target.value) })}
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.institutional_id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Course Enrollment Scope</label>
                <select
                  className="form-select"
                  value={enrollForm.role_scope}
                  onChange={(e) => setEnrollForm({ ...enrollForm, role_scope: e.target.value })}
                >
                  <option value="student">Student (Enrolled Cohort)</option>
                  <option value="ta">Teaching Assistant (TA)</option>
                  <option value="instructor">Course Instructor</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEnrollModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Provision Institutional Account */}
      {showProvisionUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Provision New Institutional Identity
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "20px", fontWeight: 500 }}>
              Registers a new university user in the SIS &amp; Auth directory. This account can immediately sign in on the login page.
            </p>

            <form onSubmit={handleProvisionUserSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Dr. Alan Turing"
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Role Tier</label>
                  <select
                    className="form-select"
                    value={provisionForm.role}
                    onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value })}
                  >
                    <option value="Student">Student</option>
                    <option value="TA">TA (Teaching Assistant)</option>
                    <option value="Professor">Professor</option>
                    <option value="Dean">Dean</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Institutional ID (Optional Auto-Gen)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. STU-2026-201"
                    value={provisionForm.institutional_id}
                    onChange={(e) => setProvisionForm({ ...provisionForm, institutional_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">University Email</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="name@university.edu"
                    value={provisionForm.email}
                    onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div>
                  <label className="form-label">Academic Department</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={provisionForm.department}
                    onChange={(e) => setProvisionForm({ ...provisionForm, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Initial Password</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProvisionUserModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
