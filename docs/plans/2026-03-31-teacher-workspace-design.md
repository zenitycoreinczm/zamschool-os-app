# Teacher Workspace Redesign

**Date:** 2026-03-31

## Goal

Make the teacher account type feel like a coherent, fast, teacher-owned workspace instead of a thin role variant layered on top of generic account pages.

## Scope

This change is teacher-only.

Included:
- teacher navigation and route structure
- teacher dashboard, profile, and settings page design
- new teacher workspace hub pages
- teacher-specific data-loading and performance improvements
- teacher-specific copy and consistency standards

Excluded:
- admin workspace changes
- parent workspace changes
- student workspace changes
- broad application-wide shell redesign outside teacher dependencies that directly affect teacher performance

## Problems Identified

### 1. Teacher profile and settings are not teacher-owned

`/teacher/profile` and `/teacher/settings` currently wrap generic `/app` pages rather than owning a teacher-specific experience. This causes:
- weak role identity
- inconsistent routing behavior
- shallow strings
- poor alignment with teacher-managed versus admin-managed data

### 2. The teacher workspace does redundant client-side loading

The teacher experience currently layers multiple auth and profile fetches across:
- dashboard layout auth wrapper
- role-based shell lookup
- teacher shell lookup
- page-level account profile requests

This produces unnecessary latency, repeated loading states, and route churn.

### 3. The navigation is too flat

The teacher shell currently exposes too many top-level destinations, making the workspace feel fragmented. Pages that should read as related workflow steps instead compete equally in the sidebar.

### 4. Teacher-facing copy is shallow

Common strings are generic and vague, for example labels such as:
- Quick actions
- Settings
- Profile
- School details
- Security note

These do not communicate teacher-specific tasks, state, or next actions clearly enough.

## Approved Direction

Use a tighter teacher workspace with a smaller primary navigation, teacher-owned profile and settings surfaces, and a shared teacher account/workspace state that removes repeated loading.

## Route Design

### Primary teacher routes

- `/teacher`
- `/teacher/teaching`
- `/teacher/inbox`
- `/teacher/profile`
- `/teacher/settings`

### Secondary teacher routes retained

- `/teacher/classes`
- `/teacher/attendance`
- `/teacher/assignments`
- `/teacher/results`
- `/teacher/messages`
- `/teacher/announcements`
- `/teacher/notifications`
- `/teacher/events`

### Routing rules

- The teacher shell owns all navigation inside `/teacher/*`.
- Primary navigation stays stable across the teacher workspace.
- `Teaching` becomes the operational hub for classwork.
- `Inbox` becomes the communication hub for messages, announcements, notifications, and linked events.
- Secondary detail pages remain available and linked from the hub pages.
- Detail pages should include consistent back-links into the tighter workspace.

## Information Architecture

### Dashboard

Purpose:
- start-of-day teacher overview

Content:
- today’s lessons
- pending rollcall
- assignment grading backlog
- unread communication
- upcoming school events

Primary actions:
- open rollcall
- review assignments
- publish results
- open inbox

### Teaching Hub

Purpose:
- central operational page for lesson and assessment work

Sections:
- classes today
- attendance activity
- assignments needing action
- results awaiting review or publishing

Behavior:
- each section provides a concise summary
- each section links to a deeper detail page

### Inbox Hub

Purpose:
- central communication page for teacher-facing updates

Sections:
- unread messages
- school announcements
- notifications requiring attention
- upcoming or recently posted events

Behavior:
- unread and urgent items appear first
- copy reflects school operations rather than generic inbox language

### Profile

Purpose:
- teacher-owned identity page with clear boundaries between editable and admin-managed information

Sections:
- personal details the teacher can edit
- school identity and employment details
- teaching assignment summary
- admin-managed access guidance

Teacher assignment summary includes:
- assigned classes
- assigned subjects
- supervised classes
- department
- employee number
- hire date

### Settings

Purpose:
- teacher-owned account and workspace controls

Sections:
- password and security state
- session controls
- notification behavior
- teacher workspace preferences

Rules:
- if a preference is not wired to behavior, it should be removed or implemented
- wording must explain teacher impact, not generic app settings

## Data-Loading Design

### Shared teacher workspace state

When a user enters the teacher route group, the app should load and share:
- teacher identity
- teacher assignment summary
- supervised classes
- unread message count
- unread notification count
- lightweight workspace stats such as pending rollcall and today lessons

### Page-specific loading

Heavier page data should remain local to its page:
- rollcall rosters
- attendance history tables
- assignments and submissions
- results tables
- message threads
- event lists

### Performance goals

- remove duplicate account/profile fetches across teacher pages
- reduce repeated role/session lookups between wrappers and shell components
- avoid remount churn when navigating between teacher pages
- replace multiple full-page spinners with a single teacher workspace boot state plus local section loading

## Teacher Copy Standards

### General rules

- prefer operational language over generic dashboard terms
- make state visible in headings, helper text, and empty states
- describe what the teacher can do next
- distinguish clearly between teacher-editable and admin-managed information

### Preferred examples

Use:
- Pending rollcall for 2 lessons
- 3 assignment submissions need grading
- No supervised classes assigned yet
- Your department and teaching assignment are managed by school administration

Avoid:
- Quick actions
- Details
- Info
- Overview
- Security note

## Error and Loading Standards

- one teacher workspace loading state when booting the route group
- page-level skeletons or section loaders for heavier content
- error messages must identify the failing area, such as profile, inbox, rollcall, or results
- secondary pages should always provide a clear path back to `Dashboard`, `Teaching`, or `Inbox`

## Testing Direction

Add regression coverage for:
- tighter teacher navigation
- new teacher hub pages
- teacher profile and settings no longer proxying generic `/app` pages
- shared teacher workspace state reducing repeated account-profile fetching
- stronger teacher-specific copy on key pages

## Expected Outcome

After this redesign, the teacher account type should:
- load faster
- feel like a single bounded workspace
- present clearer teaching and communication workflows
- expose profile and settings pages that match teacher responsibilities
- avoid shallow, generic strings across the main experience
