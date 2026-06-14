import subprocess
import json
import sys
import urllib.request

# Read the key from the Desktop
with open(r'C:\Users\MUMBUNA\Desktop\svc_role_key.txt', 'r') as f:
    SVC_KEY = f.read().strip()

BASE_URL = "https://jnnroitaftfmclegbeac.supabase.co/rest/v1"

def query(table, select="*"):
    url = f"{BASE_URL}/{table}?select={select}"
    req = urllib.request.Request(url)
    req.add_header("apikey", SVC_KEY)
    req.add_header("Authorization", f"Bearer {SVC_KEY}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode()
            return json.loads(data)
    except Exception as e:
        return {"error": str(e)}

print("=== SCHOOLS ===")
print(json.dumps(query("schools", "*"), indent=2, default=str))

print("\n=== PROFILES ===")
print(json.dumps(query("profiles", "id,email,role,name,school_id,status,must_change_password,class_id,grade_id"), indent=2, default=str))

print("\n=== GRADES ===")
print(json.dumps(query("grades", "*"), indent=2, default=str))

print("\n=== CLASSES ===")
print(json.dumps(query("classes", "*"), indent=2, default=str))

print("\n=== SUBJECTS ===")
print(json.dumps(query("subjects", "*"), indent=2, default=str))

print("\n=== AUDIT LOGS LAST 5 ===")
print(json.dumps(query("audit_logs", "id,action,resource_type,created_at&order=created_at.desc&limit=5"), indent=2, default=str))

print("\n=== EMAIL VERIFICATIONS ===")
print(json.dumps(query("email_verifications", "*"), indent=2, default=str))

print("\n=== FEES ===")
print(json.dumps(query("fees", "*"), indent=2, default=str))
