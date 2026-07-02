# ZamSchool OS - Code Optimization & Anti-Pattern Remediation Plan

**Generated:** 2026-06-30  
**Status:** Draft for Review  
**Priority:** High - Production Readiness

---

## Executive Summary

Comprehensive audit identified **3 critical areas** requiring optimization:

1. **Type Safety Issues**: 668 `any` usages undermining TypeScript's guarantees
2. **Database Performance**: 4 critical N+1 query patterns, 17 over-fetching instances
3. **React Performance**: 3 components with excessive state (11-52 useState calls)

**Estimated Impact**: 10-30x faster database operations, 200+ lines of duplicate code removed, type coverage from ~60% to ~85%.

---

## 🔴 Critical Issues (Fix Immediately)

### 1. N+1 Query Problems in Teacher Sync

**Location**: `app/api/admin/users/route.ts`

**Current (Bad)**:
```typescript
// Lines 1089-1094: Individual INSERT in loop
for (const subjectId of input.subjectIds) {
  await supabaseAdmin
    .from("teacher_subject_specializations")
    .insert({ 
      school_id, 
      teacher_profile_id, 
      subject_id: subjectId 
    });
}
```

**Optimized**:
```typescript
// Batch insert - single query
const records = input.subjectIds.map(subjectId => ({
  school_id: input.schoolId,
  teacher_profile_id: input.teacherProfileId,
  subject_id: subjectId,
}));

await supabaseAdmin
  .from("teacher_subject_specializations")
  .insert(records);
```

**Impact**: 10 specializations = 11 queries → 2 queries (5.5x faster)

**Action Items**:
- [ ] Fix `syncSpecializations` (line 1089)
- [ ] Fix `syncTeachingAssignments` (line 1116)
- [ ] Fix `syncSupervisedClasses` (line 1142)
- [ ] Add integration test for batch operations
- [ ] Monitor query performance with `EXPLAIN ANALYZE`

---

### 2. God Component - admin/users/page.tsx

**Location**: `app/app/admin/users/page.tsx` (3,645 lines)

**Issues**:
- 52 useState calls in single component
- No code splitting for detail dashboard
- Severe prop drilling
- Handles 6 different concerns in one component

**Refactoring Plan**:

```
app/app/admin/users/
├── page.tsx (orchestrator, ~200 lines)
├── components/
│   ├── UsersListView.tsx (list/table/tabs)
│   ├── UserFormModal.tsx (create/edit)
│   ├── TeacherAssignmentManager.tsx
│   ├── ParentLinkManager.tsx
│   └── UserDetailPanel.tsx (already exists)
└── hooks/
    ├── useUsersData.ts (data fetching)
    ├── useUserForm.ts (form state)
    └── useTeacherAssignments.ts
```

**Action Items**:
- [ ] Extract `useUsersData` custom hook
- [ ] Extract `UserFormModal` component
- [ ] Extract `TeacherAssignmentManager` component
- [ ] Extract `ParentLinkManager` component
- [ ] Add React.memo to extracted components
- [ ] Test performance with React DevTools Profiler

---

### 3. Missing Type Definitions

**Impact**: 668 `any` usages, no compile-time safety

**Root Cause**: Missing domain types for database entities

**Solution**: Create `lib/types/domain.ts`

```typescript
// lib/types/domain.ts
export interface Profile {
  id: string;
  school_id: string;
  role: KnownRole;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string | null;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  grade_level?: number | null;
  capacity?: number | null;
  supervisor_id?: string | null;
}

export interface Assignment {
  id: string;
  school_id: string;
  title: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  due_date: string;
  total_marks: number;
  description?: string | null;
}

export interface Teacher {
  id: string;
  profile_id: string;
  employee_id?: string | null;
  hire_date?: string | null;
  department?: string | null;
  specialization?: string | null;
}

export interface Student {
  id: string;
  profile_id: string;
  admission_number: string;
  class_id?: string | null;
  parent_id?: string | null;
  enrollment_date?: string | null;
}

export interface Payment {
  id: string;
  school_id: string;
  student_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  paid_date?: string | null;
  created_by: string;
  created_at: string;
}
```

**Action Items**:
- [ ] Create `lib/types/domain.ts` with all entities
- [ ] Create `lib/types/api.ts` for API responses
- [ ] Replace all `any[]` with typed arrays
- [ ] Fix `adminApiJson<T = any>` to `adminApiJson<T>`
- [ ] Update all component state: `useState<any[]>([])` → `useState<Subject[]>([])`

---

## 🟠 High Priority (Week 1-2)

### 4. Standardize Error Handling

**Current (37 instances)**:
```typescript
catch (err: any) {
  toast.error(err?.message || "Failed");
}
```

**Solution**: Create `lib/errors.ts`

```typescript
// lib/errors.ts
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

export function isSupabaseError(error: unknown): error is { 
  code: string; 
  message: string;
  details?: string;
  hint?: string;
} {
  return typeof error === 'object' 
    && error !== null 
    && 'code' in error 
    && 'message' in error;
}

export class TenantError extends Error {
  constructor(message: string, public readonly schoolId?: string) {
    super(message);
    this.name = 'TenantError';
  }
}
```

**Usage**:
```typescript
catch (err) {
  const message = getErrorMessage(err);
  toast.error(message);
  
  if (isSupabaseError(err)) {
    console.error('[Supabase Error]', err.code, err.details);
  }
}
```

**Action Items**:
- [ ] Create `lib/errors.ts` with error utilities
- [ ] Replace all `catch (err: any)` (37 instances)
- [ ] Add error tracking integration points
- [ ] Update error handling documentation

---

### 5. Remove SELECT * (17 instances)

**Current**:
```typescript
const { data } = await supabaseAdmin
  .from("classes")
  .select("*")
  .eq("school_id", schoolId);
```

**Optimized**:
```typescript
const { data } = await supabaseAdmin
  .from("classes")
  .select("id, name, grade_level, capacity, supervisor_id")
  .eq("school_id", schoolId);
```

**Files to Fix**:
- `app/api/admin/grades/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/finance/route.ts`
- `app/api/admin/payments/fees/route.ts`
- `app/api/teacher/bootstrap/route.ts`

**Action Items**:
- [ ] Audit all `select("*")` calls
- [ ] Replace with explicit column lists
- [ ] Add ESLint rule to prevent `select("*")`
- [ ] Document required columns for each entity

---

### 6. Fix AdminShell Performance

**Location**: `components/AdminShell.tsx`

**Issues**:
- Missing `useCallback` for logout function
- `buildWorkspacePageItems` recreated on every render
- Multiple inline object creations

**Optimizations**:

```typescript
// Before
const logout = async () => {
  if (signingOut) return;
  setSigningOut(true);
  await performWorkspaceSignOut(supabase);
};

// After
const logout = useCallback(async () => {
  if (signingOut) return;
  setSigningOut(true);
  await performWorkspaceSignOut(supabase);
}, [signingOut, supabase]);

// Before
const unreadSummary = polledUnread ?? workspaceUnread;

// After
const unreadSummary = useMemo(
  () => polledUnread ?? workspaceUnread,
  [polledUnread, workspaceUnread]
);

// Extract unread counts for shallow comparison
const workspacePageItems = useMemo(
  () => buildWorkspacePageItems(navItems, unreadSummary),
  [navItems, unreadSummary.messages, unreadSummary.notifications]
);
```

**Action Items**:
- [ ] Add `useCallback` for all event handlers
- [ ] Optimize `unreadSummary` with `useMemo`
- [ ] Extract sidebar to separate component file
- [ ] Add React.memo where appropriate
- [ ] Profile with React DevTools before/after

---

## 🟡 Medium Priority (Week 3-4)

### 7. Extract Duplicate Teacher Lookup Logic

**Duplicate Code**: `fetchTeacherAssignmentReferences` function appears in 4 files (~280 lines total)

**Files**:
- `app/api/admin/assignments/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/teacher/bootstrap/route.ts`
- `lib/teacher-account-detail-builder.ts`

**Solution**: Create `lib/teacher-references.ts`

```typescript
// lib/teacher-references.ts
export async function fetchTeacherReferences(
  schoolId: string,
  teacherIds: string[]
): Promise<TeacherReference[]> {
  // Consolidated logic
  const [teacherRows, profileRows] = await Promise.all([
    supabaseAdmin
      .from("teachers")
      .select("id, profile_id, employee_id, department")
      .eq("school_id", schoolId)
      .in("id", teacherIds),
    
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("school_id", schoolId)
      .in("id", teacherIds)
  ]);
  
  return buildTeacherReferenceMap(teacherRows, profileRows);
}
```

**Action Items**:
- [ ] Create `lib/teacher-references.ts`
- [ ] Replace 4 duplicate implementations
- [ ] Add comprehensive tests
- [ ] Document expected return format

---

### 8. Fix Timetable Page

**Location**: `app/app/admin/timetable/page.tsx`

**Issues**:
- Missing cleanup in useEffect
- Expensive calculations on every render
- 14 useState calls

**Fixes**:

```typescript
// Before: No cleanup
useEffect(() => {
  const init = async () => {
    setLoading(true);
    try {
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message);
    }
  };
  void init();
}, []);

// After: Proper cleanup
useEffect(() => {
  let cancelled = false;
  
  const init = async () => {
    setLoading(true);
    try {
      await fetchAll();
    } catch (err) {
      if (!cancelled) {
        toast.error(getErrorMessage(err));
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  
  void init();
  
  return () => {
    cancelled = true;
  };
}, [fetchAll]);

// Extract to custom hook
const { lessons, loading, createLesson, updateLesson } = useTimetableData(schoolId);
```

**Action Items**:
- [ ] Add cleanup to all useEffect hooks
- [ ] Create `useTimetableData` custom hook
- [ ] Wrap board calculation in React.memo component
- [ ] Add useCallback for all async functions

---

### 9. Add Database Indexes

**Missing Composite Indexes**:

```sql
-- High-traffic queries
CREATE INDEX idx_profiles_school_role 
  ON profiles(school_id, role) 
  WHERE is_active = true;

CREATE INDEX idx_assignments_school_class 
  ON assignments(school_id, class_id, due_date);

CREATE INDEX idx_lessons_school_class_day 
  ON lessons(school_id, class_id, day_of_week);

CREATE INDEX idx_attendance_school_date 
  ON attendance(school_id, attendance_date DESC);

CREATE INDEX idx_payments_school_status 
  ON payments(school_id, status, due_date);

CREATE INDEX idx_messages_recipient_read 
  ON messages(school_id, recipient_id, is_read, created_at DESC);
```

**Action Items**:
- [ ] Run `EXPLAIN ANALYZE` on slow queries
- [ ] Create migration with indexes
- [ ] Monitor query performance before/after
- [ ] Add index maintenance to operations docs

---

## 🟢 Low Priority (Week 5+)

### 10. Enable Stricter TypeScript Flags

**Update `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Action Items**:
- [ ] Enable `noUncheckedIndexedAccess`
- [ ] Fix new type errors (estimated 50-100)
- [ ] Enable remaining strict flags incrementally

---

### 11. Add ESLint Rules

**Update `eslint.config.mjs`**:

```javascript
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      'react-hooks/exhaustive-deps': 'error',
      'react/no-array-index-key': 'warn',
    }
  }
];
```

**Action Items**:
- [ ] Add TypeScript-specific rules
- [ ] Add React hooks rules
- [ ] Fix existing violations
- [ ] Add pre-commit hook

---

### 12. Add Performance Monitoring

**Create `lib/performance.ts`**:

```typescript
export function measureQuery<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (duration > 1000) {
      console.warn(`[Slow Query] ${name} took ${duration.toFixed(2)}ms`);
    }
  });
}

export function trackComponentRender(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Render] ${componentName}`);
  }
}
```

**Usage**:
```typescript
const data = await measureQuery('fetchClasses', () =>
  supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
);
```

**Action Items**:
- [ ] Create performance utilities
- [ ] Add to critical query paths
- [ ] Set up monitoring dashboard
- [ ] Define SLOs for key operations

---

## 📋 Implementation Roadmap

### Week 1: Critical Fixes
- [ ] Fix N+1 queries (teacher sync functions)
- [ ] Create `lib/types/domain.ts`
- [ ] Create `lib/errors.ts`
- [ ] Fix `adminApiJson` type parameter
- **Success Metric**: Database ops 10x faster, type coverage +10%

### Week 2: High Priority
- [ ] Replace all `select("*")` 
- [ ] Fix error handling (37 instances)
- [ ] Optimize AdminShell performance
- [ ] Start refactoring admin/users page
- **Success Metric**: API response sizes -30%, shell re-renders -50%

### Week 3: Component Refactoring
- [ ] Complete admin/users page refactoring
- [ ] Fix timetable page useEffect cleanup
- [ ] Extract duplicate teacher lookup logic
- **Success Metric**: -200 lines duplicate code, 52 useState → 12

### Week 4: Type Safety Push
- [ ] Type all API responses
- [ ] Replace `any[]` state (58 instances)
- [ ] Type all map/filter callbacks (296 instances)
- **Success Metric**: Type coverage 70% → 85%

### Week 5: Database & Tooling
- [ ] Add database indexes
- [ ] Enable strict TypeScript flags
- [ ] Add ESLint rules
- [ ] Add performance monitoring
- **Success Metric**: Query performance +2x, CI enforces type safety

---

## 🎯 Success Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Type Coverage | ~60% | 85% | Better compile-time safety |
| `any` Usages | 668 | <100 | Type-safe codebase |
| N+1 Queries | 4 critical | 0 | 10-30x faster operations |
| SELECT * Calls | 17 | 0 | -30% API payload sizes |
| Duplicate Code | 280 lines | 0 | Easier maintenance |
| useState per Component | 52 max | <10 max | Better component design |
| Missing useCallback | Many | 0 | Fewer re-renders |

---

## 🚨 Non-Negotiable Rules (Moving Forward)

1. **No new `any` types** - All PRs must pass `@typescript-eslint/no-explicit-any: error`
2. **No SELECT *** - Use explicit column lists
3. **No loops with individual queries** - Use batch operations
4. **Max 10 useState per component** - Extract to custom hooks
5. **All useEffect must have cleanup** - Prevent memory leaks
6. **All event handlers need useCallback** - Prevent unnecessary re-renders

---

## 📚 Additional Documentation

After implementing these changes, update:
- [ ] `ARCHITECTURE.md` - Add type system section
- [ ] `DEVELOPMENT.md` - Add performance guidelines
- [ ] `DATA.md` - Add query optimization patterns
- [ ] Create `docs/COMPONENT_PATTERNS.md` - React best practices
- [ ] Create `docs/TYPE_SYSTEM.md` - TypeScript conventions

---

## ✅ Testing Strategy

### Unit Tests
- [ ] Test batch operations vs N+1 equivalents
- [ ] Test error utilities with various error types
- [ ] Test custom hooks in isolation

### Integration Tests
- [ ] Test refactored admin/users page workflows
- [ ] Test teacher sync with 100+ specializations
- [ ] Test type safety with invalid API responses

### Performance Tests
- [ ] Benchmark queries before/after optimization
- [ ] Profile React components with DevTools
- [ ] Load test with 1000+ concurrent users

### Type Tests
- [ ] Add `tsd` for type-level tests
- [ ] Test that invalid types are rejected
- [ ] Test inference works correctly

---

## 🤝 Review & Sign-off

Before deploying to production:
- [ ] Code review by 2+ team members
- [ ] Performance benchmarks pass
- [ ] Type coverage meets 85% target
- [ ] All tests green
- [ ] Documentation updated
- [ ] Load tests at tier2_500 pass

---

## 📞 Questions & Support

For questions about this optimization plan, contact the development team lead or review the following resources:
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- React Performance: https://react.dev/learn/render-and-commit
- Supabase Performance: https://supabase.com/docs/guides/database/database-performance

---

**Document Status**: Living document - update as work progresses  
**Last Updated**: 2026-06-30  
**Next Review**: After Week 2 completion
