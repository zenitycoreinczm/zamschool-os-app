'use client';

type Props = {
  src: string;
  alt: string;
  variant?: 'public' | 'thumbnail' | 'avatar';
  className?: string;
  width?: number;
  height?: number;
};

const VARIANTS: Record<string, string> = {
  public: 'public',
  thumbnail: 'thumb-200x200',
  avatar: 'avatar-128x128',
};

export function CloudflareImage({ src, alt, variant = 'public', className, width, height }: Props) {
  if (!src) {
    return null;
  }

  const isCloudflareImage = src.includes('imagedelivery.net');
  let imgSrc = src;

  if (isCloudflareImage) {
    const parts = src.split('/');
    const base = parts.slice(0, -1).join('/');
    imgSrc = `${base}/${VARIANTS[variant] || 'public'}`;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudflare Images variants are already transformed and cached at the edge.
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}
