# Teacher Assignment Workflow Design

**Date:** 2026-03-29

## Goal

Make teacher setup in the admin workspace explicit and professional so an admin can:
- create a teacher account
- assign one or more subject specializations
- link the teacher to the classes they teach
- mark the teacher as the class teacher for one or more classes

## Problem

The current teacher flow stores only a single free-text `specialization` value and basic staff metadata. It does not capture:
- which classes a teacher teaches
- which subject they teach in each class
- whether they are the class teacher for a class

This creates ambiguity in the admin workflow and prevents the system from answering operational questions such as:
- Who teaches Mathematics in Grade 11?
- Who is the class teacher for Grade 12 A?
- Which classes is this teacher assigned to teach?

## Existing Anchors

- `classes.supervisor_id` already represents the class teacher relationship.
- `lessons.teacher_id + class_id + subject_id` already represents scheduled timetable teaching.
- `teachers.specialization` currently stores one free-text summary only.

These existing anchors are useful, but they are not enough to support an admin assignment workflow on their own.

## Approved Direction

Use a structured teaching-assignment workflow inside the teacher create/edit form.

The admin teacher form will gain a dedicated teaching assignment section with:
- subject specialization selection
- class teaching links
- class teacher ownership links

The save action will persist both the teacher account and the teacher's assignment relationships together.

## Data Model

### Class teacher ownership

Keep using `classes.supervisor_id` as the authoritative class teacher field.

Rules:
- a class can have only one class teacher at a time
- a teacher may supervise multiple classes if the school chooses

### Subject specializations

Add a normalized specialization table:
- `teacher_subject_specializations`

Columns:
- `id`
- `school_id`
- `teacher_profile_id`
- `subject_id`
- timestamps

Compatibility:
- continue populating `teachers.specialization` as a derived comma-separated display string

### Teaching assignments

Add a normalized assignment table:
- `teacher_class_subject_assignments`

Columns:
- `id`
- `school_id`
- `teacher_profile_id`
- `class_id`
- `subject_id`
- timestamps

This table represents the teacher's assigned subject responsibility for a class independently of the timetable.

## Admin UX

Inside the teacher create/edit modal:

### Staff details
- first name
- last name
- email
- phone
- gender
- employee number
- department
- hire date
- status

### Teaching assignment
- multi-select subject specializations
- multi-select class assignments
- per-class subject links so the admin can state which subjects this teacher handles in each linked class
- multi-select class teacher assignments

## Display Changes

### Teacher list
Show richer teacher summary data:
- employee number
- department
- specializations summary
- assigned class count

### Teacher detail view
Show:
- assigned subjects
- teaching classes
- supervised classes

### Class views
Existing class pages can continue using `classes.supervisor_id`, and can later expand to show subject teachers from the new assignment table.

## Validation Rules

- only teachers in the current school can receive assignments
- only subjects in the current school can be linked
- only classes in the current school can be linked
- duplicate teacher/class/subject assignments are prevented
- class teacher links overwrite the prior supervisor for that class

## API Direction

Extend the admin users create/update route so teacher requests can include:
- `specializationSubjectIds`
- `teachingAssignments`
- `supervisedClassIds`

The API will:
- validate all referenced entities belong to the same school
- create/update the teacher profile
- sync specialization rows
- sync teacher/class/subject assignment rows
- update class supervisor ownership

## Testing

Add regression coverage for:
- teacher create/update payloads accepting structured assignments
- teacher form exposing specialization and class assignment controls
- teacher detail endpoint returning assigned subjects and classes from the new normalized tables
- build verification after UI and route changes

## Non-Goals

- rebuilding the timetable flow in this change
- replacing timetable lessons as the scheduling source of truth
- building a separate teacher-assignment admin screen
