/**
 * Invoke Supabase MCP tools using Grok OAuth credentials.
 * Usage: node scripts/db/mcp-supabase-call.mjs <toolName> [jsonArgs]
 * Example: node scripts/db/mcp-supabase-call.mjs list_migrations {}
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MCP_URL =
  "https://mcp.supabase.com/mcp?project_ref=jnnroitaftfmclegbeac&features=docs%2Caccount%2Cdebugging%2Cdatabase%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage";

const credPath = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".grok",
  "mcp_credentials.json"
);

function loadToken() {
  if (!fs.existsSync(credPath)) {
    throw new Error(`Missing MCP credentials at ${credPath}. Run Grok /mcps and authenticate Supabase.`);
  }
  const raw = JSON.parse(fs.readFileSync(credPath, "utf8"));
  const entry = Object.entries(raw).find(([k]) => k.startsWith("supabase:"));
  const token = entry?.[1]?.token_response?.access_token;
  if (!token) throw new Error("Supabase MCP OAuth token not found. Re-authenticate in Grok /mcps.");
  return token;
}

function parseSseOrJson(bodyText, contentType) {
  if (contentType?.includes("text/event-stream") || bodyText.includes("event:")) {
    const dataLines = [];
    for (const line of bodyText.split(/\r?\n/)) {
      if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }
    const payloads = dataLines
      .map((chunk) => {
        try {
          return JSON.parse(chunk);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return payloads.at(-1) ?? { raw: bodyText };
  }
  try {
    return JSON.parse(bodyText);
  } catch {
    return { raw: bodyText };
  }
}

async function mcpRequest(token, method, params, sessionId) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params: params ?? {},
    }),
  });

  const sessionFromHeader = res.headers.get("mcp-session-id");
  const text = await res.text();
  const parsed = parseSseOrJson(text, res.headers.get("content-type") || "");

  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  if (parsed.error) {
    throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  }

  return { result: parsed.result ?? parsed, sessionId: sessionFromHeader || sessionId };
}

async function initialize(token) {
  const init = await mcpRequest(token, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "zamschool-mcp-script", version: "1.0.0" },
  });
  const sessionId = init.sessionId;
  await mcpRequest(
    token,
    "notifications/initialized",
    {},
    sessionId
  ).catch(() => {});
  return sessionId;
}

async function callTool(token, sessionId, name, args) {
  const { result } = await mcpRequest(
    token,
    "tools/call",
    { name, arguments: args ?? {} },
    sessionId
  );
  return result;
}

async function main() {
  const toolName = process.argv[2];
  if (!toolName) {
    console.error("Usage: node mcp-supabase-call.mjs <toolName> [jsonArgs]");
    process.exit(1);
  }
  const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};

  const token = loadToken();
  const sessionId = await initialize(token);
  const result = await callTool(token, sessionId, toolName, args);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});