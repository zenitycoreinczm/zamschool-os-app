type SchoolOwnedRow = {
  id: string;
  school_id?: string | null;
};

type ProfileRow = {
  id: string;
  school_id?: string | null;
  role?: string | null;
};

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 404; error: string };

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

export function validateStudentClassAssignment(input: {
  schoolId: string;
  classId: string | null | undefined;
  classRow: SchoolOwnedRow | null;
}): ValidationResult<{ classId: string | null }> {
  const classId = String(input.classId || "").trim();
  if (!classId) {
    return {
      ok: true,
      data: { classId: null },
    };
  }

  if (!input.classRow?.id || input.classRow.school_id !== input.schoolId) {
    return {
      ok: false,
      status: 404,
      error: "Class not found in this school",
    };
  }

  return {
    ok: true,
    data: { classId: input.classRow.id },
  };
}

export function validateParentLinkProfile(input: {
  schoolId: string;
  parentProfile: ProfileRow | null;
}): ValidationResult<{ parentProfileId: string }> {
  if (
    !input.parentProfile?.id ||
    input.parentProfile.school_id !== input.schoolId ||
    normalizeRole(input.parentProfile.role) !== "PARENT"
  ) {
    return {
      ok: false,
      status: 404,
      error: "Parent profile not found in this school",
    };
  }

  return {
    ok: true,
    data: { parentProfileId: input.parentProfile.id },
  };
}
