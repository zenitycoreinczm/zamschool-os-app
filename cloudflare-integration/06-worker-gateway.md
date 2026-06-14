# 06 — Cloudflare Worker Gateway

## Purpose

Offload file uploads from Next.js server to the edge. Large files (assignment submissions, bulk imports) go directly from browser → Cloudflare Worker → R2 without consuming Next.js server resources.

## Structure

```
workers/gateway/
├── wrangler.toml
├── src/
│   ├── index.ts        # Router + request handler
│   ├── auth.ts         # JWT / token verification
│   ├── upload.ts       # Direct R2 upload handler
│   └── image.ts        # Image optimization proxy
└── package.json
```

### `wrangler.toml`

```toml
name = "zamschool-gateway"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "zamschool-assets"

[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "zamschool-uploads"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "your-kv-namespace-id"

[vars]
UPSTREAM_API = "https://your-app.vercel.app"
```

### `src/index.ts`

```typescript
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      // Auth check on all routes except public GET
      const user = await verifyAuth(req, env);
      if (!user && req.method !== 'GET') {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      switch (true) {
        case url.pathname === '/api/upload' && req.method === 'POST':
          return handleUpload(req, env, corsHeaders);

        case url.pathname.startsWith('/api/files/') && req.method === 'GET':
          return handleDownload(req, env, url, corsHeaders);

        case url.pathname.startsWith('/api/images/') && req.method === 'GET':
          return handleImageProxy(req, env, url, corsHeaders);

        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (err) {
      return new Response('Internal Error', { status: 500, headers: corsHeaders });
    }
  },
};
```

### `src/auth.ts`

```typescript
// Verify the request has a valid session token
// The Next.js server generates a short-lived token that the Worker can validate
export async function verifyAuth(req: Request, env: Env): Promise<{ id: string; schoolId: string } | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  // Validate against Supabase JWT or internal signing key
  try {
    const payload = await validateToken(token, env);
    return payload;
  } catch {
    return null;
  }
}
```

## Updating the Stub Client

The existing `lib/api-client.ts` already has stub methods for `files.upload()` and `images.upload()`. Rewrite them to use the Worker URL from `NEXT_PUBLIC_GATEWAY_URL`:

```typescript
class CloudflareGatewayClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || '';
  }

  async uploadFile(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}` },
      body: formData,
    });
    return res.json();
  }

  getFileUrl(key: string): string {
    return `${this.baseUrl}/api/files/${encodeURIComponent(key)}`;
  }
}

export const gateway = new CloudflareGatewayClient();
```

## When to Use Worker vs Next.js API

| Scenario | Route | Reason |
|---|---|---|
| Small files (< 1 MB, e.g. avatars) | Next.js API | Simpler, no extra hop |
| Large files (assignments, submissions) | Worker Gateway | Avoid blocking Next.js |
| Image optimization requests | Worker Gateway | Edge-native processing |
| Presigned URL generation | Next.js API | Needs DB context for auth |
