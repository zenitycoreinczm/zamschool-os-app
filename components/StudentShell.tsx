"use client";

import Image from "next/image";
import Link from "next/link";
import { ProfileAvatarImage } from "@/components/ProfileAvatarImage";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Megaphone,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";

import { WorkspaceInboxCenter } from "@/components/inbox/WorkspaceInboxCenter";
import { supabase } from "@/lib/supabase";
import { performWorkspaceSignOut } from "@/lib/workspace-sign-out";
import { WorkspaceNavMenu } from "@/components/workspace/WorkspaceNavMenu";
import { WorkspaceGlobalSearch } from "@/components/workspace/WorkspaceGlobalSearch";
import { navItemsToWorkspacePages } from "@/lib/workspace-search";
import {
  buildStudentPortalDock,
  flattenNavSections,
  studentPortalSections,
} from "@/lib/workspace-nav";
import { WorkspaceLoader } from "@/components/workspace/WorkspaceLoader";
import { ws } from "@/lib/workspace-design";
import { cn } from "@/lib/utils";

const studentNavItems = flattenNavSections(studentPortalSections);
const studentDock = buildStudentPortalDock();

export default function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [schoolName, setSchoolName] = useState("Your School");
  const [yearTerm, setYearTerm] = useState("Academic Context");
  const [displayName, setDisplayName] = useState("Student");
  const [classLabel, setClassLabel] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const bootstrapped = useRef(false);
  const workspacePageItems = useMemo(() => navItemsToWorkspacePages(studentNavItems), []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const loadProfile = async () => {
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data.session?.user;
      const token = sessionResult.data.session?.access_token;
      if (!user || !token) {
        router.replace("/login?redirectTo=/student");
        return;
      }

      // Single consolidated fetch: workspace context + unread + role shell (includes class info)
      const shellRes = await fetch("/api/account/shell", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!shellRes.ok) {
        router.replace("/login?redirectTo=/student");
        return;
      }

      const shellBody = await shellRes.json();
      const data = shellBody?.data;
      if (!data) {
        router.replace("/login?redirectTo=/student");
        return;
      }

      const role = String(data.role || "").toLowerCase();
      if (role !== "student") {
        router.replace("/login?error=student_access_required");
        return;
      }

      if (!data.emailConfirmed) {
        router.replace("/verify-email");
        return;
      }

      setAvatarUrl(data.avatarUrl || null);
      setDisplayName(data.displayName || "Student");
      if (data.schoolName) setSchoolName(data.schoolName);
      if (data.yearTerm) setYearTerm(data.yearTerm);
      if (data.unread) {
        setUnreadMessages(Number(data.unread.messages || 0));
        setUnreadNotifications(Number(data.unread.notifications || 0));
      }
      const shell = data.shell as Record<string, unknown> | undefined;
      if (shell?.className) setClassLabel(shell.className as string);

      setReady(true);
    };

    void loadProfile();
  }, [router]);

  const activeSet = useMemo(() => {
    const set = new Set<string>([pathname]);
    if (pathname.startsWith("/student/assignments")) set.add("/student/assignments");
    return set;
  }, [pathname]);

  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await performWorkspaceSignOut(supabase);
  };

  if (signingOut) {
    return <WorkspaceLoader label="Signing out…" className="fixed inset-0 z-[200]" />;
  }

  if (!ready) {
    return <WorkspaceLoader label="Preparing student portal" />;
  }

  return (
    <div className={cn("flex h-screen overflow-hidden", ws.canvas)}>
      {open && (
        <button
          className={cn("fixed inset-0 z-30 lg:hidden", ws.overlay)}
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-workspace-border bg-workspace-sidebar transition-transform duration-[var(--duration-workspace-normal)] lg:relative",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-5">
            <Link href="/student" className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white shadow-sm">
                <Image
                  src="/icon.png"
                  alt="ZamSchool OS"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <div>
                <p className="font-semibold leading-tight text-slate-900">ZamSchool OS</p>
                <p className="text-xs leading-tight text-slate-500">Student Portal</p>
              </div>
            </Link>
            <button className="p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {classLabel ? (
            <div className="border-b border-slate-200/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Class
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{classLabel}</p>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <WorkspaceNavMenu
              sections={studentPortalSections}
              activePaths={activeSet}
              onNavigate={() => setOpen(false)}
              accent="teal"
            />
          </div>

          <div className="border-t border-slate-200/80 p-3">
            <button
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-white hover:text-red-600"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="zamschool-workspace-shell__main flex min-w-0 flex-1 flex-col">
        <header className={cn(ws.header, "flex items-center justify-between gap-4 border-b border-workspace-border/60 px-4 py-3.5 md:px-6")}>
          <div className="flex min-w-0 items-center gap-3">
            <button className="-ml-2 p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate font-semibold text-slate-900">{schoolName}</p>
              <p className="truncate text-xs text-slate-500">{yearTerm}</p>
            </div>
          </div>

          <WorkspaceGlobalSearch
            pageItems={workspacePageItems}
            placeholder="Search assignments, pages, announcements…"
            className="hidden min-w-0 flex-1 sm:block sm:max-w-[360px]"
          />

          <div className="flex items-center gap-3">
            <WorkspaceInboxCenter
              messagesHref="/student/messages"
              notificationsHref="/student/notifications"
              initialUnread={{
                messages: unreadMessages,
                notifications: unreadNotifications,
              }}
            />
            <div className="hidden items-center gap-3 pl-2 sm:flex">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-[11px] text-slate-400">Student</p>
              </div>
              <Link
                href="/student/profile"
                className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-teal-200 bg-teal-600 text-sm font-semibold text-white shadow-sm"
              >
                {avatarUrl ? (
                  <ProfileAvatarImage
                    src={avatarUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    fallback={displayName.slice(0, 1).toUpperCase()}
                  />
                ) : (
                  displayName.slice(0, 1).toUpperCase()
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className={cn(ws.mainScroll, "flex-1")}>
          <div className="relative z-0 zamschool-workspace-main-inner animate-enter-up space-y-5 pb-24 lg:pb-6">{children}</div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
          <div className="grid grid-cols-4 gap-1">
            {studentDock.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center justify-center rounded-lg py-2 ${
                    active ? "bg-teal-50 text-teal-700" : "text-slate-500"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  <span className="mt-1 text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}