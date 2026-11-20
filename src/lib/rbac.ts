export type AcademicRole =
  | "Dean"
  | "Professor"
  | "Teaching Assistant"
  | "Student"
  | "Auditor";

export type ModuleId =
  | "lifecycle"
  | "attendance"
  | "leaves"
  | "notes"
  | "quizzes"
  | "roles"
  | "audit";

export interface TAScopeSummary {
  course_id: number;
  course_code?: string;
  can_take_attendance?: boolean;
  can_coedit_notes?: boolean;
  can_launch_polls?: boolean;
  can_publish_grades?: boolean;
}

export interface AuthenticatedUser {
  id: number;
  institutional_id: string;
  name: string;
  email: string;
  role: AcademicRole;
  department: string;
  avatar_color: string;
  email_verified?: boolean;
  auth_source?: string;
  is_active: boolean;
  allowed_modules: ModuleId[];
  role_description?: string;
  ta_scopes?: TAScopeSummary[];
}

export interface ModuleDefinition {
  id: ModuleId;
  path: string;
  label: string;
  desc: string;
}

export const MODULE_CONFIG: ModuleDefinition[] = [
  {
    id: "lifecycle",
    path: "/lifecycle",
    label: "1. Course & Session Lifecycle",
    desc: "Syllabus, Room Locks & Timetable",
  },
  {
    id: "attendance",
    path: "/attendance",
    label: "2. Attendance & Join Gate",
    desc: "Institutional Check-in & Overrides",
  },
  {
    id: "leaves",
    path: "/leaves",
    label: "3. Absence, Leave & Substitute",
    desc: "Medical Petitions & TA Proxies",
  },
  {
    id: "notes",
    path: "/notes",
    label: "4. Collaborative Lecture Notes",
    desc: "MOM Minutes & Version Locks",
  },
  {
    id: "quizzes",
    path: "/quizzes",
    label: "5. Pop Quizzes & Gradebook",
    desc: "Comprehension Checks & Exports",
  },
  {
    id: "roles",
    path: "/roles",
    label: "6. Roles, Authority & Access",
    desc: "Dean Scopes & Roster Control",
  },
  {
    id: "audit",
    path: "/audit",
    label: "7. Security & Entrance Audit",
    desc: "Impersonation & Compliance Logs",
  },
];

export const ROLE_ALLOWED_MODULES: Record<AcademicRole, ModuleId[]> = {
  Dean: ["lifecycle", "attendance", "leaves", "notes", "quizzes", "roles", "audit"],
  Professor: ["lifecycle", "attendance", "leaves", "notes", "quizzes", "audit"],
  "Teaching Assistant": ["lifecycle", "attendance", "notes", "quizzes"],
  Student: ["lifecycle", "attendance", "leaves", "notes", "quizzes"],
  Auditor: ["lifecycle", "notes", "audit"],
};

export function getAllowedModulesForRole(
  role?: string | null,
  explicitAllowedModules?: string[] | null
): ModuleId[] {
  if (Array.isArray(explicitAllowedModules) && explicitAllowedModules.length > 0) {
    return explicitAllowedModules.filter((m): m is ModuleId =>
      MODULE_CONFIG.some((cfg) => cfg.id === m)
    );
  }
  if (!role || !(role in ROLE_ALLOWED_MODULES)) {
    return [];
  }
  return ROLE_ALLOWED_MODULES[role as AcademicRole];
}

export function canAccessModule(
  role: string | null | undefined,
  moduleId: ModuleId,
  explicitAllowedModules?: string[] | null
): boolean {
  const allowed = getAllowedModulesForRole(role, explicitAllowedModules);
  return allowed.includes(moduleId);
}

export function getDefaultModulePath(
  role?: string | null,
  explicitAllowedModules?: string[] | null
): string {
  const allowed = getAllowedModulesForRole(role, explicitAllowedModules);
  if (allowed.length === 0) return "/login";
  // 70% of students use their mobile phone for attendance check-in: prioritize /attendance as default landing route
  if (role === "Student" && allowed.includes("attendance")) {
    return "/attendance";
  }
  const firstModule = MODULE_CONFIG.find((cfg) => cfg.id === allowed[0]);
  return firstModule ? firstModule.path : "/lifecycle";
}

export function getMobileModuleShortLabel(moduleId: ModuleId): string {
  switch (moduleId) {
    case "attendance":
      return "Gate Check-In";
    case "quizzes":
      return "Live Poll";
    case "lifecycle":
      return "Schedule";
    case "leaves":
      return "Leave";
    case "notes":
      return "Notes";
    case "roles":
      return "Roles";
    case "audit":
      return "Audit";
    default:
      return moduleId;
  }
}

export function hasAnyRole(
  role: string | null | undefined,
  allowedRoles: AcademicRole[]
): boolean {
  if (!role) return false;
  return allowedRoles.includes(role as AcademicRole);
}

export function getRolePortalBadge(role?: string | null): string {
  switch (role) {
    case "Dean":
      return "DEAN · GOVERNANCE & FULL PORTAL";
    case "Professor":
      return "FACULTY · LECTURE OPERATIONS";
    case "Teaching Assistant":
      return "TA · DELEGATED LAB & CO-EDIT";
    case "Student":
      return "STUDENT · ATTENDANCE PWA & PORTAL";
    case "Auditor":
      return "AUDITOR · COMPLIANCE & READ-ONLY";
    default:
      return "INSTITUTIONAL PORTAL";
  }
}

export function getModuleLabel(moduleId: ModuleId): string {
  const found = MODULE_CONFIG.find((m) => m.id === moduleId);
  return found ? found.label : moduleId;
}

export interface DemoAccountPreset {
  role: AcademicRole;
  name: string;
  institutionalId: string;
  email: string;
  scopeSummary: string;
  accentBg: string;
  accentText: string;
}

export const DEMO_LOGIN_PASSWORD = "Academic@2026";

export const DEMO_ACCOUNT_PRESETS: DemoAccountPreset[] = [
  {
    role: "Dean",
    name: "Dr. Eleanor Vance",
    institutionalId: "ADM-2026-001",
    email: "e.vance@university.edu",
    scopeSummary: "All 7 Modules · Authorities & Seed",
    accentBg: "#FEE2E2",
    accentText: "#991B1B",
  },
  {
    role: "Professor",
    name: "Prof. Alan Turing-Ward",
    institutionalId: "FAC-2026-010",
    email: "a.turing@university.edu",
    scopeSummary: "6 Modules · Lectures, Grades & Audit",
    accentBg: "#DBEAFE",
    accentText: "#1E3A8A",
  },
  {
    role: "Teaching Assistant",
    name: "Alex Chen",
    institutionalId: "TA-2026-041",
    email: "alex.chen@university.edu",
    scopeSummary: "4 Modules · Attendance, Notes & Polls",
    accentBg: "#FEF3C7",
    accentText: "#92400E",
  },
  {
    role: "Student",
    name: "Jordan Miller",
    institutionalId: "STU-2026-101",
    email: "jordan.miller@student.university.edu",
    scopeSummary: "Mobile PWA · 1-Tap Gate, Polls, Leaves & Notes",
    accentBg: "#DCFCE7",
    accentText: "#166534",
  },
  {
    role: "Auditor",
    name: "Inspector David Kim",
    institutionalId: "AUD-2026-090",
    email: "david.kim@partner.university.edu",
    scopeSummary: "3 Modules · Read-Only & Audit Logs",
    accentBg: "#F1F5F9",
    accentText: "#334155",
  },
];
