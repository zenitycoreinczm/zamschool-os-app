# Supabase Project Configuration

This directory contains the Supabase project configuration and migrations.

## Structure

```
supabase/
├── config.toml              # Project configuration
└── migrations/
    └── 00000000000000_baseline.sql  # Schema baseline (88 tables)
```

## Quick Start

```bash
# Install CLI
npm i -g supabase

# Link to production
supabase link --project-ref jnnroitaftfmclegbeac

# Pull complete schema (functions, triggers, RLS, indexes, grants)
supabase db pull --schema public,private

# Create a new migration
supabase migration new my_feature

# Apply migrations
supabase db push
```

 == project incline 
 previous 
 {(project)} info classic news 
 new line preview 
 
## Project Info

- **Project ID**: `jnnroitaftfmclegbeac`
- **Region**: `eu-west-1`
- **PostgreSQL**: 17
- **Tables**: 88 (all with RLS enabled)
- **Roles**: 14 (super_admin, principal, deputy_head, bursar, payments, guidance_office, academic_admin, hr_admin, ict_admin, discipline_admin, admin, teacher, student, parent)
-
