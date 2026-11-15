"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Unlock,
  Edit3,
  Save,
  Send,
  Download,
  Paperclip,
  Plus,
  CheckCircle,
  Users,
  Trash2,
  Upload,
} from "lucide-react";
import { api, buildAuthenticatedUrl } from "@/lib/api";

interface NotesModuleProps {
  currentUser: any;
}

export default function NotesModule({ currentUser }: NotesModuleProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [selectedSessionId, setSelectedSessionId] = useState<number>(1);
  const [momData, setMomData] = useState<any | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [formMOM, setFormMOM] = useState({
    title: "",
    topic_summary: "",
    formulas_and_theorems: "",
    key_takeaways: "",
    ta_supplementary_notes: "",
  });

  // TA Co-edit Modal
  const [showTACoeditModal, setShowTACoeditModal] = useState(false);
  const [taNotesInput, setTaNotesInput] = useState("");

  // Slide Attachment Modal
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState(false);
  const [attachForm, setAttachForm] = useState({
    file_name: "CS401_Lec03_Consensus_Proofs.pdf",
    file_url: "/uploads/CS401_Lec03_Consensus_Proofs.pdf",
    file_size_kb: 4200,
  });

  const isStudentRole = currentUser?.role === "Student";
  const canManageMOM = ["Dean", "Professor"].includes(currentUser?.role || "");
  const canCoeditOrAttach = ["Dean", "Professor", "TA", "Teaching Assistant"].includes(
    currentUser?.role || ""
  );

  const loadMOM = async (sessionId: number) => {
    try {
      const res = await api.notes.getSessionMOM(sessionId);
      if (res.success) {
        setMomData(res);
        if (res.mom) {
          setFormMOM({
            title: res.mom.title || "",
            topic_summary: res.mom.topic_summary || "",
            formulas_and_theorems: res.mom.formulas_and_theorems || "",
            key_takeaways: res.mom.key_takeaways || "",
            ta_supplementary_notes: res.mom.ta_supplementary_notes || "",
          });
          setTaNotesInput(res.mom.ta_supplementary_notes || "");
        } else {
          setFormMOM({
            title: `Official MOM: ${res.session_title}`,
            topic_summary: "",
            formulas_and_theorems: "",
            key_takeaways: "",
            ta_supplementary_notes: "",
          });
          setTaNotesInput("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([api.sessions.getCourses(), api.sessions.getAll()]).then(([cRes, sRes]) => {
      if (cRes.success) setCourses(cRes.courses);
      if (sRes.success && sRes.sessions.length > 0) {
        setSessions(sRes.sessions);
        setSelectedSessionId(sRes.sessions[0].id);
        void loadMOM(sRes.sessions[0].id);
      }
    });
  }, []);

  const filteredSessions = useMemo(() => {
    if (courseFilter === "all") return sessions;
    return sessions.filter((s) => String(s.course_id) === courseFilter);
  }, [sessions, courseFilter]);

  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    setIsEditing(false);
    void loadMOM(id);
  };

  // Save MOM
  const handleSaveMOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notes.saveMOM(selectedSessionId, {
        ...formMOM,
        author_id: currentUser?.id || 2,
      });
      setIsEditing(false);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Co-edit TA Notes
  const handleTACoeditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let noteId = momData?.mom?.id;
      if (!noteId) {
        const created = await api.notes.saveMOM(selectedSessionId, {
          ...formMOM,
          ta_supplementary_notes: taNotesInput,
          author_id: currentUser?.id || 5,
        });
        noteId = created?.mom?.id;
      } else {
        await api.notes.coeditTA(noteId, taNotesInput, currentUser?.id || 5);
      }
      setShowTACoeditModal(false);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Publish MOM
  const handlePublishMOM = async () => {
    if (!momData?.mom?.id) return;
    try {
      await api.notes.publishMOM(momData.mom.id, currentUser?.id || 2);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Lock Note from Edits
  const handleLockMOM = async () => {
    if (!momData?.mom?.id) return;
    if (
      !window.confirm(
        "Are you sure you want to officially seal and lock this lecture note? Further edits by faculty and TAs will be disabled until unsealed."
      )
    )
      return;
    try {
      await api.notes.lockMOM(momData.mom.id, currentUser?.id || 2);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Unlock Note for Revisions
  const handleUnlockMOM = async () => {
    if (!momData?.mom?.id) return;
    try {
      await api.notes.unlockMOM(momData.mom.id);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Upload Slide File from Disk
  const handleSlideFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlide(true);
    try {
      const res = await api.system.uploadFile(file);
      if (res.success) {
        setAttachForm({
          file_name: res.filename || file.name,
          file_url: res.file_url,
          file_size_kb: res.file_size_kb || Math.max(1, Math.round(file.size / 1024)),
        });
      }
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploadingSlide(false);
    }
  };

  // Attach Slides
  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notes.attachSlides(selectedSessionId, {
        ...attachForm,
        uploaded_by_id: currentUser?.id || 2,
      });
      setShowAttachModal(false);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!window.confirm("Remove this slide attachment from the lecture record?")) return;
    try {
      await api.notes.deleteAttachment(attachmentId);
      await loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isLocked = momData?.mom?.status === "locked";
  const isPublished = momData?.mom?.status === "published" || isLocked;

  return (
    <div className="responsive-module-shell">
      {/* Header */}
      <div className="responsive-module-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{
              background: "#60A5FA",
              color: "#0F172A",
              fontWeight: 800,
              fontSize: "0.72rem",
              padding: "3px 8px",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              borderRadius: "4px",
              letterSpacing: "0.03em",
            }}>
              {isStudentRole ? "STUDY NOTES & MOM" : "MODULE 4 SPECIFICATION"}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
              Syllabus Knowledge Base &amp; Structured MOM
            </span>
          </div>
          <h1 className="responsive-module-title">
            Structured Lecture Minutes &amp; Study Notes
          </h1>
          {!isStudentRole && (
            <p style={{ color: "#475569", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px", fontWeight: 500 }}>
              Produces standardized class summaries, topic outlines, formula references, slide bindings, and exports printable study guides.
            </p>
          )}
        </div>

        {/* Global Module Actions */}
        <div className="responsive-filter-group">
          {momData?.mom && (
            <a
              href={buildAuthenticatedUrl(`/api/notes/${momData.mom.id}/export-pdf`)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary responsive-action-mobile-full"
              style={{
                background: "#2563EB",
                color: "#FFFFFF",
                border: "2.5px solid #0F172A",
                boxShadow: "3px 3px 0px #0F172A",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              <Download size={16} /> Export Study MOM (PDF)
            </a>
          )}

          {canCoeditOrAttach && !isLocked && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowAttachModal(true)}
              style={{
                background: "#FFFFFF",
                color: "#0F172A",
                border: "2.5px solid #0F172A",
                boxShadow: "3px 3px 0px #0F172A",
                fontWeight: 800,
              }}
            >
              <Paperclip size={16} /> Attach Lecture Slides
            </button>
          )}
        </div>
      </div>

      {/* Session Selector Strip */}
      <div className="responsive-filter-card">
        <div className="responsive-filter-group">
          <label style={{ margin: 0, fontWeight: 800, fontSize: "0.86rem", color: "#0F172A" }}>
            Course:
          </label>
          <select
            className="form-select responsive-select-auto"
            style={{ padding: "7px 12px", fontWeight: 700, fontSize: "0.86rem" }}
            value={courseFilter}
            onChange={(e) => {
              const nextFilter = e.target.value;
              setCourseFilter(nextFilter);
              const list =
                nextFilter === "all"
                  ? sessions
                  : sessions.filter((s) => String(s.course_id) === nextFilter);
              if (list.length > 0) {
                handleSelectSession(list[0].id);
              }
            }}
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.code}: {c.title}
              </option>
            ))}
          </select>

          <label style={{ margin: 0, fontWeight: 800, fontSize: "0.86rem", color: "#0F172A" }}>
            Session MOM:
          </label>
          <select
            className="form-select responsive-select-wide"
            style={{
              background: "#F8FAFC",
              border: "2px solid #0F172A",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.86rem",
              color: "#0F172A",
            }}
            value={selectedSessionId}
            onChange={(e) => handleSelectSession(Number(e.target.value))}
          >
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.course_code}] {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {isLocked ? (
            <span style={{
              background: "#FB7185",
              color: "#0F172A",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              borderRadius: "6px",
              padding: "5px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <Lock size={12} strokeWidth={3} /> SEALED &amp; LOCKED
            </span>
          ) : isPublished ? (
            <span style={{
              background: "#6EE7B7",
              color: "#0F172A",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              borderRadius: "6px",
              padding: "5px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <CheckCircle size={12} strokeWidth={3} /> PUBLISHED TO COHORT
            </span>
          ) : (
            <span style={{
              background: "#DBEAFE",
              color: "#0F172A",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              borderRadius: "6px",
              padding: "5px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
            }}>
              DRAFT IN PROGRESS
            </span>
          )}

          {momData?.mom && (
            <span style={{
              background: "#EFF6FF",
              color: "#0F172A",
              border: "2px solid #0F172A",
              boxShadow: "2px 2px 0px #0F172A",
              borderRadius: "6px",
              padding: "4px 10px",
              fontWeight: 800,
              fontSize: "0.75rem",
            }}>
              Version {momData.mom.version}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="responsive-notes-grid">
        {/* Left: Notes Editor / Reader */}
        <div className="responsive-panel" style={{
          background: "#FFFFFF",
          border: "2.5px solid #0F172A",
          boxShadow: "4px 4px 0px #0F172A",
          borderRadius: "12px",
          minWidth: 0,
        }}>
          {/* Top Bar inside reader */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2.5px solid #0F172A",
            paddingBottom: "18px",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}>
            <div>
              <div style={{
                fontSize: "0.82rem",
                color: "#2563EB",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                {momData?.course_code} • {momData?.course_title}
              </div>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0F172A", marginTop: "4px" }}>
                {momData?.mom?.title || `Official MOM: ${momData?.session_title}`}
              </h2>
            </div>

            {/* Action Bar */}
            {canManageMOM && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {!isLocked && !isEditing && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 size={14} /> Edit MOM
                  </button>
                )}

                {!isLocked && isEditing && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveMOM}
                  >
                    <Save size={14} /> Save Draft
                  </button>
                )}

                {!isLocked && !isPublished && momData?.mom && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={handlePublishMOM}
                  >
                    <Send size={14} /> Publish Official MOM
                  </button>
                )}

                {!isLocked && isPublished && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleLockMOM}
                  >
                    <Lock size={14} /> Seal / Lock Note
                  </button>
                )}

                {isLocked && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleUnlockMOM}
                    title="Unseal note to permit faculty or TA revisions"
                  >
                    <Unlock size={14} /> Unseal Note
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Form / Content View */}
          {isEditing ? (
            <form onSubmit={handleSaveMOM}>
              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">Lecture MOM Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={formMOM.title}
                  onChange={(e) => setFormMOM({ ...formMOM, title: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">1. Structured Topic Summary</label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  value={formMOM.topic_summary}
                  onChange={(e) => setFormMOM({ ...formMOM, topic_summary: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">2. Mathematical Invariants, Formulas &amp; Theorems</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  style={{
                    background: "#0F172A",
                    color: "#93C5FD",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                  }}
                  value={formMOM.formulas_and_theorems}
                  onChange={(e) => setFormMOM({ ...formMOM, formulas_and_theorems: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">3. Key Takeaways &amp; Conceptual Insights</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={formMOM.key_takeaways}
                  onChange={(e) => setFormMOM({ ...formMOM, key_takeaways: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* Section 1 */}
              <div style={{ marginBottom: "28px" }}>
                <h4 style={{
                  fontSize: "0.88rem",
                  fontWeight: 900,
                  color: "#0F172A",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <span style={{ width: "10px", height: "10px", background: "#2563EB", border: "1.5px solid #0F172A", display: "inline-block" }}></span>
                  1. Executive Topic Summary
                </h4>
                <div style={{
                  color: "#0F172A",
                  fontSize: "0.95rem",
                  lineHeight: 1.7,
                  background: "#EFF6FF",
                  border: "2px solid #0F172A",
                  boxShadow: "2px 2px 0px #0F172A",
                  padding: "16px 18px",
                  borderRadius: "8px",
                  fontWeight: 500,
                  overflowWrap: "anywhere",
                }}>
                  {momData?.mom?.topic_summary ||
                    (canManageMOM
                      ? "No topic summary drafted yet. Click 'Edit MOM' to create lecture minutes."
                      : "No official published study notes for this session yet.")}
                </div>
              </div>

              {/* Section 2 */}
              {momData?.mom?.formulas_and_theorems && (
                <div style={{ marginBottom: "28px" }}>
                  <h4 style={{
                    fontSize: "0.88rem",
                    fontWeight: 900,
                    color: "#0F172A",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    <span style={{ width: "10px", height: "10px", background: "#60A5FA", border: "1.5px solid #0F172A", display: "inline-block" }}></span>
                    2. Formulas, Invariants &amp; Theorems
                  </h4>
                  <pre style={{
                    background: "#0F172A",
                    border: "2.5px solid #0F172A",
                    boxShadow: "3px 3px 0px #0F172A",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.86rem",
                    fontWeight: 600,
                    color: "#93C5FD",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    overflowX: "auto",
                    maxWidth: "100%",
                    lineHeight: 1.6,
                  }}>
                    {momData.mom.formulas_and_theorems}
                  </pre>
                </div>
              )}

              {/* Section 3 */}
              {momData?.mom?.key_takeaways && (
                <div style={{ marginBottom: "28px" }}>
                  <h4 style={{
                    fontSize: "0.88rem",
                    fontWeight: 900,
                    color: "#0F172A",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    <span style={{ width: "10px", height: "10px", background: "#34D399", border: "1.5px solid #0F172A", display: "inline-block" }}></span>
                    3. Key Takeaways &amp; Conceptual Foundations
                  </h4>
                  <div style={{
                    color: "#064E3B",
                    fontSize: "0.92rem",
                    lineHeight: 1.7,
                    background: "#ECFDF5",
                    border: "2px solid #0F172A",
                    boxShadow: "2px 2px 0px #0F172A",
                    padding: "16px 18px",
                    borderRadius: "8px",
                    whiteSpace: "pre-line",
                    overflowWrap: "anywhere",
                    fontWeight: 500,
                  }}>
                    {momData.mom.key_takeaways}
                  </div>
                </div>
              )}

              {/* Section 4: TA Supplementary Co-editing */}
              <div style={{
                background: "#DBEAFE",
                border: "2.5px solid #0F172A",
                boxShadow: "3px 3px 0px #0F172A",
                borderRadius: "10px",
                padding: "16px 18px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#1E3A8A", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={16} /> TA Supplementary Notes &amp; Practice Pointers
                  </h4>
                  {!isLocked && canCoeditOrAttach && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowTACoeditModal(true)}
                    >
                      <Edit3 size={13} /> Co-Edit as TA
                    </button>
                  )}
                </div>
                <div style={{ color: "#1E3A8A", fontSize: "0.9rem", lineHeight: 1.6, fontWeight: 500 }}>
                  {momData?.mom?.ta_supplementary_notes ||
                    "No TA supplementary notes appended yet. Teaching Assistants can co-edit this section with tutorial exercises and office hour hints."}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Slides, Attachments & Revision Trail */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Slide Deck Attachments Box */}
          <div style={{
            background: "#FFFFFF",
            border: "2.5px solid #0F172A",
            boxShadow: "4px 4px 0px #0F172A",
            borderRadius: "12px",
            padding: "20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h4 style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                <Paperclip size={15} color="#0F172A" /> Attached Slide Decks
              </h4>
              {!isLocked && canCoeditOrAttach && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAttachModal(true)}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {momData?.attachments?.length === 0 ? (
                <div style={{ fontSize: "0.82rem", color: "#64748B", textAlign: "center", padding: "12px 0", fontWeight: 600 }}>
                  No slide decks bound to this note.
                </div>
              ) : (
                momData?.attachments?.map((att: any) => {
                  const downloadHref = att.file_url?.startsWith("/")
                    ? buildAuthenticatedUrl(att.file_url)
                    : att.file_url;
                  return (
                    <div
                      key={att.id}
                      style={{
                        background: "#EFF6FF",
                        border: "2px solid #0F172A",
                        boxShadow: "2px 2px 0px #0F172A",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {att.file_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginTop: "2px" }}>
                          {att.file_size_kb} KB • {att.uploaded_by_name || "Faculty"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <a
                          href={downloadHref}
                          target="_blank"
                          rel="noreferrer"
                          title="Open / Download Slide Deck"
                          style={{
                            color: "#FFFFFF",
                            background: "#2563EB",
                            border: "1.5px solid #0F172A",
                            borderRadius: "4px",
                            minWidth: "34px",
                            minHeight: "34px",
                            padding: "5px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Download size={15} />
                        </a>
                        {!isLocked && canCoeditOrAttach && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            title="Delete slide attachment"
                            style={{
                              color: "#DC2626",
                              background: "#FFFFFF",
                              border: "1.5px solid #0F172A",
                              borderRadius: "4px",
                              padding: "5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Audit / Revision Trail */}
          <div style={{
            background: "#FFFFFF",
            border: "2.5px solid #000000",
            boxShadow: "4px 4px 0px #000000",
            borderRadius: "12px",
            padding: "20px",
          }}>
            <h4 style={{ fontSize: "0.92rem", fontWeight: 900, color: "#000000", marginBottom: "12px" }}>
              Revision History
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {momData?.mom?.edits?.length ? (
                momData.mom.edits.map((e: any) => (
                  <div
                    key={e.id}
                    style={{
                      fontSize: "0.8rem",
                      borderBottom: "1.5px solid #E5E7EB",
                      paddingBottom: "8px",
                    }}
                  >
                    <div style={{ color: "#000000", fontWeight: 800 }}>{e.change_summary}</div>
                    <div style={{ color: "#4B5563", display: "flex", justifyContent: "space-between", marginTop: "3px", fontWeight: 600 }}>
                      <span>{e.editor_name} ({e.editor_role})</span>
                      <span>{new Date(e.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>
                  No revision commits recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Co-edit TA Notes */}
      {showTACoeditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Co-edit Teaching Assistant Notes
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              TAs can add supplementary explanations, practice derivations, homework tips, and tutorial office hour pointers.
            </p>

            <form onSubmit={handleTACoeditSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">TA Supplementary Notes</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  required
                  value={taNotesInput}
                  onChange={(e) => setTaNotesInput(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTACoeditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Merge TA Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Attach Slides */}
      {showAttachModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Attach Lecture Slide Deck
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Upload a PDF/slide file directly from your device or bind an external courseware URL.
            </p>

            <form onSubmit={handleAttachSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">
                  <Upload size={14} style={{ display: "inline", marginRight: "6px" }} />
                  Upload File from Device (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg"
                  onChange={handleSlideFileSelect}
                  className="form-input"
                  style={{ padding: "8px" }}
                />
                {uploadingSlide && (
                  <span style={{ fontSize: "0.75rem", color: "#2563EB", fontWeight: 700 }}>
                    Uploading slide deck to institutional storage...
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Slide Deck Filename</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={attachForm.file_name}
                  onChange={(e) => setAttachForm({ ...attachForm, file_name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Slide Deck Document URL or Path</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={attachForm.file_url}
                  onChange={(e) => setAttachForm({ ...attachForm, file_url: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">File Size (KB)</label>
                <input
                  type="number"
                  className="form-input"
                  value={attachForm.file_size_kb}
                  onChange={(e) => setAttachForm({ ...attachForm, file_size_kb: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAttachModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingSlide}>
                  Bind Attachment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
