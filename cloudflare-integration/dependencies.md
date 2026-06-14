# Dependencies

## Installed ✅

```json
{
  "@aws-sdk/client-s3": "^latest",
  "@aws-sdk/s3-request-presigner": "^latest"
}
```

These were installed and verified on 2026-05-13. 94 packages added.

## Dev Dependencies

```json
{
  "wrangler": "^latest"
}
```

Only needed if you build the Worker gateway (Phase 5). Install with:

```bash
npm install -D wrangler
```

## No Other Dependencies Needed

The rest of the integration uses:
- **Built-in `fetch`** — for Cloudflare Images API calls, KV REST API
- **Existing `sharp`** — for image validation (already in codebase at `lib/image-optimization.ts`)
- **Existing `papaparse`** — for bulk import CSV processing (already in codebase)
- **Existing Next.js API routes** — for the file upload endpoints
