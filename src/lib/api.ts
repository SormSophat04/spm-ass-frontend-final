// API Client for Academic Lecture & Institutional Seminar Coordinator
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.message || errMsg;
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Auth & Multi-Role Switching
  auth: {
    getUsers: () => fetchApi<{ success: boolean; users: any[] }>("/auth/users"),
    getCurrentUser: () => fetchApi<{ success: boolean; user: any }>("/auth/current"),
    switchUser: (user_id: number) =>
      fetchApi<{ success: boolean; message: string; user: any }>("/auth/switch-user", {
        method: "POST",
        body: JSON.stringify({ user_id }),
      }),
    verifyIdentity: (institutional_id: string, email: string) =>
      fetchApi<{ success: boolean; verified: boolean; user?: any; reason?: string }>("/auth/verify-institutional-identity", {
        method: "POST",
        body: JSON.stringify({ institutional_id, email }),
      }),
  },

  // Module 1: Lecture & Seminar Lifecycle Management
  sessions: {
    getAll: (params?: { course_id?: number; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.course_id) qs.append("course_id", String(params.course_id));
      if (params?.status) qs.append("status", params.status);
      return fetchApi<{ success: boolean; count: number; sessions: any[] }>(`/sessions?${qs.toString()}`);
    },
    getDetail: (id: number) => fetchApi<{ success: boolean; session: any }>(`/sessions/${id}`),
    schedule: (data: any) =>
      fetchApi<{ success: boolean; message: string; session: any }>("/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    configureSecurity: (id: number, security_config: any, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; room_security_config: any }>(`/sessions/${id}/security`, {
        method: "PUT",
        body: JSON.stringify({ security_config, actor_id }),
      }),
    start: (id: number) =>
      fetchApi<{ success: boolean; message: string; session: any }>(`/sessions/${id}/start`, {
        method: "POST",
      }),
    end: (id: number) =>
      fetchApi<{ success: boolean; message: string; session: any }>(`/sessions/${id}/end`, {
        method: "POST",
      }),
    assignCoHost: (id: number, user_id: number, host_role: string) =>
      fetchApi<{ success: boolean; message: string; co_hosts: any[] }>(`/sessions/${id}/co-hosts`, {
        method: "POST",
        body: JSON.stringify({ user_id, host_role }),
      }),
    removeCoHost: (id: number, host_user_id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/sessions/${id}/co-hosts/${host_user_id}`, {
        method: "DELETE",
      }),
    archiveRecording: (id: number, data: { recording_url: string; recording_duration_mins: number; recording_notes?: string }) =>
      fetchApi<{ success: boolean; message: string; session: any }>(`/sessions/${id}/archive-recording`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    setRecurringTimetable: (course_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; timetable: any }>(`/sessions/courses/${course_id}/recurring-timetable`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getRecurringTimetables: (course_id: number) =>
      fetchApi<{ success: boolean; timetables: any[] }>(`/sessions/courses/${course_id}/recurring-timetables`),
  },

  // Module 2: Student Attendance & Session Engagement
  attendance: {
    getSessionAttendance: (session_id: number) =>
      fetchApi<{ success: boolean; session_id: number; session_title: string; course_code: string; status: string; metrics: any; records: any[] }>(
        `/attendance/session/${session_id}`
      ),
    joinGate: (session_id: number, student_id: number) =>
      fetchApi<{ success: boolean; admitted: boolean; is_late: boolean; late_minutes: number; record?: any; message?: string }>(
        "/attendance/join-gate",
        {
          method: "POST",
          body: JSON.stringify({ session_id, student_id }),
        }
      ),
    leaveGate: (session_id: number, student_id: number, reason?: string) =>
      fetchApi<{ success: boolean; is_early_exit: boolean; early_exit_minutes: number; record: any }>("/attendance/leave-gate", {
        method: "POST",
        body: JSON.stringify({ session_id, student_id, reason }),
      }),
    heartbeat: (session_id: number, student_id: number, increment_seconds = 30) =>
      fetchApi<{ success: boolean; total_duration_minutes: number; coverage_pct: number }>("/attendance/heartbeat", {
        method: "POST",
        body: JSON.stringify({ session_id, student_id, increment_seconds }),
      }),
    overrideVerifiedStatus: (data: { record_id: number; verified_status: string; verification_reason: string; actor_id?: number }) =>
      fetchApi<{ success: boolean; message: string; record: any }>("/attendance/override", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    enrollRoster: (course_id: number, students: any[], actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; enrolled_count: number }>(`/attendance/courses/${course_id}/roster-enroll`, {
        method: "POST",
        body: JSON.stringify({ students, actor_id }),
      }),
    getCourseAttendanceSheet: (course_id: number) =>
      fetchApi<{ success: boolean; course_id: number; course_code: string; sessions: any[]; attendance_matrix: any[] }>(
        `/attendance/courses/${course_id}/attendance-sheet`
      ),
  },

  // Module 3: Academic Leave & Absence Approval
  leaves: {
    getAll: (params?: { student_id?: number; course_id?: number; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.student_id) qs.append("student_id", String(params.student_id));
      if (params?.course_id) qs.append("course_id", String(params.course_id));
      if (params?.status) qs.append("status", params.status);
      return fetchApi<{ success: boolean; count: number; leaves: any[] }>(`/leaves?${qs.toString()}`);
    },
    submit: (data: any) =>
      fetchApi<{ success: boolean; message: string; leave: any }>("/leaves", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    review: (leave_id: number, status: "approved" | "rejected", review_comment: string, reviewer_id?: number) =>
      fetchApi<{ success: boolean; message: string; leave: any }>(`/leaves/${leave_id}/review`, {
        method: "PUT",
        body: JSON.stringify({ status, review_comment, reviewer_id }),
      }),
    assignProxy: (leave_id: number, note_proxy_id: number) =>
      fetchApi<{ success: boolean; message: string; leave: any }>(`/leaves/${leave_id}/assign-proxy`, {
        method: "POST",
        body: JSON.stringify({ note_proxy_id }),
      }),
    getStudentHistory: (student_id: number) =>
      fetchApi<{ success: boolean; student: any; summary: any; leave_requests: any[] }>(`/leaves/student/${student_id}/history`),
  },

  // Module 4: Structured Lecture Minutes & Study Notes
  notes: {
    getSessionMOM: (session_id: number) =>
      fetchApi<{ success: boolean; session_id: number; session_title: string; has_mom: boolean; mom: any; attachments: any[] }>(
        `/notes/session/${session_id}`
      ),
    saveMOM: (session_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; mom: any }>(`/notes/session/${session_id}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    coeditTA: (mom_id: number, ta_supplementary_notes: string, editor_id?: number) =>
      fetchApi<{ success: boolean; message: string; mom: any }>(`/notes/${mom_id}/coedit`, {
        method: "PUT",
        body: JSON.stringify({ ta_supplementary_notes, editor_id }),
      }),
    publishMOM: (mom_id: number, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; mom: any }>(`/notes/${mom_id}/publish`, {
        method: "POST",
        body: JSON.stringify({ actor_id }),
      }),
    lockMOM: (mom_id: number, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; mom: any }>(`/notes/${mom_id}/lock`, {
        method: "POST",
        body: JSON.stringify({ actor_id }),
      }),
    attachSlides: (session_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; attachment: any }>(`/notes/session/${session_id}/attachments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Module 5: Live In-Class Polling & Quiz Tracker
  quizzes: {
    getSessionQuizzes: (session_id: number) =>
      fetchApi<{ success: boolean; session_id: number; quizzes: any[] }>(`/quizzes/session/${session_id}`),
    getDetail: (id: number, as_student = false) =>
      fetchApi<{ success: boolean; quiz: any; responses: any[] }>(`/quizzes/${id}?as_student=${as_student}`),
    create: (session_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; quiz: any }>(`/quizzes/session/${session_id}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    launch: (id: number, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; quiz: any }>(`/quizzes/${id}/launch`, {
        method: "POST",
        body: JSON.stringify({ actor_id }),
      }),
    submitAnswer: (id: number, data: { student_id: number; answers: any; latency_ms?: number }) =>
      fetchApi<{ success: boolean; message: string; response: any }>(`/quizzes/${id}/submit`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    close: (id: number, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; quiz: any }>(`/quizzes/${id}/close`, {
        method: "POST",
        body: JSON.stringify({ actor_id }),
      }),
    exportGradebook: (id: number, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; exported_count: number; quiz: any }>(`/quizzes/${id}/export-gradebook`, {
        method: "POST",
        body: JSON.stringify({ actor_id }),
      }),
  },

  // Module 6: Roles & Permissions Management
  roles: {
    getMatrix: () => fetchApi<{ success: boolean; roles_matrix: any }>("/roles/matrix"),
    getCourseAuthorities: (course_id: number) =>
      fetchApi<{ success: boolean; course: any; primary_instructor: any; ta_scopes: any[]; enrollments_count: number }>(
        `/roles/courses/${course_id}/authorities`
      ),
    assignAuthority: (course_id: number, instructor_id: number, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; course: any }>(`/roles/courses/${course_id}/assign-authority`, {
        method: "PUT",
        body: JSON.stringify({ instructor_id, actor_id }),
      }),
    updateTAScope: (scope_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; scope: any }>(`/roles/ta-scopes/${scope_id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    getEnrollments: (course_id: number) =>
      fetchApi<{ success: boolean; enrollments: any[] }>(`/roles/courses/${course_id}/enrollments`),
    revokeAccess: (enrollment_id: number, reason: string, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; enrollment: any }>(`/roles/enrollments/${enrollment_id}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason, actor_id }),
      }),
  },

  // Module 7: Activity Log & Audit Trail
  audit: {
    searchLogs: (params?: { course_id?: number; event_type?: string; actor_id?: number; target_entity?: string; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.course_id) qs.append("course_id", String(params.course_id));
      if (params?.event_type) qs.append("event_type", params.event_type);
      if (params?.actor_id) qs.append("actor_id", String(params.actor_id));
      if (params?.target_entity) qs.append("target_entity", params.target_entity);
      if (params?.q) qs.append("q", params.q);
      return fetchApi<{ success: boolean; count: number; logs: any[] }>(`/audit/logs?${qs.toString()}`);
    },
    getEntranceLogs: (params?: { session_id?: number; user_id?: number; event_type?: string }) => {
      const qs = new URLSearchParams();
      if (params?.session_id) qs.append("session_id", String(params.session_id));
      if (params?.user_id) qs.append("user_id", String(params.user_id));
      if (params?.event_type) qs.append("event_type", params.event_type);
      return fetchApi<{ success: boolean; count: number; entrance_logs: any[] }>(`/audit/entrance-logs?${qs.toString()}`);
    },
    getComplianceReport: (course_id?: number) => {
      const qs = new URLSearchParams();
      if (course_id) qs.append("course_id", String(course_id));
      return fetchApi<{ success: boolean; generated_at: string; institution: string; compliance_summary: any[] }>(
        `/audit/compliance-report?${qs.toString()}`
      );
    },
  },
};
