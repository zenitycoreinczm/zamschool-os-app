const BRAND = {
  name: "ZamSchool OS",
  accent: "#0284c7",
  dark: "#0f172a",
};

export function wrapEmailHtml(body: string, title?: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:${BRAND.dark}">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:linear-gradient(135deg,${BRAND.accent} 0%,#0369a1 100%);padding:28px 24px;border-radius:16px 16px 0 0;text-align:center">
      <h1 style="margin:0;font-size:22px;color:#fff">${BRAND.name}</h1>
      ${title ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px">${title}</p>` : ""}
    </div>
    <div style="background:#fff;padding:28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px">
      ${body}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">© ${new Date().getFullYear()} ${BRAND.name}</p>
  </div>
</body>
</html>`.trim();
}

export function emailButton(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${label}</a></p>`;
}