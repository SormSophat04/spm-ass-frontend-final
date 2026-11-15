// API Client for Academic Lecture & Institutional Seminar Coordinator
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export const AUTH_TOKEN_STORAGE_KEY = "acad_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access restrictions
  }
}

export function buildAuthenticatedUrl(path: string): string {
  const token = getStoredToken();
  const baseUrl = path.startsWith("http") || path.startsWith("/api") || path.startsWith("/uploads")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!token) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}token=${encodeURIComponent(token)}`;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers["Authorization"] && !headers["authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: options.credentials ?? "same-origin",
    headers,
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.statusText}`;
    let errCode: string | undefined;
    try {
      const errJson = await res.json();
      errMsg = errJson.message || errJson.error || errMsg;
      errCode = errJson.code;
    } catch {
      // Ignore JSON parse error
    }
    throw new ApiError(errMsg, res.status, errCode);
  }

  return res.json();
}

export const api = {
  // Global Institutional Stats, Seed & File Uploads
  system: {
    getStats: () =>
      fetchApi<{
        success: boolean;
        total_users: number;
        total_courses: number;
        total_sessions: number;
        live_sessions: number;
        total_attendance_records: number;
        total_leave_requests: number;
        pending_leaves: number;
        total_quizzes: number;
        live_quizzes: number;
        total_audit_events: number;
      }>("/stats"),
    reseed: () =>
      fetchApi<{ success: boolean; message: string }>("/seed", {
        method: "POST",
      }),
    seedDatabase: () =>
      fetchApi<{ success: boolean; message: string }>("/seed", {
        method: "POST",
      }),
    uploadFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetchApi<{
        success: boolean;
        filename?: string;
        file_name: string;
        stored_name: string;
        file_url: string;
        file_type: string;
        file_size_kb: number;
      }>("/uploads", {
        method: "POST",
        body: formData,
      });
    },
  },

  // Authentication & Institutional Identity
  auth: {
    login: (identifier: string, password: string) =>
      fetchApi<{ success: boolean; message?: string; token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      }),
    logout: () =>
      fetchApi<{ success: boolean; message?: string }>("/auth/logout", {
        method: "POST",
      }),
    getUsers: (role?: string) => {
      const qs = role ? `?role=${encodeURIComponent(role)}` : "";
      return fetchApi<{ success: boolean; users: any[] }>(`/auth/users${qs}`);
    },
    getDemoAccounts: () =>
      fetchApi<{
        success: boolean;
        default_password?: string;
        accounts: Array<{
          id: number;
          role: string;
          name: string;
          institutional_id?: string;
          institutionalId: string;
          email: string;
          department: string;
          modulesCount: number;
          allowed_modules?: string[];
          allowedModules: string[];
        }>;
      }>("/auth/demo-accounts"),
    getCurrentUser: () => fetchApi<{ success: boolean; user: any }>("/auth/current"),
    switchUser: (user_id: number) =>
      fetchApi<{ success: boolean; message: string; token?: string; user: any }>("/auth/switch-user", {
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
    getCourses: (all = false) =>
      fetchApi<{ success: boolean; count: number; courses: any[] }>(`/sessions/courses${all ? "?all=true" : ""}`),
    createCourse: (data: any) =>
      fetchApi<{ success: boolean; message: string; course: any }>("/sessions/courses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getCourseModules: (course_id: number) =>
      fetchApi<{ success: boolean; modules: any[] }>(`/sessions/courses/${course_id}/modules`),
    createCourseModule: (course_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; module: any }>(`/sessions/courses/${course_id}/modules`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
    deleteSession: (id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/sessions/${id}`, {
        method: "DELETE",
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
    deleteRecurringTimetable: (timetable_id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/sessions/recurring-timetables/${timetable_id}`, {
        method: "DELETE",
      }),
    generateFromTimetable: (course_id: number, data?: any) =>
      fetchApi<{ success: boolean; message: string; sessions: any[] }>(
        `/sessions/courses/${course_id}/generate-from-timetable`,
        {
          method: "POST",
          body: JSON.stringify(data || {}),
        }
      ),
  },

  // Module 2: Student Attendance & Session Engagement
  attendance: {
    getSessionAttendance: (session_id: number) =>
      fetchApi<{
        success: boolean;
        session_id: number;
        session_title: string;
        course_id: number;
        course_code: string;
        course_title: string;
        virtual_room_code: string;
        room_security_config: any;
        status: string;
        metrics: any;
        records: any[];
      }>(`/attendance/session/${session_id}`),
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
    overrideVerifiedStatus: (data: {
      record_id?: number | null;
      session_id?: number;
      student_id?: number;
      verified_status: string;
      verification_reason: string;
      actor_id?: number;
    }) =>
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
      fetchApi<{ success: boolean; course_id: number; course_code: string; course_title: string; sessions: any[]; attendance_matrix: any[] }>(
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
    deliverProxyNotes: (leave_id: number, delivered = true) =>
      fetchApi<{ success: boolean; message: string; leave: any }>(`/leaves/${leave_id}/deliver-proxy-notes`, {
        method: "PUT",
        body: JSON.stringify({ delivered }),
      }),
    getStudentHistory: (student_id: number) =>
      fetchApi<{ success: boolean; student: any; summary: any; leave_requests: any[] }>(`/leaves/student/${student_id}/history`),
  },

  // Module 4: Structured Lecture Minutes & Study Notes
  notes: {
    getSessionMOM: (session_id: number) =>
      fetchApi<{
        success: boolean;
        session_id: number;
        session_title: string;
        course_code: string;
        course_title: string;
        has_mom: boolean;
        mom: any;
        attachments: any[];
      }>(`/notes/session/${session_id}`),
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
    unlockMOM: (mom_id: number) =>
      fetchApi<{ success: boolean; message: string; mom: any }>(`/notes/${mom_id}/unlock`, {
        method: "POST",
      }),
    attachSlides: (session_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; attachment: any }>(`/notes/session/${session_id}/attachments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteAttachment: (attachment_id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/notes/attachments/${attachment_id}`, {
        method: "DELETE",
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
    deleteQuiz: (id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/quizzes/${id}`, {
        method: "DELETE",
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
    adjustScore: (response_id: number, score: number, justification: string) =>
      fetchApi<{ success: boolean; message: string; response: any }>(`/quizzes/responses/${response_id}/adjust-score`, {
        method: "PUT",
        body: JSON.stringify({ score, justification }),
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
    assignTAScope: (course_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; scope: any }>(`/roles/courses/${course_id}/ta-scopes`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateTAScope: (scope_id: number, data: any) =>
      fetchApi<{ success: boolean; message: string; scope: any }>(`/roles/ta-scopes/${scope_id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    removeTAScope: (scope_id: number) =>
      fetchApi<{ success: boolean; message: string }>(`/roles/ta-scopes/${scope_id}`, {
        method: "DELETE",
      }),
    getEnrollments: (course_id: number) =>
      fetchApi<{ success: boolean; enrollments: any[] }>(`/roles/courses/${course_id}/enrollments`),
    enrollUser: (course_id: number, user_id: number, role_scope: string) =>
      fetchApi<{ success: boolean; message: string; enrollment: any }>(`/roles/courses/${course_id}/enroll`, {
        method: "POST",
        body: JSON.stringify({ user_id, role_scope }),
      }),
    revokeAccess: (enrollment_id: number, reason: string, actor_id?: number) =>
      fetchApi<{ success: boolean; message: string; enrollment: any }>(`/roles/enrollments/${enrollment_id}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason, actor_id }),
      }),
    restoreAccess: (enrollment_id: number) =>
      fetchApi<{ success: boolean; message: string; enrollment: any }>(`/roles/enrollments/${enrollment_id}/restore`, {
        method: "POST",
      }),
    provisionUser: (data: { institutional_id: string; name: string; email: string; role: string; department: string; password?: string }) =>
      fetchApi<{ success: boolean; message: string; user: any }>("/roles/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateUserRole: (user_id: number, role: string) =>
      fetchApi<{ success: boolean; message: string; user: any }>(`/roles/users/${user_id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
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
    getEntranceLogs: (params?: number | { session_id?: number; user_id?: number; event_type?: string }) => {
      const qs = new URLSearchParams();
      if (typeof params === "number") {
        qs.append("session_id", String(params));
      } else if (params) {
        if (params.session_id) qs.append("session_id", String(params.session_id));
        if (params.user_id) qs.append("user_id", String(params.user_id));
        if (params.event_type) qs.append("event_type", params.event_type);
      }
      return fetchApi<{ success: boolean; count: number; entrance_logs: any[] }>(`/audit/entrance-logs?${qs.toString()}`);
    },
    getComplianceReport: (course_id?: number) => {
      const qs = new URLSearchParams();
      if (course_id) qs.append("course_id", String(course_id));
      return fetchApi<{
        success: boolean;
        generated_at: string;
        institution: string;
        overall_institutional_integrity_index?: number;
        totals: any;
        compliance_summary: any[];
      }>(`/audit/compliance-report?${qs.toString()}`);
    },
  },
};
