export function buildCreateClassPayload(input) {
  return {
    school_id: input.schoolId,
    grade_id: input.body.gradeId || null,
    grade_level: normalizeGradeLevel(input.resolvedGradeLevel ?? input.body.gradeLevel),
    name: String(input.body.name || "").trim(),
    capacity: input.body.capacity,
    supervisor_id: input.supervisorProfileId ?? null,
  };
}

function normalizeGradeLevel(value) {
  return Number.isInteger(value) ? value : null;
}
