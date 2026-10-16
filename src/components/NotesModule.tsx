"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Lock, 
  Unlock, 
  Edit3, 
  Save, 
  Send, 
  Download, 
  Paperclip, 
  Plus, 
  BookOpen, 
  CheckCircle, 
  Users, 
  FileCode,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";

interface NotesModuleProps {
  currentUser: any;
}

export default function NotesModule({ currentUser }: NotesModuleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(1);
  const [momData, setMomData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [formMOM, setFormMOM] = useState({
    title: "",
    topic_summary: "",
    formulas_and_theorems: "",
    key_takeaways: "",
    ta_supplementary_notes: ""
  });

  // TA Co-edit Modal
  const [showTACoeditModal, setShowTACoeditModal] = useState(false);
  const [taNotesInput, setTaNotesInput] = useState("");

  // Slide Attachment Modal
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachForm, setAttachForm] = useState({
    file_name: "CS401_Lec03_Consensus_Proofs.pdf",
    file_url: "https://courseware.university.edu/slides/CS401_Lec03.pdf",
    file_size_kb: 4200
  });

  const loadMOM = async (sessionId: number) => {
    setLoading(true);
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
            ta_supplementary_notes: res.mom.ta_supplementary_notes || ""
          });
          setTaNotesInput(res.mom.ta_supplementary_notes || "");
        } else {
          setFormMOM({
            title: `Official MOM: ${res.session_title}`,
            topic_summary: "",
            formulas_and_theorems: "",
            key_takeaways: "",
            ta_supplementary_notes: ""
          });
        }
      }
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
        setSelectedSessionId(res.sessions[0].id);
        loadMOM(res.sessions[0].id);
      }
    });
  }, []);

  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    setIsEditing(false);
    loadMOM(id);
  };

  // Save MOM
  const handleSaveMOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notes.saveMOM(selectedSessionId, {
        ...formMOM,
        author_id: currentUser?.id || 2
      });
      setIsEditing(false);
      loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Co-edit TA Notes
  const handleTACoeditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!momData?.mom?.id) return;
    try {
      await api.notes.coeditTA(momData.mom.id, taNotesInput, currentUser?.id || 5);
      setShowTACoeditModal(false);
      loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Publish MOM
  const handlePublishMOM = async () => {
    if (!momData?.mom?.id) return;
    try {
      await api.notes.publishMOM(momData.mom.id, currentUser?.id || 2);
      loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Lock Note from Edits
  const handleLockMOM = async () => {
    if (!momData?.mom?.id) return;
    if (!confirm("Are you sure you want to officially seal and lock this lecture note? Further edits by faculty and TAs will be disabled.")) return;
    try {
      await api.notes.lockMOM(momData.mom.id, currentUser?.id || 2);
      loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Attach Slides
  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notes.attachSlides(selectedSessionId, {
        ...attachForm,
        uploaded_by_id: currentUser?.id || 2
      });
      setShowAttachModal(false);
      loadMOM(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isLocked = momData?.mom?.status === "locked";
  const isPublished = momData?.mom?.status === "published" || isLocked;

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
              MODULE 4 SPECIFICATION
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4B5563" }}>
              Syllabus Knowledge Base & Structured MOM
            </span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.03em" }}>
            Structured Lecture Minutes & Study Notes
          </h1>
          <p style={{ color: "#4B5563", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px", fontWeight: 500 }}>
            Produces standardized class summaries, topic outlines, formula references, slide bindings, and exports printable study guides.
          </p>
        </div>

        {/* Global Module Actions */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {momData?.mom && (
            <a 
              href={`/api/notes/${momData.mom.id}/export-pdf`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{
                background: "#FFE600",
                color: "#000000",
                border: "2.5px solid #000000",
                boxShadow: "3px 3px 0px #000000",
                fontWeight: 800,
                textDecoration: "none"
              }}
            >
              <Download size={16} /> Export Study MOM (PDF)
            </a>
          )}

          <button 
            className="btn btn-secondary"
            onClick={() => setShowAttachModal(true)}
            style={{
              background: "#FFFFFF",
              color: "#000000",
              border: "2.5px solid #000000",
              boxShadow: "3px 3px 0px #000000",
              fontWeight: 800
            }}
          >
            <Paperclip size={16} /> Attach Lecture Slides
          </button>
        </div>
      </div>

      {/* Session Selector Strip */}
      <div style={{
        background: "#FFFFFF",
        border: "2.5px solid #000000",
        boxShadow: "4px 4px 0px #000000",
        borderRadius: "10px",
        padding: "18px 24px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <label style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem", color: "#000000" }}>
            Active Session MOM:
          </label>
          <select 
            className="form-select"
            style={{ 
              width: "400px",
              background: "#F9FAFB",
              border: "2px solid #000000",
              borderRadius: "6px",
              fontWeight: 700,
              color: "#000000"
            }}
            value={selectedSessionId}
            onChange={(e) => handleSelectSession(Number(e.target.value))}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.course_code}] {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isLocked ? (
            <span style={{
              background: "#FF6584",
              color: "#000000",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
              borderRadius: "6px",
              padding: "5px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <Lock size={12} strokeWidth={3} /> SEALED & LOCKED
            </span>
          ) : isPublished ? (
            <span style={{
              background: "#86EFAC",
              color: "#000000",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
              borderRadius: "6px",
              padding: "5px 12px",
              fontWeight: 800,
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <CheckCircle size={12} strokeWidth={3} /> PUBLISHED TO COHORT
            </span>
          ) : (
            <span style={{
              background: "#FEF08A",
              color: "#000000",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
              borderRadius: "6px",
              padding: "5px 12px",
              fontWeight: 800,
              fontSize: "0.78rem"
            }}>
              DRAFT IN PROGRESS
            </span>
          )}

          {momData?.mom && (
            <span style={{
              background: "#EDE9FE",
              color: "#000000",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
              borderRadius: "6px",
              padding: "4px 10px",
              fontWeight: 800,
              fontSize: "0.75rem"
            }}>
              Version {momData.mom.version}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
        {/* Left: Notes Editor / Reader */}
        <div style={{
          background: "#FFFFFF",
          border: "2.5px solid #000000",
          boxShadow: "4px 4px 0px #000000",
          borderRadius: "12px",
          padding: "28px"
        }}>
          {/* Top Bar inside reader */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2.5px solid #000000",
            paddingBottom: "18px",
            marginBottom: "24px"
          }}>
            <div>
              <div style={{
                fontSize: "0.82rem",
                color: "#4338CA",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                {momData?.course_code} • {momData?.course_title}
              </div>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#000000", marginTop: "4px" }}>
                {momData?.mom?.title || `Official MOM: ${momData?.session_title}`}
              </h2>
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", gap: "8px" }}>
              {!isLocked && !isEditing && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: "#FFFFFF",
                    color: "#000000",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800
                  }}
                >
                  <Edit3 size={14} /> Edit MOM
                </button>
              )}

              {!isLocked && isEditing && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveMOM}
                  style={{
                    background: "#FFE600",
                    color: "#000000",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800
                  }}
                >
                  <Save size={14} /> Save Draft
                </button>
              )}

              {!isLocked && !isPublished && momData?.mom && (
                <button 
                  className="btn btn-success btn-sm"
                  onClick={handlePublishMOM}
                  style={{
                    background: "#86EFAC",
                    color: "#000000",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800
                  }}
                >
                  <Send size={14} /> Publish Official MOM
                </button>
              )}

              {!isLocked && isPublished && (
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={handleLockMOM}
                  style={{
                    background: "#FF6584",
                    color: "#000000",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800
                  }}
                >
                  <Lock size={14} /> Seal / Lock Note
                </button>
              )}
            </div>
          </div>

          {/* Form / Content View */}
          {isEditing ? (
            <form onSubmit={handleSaveMOM}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Lecture MOM Title
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  value={formMOM.title}
                  onChange={(e) => setFormMOM({ ...formMOM, title: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  1. Structured Topic Summary
                </label>
                <textarea 
                  className="form-textarea"
                  rows={5}
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 600
                  }}
                  value={formMOM.topic_summary}
                  onChange={(e) => setFormMOM({ ...formMOM, topic_summary: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  2. Mathematical Invariants, Formulas & Theorems
                </label>
                <textarea 
                  className="form-textarea"
                  rows={4}
                  style={{ 
                    border: "2px solid #000000",
                    background: "#1E293B",
                    color: "#7DD3FC",
                    fontFamily: "var(--font-mono)", 
                    fontSize: "0.88rem",
                    fontWeight: 600
                  }}
                  value={formMOM.formulas_and_theorems}
                  onChange={(e) => setFormMOM({ ...formMOM, formulas_and_theorems: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  3. Key Takeaways & Conceptual Insights
                </label>
                <textarea 
                  className="form-textarea"
                  rows={4}
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 600
                  }}
                  value={formMOM.key_takeaways}
                  onChange={(e) => setFormMOM({ ...formMOM, key_takeaways: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
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
                  color: "#000000", 
                  marginBottom: "8px", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ width: "10px", height: "10px", background: "#FFE600", border: "1.5px solid #000000", display: "inline-block" }}></span>
                  1. Executive Topic Summary
                </h4>
                <div style={{ 
                  color: "#1F2937", 
                  fontSize: "0.95rem", 
                  lineHeight: 1.7, 
                  background: "#FEF9C3", 
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px #000000",
                  padding: "16px 20px", 
                  borderRadius: "8px",
                  fontWeight: 500
                }}>
                  {momData?.mom?.topic_summary || "No topic summary drafted yet. Click 'Edit MOM' to create lecture minutes."}
                </div>
              </div>

              {/* Section 2 */}
              {momData?.mom?.formulas_and_theorems && (
                <div style={{ marginBottom: "28px" }}>
                  <h4 style={{ 
                    fontSize: "0.88rem", 
                    fontWeight: 900, 
                    color: "#000000", 
                    marginBottom: "8px", 
                    textTransform: "uppercase", 
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span style={{ width: "10px", height: "10px", background: "#7DD3FC", border: "1.5px solid #000000", display: "inline-block" }}></span>
                    2. Formulas, Invariants & Theorems
                  </h4>
                  <pre style={{
                    background: "#0F172A",
                    border: "2.5px solid #000000",
                    boxShadow: "3px 3px 0px #000000",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#7DD3FC",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6
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
                    color: "#000000", 
                    marginBottom: "8px", 
                    textTransform: "uppercase", 
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span style={{ width: "10px", height: "10px", background: "#86EFAC", border: "1.5px solid #000000", display: "inline-block" }}></span>
                    3. Key Takeaways & Conceptual Foundations
                  </h4>
                  <div style={{ 
                    color: "#064E3B", 
                    fontSize: "0.92rem", 
                    lineHeight: 1.7, 
                    background: "#F0FDF4", 
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    padding: "16px 20px", 
                    borderRadius: "8px", 
                    whiteSpace: "pre-line",
                    fontWeight: 500
                  }}>
                    {momData.mom.key_takeaways}
                  </div>
                </div>
              )}

              {/* Section 4: TA Supplementary Co-editing */}
              <div style={{
                background: "#EDE9FE",
                border: "2.5px solid #000000",
                boxShadow: "3px 3px 0px #000000",
                borderRadius: "10px",
                padding: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#4C1D95", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={16} /> TA Supplementary Notes & Practice Pointers
                  </h4>
                  {!isLocked && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowTACoeditModal(true)}
                      style={{
                        background: "#FFFFFF",
                        border: "2px solid #000000",
                        boxShadow: "2px 2px 0px #000000",
                        fontWeight: 800,
                        color: "#000000"
                      }}
                    >
                      <Edit3 size={13} /> Co-Edit as TA
                    </button>
                  )}
                </div>
                <div style={{ color: "#3B0764", fontSize: "0.9rem", lineHeight: 1.6, fontWeight: 500 }}>
                  {momData?.mom?.ta_supplementary_notes || "No TA supplementary notes appended yet. Teaching Assistants can co-edit this section with tutorial exercises and office hour hints."}
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
            border: "2.5px solid #000000",
            boxShadow: "4px 4px 0px #000000",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h4 style={{ fontSize: "0.92rem", fontWeight: 900, color: "#000000", display: "flex", alignItems: "center", gap: "6px" }}>
                <Paperclip size={15} color="#000000" /> Attached Slide Decks
              </h4>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAttachModal(true)}
                style={{
                  background: "#FFE600",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px #000000",
                  fontWeight: 800,
                  color: "#000000"
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {momData?.attachments?.length === 0 ? (
                <div style={{ fontSize: "0.82rem", color: "#6B7280", textAlign: "center", padding: "12px 0", fontWeight: 600 }}>
                  No slide decks bound to this note.
                </div>
              ) : (
                momData?.attachments?.map((att: any) => (
                  <div key={att.id} style={{
                    background: "#F3F4F6",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#000000" }}>{att.file_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#4B5563", fontWeight: 600, marginTop: "2px" }}>
                        {att.file_size_kb} KB • {att.uploaded_by_name || 'Faculty'}
                      </div>
                    </div>
                    <a 
                      href={att.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        color: "#000000",
                        background: "#FFE600",
                        border: "1.5px solid #000000",
                        borderRadius: "4px",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit / Revision Trail */}
          <div style={{
            background: "#FFFFFF",
            border: "2.5px solid #000000",
            boxShadow: "4px 4px 0px #000000",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h4 style={{ fontSize: "0.92rem", fontWeight: 900, color: "#000000", marginBottom: "12px" }}>
              Revision History
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {momData?.mom?.edits?.map((e: any) => (
                <div key={e.id} style={{ 
                  fontSize: "0.8rem", 
                  borderBottom: "1.5px solid #E5E7EB", 
                  paddingBottom: "8px" 
                }}>
                  <div style={{ color: "#000000", fontWeight: 800 }}>{e.change_summary}</div>
                  <div style={{ color: "#4B5563", display: "flex", justifyContent: "space-between", marginTop: "3px", fontWeight: 600 }}>
                    <span>{e.editor_name} ({e.editor_role})</span>
                    <span>{new Date(e.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Co-edit TA Notes */}
      {showTACoeditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            background: "#FFFFFF",
            border: "3px solid #000000",
            boxShadow: "8px 8px 0px #000000",
            borderRadius: "12px",
            color: "#000000"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Co-edit Teaching Assistant Notes
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              TAs can add supplementary explanations, practice derivations, homework tips, and tutorial office hour pointers.
            </p>

            <form onSubmit={handleTACoeditSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  TA Supplementary Notes
                </label>
                <textarea 
                  className="form-textarea"
                  rows={6}
                  required
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 600
                  }}
                  value={taNotesInput}
                  onChange={(e) => setTaNotesInput(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowTACoeditModal(false)}
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
                    background: "#86EFAC",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    fontWeight: 800,
                    color: "#000000"
                  }}
                >
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
          <div className="modal-content" style={{
            background: "#FFFFFF",
            border: "3px solid #000000",
            boxShadow: "8px 8px 0px #000000",
            borderRadius: "12px",
            color: "#000000"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Attach Lecture Slide Deck
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Binds PDF slide decks and supplementary reading materials to the official session record.
            </p>

            <form onSubmit={handleAttachSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Slide Deck Filename
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  value={attachForm.file_name}
                  onChange={(e) => setAttachForm({ ...attachForm, file_name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Slide Deck Document URL
                </label>
                <input 
                  type="url" 
                  className="form-input"
                  required
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  value={attachForm.file_url}
                  onChange={(e) => setAttachForm({ ...attachForm, file_url: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  File Size (KB)
                </label>
                <input 
                  type="number" 
                  className="form-input"
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 700
                  }}
                  value={attachForm.file_size_kb}
                  onChange={(e) => setAttachForm({ ...attachForm, file_size_kb: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAttachModal(false)}
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
