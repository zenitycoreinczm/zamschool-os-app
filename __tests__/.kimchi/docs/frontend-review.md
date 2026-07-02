# Frontend Review: UI/UX Conflicts, Bad Code, Duplicates & Errors

## Summary

The ZamSchool OS frontend has a solid design-token system (`globals.css` + `lib/workspace-design.ts`) and a well-structured role-based shell architecture. However, there are significant issues across four categories: **massive shell duplication**, **inconsistent styling systems** (two competing design languages), **type errors** (13 broken API route calls), and **hardcoded mock data** shipped in production components.

---

## 1. UI/UX Conflicts

### 1.1 Two competing design systems
The codebase has **two parallel styling languages** that conflict visually:

| Pattern | Design System A (legacy) | Design System B (workspace) |
|---|---|---|
| Border radius | `rounded-xl`, `rounded-2xl`, `rounded-md` | `rounded-workspace-xl`, `rounded-workspace-lg` |
| Shadows | `shadow-sm`, `shadow-xl` | `shadow-workspace-sm`, `shadow-workspace-md` |
| Colors | `bg-lamaSky`, `text-lamaPurple`, `bg-sky-50` | `bg-brand`, `bg-workspace-sidebar`, `text-workspace-muted` |
| Headers | `text-[2rem] font-bold` (h1 inside cards) | `text-lg font-semibold` |

**Examples of conflict:**
- `AttendanceChart.tsx:78` — uses `rounded-workspace-xl` + `shadow-sm` + `border-slate-100` (mixed)
- `FinanceChart.tsx:62` — uses `rounded-xl` + no workspace classes (legacy only)
- `Performance.tsx:55` — uses `rounded-md` + `h-80` (legacy only)
- `CountChart.tsx:78` — uses `rounded-workspace-xl` + `shadow-sm` + `border-slate-100` (mixed)
- `Announcements.tsx:80` — uses `rounded-workspace-xl` + `shadow-sm` + `border-slate-100` (mixed)
- `BulkImport.tsx` — entirely legacy: `rounded-2xl`, `bg-lamaSky`, `shadow-lg`
- `Pagination.tsx:30` — uses `bg-lamaSky` (legacy color token)
- `Navbar.tsx` — entirely legacy: `rounded-xl`, `ring-gray-300`, `bg-lamaSky`
- `EventCalendar.tsx:87` — uses `text-[2rem] font-bold` for card heading
- `SectionPlaceholder.tsx:43` — uses `rounded-xl bg-sky-500` (raw Tailwind, no design token)
- `MfaSetup.tsx` — uses `rounded-2xl`, `bg-sky-500`, `hover:bg-sky-400` (raw Tailwind)

**Impact:** Cards on the same dashboard page look visually inconsistent — different radius, shadow depth, and border colors.

### 1.2 Inconsistent heading hierarchy
Multiple components use `<h1>` inside cards, which is semantically incorrect (there should be one `<h1>` per page):
- `AttendanceChart.tsx:79` — `<h1 className="text-[2rem] font-bold">Attendance</h1>`
- `CountChart.tsx:79` — `<h1 className="text-[2rem] font-bold">Students</h1>`
- `Announcements.tsx:88` — `<h1 className="text-[2rem] font-bold">Announcements</h1>`
- `EventCalendar.tsx:74` — `<h1 className="text-[2rem] font-bold">Events</h1>`
- `FinanceChart.tsx:64` — `<h1 className="text-lg font-semibold">Payments</h1>` (different size!)
- `Performance.tsx:57` — `<h1 className="text-xl font-semibold">Performance</h1>` (different size!)
- `CountChart.tsx:100` — `<h1>` used for stat numbers inside cards
- `UserCard.tsx:82` — `<p>` with `text-[2rem]` (not a heading at all)

**Impact:** Inconsistent card title sizes across the dashboard, and multiple `<h1>` elements hurt accessibility/SEO.

### 1.3 Avatar styling inconsistency
Each shell handles avatars differently:
- **AdminShell** — `border-slate-200 bg-slate-100 text-slate-900` (neutral, ring on hover)
- **TeacherShell** — `border-slate-200 bg-slate-100 text-slate-900` (same as admin)
- **StudentShell** — `border-teal-200 bg-teal-600 text-white` (filled teal)
- **ParentShell** — `border-teal-200 bg-teal-600 text-white` (filled teal, same as student)
- **PaymentsShell** — `border-green-200 bg-green-500 text-white` (filled green)
- **Navbar** — `border-2 border-slate-100` with fallback `bg-lamaSky` (legacy)

**Impact:** No consistent avatar treatment — student and parent are identical, admin/teacher differ from payments.

### 1.4 Fallback initials inconsistency
- **AdminShell** — uses `getDisplayInitials()` helper with full name parsing
- **StudentShell** — uses `displayName.slice(0, 1).toUpperCase()` (first char only)
- **ParentShell** — uses `displayName.slice(0, 1).toUpperCase()` (first char only)
- **TeacherShell** — uses `displayName.slice(0, 1).toUpperCase()` (first char only)
- **PaymentsShell** — uses `displayName.slice(0, 1).toUpperCase()` (first char only)

**Impact:** Admin users see proper initials like "JD"; everyone else sees just "J".

### 1.5 `Performance.tsx` — hardcoded mock data in production
```tsx
const data = [
  { name: "Group A", value: 92, fill: "#C3EBFA" },
  { name: "Group B", value: 8, fill: "#FAE27C" },
];
// ...
<h1 className="text-3xl font-bold">9.2</h1>
<p className="text-xs text-gray-300">of 10 max LTS</p>
```
This is entirely fake data with placeholder labels ("Group A", "Group B") shipped as a real component.

### 1.6 `BigCalendar.tsx` — hardcoded mock schedule
```tsx
const calendarEvents = [
  { title: "Math", start: new Date(2025, 1, 12, 8, 0), ... },
  { title: "English", start: new Date(2025, 1, 12, 9, 0), ... },
  // ... 6 hardcoded events for Feb 12, 2025
];
```
This is entirely static mock data. It also uses `moment` (deprecated) while the rest of the app uses `date-fns`.

---

## 2. Bad Code Patterns

### 2.1 `AttendanceChart.tsx` — raw `fetch` without CSRF or error normalization
```tsx
const response = await fetch("/api/admin/attendance/summary?range=week", {
  cache: "no-store",
});
```
Uses raw `fetch` instead of the `adminApiJson` helper that handles CSRF tokens, offline support, and error normalization. Other components (`FinanceChart`, `EventCalendar`, `CountChart`, `UserCard`, `Announcements`) correctly use `adminApiJson` or `fetchAnnouncementsList`.

### 2.2 `EventCalendar.tsx:41` — `any` type for API response
```tsx
const body = await adminApiJson<{ data?: any[] }>("/api/admin/events?upcomingOnly=true");
```
Uses `any[]` instead of a typed response. Same pattern in `FinanceChart.tsx:38` and `AttendanceChart.tsx:37`.

### 2.3 `EventCalendar.tsx:87` — broken Tailwind class (syntax error)
```tsx
className="... [&_.react-calendar__tile--active]:text-slate-900]"
```
There's a stray `]` at the end of the class string. This is a malformed arbitrary variant selector that Tailwind cannot parse.

### 2.4 `EventCalendar.tsx:98` — inconsistent border styling
```tsx
className="rounded-2xl border-2 border-slate-100 bg-white px-5 py-5 odd:border-t-[#bde9fb] even:border-t-[#c9c4ff] shadow-sm"
```
Uses raw hex colors (`#bde9fb`, `#c9c4ff`) instead of design tokens. These same hex values appear in `CountChart.tsx` and `AttendanceChart.tsx` — they're the `lamaSky`/`lamaPurple` colors but hardcoded.

### 2.5 `Navbar.tsx` — completely orphaned component
The `Navbar` component:
- Uses its own `useEffect` + `fetchProfileByIdentity` + `supabase.auth.getUser()` — bypassing `WorkspaceContextProvider`
- Uses raw `supabase` client instead of the workspace context pattern
- Has a CSS-only hover dropdown (`group-hover:visible`) with no keyboard accessibility
- Dynamically imports `performWorkspaceSignOut` (unnecessary — all shells import it statically)
- Has a notification badge that's always red (hardcoded, not data-driven)

This component appears to be an old navbar that was replaced by the shell header pattern but never removed.

### 2.6 `Table.tsx` — no key on rendered rows
```tsx
<tbody>{data.map((item) => renderRow(item))}</tbody>
```
The `Table` component delegates row rendering to the caller but doesn't enforce keys. If the caller doesn't add keys, React will warn. The component also doesn't support sorting, selection, or loading states.

### 2.7 `TableSearch.tsx` — uncontrolled input with `value` prop
```tsx
<input type="text" value={value} onChange={(e) => onChange?.(e.target.value)} ... />
```
This passes `value` as a prop but `onChange` is optional (`onChange?`). If the parent doesn't pass `onChange`, the input becomes read-only with no warning. The component also uses `ring-gray-300` instead of workspace tokens.

### 2.8 `Pagination.tsx` — uses `bg-lamaSky` and `rounded-md`
Mixes legacy `lamaSky` color with non-workspace `rounded-md`. Also has no keyboard navigation or page-size selector. The `Prev`/`Next` labels are not localized.

### 2.9 `CountChart.tsx` — gender inference logic in the UI
```tsx
const inferredBoys = totals.boys + Math.ceil(totals.unspecified / 2);
const inferredGirls = totals.girls + Math.floor(totals.unspecified / 2);
```
This business logic (splitting "unspecified" gender 50/50) belongs in the API or a data layer, not in a chart component. It also means the chart shows estimated data without labeling it as such.

### 2.10 `Announcements.tsx` — hardcoded color cycling
```tsx
className={`rounded-2xl p-4 border transition-all hover:shadow-md ${
  index === 0 ? "bg-[#eef8ff] border-[#d9eefc]"
  : index === 1 ? "bg-[#f4f1ff] border-[#e1dbff]"
  : "bg-[#fff8e8] border-[#f6e7b8]"
}`}
```
Three hardcoded color schemes based on index. If there are more than 3 announcements, they cycle incorrectly (all use the third color). Uses raw hex values instead of design tokens.

### 2.11 `AssignmentSubmissionDialog.tsx` — no focus trap
The dialog has `role="dialog"` and `aria-modal="true"` but implements no focus trap — Tab can escape to the background. Compare with `DetailPanel.tsx` which has a proper focus trap implementation.

---

## 3. Duplicated Code

### 3.1 Shell duplication (CRITICAL — ~400 lines duplicated across 4 files)
`AdminShell.tsx`, `StudentShell.tsx`, `TeacherShell.tsx`, `ParentShell.tsx`, and `PaymentsShell.tsx` share nearly identical:
- Skip-to-content link markup (5 copies)
- Sidebar overlay button (5 copies)
- Sidebar header with logo + close button (5 copies)
- Sign out button (5 copies)
- Header layout with school name + year term (5 copies)
- WorkspaceGlobalSearch integration (5 copies)
- WorkspaceInboxCenter integration (5 copies)
- Avatar + display name section (5 copies)
- Signing out loader state (5 copies)
- Mobile dock integration (5 copies)

The `AdminShell` and `PaymentsShell` use the `zamschool-workspace-shell` CSS grid class, while `StudentShell`, `TeacherShell`, and `ParentShell` use `flex h-screen overflow-hidden`. This means the shells have **two different layout strategies** for the same purpose.

### 3.2 Context provider pattern duplication
`WorkspaceContextProvider`, `TeacherWorkspaceProvider`, and `DashboardSummaryProvider` all implement the same cached-context pattern:
- `readCached*()` → initial state
- `useEffect` → load if no initial
- `load(force)` callback
- `refresh()` wrapper
- `useRef` to track current data

This should be a generic `createCachedContext()` hook/factory.

### 3.3 Data-loading effect pattern duplicated ~8 times
The `let cancelled = false; const load = async () => { ... }; void load(); return () => { cancelled = true; }` pattern appears in:
- `AttendanceChart.tsx`
- `FinanceChart.tsx`
- `EventCalendar.tsx`
- `CountChart.tsx`
- `UserCard.tsx`
- `Announcements.tsx`
- `PaymentsShell.tsx`
- `StudentShell.tsx`

This should be a `useAsyncEffect` or `useAsyncData` hook.

### 3.4 `BigCalendar.tsx` vs `EventCalendar.tsx` — two calendar components
- `BigCalendar` uses `react-big-calendar` + `moment` (hardcoded mock events)
- `EventCalendar` uses `react-calendar` + real API data

Two different calendar libraries for the same purpose. `BigCalendar` is dead/mock code.

---

## 4. Type Errors (13 errors)

Running `tsc --noEmit` produces **13 type errors**, all in API route files:

### 4.1 Missing `schoolId` parameter (12 errors)
All of these routes call a rate-limiting function with a `preset` but are missing the required `schoolId` parameter:

| File | Line | Preset |
|---|---|---|
| `app/api/account/shell/route.ts` | 66 | `workspaceContext` |
| `app/api/parent/children/route.ts` | 25 | `heavyRead` |
| `app/api/student/assignments/route.ts` | 21 | `heavyRead` |
| `app/api/student/attendance/route.ts` | 30 | `heavyRead` |
| `app/api/student/dashboard/route.ts` | 33 | `heavyRead` |
| `app/api/teacher/attendance/route.ts` | 207 | `teacherAttendanceWrite` |
| `app/api/teacher/bootstrap/route.ts` | 95 | `teacherBootstrap` |
| `app/api/teacher/classes/route.ts` | 33 | `teacherClasses` |
| `app/api/teacher/dashboard/route.ts` | 33 | `teacherDashboard` |
| `app/api/teacher/messages/route.ts` | 38 | `messagesRead` |
| `app/api/teacher/messages/route.ts` | 78 | `messagesWrite` |
| `app/api/teacher/results-completeness/route.ts` | 26 | `teacherResultsCompleteness` |
| `app/api/upload/validate/route.ts` | 33 | `uploadValidate` |

The function signature requires `{ scope, schoolId, req, userId?, preset }` but all callsites pass `{ scope, req, userId, preset }` — missing `schoolId`.

### 4.2 Null assignability error (1 error)
`app/api/admin/notifications/route.ts:132` — `Type 'string | null' is not assignable to type 'string'`. A nullable value is being assigned to a non-nullable string field.

---

## Priority Summary

| Priority | Issue | Files affected |
|---|---|---|
| 🔴 P0 | 13 TypeScript errors (broken rate-limit calls) | 13 API routes |
| 🔴 P0 | `EventCalendar.tsx` broken Tailwind class (stray `]`) | 1 |
| 🟠 P1 | Shell duplication (~400 lines copy-pasted) | 5 shell files |
| 🟠 P1 | Two competing design systems (legacy vs workspace) | ~15 components |
| 🟠 P1 | `BigCalendar.tsx` / `Performance.tsx` — mock data in production | 2 |
| 🟡 P2 | `Navbar.tsx` — orphaned component, bypasses context | 1 |
| 🟡 P2 | Context provider pattern duplication | 3 providers |
| 🟡 P2 | Data-loading effect pattern duplicated | ~8 components |
| 🟡 P2 | `<h1>` misuse inside cards | ~7 components |
| 🟡 P2 | Avatar styling + fallback initials inconsistency | 6 components |
| 🟢 P3 | Raw hex colors instead of design tokens | ~5 components |
| 🟢 P3 | `TableSearch.tsx` optional onChange makes input silently read-only | 1 |
| 🟢 P3 | `CountChart.tsx` gender inference in UI layer | 1 |
| 🟢 P3 | `AssignmentSubmissionDialog` missing focus trap | 1 |
