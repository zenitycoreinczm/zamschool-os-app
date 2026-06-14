const CLOUDFLARE_IMAGES_TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN || '';
const CLOUDFLARE_IMAGES_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID || '';
const CLOUDFLARE_IMAGES_ACCOUNT_HASH = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH || '';
const CLOUDFLARE_IMAGES_DELIVERY_URL = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL || 'https://imagedelivery.net';

export type ImageVariant = 'public' | 'thumbnail' | 'avatar';

const VARIANT_MAP: Record<ImageVariant, string> = {
  public: 'public',
  thumbnail: 'thumb-200x200',
  avatar: 'avatar-128x128',
};

export function isCloudflareImagesConfigured(): boolean {
  return Boolean(CLOUDFLARE_IMAGES_TOKEN && CLOUDFLARE_IMAGES_ACCOUNT_ID);
}

export function getCloudflareImageUrl(imageId: string, variant: ImageVariant = 'public'): string {
  if (!CLOUDFLARE_IMAGES_ACCOUNT_HASH) {
    return '';
  }
  return `${CLOUDFLARE_IMAGES_DELIVERY_URL}/${CLOUDFLARE_IMAGES_ACCOUNT_HASH}/${imageId}/${VARIANT_MAP[variant]}`;
}

export async function uploadToCloudflareImages(
  imageBuffer: Buffer,
  filename: string
): Promise<{ id: string; url: string }> {
  if (!isCloudflareImagesConfigured()) {
    throw new Error('Cloudflare Images is not configured. Set CLOUDFLARE_IMAGES_TOKEN and CLOUDFLARE_IMAGES_ACCOUNT_ID.');
  }

  const formData = new FormData();
  const blob = new Blob([imageBuffer as unknown as BlobPart], { type: 'image/webp' });
  formData.append('file', blob, filename);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_IMAGES_TOKEN}` },
      body: formData,
    }
  );

  const data = await res.json() as any;
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Cloudflare Images upload failed');
  }

  const imageId = data.result.id;
  const url = getCloudflareImageUrl(imageId, 'public');

  return { id: imageId, url };
}

export async function deleteFromCloudflareImages(imageId: string): Promise<void> {
  if (!isCloudflareImagesConfigured()) return;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${CLOUDFLARE_IMAGES_TOKEN}` },
    }
  );

  if (!res.ok) {
    throw new Error('Failed to delete image from Cloudflare Images');
  }
}
