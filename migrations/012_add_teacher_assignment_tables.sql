CREATE TABLE IF NOT EXISTS teacher_subject_specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (teacher_profile_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_specializations_school_teacher
    ON teacher_subject_specializations (school_id, teacher_profile_id);

CREATE TABLE IF NOT EXISTS teacher_class_subject_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (teacher_profile_id, class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_subject_assignments_school_teacher
    ON teacher_class_subject_assignments (school_id, teacher_profile_id);

CREATE INDEX IF NOT EXISTS idx_teacher_class_subject_assignments_school_class
    ON teacher_class_subject_assignments (school_id, class_id);
