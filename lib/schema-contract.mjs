export const SCHEMA_CONTRACT = {
  schools: {
    id: { dataType: "uuid", isNullable: "NO" },
    name: { dataType: "text", isNullable: "NO" },
    code: { dataType: "text", isNullable: "NO" },
    address: { dataType: "text" },
    logo_url: { dataType: "text" },
    phone: { dataType: "text" },
    email: { dataType: "text" },
    emis_code: { dataType: "text" },
    province: { dataType: "text" },
    district: { dataType: "text" },
    school_type: { dataType: "text" },
    ownership_type: { dataType: "text" },
    created_at: { dataType: "timestamp with time zone" },
    updated_at: { dataType: "timestamp with time zone" },
  },
  profiles: {
    id: { dataType: "uuid", isNullable: "NO" },
    school_id: { dataType: "uuid" },
    role: { dataType: "text", isNullable: "NO" },
    first_name: { dataType: "text", isNullable: "NO" },
    last_name: { dataType: "text", isNullable: "NO" },
    email: { dataType: "text", isNullable: "NO" },
    avatar_url: { dataType: "text" },
    must_change_password: { dataType: "boolean" },
    temporary_password_issued_at: { dataType: "timestamp with time zone" },
    created_at: { dataType: "timestamp with time zone" },
    updated_at: { dataType: "timestamp with time zone" },
  },
  announcements: {
    id: { dataType: "uuid" },
    school_id: { dataType: "uuid" },
    title: { dataType: "text" },
    content: { dataType: "text" },
    created_at: { dataType: "timestamp with time zone" },
  },
  attendance: {
    id: { dataType: "uuid" },
    school_id: { dataType: "uuid" },
    class_id: { dataType: "uuid" },
    date: { dataType: "date" },
    student_id: { dataType: "uuid" },
    status: { dataType: "text" },
    created_at: { dataType: "timestamp with time zone" },
  },
  results: {
    id: { dataType: "uuid" },
    school_id: { dataType: "uuid" },
    student_id: { dataType: "uuid" },
    score: { dataType: "numeric" },
    published_at: { dataType: "timestamp with time zone" },
    published_by: { dataType: "uuid" },
    created_at: { dataType: "timestamp with time zone" },
  },
};

export function compareTableContract(table, expected, actualRows) {
  const actualMap = new Map(actualRows.map((row) => [row.column_name, row]));

  const missingColumns = [];
  const typeMismatches = [];
  const nullableMismatches = [];

  for (const [column, rules] of Object.entries(expected)) {
    const actual = actualMap.get(column);
    if (!actual) {
      missingColumns.push(column);
      continue;
    }
    if (rules.dataType && actual.data_type !== rules.dataType) {
      typeMismatches.push({
        column,
        expected: rules.dataType,
        actual: actual.data_type,
      });
    }
    if (rules.isNullable && actual.is_nullable !== rules.isNullable) {
      nullableMismatches.push({
        column,
        expected: rules.isNullable,
        actual: actual.is_nullable,
      });
    }
  }

  return { table, missingColumns, typeMismatches, nullableMismatches };
}

export function hasSchemaDiff(diff) {
  return (
    diff.missingColumns.length > 0 ||
    diff.typeMismatches.length > 0 ||
    diff.nullableMismatches.length > 0
  );
}
