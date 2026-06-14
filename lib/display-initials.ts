const HONORIFIC_PREFIX =
  /^(dr|mr|mrs|ms|miss|prof|rev|sr|jr|hon)\.?\s+/i;

function tokenizeName(value: string) {
  return value
    .trim()
    .replace(HONORIFIC_PREFIX, "")
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
}

export function getDisplayInitials(input: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const firstRaw = input.firstName?.trim() || "";
  const last = input.lastName?.trim() || "";
  const firstParts = tokenizeName(firstRaw);
  const first = firstParts[0] || firstRaw.replace(HONORIFIC_PREFIX, "").trim();
  const firstRemainder = firstParts.slice(1).join(" ");

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  if (first && firstRemainder) {
    return `${first[0]}${firstRemainder[0]}`.toUpperCase();
  }

  if (first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }

  if (first) {
    return first[0]!.toUpperCase();
  }

  const parts = tokenizeName(input.displayName || "");
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }

  if (parts[0]) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  const emailLocal = (input.email || "").split("@")[0]?.trim() || "";
  if (emailLocal) {
    return emailLocal.slice(0, 2).toUpperCase();
  }

  return "?";
}