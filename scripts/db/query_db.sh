#!/bin/bash
SVC_KEY=$(cat /c/Users/MUMBUNA/Desktop/svc_role_key.txt)

query() {
  local table=$1
  local params=$2
  curl -s --max-time 15 \
    "https://jnnroitaftfmclegbeac.supabase.co/rest/v1/${table}?${params}" \
    -H "apikey: ${SVC_KEY}" \
    -H "Authorization: Bearer *** 2>/dev/null
}

echo "=== SCHOOLS ==="
query "schools" "select=*"
echo ""

echo "=== PROFILES ==="
query "profiles" "select=id,email,role,name,school_id,status,must_change_password,class_id,grade_id"
echo ""

echo "=== GRADES ==="
query "grades" "select=*"
echo ""

echo "=== CLASSES ==="
query "classes" "select=*"
echo ""

echo "=== SUBJECTS ==="
query "subjects" "select=*"
echo ""

echo "=== AUDIT LOGS LAST 5 ==="
query "audit_logs" "select=id,action,resource_type,created_at&order=created_at.desc&limit=5"
echo ""

echo "=== EMAIL VERIFICATIONS ==="
query "email_verifications" "select=*"
echo ""
