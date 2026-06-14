CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    submission_text TEXT,
    submission_link TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (school_id, assignment_id, student_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_assignment
    ON assignment_submissions (school_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_student
    ON assignment_submissions (school_id, student_profile_id);
