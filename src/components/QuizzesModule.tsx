"use client";

import React, { useState, useEffect } from "react";
import { 
  Vote, 
  Play, 
  Square, 
  Send, 
  BarChart2, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Radio, 
  HelpCircle,
  Plus
} from "lucide-react";
import { api } from "@/lib/api";

interface QuizzesModuleProps {
  currentUser: any;
}

export default function QuizzesModule({ currentUser }: QuizzesModuleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(2); // Default to live session
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Student Screen Simulation State
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [studentLatencyMs, setStudentLatencyMs] = useState(1150);

  // Create Quiz Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "Concept Check: Paxos vs Raft Invariants",
    prompt_type: "multiple_choice",
    time_limit_seconds: 60,
    questions: [
      {
        id: 1,
        question: "Under the Raft protocol, what prevents a stale leader from overwriting newly committed entries from a higher term?",
        options: [
          "Term numbers in AppendEntries RPC reject lower terms immediately",
          "Randomized timers force stale leaders to reboot",
          "NTP physical clock synchronization kills older leaders",
          "Stale leaders automatically decrypt SHA-256 keys"
        ],
        correct_answer: "Term numbers in AppendEntries RPC reject lower terms immediately",
        explanation: "Every Raft message carries the sender's term. If a receiver detects a message with term T < currentTerm, it rejects it outright.",
        points: 5
      }
    ]
  });

  const loadQuizzes = async (sessionId: number) => {
    setLoading(true);
    try {
      const res = await api.quizzes.getSessionQuizzes(sessionId);
      if (res.success) {
        setQuizzes(res.quizzes);
        if (res.quizzes.length > 0) {
          setSelectedQuiz(res.quizzes[0]);
        } else {
          setSelectedQuiz(null);
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
        const live = res.sessions.find((s: any) => s.status === "in_progress");
        const defaultId = live ? live.id : res.sessions[0].id;
        setSelectedSessionId(defaultId);
        loadQuizzes(defaultId);
      }
    });
  }, []);

  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    loadQuizzes(id);
  };

  const handleLaunchQuiz = async (quizId: number) => {
    try {
      await api.quizzes.launch(quizId, currentUser?.id || 2);
      loadQuizzes(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseQuiz = async (quizId: number) => {
    try {
      await api.quizzes.close(quizId, currentUser?.id || 2);
      loadQuizzes(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportGradebook = async (quizId: number) => {
    try {
      const res = await api.quizzes.exportGradebook(quizId, currentUser?.id || 2);
      alert(res.message);
      loadQuizzes(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Student answer submission simulation
  const handleStudentSubmitAnswer = async () => {
    if (!selectedQuiz) return;
    setSubmittingAnswer(true);
    try {
      const latency = Math.floor(Math.random() * 800) + 900; // Simulated latency
      setStudentLatencyMs(latency);
      const studentId = currentUser?.role === "Student" ? currentUser.id : 7; // Default to Jordan
      const res = await api.quizzes.submitAnswer(selectedQuiz.id, {
        student_id: studentId,
        answers: studentAnswers,
        latency_ms: latency
      });
      if (res.success) {
        setAnswerSubmitted(true);
        loadQuizzes(selectedSessionId);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Create Quiz Submit
  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.quizzes.create(selectedSessionId, {
        title: createForm.title,
        prompt_type: createForm.prompt_type,
        time_limit_seconds: Number(createForm.time_limit_seconds),
        questions: createForm.questions,
        created_by_id: currentUser?.id || 2
      });
      setShowCreateModal(false);
      loadQuizzes(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isLive = selectedQuiz?.status === "launched";
  const isClosed = selectedQuiz?.status === "closed";

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
              MODULE 5 SPECIFICATION
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4B5563" }}>
              Interactive In-Class Comprehension & Polling
            </span>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.03em" }}>
            Live In-Class Polling & Quiz Tracker
          </h1>
          <p style={{ color: "#4B5563", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px", fontWeight: 500 }}>
            Runs real-time concept-check polls and comprehension quizzes during seminars with millisecond timestamp capture and gradebook integration.
          </p>
        </div>

        {/* Global Module Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{
              background: "#FFE600",
              color: "#000000",
              border: "2.5px solid #000000",
              boxShadow: "3px 3px 0px #000000",
              fontWeight: 800
            }}
          >
            <Plus size={16} /> Create Live Quiz / Poll
          </button>
        </div>
      </div>

      {/* Session Filter Bar */}
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
            Active Session:
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

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {quizzes.map((q) => {
            const isSelected = selectedQuiz?.id === q.id;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setSelectedQuiz(q);
                  setAnswerSubmitted(false);
                  setStudentAnswers({});
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "2px solid #000000",
                  boxShadow: isSelected ? "3px 3px 0px #000000" : "1.5px 1.5px 0px #000000",
                  background: isSelected ? "#FFE600" : "#FFFFFF",
                  color: "#000000",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transform: isSelected ? "translate(-1px, -1px)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                {q.status === "launched" && (
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: "#EF4444", 
                    border: "1px solid #000000" 
                  }} />
                )}
                {q.title.length > 25 ? `${q.title.substring(0, 25)}...` : q.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Column Dual Screen Display */}
      {selectedQuiz ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "24px" }}>
          {/* Left: Faculty Console & Cohort Mastery Analytics */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{
              background: "#FFFFFF",
              border: "2.5px solid #000000",
              boxShadow: "4px 4px 0px #000000",
              borderRadius: "12px",
              padding: "24px"
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{
                      background: "#EDE9FE",
                      color: "#000000",
                      border: "1.5px solid #000000",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontWeight: 800,
                      fontSize: "0.72rem"
                    }}>
                      FACULTY CONTROL CONSOLE
                    </span>
                    {isLive && (
                      <span style={{
                        background: "#FF6584",
                        color: "#000000",
                        border: "2px solid #000000",
                        boxShadow: "2px 2px 0px #000000",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}>
                        <Radio size={12} strokeWidth={3} /> BROADCASTING LIVE
                      </span>
                    )}
                    {isClosed && (
                      <span style={{
                        background: "#86EFAC",
                        color: "#000000",
                        border: "2px solid #000000",
                        boxShadow: "2px 2px 0px #000000",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}>
                        <CheckCircle size={12} strokeWidth={3} /> SUBMISSIONS CLOSED
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#000000" }}>
                    {selectedQuiz.title}
                  </h2>
                </div>

                {/* Status Trigger Buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {!isLive && !isClosed && (
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleLaunchQuiz(selectedQuiz.id)}
                      style={{
                        background: "#86EFAC",
                        color: "#000000",
                        border: "2px solid #000000",
                        boxShadow: "2px 2px 0px #000000",
                        fontWeight: 800
                      }}
                    >
                      <Play size={14} /> Launch In-Class Question
                    </button>
                  )}

                  {isLive && (
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCloseQuiz(selectedQuiz.id)}
                      style={{
                        background: "#FF6584",
                        color: "#000000",
                        border: "2px solid #000000",
                        boxShadow: "2px 2px 0px #000000",
                        fontWeight: 800
                      }}
                    >
                      <Square size={14} /> Close Quiz & Reveal Answers
                    </button>
                  )}

                  {isClosed && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleExportGradebook(selectedQuiz.id)}
                      style={{
                        background: "#FFE600",
                        color: "#000000",
                        border: "2px solid #000000",
                        boxShadow: "2px 2px 0px #000000",
                        fontWeight: 800
                      }}
                    >
                      <Download size={14} /> Export to Course Gradebook
                    </button>
                  )}
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                {selectedQuiz.questions?.map((q: any, idx: number) => (
                  <div key={idx} style={{
                    background: "#F9FAFB",
                    border: "2px solid #000000",
                    boxShadow: "2px 2px 0px #000000",
                    borderRadius: "8px",
                    padding: "16px"
                  }}>
                    <div style={{ fontSize: "0.78rem", color: "#4338CA", fontWeight: 900, marginBottom: "4px" }}>
                      QUESTION {idx + 1} ({q.points || 5} Points)
                    </div>
                    <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "#000000", marginBottom: "12px", lineHeight: 1.5 }}>
                      {q.question}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {q.options?.map((opt: string, optIdx: number) => {
                        const isCorrect = q.correct_answer === opt;
                        return (
                          <div 
                            key={optIdx}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "6px",
                              border: isClosed && isCorrect ? "2px solid #000000" : "1.5px solid #000000",
                              boxShadow: isClosed && isCorrect ? "2px 2px 0px #000000" : "none",
                              background: isClosed && isCorrect ? "#86EFAC" : "#FFFFFF",
                              color: "#000000",
                              fontSize: "0.88rem",
                              fontWeight: isClosed && isCorrect ? 800 : 600,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <span>{opt}</span>
                            {isClosed && isCorrect && (
                              <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#000000" }}>
                                ✓ CORRECT
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Reveal Explanation if Closed */}
                    {isClosed && q.explanation && (
                      <div style={{ 
                        marginTop: "12px", 
                        background: "#EDE9FE", 
                        border: "2px solid #000000", 
                        boxShadow: "2px 2px 0px #000000",
                        borderRadius: "6px", 
                        padding: "12px", 
                        fontSize: "0.85rem", 
                        color: "#1F2937",
                        fontWeight: 500
                      }}>
                        <strong style={{ color: "#4338CA", fontWeight: 800 }}>Official Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cohort Mastery Analytics Chart */}
            <div style={{
              background: "#FFFFFF",
              border: "2.5px solid #000000",
              boxShadow: "4px 4px 0px #000000",
              borderRadius: "12px",
              padding: "20px 24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 900, color: "#000000", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BarChart2 size={18} color="#000000" /> Cohort Performance & Mastery Percentages
                </h3>
                <span style={{
                  background: "#FEF08A",
                  color: "#000000",
                  border: "1.5px solid #000000",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontWeight: 800,
                  fontSize: "0.75rem"
                }}>
                  {selectedQuiz.responses_count ?? 0} Submissions Logged
                </span>
              </div>

              {selectedQuiz.cohort_stats && selectedQuiz.cohort_stats.total_responses > 0 ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ 
                      background: "#E0F2FE", 
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 0px #000000",
                      padding: "12px", 
                      borderRadius: "8px", 
                      textAlign: "center" 
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#000000", fontWeight: 800 }}>AVERAGE SCORE</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#000000", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.average_score} / {selectedQuiz.total_points}
                      </div>
                    </div>
                    <div style={{ 
                      background: "#DCFCE7", 
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 0px #000000",
                      padding: "12px", 
                      borderRadius: "8px", 
                      textAlign: "center" 
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#000000", fontWeight: 800 }}>MASTERY PCT</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#000000", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.average_pct}%
                      </div>
                    </div>
                    <div style={{ 
                      background: "#EDE9FE", 
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 0px #000000",
                      padding: "12px", 
                      borderRadius: "8px", 
                      textAlign: "center" 
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#000000", fontWeight: 800 }}>PASS RATE</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#000000", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.pass_rate_pct}%
                      </div>
                    </div>
                    <div style={{ 
                      background: "#FEF9C3", 
                      border: "2px solid #000000",
                      boxShadow: "2px 2px 0px #000000",
                      padding: "12px", 
                      borderRadius: "8px", 
                      textAlign: "center" 
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#000000", fontWeight: 800 }}>HIGH SCORE</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#000000", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.highest_score}
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#4B5563", fontWeight: 700, marginBottom: "6px" }}>
                      <span>Cohort Mastery Spectrum</span>
                      <span style={{ color: "#000000" }}>Target: &gt;= 75% Accreditation Standard</span>
                    </div>
                    <div style={{ 
                      width: "100%", 
                      height: "14px", 
                      background: "#F3F4F6", 
                      border: "2px solid #000000",
                      borderRadius: "7px", 
                      overflow: "hidden" 
                    }}>
                      <div style={{
                        width: `${Math.min(100, selectedQuiz.cohort_stats.average_pct)}%`,
                        height: "100%",
                        background: "#4ADE80",
                        borderRight: "2px solid #000000"
                      }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#6B7280", textAlign: "center", padding: "16px 0", fontWeight: 600 }}>
                  Awaiting student responses. Cohort mastery metrics will synthesize upon collection.
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Interactive Student Screen Simulation */}
          <div style={{ 
            background: "#FFFFFF",
            border: "2.5px solid #000000",
            boxShadow: "4px 4px 0px #000000",
            borderRadius: "12px",
            padding: "24px" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  background: "#7DD3FC",
                  color: "#000000",
                  border: "1.5px solid #000000",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontWeight: 900,
                  fontSize: "0.72rem"
                }}>
                  STUDENT LIVE SCREEN
                </span>
                <span style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>Real-Time Screen Push</span>
              </div>
              <span style={{
                background: "#FEF08A",
                color: "#000000",
                border: "1.5px solid #000000",
                borderRadius: "4px",
                padding: "3px 8px",
                fontWeight: 800,
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <Clock size={12} /> {selectedQuiz.time_limit_seconds}s Window
              </span>
            </div>

            {isLive ? (
              <div>
                <div style={{ 
                  background: "#F9FAFB", 
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px #000000",
                  padding: "18px", 
                  borderRadius: "10px", 
                  marginBottom: "20px" 
                }}>
                  <div style={{ fontSize: "0.78rem", color: "#0284C7", fontWeight: 900, marginBottom: "4px" }}>
                    LIVE IN-CLASS QUESTION POP-UP
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#000000", marginBottom: "16px", lineHeight: 1.4 }}>
                    {selectedQuiz.questions?.[0]?.question}
                  </div>

                  {/* Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedQuiz.questions?.[0]?.options?.map((opt: string, optIdx: number) => {
                      const qId = String(selectedQuiz.questions[0].id);
                      const isSelected = studentAnswers[qId] === opt;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => {
                            if (!answerSubmitted) {
                              setStudentAnswers({ ...studentAnswers, [qId]: opt });
                            }
                          }}
                          style={{
                            padding: "12px 16px",
                            borderRadius: "8px",
                            border: isSelected ? "2.5px solid #000000" : "1.5px solid #000000",
                            boxShadow: isSelected ? "3px 3px 0px #000000" : "1.5px 1.5px 0px #000000",
                            background: isSelected ? "#FFE600" : "#FFFFFF",
                            color: "#000000",
                            fontSize: "0.9rem",
                            fontWeight: isSelected ? 800 : 600,
                            cursor: answerSubmitted ? "default" : "pointer",
                            transform: isSelected ? "translate(-1px, -1px)" : "none",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submission CTA */}
                {answerSubmitted ? (
                  <div style={{ 
                    background: "#86EFAC", 
                    border: "2.5px solid #000000", 
                    boxShadow: "3px 3px 0px #000000",
                    borderRadius: "10px", 
                    padding: "16px", 
                    textAlign: "center" 
                  }}>
                    <CheckCircle size={28} color="#000000" strokeWidth={2.5} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "1rem", fontWeight: 900, color: "#000000" }}>
                      Answer Successfully Recorded!
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#000000", marginTop: "4px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      <Zap size={12} style={{ display: "inline", marginRight: "4px" }} />
                      Millisecond Timestamp Latency: {studentLatencyMs}ms
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn btn-primary"
                    style={{ 
                      width: "100%", 
                      padding: "12px",
                      background: "#FFE600",
                      color: "#000000",
                      border: "2.5px solid #000000",
                      boxShadow: "3px 3px 0px #000000",
                      fontWeight: 900,
                      fontSize: "0.95rem"
                    }}
                    disabled={submittingAnswer || !studentAnswers[String(selectedQuiz.questions?.[0]?.id)]}
                    onClick={handleStudentSubmitAnswer}
                  >
                    <Send size={16} /> Submit Answer with Timestamp Verification
                  </button>
                )}
              </div>
            ) : isClosed ? (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <CheckCircle size={40} color="#000000" strokeWidth={2.5} style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#000000", marginBottom: "6px" }}>
                  Quiz Session Completed
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#4B5563", maxWidth: "340px", margin: "0 auto 16px", fontWeight: 500 }}>
                  Submissions are closed. Correct answers, derivations, and gradebook scores have been calculated.
                </p>
                <div style={{ 
                  display: "inline-block", 
                  background: "#E0F2FE", 
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px #000000",
                  padding: "10px 18px", 
                  borderRadius: "8px", 
                  fontSize: "0.85rem", 
                  color: "#000000", 
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800
                }}>
                  Total Questions: {selectedQuiz.questions?.length} • Score Value: {selectedQuiz.total_points} Pts
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 10px" }}>
                <Clock size={40} color="#000000" strokeWidth={2} style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#000000", marginBottom: "6px" }}>
                  Awaiting Instructor Broadcast
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#4B5563", maxWidth: "340px", margin: "0 auto", fontWeight: 500 }}>
                  The question will instantaneously appear on this screen when launched by the instructor during the seminar.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background: "#FFFFFF",
          border: "2.5px solid #000000",
          boxShadow: "4px 4px 0px #000000",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center"
        }}>
          <Vote size={44} color="#000000" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#000000" }}>No Live Quizzes for this Session</h3>
          <p style={{ color: "#4B5563", fontSize: "0.9rem", marginTop: "4px", fontWeight: 600 }}>
            Click 'Create Live Quiz / Poll' to formulate an interactive concept check.
          </p>
        </div>
      )}

      {/* MODAL: Create Live Quiz */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            background: "#FFFFFF",
            border: "3px solid #000000",
            boxShadow: "8px 8px 0px #000000",
            borderRadius: "12px",
            color: "#000000"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Formulate In-Class Concept Poll
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Create multiple-choice or true/false prompts to gauge real-time cohort comprehension.
            </p>

            <form onSubmit={handleCreateQuizSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Quiz / Poll Title
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
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                    Prompt Format
                  </label>
                  <select 
                    className="form-select"
                    style={{
                      border: "2px solid #000000",
                      background: "#F9FAFB",
                      color: "#000000",
                      fontWeight: 700
                    }}
                    value={createForm.prompt_type}
                    onChange={(e) => setCreateForm({ ...createForm, prompt_type: e.target.value })}
                  >
                    <option value="multiple_choice">Multiple Choice (4 Options)</option>
                    <option value="true_false">True / False</option>
                    <option value="open_concept">Open-Ended Concept</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                    Submission Window (Seconds)
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
                    value={createForm.time_limit_seconds}
                    onChange={(e) => setCreateForm({ ...createForm, time_limit_seconds: Number(e.target.value) })}
                    min={15}
                    max={300}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Comprehension Prompt Question
                </label>
                <textarea 
                  className="form-textarea"
                  rows={2}
                  required
                  style={{
                    border: "2px solid #000000",
                    background: "#F9FAFB",
                    color: "#000000",
                    fontWeight: 600
                  }}
                  value={createForm.questions[0].question}
                  onChange={(e) => {
                    const q = [...createForm.questions];
                    q[0].question = e.target.value;
                    setCreateForm({ ...createForm, questions: q });
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontWeight: 800, fontSize: "0.85rem", color: "#000000", marginBottom: "6px" }}>
                  Correct Option String
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
                  value={createForm.questions[0].correct_answer}
                  onChange={(e) => {
                    const q = [...createForm.questions];
                    q[0].correct_answer = e.target.value;
                    setCreateForm({ ...createForm, questions: q });
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
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
                  Save Concept Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
