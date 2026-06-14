# 05 — Cloudflare Images Integration

## Overview

Cloudflare Images provides automatic image optimization (resizing, format conversion to WebP/AVIF, compression) served from Cloudflare's edge. This is ideal for profile photos and any user-uploaded images.

## Setup

1. Enable Cloudflare Images in your Cloudflare dashboard
2. Generate an API token with `cloudflare_images:write` permission
3. Note your account hash for image delivery URLs

## Components

### `components/CloudflareImage.tsx`

```tsx
'use client';
import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  variant?: 'public' | 'thumbnail' | 'avatar';
  className?: string;
};

const VARIANTS = {
  public: 'public',
  thumbnail: 'thumb-200x200',
  avatar: 'avatar-128x128',
};

// If src is already a Cloudflare Images URL, use variant
// Otherwise fall back to direct <img> with Next.js Image
export function CloudflareImage({ src, alt, variant = 'public', className }: Props) {
  if (src?.includes('imagedelivery.net')) {
    const baseUrl = src.split('/').slice(0, -1).join('/');
    const variantValue = VARIANTS[variant];
    return (
      <img
        src={`${baseUrl}/${variantValue}`}
        alt={alt}
        className={className}
        loading="lazy"
      />
    );
  }
  // Fallback to direct image
  return (
    <img src={src} alt={alt} className={className} loading="lazy" />
  );
}
```

### `lib/images-client.ts`

```typescript
const CLOUDFLARE_IMAGES_TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN;
const ACCOUNT_HASH = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;

export async function uploadToCloudflareImages(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/webp' }), filename);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_IMAGES_TOKEN}` },
      body: formData,
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message);
  return data.result.variants[0]; // delivery URL
}
```

## Integration with Avatar Upload

In `app/api/account/avatar/route.ts`, after uploading to R2, optionally also push to Cloudflare Images for optimized delivery:

```typescript
if (process.env.CLOUDFLARE_IMAGES_TOKEN) {
  const optimizedUrl = await uploadToCloudflareImages(buffer, `${userId}.webp`);
  // Save optimizedUrl to profile.avatar_url instead of raw R2 URL
}
```

## next.config.ts Updates

```typescript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'imagedelivery.net',
  },
],
```
