"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Vote,
  Play,
  Square,
  Send,
  BarChart2,
  Download,
  CheckCircle,
  Clock,
  Zap,
  Radio,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface QuizzesModuleProps {
  currentUser: any;
}

export default function QuizzesModule({ currentUser }: QuizzesModuleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(2);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Student Screen Simulation State
  const [simulatedStudentId, setSimulatedStudentId] = useState<number>(() =>
    currentUser?.role === "Student" && currentUser?.id ? currentUser.id : 7
  );
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<any | null>(null);
  const [studentLatencyMs, setStudentLatencyMs] = useState(1150);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{ quizKey: string; remaining: number }>({
    quizKey: "",
    remaining: 60,
  });

  // Adjust Score Modal
  const [showAdjustScoreModal, setShowAdjustScoreModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null);
  const [adjustScoreForm, setAdjustScoreForm] = useState({
    score: 0,
    justification: "",
  });

  // Create Quiz Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "Concept Check: Paxos vs Raft Invariants",
    prompt_type: "multiple_choice",
    time_limit_seconds: 60,
    questions: [
      {
        id: 1,
        question:
          "Under the Raft protocol, what prevents a stale leader from overwriting newly committed entries from a higher term?",
        options: [
          "Term numbers in AppendEntries RPC reject lower terms immediately",
          "Randomized timers force stale leaders to reboot",
          "NTP physical clock synchronization kills older leaders",
          "Stale leaders automatically decrypt SHA-256 keys",
        ],
        correct_answer: "Term numbers in AppendEntries RPC reject lower terms immediately",
        explanation:
          "Every Raft message carries the sender's term. If a receiver detects a message with term T < currentTerm, it rejects it outright.",
        points: 5,
      },
    ],
  });

  const isStudentRole = currentUser?.role === "Student";
  const canManageQuizzes = ["Dean", "Professor", "TA", "Teaching Assistant"].includes(
    currentUser?.role || ""
  );
  const canAdjustScores = ["Dean", "Professor"].includes(currentUser?.role || "");

  const loadQuizzes = async (sessionId: number, keepQuizId?: number) => {
    try {
      const res = await api.quizzes.getSessionQuizzes(sessionId);
      if (res.success) {
        setQuizzes(res.quizzes);
        if (res.quizzes.length > 0) {
          const found = keepQuizId
            ? res.quizzes.find((q: any) => q.id === keepQuizId)
            : null;
          const nextQ = found || res.quizzes[0];
          setSelectedQuiz(nextQ);
        } else {
          setSelectedQuiz(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([
      api.sessions.getAll(),
      !isStudentRole
        ? api.auth.getUsers("Student").catch(() => ({ success: false, users: [] }))
        : Promise.resolve({ success: false, users: [] }),
    ]).then(([res, stuRes]) => {
      if (stuRes.success && stuRes.users.length > 0) {
        setAllStudents(stuRes.users);
      }
      if (res.success && res.sessions.length > 0) {
        setSessions(res.sessions);
        const live = res.sessions.find((s: any) => s.status === "in_progress");
        const defaultId = live ? live.id : res.sessions[0].id;
        setSelectedSessionId(defaultId);
        void loadQuizzes(defaultId);
      }
    });
  }, [isStudentRole]);

  // Countdown timer when quiz is live
  const currentQuizKey = `${selectedQuiz?.id || 0}:${selectedQuiz?.status || ""}:${selectedQuiz?.time_limit_seconds || 60}`;
  const defaultQuizSeconds = selectedQuiz?.time_limit_seconds || 60;
  const remainingSeconds =
    countdown.quizKey === currentQuizKey ? countdown.remaining : defaultQuizSeconds;

  useEffect(() => {
    if (selectedQuiz?.status !== "launched") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        const base = prev.quizKey === currentQuizKey ? prev.remaining : defaultQuizSeconds;
        return { quizKey: currentQuizKey, remaining: base > 0 ? base - 1 : 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedQuiz?.status, currentQuizKey, defaultQuizSeconds]);

  const activeQuizStudentId = isStudentRole && currentUser?.id ? currentUser.id : simulatedStudentId;
  const persistedSubmission = useMemo(() => {
    return selectedQuiz?.responses?.find((r: any) => r.student_id === activeQuizStudentId) || null;
  }, [selectedQuiz, activeQuizStudentId]);
  const isSubmissionRecorded = answerSubmitted || Boolean(persistedSubmission);
  const effectiveSubmissionResult =
    (lastSubmissionResult && lastSubmissionResult.quiz_id === selectedQuiz?.id && lastSubmissionResult.student_id === activeQuizStudentId
      ? lastSubmissionResult
      : persistedSubmission) || null;
  const effectiveStudentAnswers =
    persistedSubmission?.answers && typeof persistedSubmission.answers === "object" && Object.keys(studentAnswers).length === 0
      ? persistedSubmission.answers
      : studentAnswers;
  const effectiveLatencyMs = effectiveSubmissionResult?.latency_ms ?? studentLatencyMs;

  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    setAnswerSubmitted(false);
    setLastSubmissionResult(null);
    setStudentAnswers({});
    setQuizError(null);
    void loadQuizzes(id);
  };

  const handleLaunchQuiz = async (quizId: number) => {
    try {
      await api.quizzes.launch(quizId, currentUser?.id || 2);
      setAnswerSubmitted(false);
      setLastSubmissionResult(null);
      setStudentAnswers({});
      await loadQuizzes(selectedSessionId, quizId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseQuiz = async (quizId: number) => {
    try {
      await api.quizzes.close(quizId, currentUser?.id || 2);
      await loadQuizzes(selectedSessionId, quizId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteQuiz = async (quizId: number, title: string) => {
    if (!window.confirm(`Delete quiz "${title}" and its responses?`)) return;
    try {
      await api.quizzes.deleteQuiz(quizId);
      await loadQuizzes(selectedSessionId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportGradebook = async (quizId: number) => {
    try {
      const res = await api.quizzes.exportGradebook(quizId, currentUser?.id || 2);
      alert(res.message);
      await loadQuizzes(selectedSessionId, quizId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Student answer submission
  const handleStudentSubmitAnswer = async () => {
    if (!selectedQuiz) return;
    setSubmittingAnswer(true);
    setQuizError(null);
    try {
      const latency = Math.floor(Math.random() * 800) + 900;
      setStudentLatencyMs(latency);
      const studentId = isStudentRole && currentUser?.id ? currentUser.id : simulatedStudentId;
      const res = await api.quizzes.submitAnswer(selectedQuiz.id, {
        student_id: studentId,
        answers: studentAnswers,
        latency_ms: latency,
      });
      if (res.success) {
        setAnswerSubmitted(true);
        setLastSubmissionResult(res.response);
        await loadQuizzes(selectedSessionId, selectedQuiz.id);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to record response.";
      if (isStudentRole) {
        setQuizError(msg);
      } else {
        alert(msg);
      }
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAdjustScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResponse || !selectedQuiz) return;
    try {
      await api.quizzes.adjustScore(
        selectedResponse.id,
        Number(adjustScoreForm.score),
        adjustScoreForm.justification
      );
      setShowAdjustScoreModal(false);
      await loadQuizzes(selectedSessionId, selectedQuiz.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Multi-Question Builder Helpers
  const handlePromptTypeChange = (nextType: string) => {
    const updatedQuestions = createForm.questions.map((q) => {
      if (nextType === "true_false") {
        return {
          ...q,
          options: ["True", "False"],
          correct_answer: "True",
        };
      }
      if (nextType === "open_concept") {
        return {
          ...q,
          options: [],
          correct_answer: q.correct_answer || "term",
        };
      }
      return {
        ...q,
        options:
          q.options && q.options.length === 4
            ? q.options
            : ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: q.options?.[0] || "Option A",
      };
    });
    setCreateForm({
      ...createForm,
      prompt_type: nextType,
      questions: updatedQuestions,
    });
  };

  const handleAddQuestion = () => {
    const nextId = createForm.questions.length + 1;
    const isTF = createForm.prompt_type === "true_false";
    const isOpen = createForm.prompt_type === "open_concept";
    setCreateForm({
      ...createForm,
      questions: [
        ...createForm.questions,
        {
          id: nextId,
          question: "",
          options: isTF
            ? ["True", "False"]
            : isOpen
            ? []
            : ["Option 1", "Option 2", "Option 3", "Option 4"],
          correct_answer: isTF ? "True" : isOpen ? "" : "Option 1",
          explanation: "",
          points: 5,
        },
      ],
    });
  };

  const handleRemoveQuestion = (idx: number) => {
    if (createForm.questions.length <= 1) return;
    const next = createForm.questions
      .filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, id: i + 1 }));
    setCreateForm({ ...createForm, questions: next });
  };

  // Create Quiz Submit
  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.quizzes.create(selectedSessionId, {
        title: createForm.title,
        prompt_type: createForm.prompt_type,
        time_limit_seconds: Number(createForm.time_limit_seconds),
        questions: createForm.questions,
        created_by_id: currentUser?.id || 2,
      });
      setShowCreateModal(false);
      await loadQuizzes(selectedSessionId, res?.quiz?.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isLive = selectedQuiz?.status === "launched";
  const isClosed = selectedQuiz?.status === "closed";
  const allQuestionsAnswered =
    selectedQuiz?.questions?.length > 0 &&
    selectedQuiz.questions.every((q: any) => Boolean(studentAnswers[String(q.id)]?.trim()));

  return (
    <div className="responsive-module-shell">
      {/* Header */}
      <div className="responsive-module-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
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
              {isStudentRole ? "STUDENT LIVE POLL" : "MODULE 5 SPECIFICATION"}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
              Interactive In-Class Comprehension &amp; Polling
            </span>
          </div>
          <h1 className="responsive-module-title">
            Live In-Class Polling &amp; Quiz Tracker
          </h1>
          {!isStudentRole && (
            <p style={{ color: "#475569", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px", fontWeight: 500 }}>
              Runs real-time multi-question concept-check polls and comprehension quizzes during seminars with millisecond timestamp capture and gradebook integration.
            </p>
          )}
        </div>

        {/* Global Module Actions */}
        {canManageQuizzes && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} /> Create Live Quiz / Poll
            </button>
          </div>
        )}
      </div>

      {/* Session Filter Bar */}
      <div className="responsive-filter-card">
        <div className="responsive-filter-group">
          <label style={{ margin: 0, fontWeight: 800, fontSize: "0.86rem", color: "#0F172A" }}>
            Active Session:
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
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.course_code}] {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="responsive-filter-group">
          {quizzes.map((q) => {
            const isSelected = selectedQuiz?.id === q.id;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setSelectedQuiz(q);
                  setAnswerSubmitted(false);
                  setLastSubmissionResult(null);
                  setStudentAnswers({});
                  setQuizError(null);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "2px solid #0F172A",
                  boxShadow: isSelected ? "3px 3px 0px #0F172A" : "1.5px 1.5px 0px #0F172A",
                  background: isSelected ? "#60A5FA" : "#FFFFFF",
                  color: "#0F172A",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  maxWidth: "100%",
                  transform: isSelected ? "translate(-1px, -1px)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {q.status === "launched" && (
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10B981",
                    border: "1px solid #0F172A",
                  }} />
                )}
                {q.title.length > 28 ? `${q.title.substring(0, 28)}...` : q.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Dual Screen Layout (desktop: 2-column side-by-side; mobile: stacked with Student Poll on top) */}
      {selectedQuiz ? (
        <div className="responsive-quiz-grid">
          {/* Left on Desktop (2nd on Mobile): Answer Key / Faculty Console & Cohort Mastery Analytics */}
          <div className="quiz-analytics-col">
            {(!isStudentRole || isClosed) && (
            <div className="responsive-panel" style={{
              background: "#FFFFFF",
              border: "2.5px solid #0F172A",
              boxShadow: "4px 4px 0px #0F172A",
              borderRadius: "12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span style={{
                      background: "#DBEAFE",
                      color: "#0F172A",
                      border: "1.5px solid #0F172A",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontWeight: 800,
                      fontSize: "0.72rem",
                    }}>
                      {isStudentRole
                        ? "OFFICIAL ANSWER KEY & EXPLANATIONS"
                        : `FACULTY CONTROL CONSOLE (${selectedQuiz.prompt_type?.replace("_", " ").toUpperCase()})`}
                    </span>
                    {isLive && (
                      <span style={{
                        background: "#60A5FA",
                        color: "#0F172A",
                        border: "2px solid #0F172A",
                        boxShadow: "2px 2px 0px #0F172A",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}>
                        <Radio size={12} strokeWidth={3} /> BROADCASTING LIVE ({remainingSeconds}s)
                      </span>
                    )}
                    {isClosed && (
                      <span style={{
                        background: "#6EE7B7",
                        color: "#0F172A",
                        border: "2px solid #0F172A",
                        boxShadow: "2px 2px 0px #0F172A",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}>
                        <CheckCircle size={12} strokeWidth={3} /> SUBMISSIONS CLOSED
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0F172A" }}>
                    {selectedQuiz.title}
                  </h2>
                </div>

                {/* Status Trigger Buttons */}
                {canManageQuizzes && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {!isLive && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleLaunchQuiz(selectedQuiz.id)}
                      >
                        <Play size={14} /> {isClosed ? "Re-Launch Quiz" : "Launch In-Class Question"}
                      </button>
                    )}

                    {isLive && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCloseQuiz(selectedQuiz.id)}
                      >
                        <Square size={14} /> Close Quiz &amp; Reveal Answers
                      </button>
                    )}

                    {isClosed && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleExportGradebook(selectedQuiz.id)}
                      >
                        <Download size={14} /> Export to Course Gradebook
                      </button>
                    )}

                    {canAdjustScores && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: "#DC2626" }}
                        onClick={() => handleDeleteQuiz(selectedQuiz.id, selectedQuiz.title)}
                        title="Delete quiz"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                {selectedQuiz.questions?.map((q: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: "#F8FAFC",
                      border: "2px solid #0F172A",
                      boxShadow: "2px 2px 0px #0F172A",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ fontSize: "0.78rem", color: "#2563EB", fontWeight: 900, marginBottom: "4px" }}>
                      QUESTION {idx + 1} ({q.points || 5} Points)
                    </div>
                    <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0F172A", marginBottom: "12px", lineHeight: 1.5 }}>
                      {q.question}
                    </div>

                    {q.options && q.options.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrect = q.correct_answer === opt;
                          return (
                            <div
                              key={optIdx}
                              style={{
                                padding: "10px 14px",
                                borderRadius: "6px",
                                border: isClosed && isCorrect ? "2px solid #0F172A" : "1.5px solid #0F172A",
                                boxShadow: isClosed && isCorrect ? "2px 2px 0px #0F172A" : "none",
                                background: isClosed && isCorrect ? "#6EE7B7" : "#FFFFFF",
                                color: "#0F172A",
                                fontSize: "0.88rem",
                                fontWeight: isClosed && isCorrect ? 800 : 600,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span>{opt}</span>
                              {isClosed && isCorrect && (
                                <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#0F172A" }}>
                                  ✓ CORRECT
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: "8px 12px", background: "#FFFFFF", border: "1.5px solid #0F172A", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
                        Open-Concept Prompt {isClosed && q.correct_answer ? `• Expected Keyword/Answer: "${q.correct_answer}"` : ""}
                      </div>
                    )}

                    {/* Reveal Explanation if Closed */}
                    {isClosed && q.explanation && (
                      <div style={{
                        marginTop: "12px",
                        background: "#DBEAFE",
                        border: "2px solid #0F172A",
                        boxShadow: "2px 2px 0px #0F172A",
                        borderRadius: "6px",
                        padding: "12px",
                        fontSize: "0.85rem",
                        color: "#0F172A",
                        fontWeight: 500,
                      }}>
                        <strong style={{ color: "#1E40AF", fontWeight: 800 }}>Official Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Cohort Mastery Analytics Chart */}
            <div className="responsive-panel" style={{
              background: "#FFFFFF",
              border: "2.5px solid #0F172A",
              boxShadow: "4px 4px 0px #0F172A",
              borderRadius: "12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ fontSize: "0.98rem", fontWeight: 900, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BarChart2 size={18} color="#2563EB" /> Cohort Performance &amp; Mastery Percentages
                </h3>
                <span style={{
                  background: "#DBEAFE",
                  color: "#0F172A",
                  border: "1.5px solid #0F172A",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                }}>
                  {selectedQuiz.responses_count ?? 0} Submissions Logged
                </span>
              </div>

              {selectedQuiz.cohort_stats && selectedQuiz.cohort_stats.total_responses > 0 ? (
                <div>
                  <div className="responsive-stats-grid" style={{ marginBottom: "16px" }}>
                    <div style={{
                      background: "#DBEAFE",
                      border: "2px solid #0F172A",
                      boxShadow: "2px 2px 0px #0F172A",
                      padding: "12px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#1E40AF", fontWeight: 800 }}>AVERAGE SCORE</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.average_score} / {selectedQuiz.total_points}
                      </div>
                    </div>
                    <div style={{
                      background: "#D1FAE5",
                      border: "2px solid #0F172A",
                      boxShadow: "2px 2px 0px #0F172A",
                      padding: "12px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#065F46", fontWeight: 800 }}>MASTERY PCT</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.average_pct}%
                      </div>
                    </div>
                    <div style={{
                      background: "#EFF6FF",
                      border: "2px solid #0F172A",
                      boxShadow: "2px 2px 0px #0F172A",
                      padding: "12px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#1D4ED8", fontWeight: 800 }}>PASS RATE</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.pass_rate_pct}%
                      </div>
                    </div>
                    <div style={{
                      background: "#E0F2FE",
                      border: "2px solid #0F172A",
                      boxShadow: "2px 2px 0px #0F172A",
                      padding: "12px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: "0.7rem", color: "#0369A1", fontWeight: 800 }}>HIGH SCORE</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0F172A", marginTop: "2px" }}>
                        {selectedQuiz.cohort_stats.highest_score}
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#475569", fontWeight: 700, marginBottom: "6px" }}>
                      <span>Cohort Mastery Spectrum</span>
                      <span style={{ color: "#0F172A" }}>Target: &gt;= 75% Accreditation Standard</span>
                    </div>
                    <div style={{
                      width: "100%",
                      height: "14px",
                      background: "#E2E8F0",
                      border: "2px solid #0F172A",
                      borderRadius: "7px",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${Math.min(100, selectedQuiz.cohort_stats.average_pct)}%`,
                        height: "100%",
                        background: "#2563EB",
                        borderRight: "2px solid #0F172A",
                      }} />
                    </div>
                  </div>

                  {/* Individual Student Submissions Table */}
                  {canManageQuizzes && selectedQuiz.responses?.length > 0 && (
                    <div style={{ borderTop: "2px solid #E2E8F0", paddingTop: "14px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#0F172A", marginBottom: "10px" }}>
                        Individual Student Submissions &amp; Gradebook Scores
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                          <thead>
                            <tr style={{ background: "#EFF6FF", borderBottom: "1.5px solid #0F172A", textAlign: "left" }}>
                              <th style={{ padding: "8px 10px" }}>STUDENT</th>
                              <th style={{ padding: "8px 10px" }}>LATENCY</th>
                              <th style={{ padding: "8px 10px" }}>SCORE</th>
                              {canAdjustScores && <th style={{ padding: "8px 10px", textAlign: "right" }}>OVERRIDE</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedQuiz.responses.map((resp: any) => (
                              <tr key={resp.id} style={{ borderBottom: "1px solid #CBD5E1" }}>
                                <td style={{ padding: "8px 10px", fontWeight: 800 }}>
                                  {resp.student_name}{" "}
                                  <span style={{ fontFamily: "var(--font-mono)", color: "#475569", fontSize: "0.72rem" }}>
                                    ({resp.institutional_id})
                                  </span>
                                </td>
                                <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                  {resp.latency_ms}ms
                                </td>
                                <td style={{ padding: "8px 10px", fontWeight: 900, color: "#1E40AF" }}>
                                  {resp.score} / {resp.max_score} pts
                                </td>
                                {canAdjustScores && (
                                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                                      onClick={() => {
                                        setSelectedResponse(resp);
                                        setAdjustScoreForm({
                                          score: resp.score,
                                          justification: "",
                                        });
                                        setShowAdjustScoreModal(true);
                                      }}
                                    >
                                      <Edit3 size={11} /> Adjust
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#64748B", textAlign: "center", padding: "16px 0", fontWeight: 600 }}>
                  Awaiting student responses. Cohort mastery metrics will synthesize upon collection.
                </div>
              )}
            </div>
          </div>

          {/* Right on Desktop (1st on Mobile): Live Interactive Student Screen */}
          <div className="responsive-panel quiz-student-col" style={{
            background: "#FFFFFF",
            border: "2.5px solid #0F172A",
            boxShadow: "4px 4px 0px #0F172A",
            borderRadius: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  background: "#60A5FA",
                  color: "#0F172A",
                  border: "1.5px solid #0F172A",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontWeight: 900,
                  fontSize: "0.72rem",
                }}>
                  STUDENT LIVE SCREEN
                </span>
                <span style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 600 }}>Real-Time Screen Push</span>
              </div>
              <span style={{
                background: isLive && remainingSeconds <= 15 ? "#FEE2E2" : "#DBEAFE",
                color: isLive && remainingSeconds <= 15 ? "#991B1B" : "#0F172A",
                border: "1.5px solid #0F172A",
                borderRadius: "4px",
                padding: "3px 8px",
                fontWeight: 800,
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}>
                <Clock size={12} /> {isLive ? `${remainingSeconds}s Remaining` : `${selectedQuiz.time_limit_seconds}s Window`}
              </span>
            </div>

            {/* Student Selector for Faculty Simulation */}
            {!isStudentRole && allStudents.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontSize: "0.76rem" }}>
                  Simulating Student Terminal:
                </label>
                <select
                  className="form-select"
                  style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  value={simulatedStudentId}
                  onChange={(e) => {
                    setSimulatedStudentId(Number(e.target.value));
                    setAnswerSubmitted(false);
                    setLastSubmissionResult(null);
                  }}
                >
                  {allStudents.map((stu: any) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.name} ({stu.institutional_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLive ? (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                  {selectedQuiz.questions?.map((q: any, qIdx: number) => {
                    const qId = String(q.id);
                    return (
                      <div
                        key={qId}
                        style={{
                          background: "#EFF6FF",
                          border: "2px solid #0F172A",
                          boxShadow: "2px 2px 0px #0F172A",
                          padding: "16px",
                          borderRadius: "10px",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", color: "#2563EB", fontWeight: 900, marginBottom: "4px" }}>
                          QUESTION {qIdx + 1} OF {selectedQuiz.questions.length} ({q.points || 5} PTS)
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0F172A", marginBottom: "14px", lineHeight: 1.4 }}>
                          {q.question}
                        </div>

                        {q.options && q.options.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {q.options.map((opt: string, optIdx: number) => {
                              const isSelected = effectiveStudentAnswers[qId] === opt;
                              return (
                                <button
                                  type="button"
                                  key={optIdx}
                                  disabled={isSubmissionRecorded}
                                  onClick={() => {
                                    if (!isSubmissionRecorded) {
                                      setStudentAnswers({ ...studentAnswers, [qId]: opt });
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    minHeight: "48px",
                                    padding: "11px 14px",
                                    borderRadius: "8px",
                                    border: isSelected ? "2.5px solid #0F172A" : "1.5px solid #0F172A",
                                    boxShadow: isSelected ? "3px 3px 0px #0F172A" : "1.5px 1.5px 0px #0F172A",
                                    background: isSelected ? "#60A5FA" : "#FFFFFF",
                                    color: "#0F172A",
                                    fontSize: "0.88rem",
                                    fontWeight: isSelected ? 800 : 600,
                                    cursor: isSubmissionRecorded ? "default" : "pointer",
                                    transform: isSelected ? "translate(-1px, -1px)" : "none",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <textarea
                            className="form-textarea"
                            rows={2}
                            disabled={isSubmissionRecorded}
                            placeholder="Type your open-concept response..."
                            value={effectiveStudentAnswers[qId] || ""}
                            onChange={(e) =>
                              setStudentAnswers({ ...studentAnswers, [qId]: e.target.value })
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {quizError && (
                  <div
                    role="alert"
                    style={{
                      marginBottom: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "#FEE2E2",
                      border: "2px solid #DC2626",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#991B1B",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AlertCircle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
                    <span>{quizError}</span>
                  </div>
                )}

                {/* Submission CTA */}
                {isSubmissionRecorded ? (
                  <div style={{
                    background: "#6EE7B7",
                    border: "2.5px solid #0F172A",
                    boxShadow: "3px 3px 0px #0F172A",
                    borderRadius: "10px",
                    padding: "16px",
                    textAlign: "center",
                  }}>
                    <CheckCircle size={28} color="#0F172A" strokeWidth={2.5} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0F172A" }}>
                      Answer Successfully Recorded!{" "}
                      {effectiveSubmissionResult &&
                        `(${effectiveSubmissionResult.score} / ${effectiveSubmissionResult.max_score} Pts)`}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#0F172A", marginTop: "4px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      <Zap size={12} style={{ display: "inline", marginRight: "4px" }} />
                      Millisecond Timestamp Latency: {effectiveLatencyMs}ms
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      minHeight: "48px",
                      padding: "12px",
                      fontSize: "0.95rem",
                    }}
                    disabled={submittingAnswer || !allQuestionsAnswered}
                    onClick={handleStudentSubmitAnswer}
                  >
                    <Send size={16} /> Submit All Answers ({Object.keys(studentAnswers).length}/
                    {selectedQuiz.questions?.length || 1})
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
                  fontWeight: 800,
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
          textAlign: "center",
        }}>
          <Vote size={44} color="#000000" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#000000" }}>No Live Quizzes for this Session</h3>
          <p style={{ color: "#4B5563", fontSize: "0.9rem", marginTop: "4px", fontWeight: 600 }}>
            Click &lsquo;Create Live Quiz / Poll&rsquo; to formulate an interactive concept check.
          </p>
        </div>
      )}

      {/* MODAL 1: Create Live Quiz (Multi-Question Dynamic Builder) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "740px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#000000" }}>
              Formulate In-Class Concept Poll / Multi-Question Quiz
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "20px", fontWeight: 500 }}>
              Create single or multi-question prompts (Multiple Choice, True/False, or Open-Ended Concept) to gauge real-time cohort comprehension.
            </p>

            <form onSubmit={handleCreateQuizSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Quiz / Poll Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">Prompt Format</label>
                  <select
                    className="form-select"
                    value={createForm.prompt_type}
                    onChange={(e) => handlePromptTypeChange(e.target.value)}
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="open_concept">Open-Ended Concept</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Submission Window (Seconds)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={createForm.time_limit_seconds}
                    onChange={(e) => setCreateForm({ ...createForm, time_limit_seconds: Number(e.target.value) })}
                    min={15}
                    max={600}
                  />
                </div>
              </div>

              {/* Dynamic Questions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "20px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                {createForm.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    style={{
                      background: "#F8FAFC",
                      border: "2px solid #0F172A",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "#2563EB" }}>
                        QUESTION #{qIdx + 1}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 800 }}>Points:</label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: "70px", padding: "4px 8px" }}
                          min={1}
                          max={100}
                          value={q.points}
                          onChange={(e) => {
                            const next = [...createForm.questions];
                            next[qIdx].points = Number(e.target.value);
                            setCreateForm({ ...createForm, questions: next });
                          }}
                        />
                        {createForm.questions.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#DC2626", padding: "4px 8px" }}
                            onClick={() => handleRemoveQuestion(qIdx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label className="form-label">Question Prompt</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        required
                        value={q.question}
                        onChange={(e) => {
                          const next = [...createForm.questions];
                          next[qIdx].question = e.target.value;
                          setCreateForm({ ...createForm, questions: next });
                        }}
                      />
                    </div>

                    {createForm.prompt_type === "multiple_choice" && (
                      <div style={{ marginBottom: "12px" }}>
                        <label className="form-label">Answer Options (Select radio for Correct Answer)</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correct_answer === opt}
                                onChange={() => {
                                  const next = [...createForm.questions];
                                  next[qIdx].correct_answer = opt;
                                  setCreateForm({ ...createForm, questions: next });
                                }}
                                title="Mark as correct option"
                              />
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                                required
                                value={opt}
                                onChange={(e) => {
                                  const next = [...createForm.questions];
                                  const wasCorrect = next[qIdx].correct_answer === opt;
                                  next[qIdx].options[oIdx] = e.target.value;
                                  if (wasCorrect) {
                                    next[qIdx].correct_answer = e.target.value;
                                  }
                                  setCreateForm({ ...createForm, questions: next });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {createForm.prompt_type === "true_false" && (
                      <div style={{ marginBottom: "12px" }}>
                        <label className="form-label">Correct Answer</label>
                        <select
                          className="form-select"
                          value={q.correct_answer}
                          onChange={(e) => {
                            const next = [...createForm.questions];
                            next[qIdx].correct_answer = e.target.value;
                            setCreateForm({ ...createForm, questions: next });
                          }}
                        >
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      </div>
                    )}

                    {createForm.prompt_type === "open_concept" && (
                      <div style={{ marginBottom: "12px" }}>
                        <label className="form-label">Expected Answer / Keyword for Auto-Grading</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. quorum intersection"
                          value={q.correct_answer}
                          onChange={(e) => {
                            const next = [...createForm.questions];
                            next[qIdx].correct_answer = e.target.value;
                            setCreateForm({ ...createForm, questions: next });
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label className="form-label">Post-Quiz Explanation (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Explanation shown after quiz closes..."
                        value={q.explanation}
                        onChange={(e) => {
                          const next = [...createForm.questions];
                          next[qIdx].explanation = e.target.value;
                          setCreateForm({ ...createForm, questions: next });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddQuestion}
                >
                  <Plus size={14} /> Add Another Question
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Concept Poll ({createForm.questions.length} Q)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Adjust Student Quiz Score */}
      {showAdjustScoreModal && selectedResponse && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "8px", color: "#0F172A" }}>
              Manual Quiz Score Adjustment
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "20px", fontWeight: 600 }}>
              Adjusting score for <strong style={{ color: "#0F172A" }}>{selectedResponse.student_name}</strong> (Max:{" "}
              {selectedResponse.max_score} pts).
            </p>

            <form onSubmit={handleAdjustScoreSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Adjusted Score (Points)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={selectedResponse.max_score}
                  className="form-input"
                  required
                  value={adjustScoreForm.score}
                  onChange={(e) => setAdjustScoreForm({ ...adjustScoreForm, score: Number(e.target.value) })}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Mandatory Academic Justification</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="State reason for score adjustment (e.g. partial credit for open-concept derivation)."
                  value={adjustScoreForm.justification}
                  onChange={(e) => setAdjustScoreForm({ ...adjustScoreForm, justification: e.target.value })}
                />
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#854D0E", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={14} /> Logged permanently in the Module 7 Institutional Audit Trail.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdjustScoreModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Score Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
