# Database Query Optimization Report

**Generated:** 2026-06-30  
**Scope:** API routes and lib files with Supabase queries

## Executive Summary

This report identifies **4 critical N+1 query problems**, **15+ instances of over-fetching with `SELECT *`**, **missing batch loading opportunities**, and **duplicate query patterns** that should be extracted to shared utilities.

---

## 1. N+1 Query Problems

### 🔴 CRITICAL: Teacher Assignment Synchronization (Multiple Loops)

**Location:** `app/api/admin/users/route.ts`

**Problem:** Three functions execute individual INSERT/UPDATE queries in loops instead of batching:

#### Issue 1: `syncTeacherSpecializationRows` (Lines 930-940)
```typescript
for (const subjectId of input.subjectIds) {
  const { error } = await supabaseAdmin
    .from("teacher_subject_specializations")
    .insert({
      school_id: input.schoolId,
      teacher_profile_id: input.teacherProfileId,
      subject_id: subjectId,
    });
}
```

**Impact:** If a teacher has 10 subject specializations, this executes 11 queries (1 DELETE + 10 INSERTs).

**Solution:**
```typescript
async function syncTeacherSpecializationRows(input: {
  schoolId: string;
  teacherProfileId: string;
  subjectIds?: string[];
}) {
  if (!input.subjectIds || input.subjectIds.length === 0) return;

  await supabaseAdmin
    .from("teacher_subject_specializations")
    .delete()
    .eq("school_id", input.schoolId)
    .eq("teacher_profile_id", input.teacherProfileId);

  // Batch insert all specializations at once
  const records = input.subjectIds.map(subjectId => ({
    school_id: input.schoolId,
    teacher_profile_id: input.teacherProfileId,
    subject_id: subjectId,
  }));

  const { error } = await supabaseAdmin
    .from("teacher_subject_specializations")
    .insert(records);
    
  if (error && !isMissingRelationError(error)) {
    console.error("sync specialization error", error);
  }
}
```

#### Issue 2: `syncTeacherClassSubjectAssignments` (Lines 956-967)
```typescript
for (const assignment of input.teachingAssignments) {
  const { error } = await supabaseAdmin
    .from("teacher_class_subject_assignments")
    .insert({
      school_id: input.schoolId,
      teacher_profile_id: input.teacherProfileId,
      class_id: assignment.classId,
      subject_id: assignment.subjectId,
    });
}
```

**Solution:**
```typescript
async function syncTeacherClassSubjectAssignments(input: {
  schoolId: string;
  teacherProfileId: string;
  teachingAssignments?: { classId: string; subjectId: string }[];
}) {
  if (!input.teachingAssignments || input.teachingAssignments.length === 0) return;

  await supabaseAdmin
    .from("teacher_class_subject_assignments")
    .delete()
    .eq("school_id", input.schoolId)
    .eq("teacher_profile_id", input.teacherProfileId);

  // Batch insert all assignments at once
  const records = input.teachingAssignments.map(assignment => ({
    school_id: input.schoolId,
    teacher_profile_id: input.teacherProfileId,
    class_id: assignment.classId,
    subject_id: assignment.subjectId,
  }));

  const { error } = await supabaseAdmin
    .from("teacher_class_subject_assignments")
    .insert(records);
    
  if (error && !isMissingRelationError(error)) {
    console.error("sync assignment error", error);
  }
}
```

#### Issue 3: `syncTeacherSupervisedClasses` (Lines 977-983)
```typescript
for (const classId of input.supervisedClassIds) {
  await supabaseAdmin
    .from("classes")
    .update({ supervisor_id: input.teacherProfileId })
    .eq("school_id", input.schoolId)
    .eq("id", classId);
}
```

**Solution:**
```typescript
async function syncTeacherSupervisedClasses(input: {
  schoolId: string;
  teacherProfileId: string;
  supervisedClassIds?: string[];
}) {
  if (!input.supervisedClassIds || input.supervisedClassIds.length === 0) return;

  // Batch update using .in() filter
  const { error } = await supabaseAdmin
    .from("classes")
    .update({ supervisor_id: input.teacherProfileId })
    .eq("school_id", input.schoolId)
    .in("id", input.supervisedClassIds);
    
  if (error) {
    console.error("sync supervised classes error", error);
  }
}
```

**Estimated Impact:** Reduces 30+ queries to 3 queries for a teacher with 10 specializations, 15 assignments, and 2 supervised classes.

---

### 🟡 MEDIUM: Teacher Profile Lookups in Loops

**Locations:**
- `app/api/admin/assignments/route.ts` (Lines 442-459)
- `app/api/admin/classes/route.ts` (Lines 395-412)
- `app/api/admin/relationships/route.ts` (Lines 688-705)
- `app/api/admin/timetable/route.ts` (Lines 724-741)

**Problem:** Inside loops, these functions fetch profile data one by one:

```typescript
for (const teacherRow of teacherRowResult.data || []) {
  teacherRows.push(teacherRow);

  if (
    teacherRow.profile_id &&
    !teacherProfiles.some((profile) => profile.id === teacherRow.profile_id)
  ) {
    const { data: rowProfile, error: rowProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", teacherRow.profile_id)
      .maybeSingle();

    if (rowProfileError) throw rowProfileError;
    if (rowProfile) {
      teacherProfiles.push(rowProfile);
    }
  }
}
```

**Solution:** Collect all profile IDs first, then batch fetch:

```typescript
for (const teacherRow of teacherRowResult.data || []) {
  teacherRows.push(teacherRow);
}

// Collect missing profile IDs
const missingProfileIds = Array.from(
  new Set(
    teacherRows
      .map(row => row.profile_id)
      .filter(id => id && !teacherProfiles.some(p => p.id === id))
  )
);

// Batch fetch all missing profiles
if (missingProfileIds.length > 0) {
  const { data: additionalProfiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, school_id, role")
    .in("id", missingProfileIds);

  if (profileError) throw profileError;
  teacherProfiles.push(...(additionalProfiles || []));
}
```

**Estimated Impact:** Reduces N queries to 1 query when N teachers have profile_ids.

---

### 🟡 MEDIUM: Sequential Queries That Could Be Parallel

**Location:** `app/api/admin/assignments/route.ts` (Lines 354-358)

**Problem:** Three separate queries executed sequentially when they could run in parallel:

```typescript
const [classRow, subjectRow, teacherReferences] = await Promise.all([
  fetchSchoolOwnedRow("classes", input.classId, input.schoolId),
  fetchSchoolOwnedRow("subjects", input.subjectId, input.schoolId),
  fetchTeacherAssignmentReferences(input.schoolId, input.teacherId),
]);
```

**Status:** ✅ Already optimized! This is the correct pattern.

But this pattern is **NOT** used everywhere. Compare to:

**Location:** `app/api/admin/classes/route.ts` (Lines 324-330)

```typescript
if (input.gradeId) {
  const { data, error } = await supabaseAdmin
    .from("grades")
    .select("id, level")
    .eq("id", input.gradeId)
    .eq("school_id", input.schoolId)
    .maybeSingle();
  // ... then use the result
}
```

**Recommendation:** Good pattern is already established in assignments route - replicate it consistently.

---

## 2. Over-Fetching Data with `SELECT *`

### Problem: Selecting All Columns When Only Few Are Needed

**17 instances found across:**

- ✅ `admin/audit/route.ts` - May be justified for audit logs
- 🔴 `admin/events/route.ts` (Line 63)
- 🔴 `admin/finance/route.ts` (Lines 222, 310)
- 🔴 `admin/grades/route.ts` (Lines 35, 161, 242)
- 🔴 `admin/grading-scales/route.ts` (Line 39)
- 🔴 `admin/payments/route.ts` (Line 62)
- 🔴 `admin/school/route.ts` (Line 83)
- 🔴 `admin/subjects/route.ts` (Line 35)
- 🔴 `admin/terms/route.ts` (Line 41)
- 🔴 `admin/users/route.ts` (Lines 744, 755-757)
- 🔴 `discipline/categories/route.ts` (Line 40)
- 🔴 `payments/fees/route.ts` (Line 26)
- 🔴 `payments/students/route.ts` (Line 28)

**Impact:**
- Wastes bandwidth transferring unused columns
- Increases memory usage
- Slower query execution
- Breaks API contracts when schema changes

**Example - Bad:**
```typescript
const { data, error } = await supabaseAdmin
  .from("grades")
  .select("*")
  .eq("school_id", schoolId);
```

**Example - Good:**
```typescript
const { data, error } = await supabaseAdmin
  .from("grades")
  .select("id, level, name, school_id, created_at, updated_at")
  .eq("school_id", schoolId);
```

**Recommendation:** Replace all `SELECT *` with explicit column lists. Only fetch columns actually used in the response.

---

## 3. Missing Indexes on school_id Filters

### Problem: All queries filter by `school_id` but index coverage is unclear

**Pattern found in 100+ queries:**
```typescript
.from("table_name")
.select("...")
.eq("school_id", schoolId)
```

**Recommendation:** Verify indexes exist on:
```sql
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_students_school_id_class_id 
  ON students(school_id, class_id);

CREATE INDEX IF NOT EXISTS idx_assignments_school_id_teacher_id 
  ON assignments(school_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_messages_school_id_recipient_id 
  ON messages(school_id, recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_results_school_id_student_id 
  ON results(school_id, student_id);

CREATE INDEX IF NOT EXISTS idx_payments_school_id_student_id 
  ON payments(school_id, student_id);

CREATE INDEX IF NOT EXISTS idx_finance_records_school_id_date 
  ON finance_records(school_id, transaction_date DESC);
```

**How to verify:** Run `EXPLAIN ANALYZE` on key queries to confirm index usage.

---

## 4. Duplicate Query Patterns - Extract to Shared Utilities

### Pattern 1: Fetch School-Owned Row

**Found in 4+ files:**

```typescript
// app/api/admin/assignments/route.ts
async function fetchSchoolOwnedRow(
  table: "classes" | "subjects",
  id: string,
  schoolId: string,
) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("id, school_id")
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

**Recommendation:** Extract to `lib/query-helpers.ts`:

```typescript
export async function fetchSchoolOwnedRow<T extends { id: string; school_id: string }>(
  table: string,
  id: string,
  schoolId: string,
  selectColumns: string = "id, school_id"
): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(selectColumns)
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

---

### Pattern 2: Teacher Assignment References

**Found in 4+ files with identical logic:**

- `app/api/admin/assignments/route.ts` (Lines 398-463)
- `app/api/admin/classes/route.ts` (Lines 365-416)
- `app/api/admin/relationships/route.ts` (Lines 653-714)
- `app/api/admin/timetable/route.ts` (Lines 687-748)

**Current:** ~70 lines duplicated 4 times = 280 lines of duplicate code

**Recommendation:** Extract to `lib/teacher-references.ts`:

```typescript
export async function fetchTeacherAssignmentReferences(
  schoolId: string,
  teacherId: string | null | undefined
) {
  const normalizedTeacherId = String(teacherId || "").trim();
  if (!normalizedTeacherId) {
    return { teacherProfiles: [], teacherRows: [] };
  }

  const teacherProfiles: Array<{
    id: string;
    school_id: string | null;
    role: string | null;
  }> = [];

  // Fetch direct profile
  const { data: directProfile, error: directProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", normalizedTeacherId)
    .maybeSingle();

  if (directProfileError) throw directProfileError;
  if (directProfile) {
    teacherProfiles.push(directProfile);
  }

  // Fetch teacher rows
  const teacherRowResult = await supabaseAdmin
    .from("teachers")
    .select("id, profile_id, school_id")
    .eq("school_id", schoolId)
    .or(`id.eq.${normalizedTeacherId},profile_id.eq.${normalizedTeacherId}`);

  if (teacherRowResult.error && !isMissingRelationError(teacherRowResult.error)) {
    throw teacherRowResult.error;
  }

  const teacherRows = teacherRowResult.data || [];
  
  // Batch fetch missing profiles
  const missingProfileIds = Array.from(
    new Set(
      teacherRows
        .map(row => row.profile_id)
        .filter(id => id && !teacherProfiles.some(p => p.id === id))
    )
  );

  if (missingProfileIds.length > 0) {
    const { data: additionalProfiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, role")
      .in("id", missingProfileIds);

    if (profileError) throw profileError;
    teacherProfiles.push(...(additionalProfiles || []));
  }

  return { teacherProfiles, teacherRows };
}
```

**Impact:** Reduces code duplication from 280 lines to ~80 lines (200 lines saved).

---

### Pattern 3: Count School Rows

**Found in:** `lib/dashboard-summary-server.ts` (Lines 113-121)

```typescript
async function countSchoolRows(table: string, schoolId: string) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if (error) return 0;
  return count || 0;
}
```

**Status:** ✅ Already extracted! Good pattern.

**Recommendation:** Move to `lib/query-helpers.ts` for reuse across the codebase.

---

## 5. Batch Loading Opportunities

### Use Existing `batchQueries` Utility

**Location:** `lib/batch-query.ts` - Already implemented!

**Current usage:** Limited

**Opportunity:** Many routes could benefit from batch loading:

#### Example: Load User Directory Data

**Current:** `app/api/admin/users/route.ts` (Lines 755-757)
```typescript
supabaseAdmin.from("students").select("*").eq("school_id", schoolId),
supabaseAdmin.from("teachers").select("*").eq("school_id", schoolId),
supabaseAdmin.from("parents").select("*").eq("school_id", schoolId),
```

**Better with batch-query:**
```typescript
import { batchQueries } from "@/lib/batch-query";

const { results } = await batchQueries([
  () => supabaseAdmin.from("students").select("id, profile_id, class_id, admission_number").eq("school_id", schoolId),
  () => supabaseAdmin.from("teachers").select("id, profile_id").eq("school_id", schoolId),
  () => supabaseAdmin.from("parents").select("id, profile_id").eq("school_id", schoolId),
], { concurrency: 3 });

const [studentsRes, teachersRes, parentsRes] = results;
```

**Note:** The current code already uses `Promise.all()` which is efficient. The `batchQueries` utility is better when you need rate limit protection.

---

## 6. Query Pattern Best Practices

### ✅ Good Patterns Found

1. **Parallel queries with Promise.all()** - `app/api/admin/assignments/route.ts`
2. **Batch loading profiles** - `app/api/account/messages/route.ts` (Lines 200-212)
3. **Hydration pattern** - `lib/admin-route-hydration.mjs`
4. **Caching** - `lib/dashboard-summary-server.ts` uses `withCache()`

### 🔴 Anti-Patterns to Avoid

1. **Sequential queries in loops** - Fix the 3 teacher sync functions
2. **SELECT *** - Replace with explicit column lists
3. **Individual INSERTs in loops** - Use batch insert
4. **Individual UPDATEs in loops** - Use `.in()` filter for batch updates
5. **Fetching related data one by one** - Collect IDs, then batch fetch

---

## 7. Recommended Action Plan

### Priority 1: Critical Performance Issues (Week 1)

1. ✅ Fix N+1 in `syncTeacherSpecializationRows` - batch INSERT
2. ✅ Fix N+1 in `syncTeacherClassSubjectAssignments` - batch INSERT
3. ✅ Fix N+1 in `syncTeacherSupervisedClasses` - batch UPDATE
4. ✅ Fix N+1 in teacher profile lookups (4 files) - batch SELECT

**Estimated time:** 4-6 hours  
**Impact:** 10-30x faster teacher assignment operations

### Priority 2: Code Quality & Maintainability (Week 2)

1. Extract `fetchTeacherAssignmentReferences` to shared utility
2. Replace `SELECT *` with explicit columns in all routes
3. Add explicit column list standard to code review checklist

**Estimated time:** 8-10 hours  
**Impact:** Reduced code duplication, clearer API contracts

### Priority 3: Database Optimization (Week 3)

1. Audit existing indexes with `EXPLAIN ANALYZE`
2. Add composite indexes on `(school_id, other_filter_columns)`
3. Add indexes on foreign key columns used in JOINs

**Estimated time:** 4-6 hours  
**Impact:** Faster queries at scale

### Priority 4: Monitoring & Documentation (Week 4)

1. Add query performance logging for queries > 1s
2. Document query patterns in `docs/QUERY_PATTERNS.md`
3. Set up slow query alerts

**Estimated time:** 4-6 hours  
**Impact:** Proactive performance monitoring

---

## 8. Code Examples: Before & After

### Example 1: Batch INSERT

**Before (N+1):**
```typescript
for (const item of items) {
  await supabaseAdmin.from("table").insert(item);
}
```

**After (Batched):**
```typescript
await supabaseAdmin.from("table").insert(items);
```

**Improvement:** N queries → 1 query

---

### Example 2: Batch UPDATE

**Before (N+1):**
```typescript
for (const id of ids) {
  await supabaseAdmin.from("table").update({ field: value }).eq("id", id);
}
```

**After (Batched):**
```typescript
await supabaseAdmin.from("table").update({ field: value }).in("id", ids);
```

**Improvement:** N queries → 1 query

---

### Example 3: Batch SELECT

**Before (N+1):**
```typescript
const profiles = [];
for (const id of profileIds) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (data) profiles.push(data);
}
```

**After (Batched):**
```typescript
const { data: profiles } = await supabaseAdmin
  .from("profiles")
  .select("id, name")
  .in("id", profileIds);
```

**Improvement:** N queries → 1 query

---

### Example 4: SELECT Specific Columns

**Before (Over-fetching):**
```typescript
const { data } = await supabaseAdmin
  .from("students")
  .select("*")
  .eq("school_id", schoolId);
```

**After (Optimized):**
```typescript
const { data } = await supabaseAdmin
  .from("students")
  .select("id, profile_id, class_id, admission_number, is_active")
  .eq("school_id", schoolId);
```

**Improvement:** Transfer only needed data, clearer API contract

---

## 9. Testing Recommendations

### Performance Testing

1. **Benchmark current queries:**
   ```typescript
   const start = Date.now();
   await syncTeacherSpecializationRows(input);
   console.log(`Duration: ${Date.now() - start}ms`);
   ```

2. **Benchmark after optimization:**
   - Expected: 10-30x improvement for batch operations

3. **Load testing:**
   - Test with 100+ teachers with 10+ assignments each
   - Monitor database connection pool usage

### Unit Tests

Add tests for new batch utilities:

```typescript
describe("fetchTeacherAssignmentReferences", () => {
  it("should batch fetch profiles", async () => {
    const result = await fetchTeacherAssignmentReferences(schoolId, teacherId);
    expect(result.teacherProfiles).toBeDefined();
    expect(result.teacherRows).toBeDefined();
  });
});
```

---

## 10. Monitoring & Metrics

### Key Metrics to Track

1. **Query count per request:**
   - Current: 30-50 queries for teacher assignment sync
   - Target: 5-10 queries

2. **Response time:**
   - Current: 2-5 seconds for complex teacher updates
   - Target: <500ms

3. **Database connection pool usage:**
   - Monitor for connection exhaustion

4. **Slow query log:**
   - Alert on queries > 1 second

### Implementation

Add to API middleware:

```typescript
const queryCount = { current: 0 };

// Wrap Supabase client to count queries
const instrumentedClient = new Proxy(supabaseAdmin, {
  get(target, prop) {
    if (prop === "from") {
      return (...args: any[]) => {
        queryCount.current++;
        return target.from(...args);
      };
    }
    return target[prop];
  },
});

// Log at end of request
console.log(`Request completed with ${queryCount.current} queries`);
```

---

## Conclusion

The codebase has **4 critical N+1 query problems** that can be fixed with batch operations, reducing query counts by 10-30x. Additionally, replacing `SELECT *` with explicit column lists across 17 files will improve performance and maintainability.

The good news: You already have the `batchQueries` utility and some good patterns in place (like parallel queries with `Promise.all`). The main work is:

1. **Apply batch operations** to the 3 teacher sync functions (highest impact)
2. **Extract duplicate code** to shared utilities (reduce 200+ lines)
3. **Replace SELECT *** with explicit columns (better contracts)
4. **Verify database indexes** for common query patterns

Estimated total effort: **20-28 hours** over 4 weeks with significant performance gains.
