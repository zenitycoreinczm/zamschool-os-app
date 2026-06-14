import type { ComponentType } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  User,
  Users,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type WorkspaceNavSection = {
  label: string;
  items: WorkspaceNavItem[];
};

export type WorkspaceRoleKey =
  | "admin"
  | "principal"
  | "deputy_head"
  | "bursar"
  | "guidance_office"
  | "academic_admin"
  | "hr_admin"
  | "ict_admin"
  | "discipline_admin"
  | "super_admin"
  | "teacher"
  | "student"
  | "parent"
  | "payments";

export function flattenNavSections(sections: WorkspaceNavSection[]): WorkspaceNavItem[] {
  const seen = new Set<string>();
  const items: WorkspaceNavItem[] = [];

  for (const section of sections) {
    for (const item of section.items) {
      if (seen.has(item.href)) {
        continue;
      }
      seen.add(item.href);
      items.push(item);
    }
  }

  return items;
}

const adminSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "People & classes",
    items: [
      { href: "/app/admin/users", label: "Users", icon: Users },
      { href: "/app/admin/classes", label: "Classes", icon: GraduationCap },
      { href: "/app/admin/assignments", label: "Assignments", icon: FileText },
      { href: "/app/admin/timetable", label: "Timetable", icon: CalendarClock },
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/app/admin/subjects", label: "Subjects", icon: FileText },
      { href: "/app/admin/academic", label: "Academic Years", icon: Calendar },
      { href: "/app/admin/grading-scales", label: "Grades & Scales", icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/app/admin/fees", label: "Payments", icon: CreditCard },
      { href: "/app/admin/finance", label: "Finance", icon: FileBarChart2 },
    ],
  },
  {
    label: "School & system",
    items: [
      { href: "/app/admin/school", label: "School", icon: Building2 },
      { href: "/app/admin/audit", label: "Audit", icon: Shield },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const principalSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/principal", label: "Overview", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "People & academics",
    items: [
      { href: "/app/admin/users", label: "Users & accounts", icon: Users },
      { href: "/app/admin/classes", label: "Classes", icon: GraduationCap },
      { href: "/app/admin/subjects", label: "Subjects", icon: FileText },
      { href: "/app/admin/academic", label: "Academic years", icon: Calendar },
      { href: "/app/admin/timetable", label: "Timetable", icon: CalendarClock },
    ],
  },
  {
    label: "Leadership & finance",
    items: [
      { href: "/app/admin/finance", label: "Finance", icon: FileBarChart2 },
      { href: "/app/admin/fees", label: "Payments", icon: CreditCard },
      { href: "/app/admin/audit", label: "Audit trail", icon: Shield },
      { href: "/app/admin/school", label: "School profile", icon: Building2 },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const deputyHeadSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/deputy-head", label: "Operations Hub", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "Daily operations",
    items: [
      { href: "/app/admin/users", label: "People", icon: Users },
      { href: "/app/admin/classes", label: "Classes", icon: GraduationCap },
      { href: "/app/admin/attendance", label: "Attendance", icon: ClipboardList },
      { href: "/app/admin/timetable", label: "Timetable", icon: CalendarClock },
      { href: "/app/admin/assignments", label: "Assignments", icon: FileText },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const bursarSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/bursar", label: "Finance Hub", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/app/admin/finance", label: "Finance", icon: FileBarChart2 },
      { href: "/app/payments", label: "Payments", icon: CreditCard },
      { href: "/app/payments/students", label: "Student Accounts", icon: Users },
      { href: "/app/payments/fees", label: "Fee Management", icon: CreditCard },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const guidanceSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/guidance", label: "Welfare Desk", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "Student care",
    items: [
      { href: "/app/admin/users", label: "Students", icon: Users },
      { href: "/app/admin/attendance", label: "Attendance", icon: ClipboardList },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const academicAdminSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/academic-admin", label: "Academic Hub", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Curriculum",
    items: [
      { href: "/app/admin/classes", label: "Classes", icon: GraduationCap },
      { href: "/app/admin/subjects", label: "Subjects", icon: FileText },
      { href: "/app/admin/assignments", label: "Assignments", icon: FileText },
      { href: "/app/admin/timetable", label: "Timetable", icon: CalendarClock },
      { href: "/app/admin/academic", label: "Academic Years", icon: Calendar },
      { href: "/app/admin/grading-scales", label: "Grades & Scales", icon: ClipboardList },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const hrAdminSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/hr-admin", label: "HR Hub", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Staff",
    items: [
      { href: "/app/admin/users", label: "Users", icon: Users },
      { href: "/app/admin/school", label: "School", icon: Building2 },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const ictAdminSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/ict-admin", label: "ICT Hub", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/app/admin/users", label: "User Recovery", icon: Users },
      { href: "/app/admin/audit", label: "Audit", icon: Shield },
      { href: "/app/admin/school", label: "School", icon: Building2 },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const disciplineAdminSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/discipline-admin", label: "Conduct Desk", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "Students",
    items: [
      { href: "/app/admin/users", label: "Students", icon: Users },
      { href: "/app/admin/classes", label: "Classes", icon: GraduationCap },
      { href: "/app/admin/attendance", label: "Attendance", icon: ClipboardList },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const appTeacherSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/teacher", label: "Schedule", icon: CalendarClock },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/profile", label: "Profile", icon: Users },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const appStudentSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/student", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/profile", label: "Profile", icon: Users },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Parent portal sidebar uses the same sections as the portal dock.

export const paymentsSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/app/payments", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/app/payments/students", label: "Student Payments", icon: Users },
      { href: "/app/payments/fees", label: "Fee Management", icon: FileText },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/profile", label: "Profile", icon: Users },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const teacherPortalSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
      { href: "/teacher/inbox", label: "Messages", icon: MessageSquare },
      { href: "/teacher/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Teaching",
    items: [
      { href: "/teacher/students", label: "Students", icon: Users },
      { href: "/teacher/teaching", label: "Teaching", icon: GraduationCap },
      { href: "/teacher/classes", label: "Classes", icon: GraduationCap },
      { href: "/teacher/attendance", label: "Attendance", icon: ClipboardList },
      { href: "/teacher/results", label: "Results", icon: GraduationCap },
      { href: "/teacher/discipline", label: "Discipline", icon: Shield },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/teacher/profile", label: "Profile", icon: User },
      { href: "/teacher/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const studentPortalSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/student", label: "Dashboard", icon: LayoutDashboard },
      { href: "/student/messages", label: "Messages", icon: MessageSquare },
      { href: "/student/notifications", label: "Notifications", icon: Bell },
      { href: "/student/announcements", label: "Announcements", icon: Megaphone },
      { href: "/student/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "School work",
    items: [
      { href: "/student/assignments", label: "Assignments", icon: BookOpen },
      { href: "/student/attendance", label: "Attendance", icon: ClipboardList },
      { href: "/student/results", label: "Results", icon: GraduationCap },
      { href: "/student/discipline", label: "Conduct", icon: Shield },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/student/profile", label: "Profile", icon: User },
      { href: "/student/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const parentPortalSections: WorkspaceNavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
      { href: "/parent/messages", label: "Messages", icon: MessageSquare },
      { href: "/parent/notifications", label: "Notifications", icon: Bell },
      { href: "/parent/announcements", label: "Announcements", icon: Megaphone },
      { href: "/parent/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "My children",
    items: [
      { href: "/parent/children", label: "My Children", icon: Users },
      { href: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/parent/results", label: "Results", icon: GraduationCap },
      { href: "/parent/discipline", label: "Conduct", icon: Shield },
      { href: "/parent/reports", label: "Report Cards", icon: FileSpreadsheet },
      { href: "/parent/timetable", label: "Timetable", icon: CalendarClock },
      { href: "/parent/teachers", label: "Teachers", icon: BookOpen },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/parent/fees", label: "School Fees", icon: CreditCard },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/parent/absence", label: "Absence", icon: AlertTriangle },
      { href: "/parent/profile", label: "Profile", icon: User },
      { href: "/parent/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const roleNavSections: Record<WorkspaceRoleKey, WorkspaceNavSection[]> = {
  admin: adminSections,
  principal: principalSections,
  deputy_head: deputyHeadSections,
  bursar: bursarSections,
  guidance_office: guidanceSections,
  academic_admin: academicAdminSections,
  hr_admin: hrAdminSections,
  ict_admin: ictAdminSections,
  discipline_admin: disciplineAdminSections,
  super_admin: [
    {
      label: "Platform",
      items: [{ href: "/app/super-admin", label: "Super Admin", icon: Shield }],
    },
  ],
  teacher: appTeacherSections,
  student: appStudentSections,
  parent: parentPortalSections,
  payments: paymentsSections,
};

export function getRoleNavItems(role: WorkspaceRoleKey): WorkspaceNavItem[] {
  return flattenNavSections(roleNavSections[role] || adminSections);
}

function pickDockItem(items: WorkspaceNavItem[], href: string) {
  return items.find((item) => item.href === href);
}

export function buildRoleMobileDock(role: WorkspaceRoleKey): WorkspaceNavItem[] {
  const items = getRoleNavItems(role);
  const home = items[0];

  switch (role) {
    case "admin":
    case "principal":
      return [
        home,
        pickDockItem(items, "/app/messages"),
        pickDockItem(items, "/app/admin/users"),
        pickDockItem(items, "/app/admin/finance"),
        { href: "/app/profile", label: "Profile", icon: Settings },
      ].filter(Boolean) as WorkspaceNavItem[];
    case "deputy_head":
    case "guidance_office":
    case "discipline_admin":
    case "academic_admin":
    case "hr_admin":
    case "ict_admin":
      return [
        home,
        pickDockItem(items, "/app/messages"),
        pickDockItem(items, "/app/admin/users"),
        items.find((item) => item.href.includes("/admin/")) || items[1],
        { href: "/app/settings", label: "Settings", icon: Settings },
      ].filter(Boolean) as WorkspaceNavItem[];
    case "bursar":
    case "payments":
      return [
        home,
        pickDockItem(items, "/app/messages"),
        pickDockItem(items, "/app/payments/students"),
        pickDockItem(items, "/app/payments/fees"),
        { href: "/app/profile", label: "Profile", icon: Settings },
      ].filter(Boolean) as WorkspaceNavItem[];
    case "teacher":
      return [
        home,
        pickDockItem(items, "/app/messages"),
        pickDockItem(items, "/app/teacher"),
        pickDockItem(items, "/app/announcements"),
        { href: "/app/profile", label: "Profile", icon: Settings },
      ].filter(Boolean) as WorkspaceNavItem[];
    case "student":
      return [
        home,
        pickDockItem(items, "/app/messages"),
        pickDockItem(items, "/app/announcements"),
        { href: "/app/profile", label: "Profile", icon: Users },
        { href: "/app/settings", label: "Settings", icon: Settings },
      ].filter(Boolean) as WorkspaceNavItem[];
    case "parent":
      return [
        home,
        pickDockItem(items, "/parent/messages"),
        pickDockItem(items, "/parent/children"),
        pickDockItem(items, "/parent/attendance"),
        pickDockItem(items, "/parent/fees"),
      ].filter(Boolean) as WorkspaceNavItem[];
    default:
      return items.slice(0, 5);
  }
}

export function buildTeacherPortalDock(): WorkspaceNavItem[] {
  const items = flattenNavSections(teacherPortalSections);
  return [
    pickDockItem(items, "/teacher"),
    pickDockItem(items, "/teacher/inbox"),
    pickDockItem(items, "/teacher/students"),
    pickDockItem(items, "/teacher/teaching"),
    pickDockItem(items, "/teacher/settings"),
  ].filter(Boolean) as WorkspaceNavItem[];
}

export function buildStudentPortalDock(): WorkspaceNavItem[] {
  const items = flattenNavSections(studentPortalSections);
  return [
    pickDockItem(items, "/student"),
    pickDockItem(items, "/student/messages"),
    pickDockItem(items, "/student/assignments"),
    pickDockItem(items, "/student/profile"),
  ].filter(Boolean) as WorkspaceNavItem[];
}

export function buildParentPortalDock(): WorkspaceNavItem[] {
  const items = flattenNavSections(parentPortalSections);
  return [
    pickDockItem(items, "/parent"),
    pickDockItem(items, "/parent/messages"),
    pickDockItem(items, "/parent/children"),
    pickDockItem(items, "/parent/attendance"),
    pickDockItem(items, "/parent/fees"),
  ].filter(Boolean) as WorkspaceNavItem[];
}