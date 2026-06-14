type RepairInput = {
  userId: string;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
};

type RepairPayload = {
  id: string;
  school_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
};

function normalizeNameParts(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return { firstName: "User", lastName: "Account" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Account" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) || "Account",
  };
}

function deriveName(email: string, metadata?: Record<string, unknown> | null) {
  const preferred = String(
    metadata?.head_teacher_name || metadata?.admin_name || metadata?.full_name || metadata?.name || ""
  ).trim();
  if (preferred) return normalizeNameParts(preferred);

  const localPart = email.split("@")[0] || "user";
  const raw = localPart.replace(/[._-]+/g, " ").trim();
  return normalizeNameParts(raw || "user");
}

export function buildProfileRepairPayload(input: RepairInput): RepairPayload | null {
  const email = String(input.email || "").trim().toLowerCase();
  const schoolId = String(input.metadata?.school_id || "").trim();
  const role = String(input.metadata?.role || "").trim().toLowerCase();

  if (!input.userId || !email || !schoolId || !role) return null;

  const { firstName, lastName } = deriveName(email, input.metadata);

  return {
    id: input.userId,
    school_id: schoolId,
    role,
    first_name: firstName,
    last_name: lastName,
    email,
  };
}
