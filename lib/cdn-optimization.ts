/**
 * CDN and Storage optimization utilities
 * Optimizes asset delivery and storage costs
 */

// CDN Configuration
const CDN_CONFIG = {
  baseUrl: process.env.CDN_BASE_URL || '',
  imageBaseUrl: process.env.CDN_IMAGE_URL || '',
  staticBaseUrl: process.env.CDN_STATIC_URL || '',
  enableCompression: true,
  enableWebP: true,
};

/**
 * Generate optimized image URL with transformation parameters
 * Works with Cloudinary, Cloudflare Images, or Imgix
 */
export function generateOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'auto';
    fit?: 'cover' | 'contain' | 'fill';
  } = {}
): string {
  if (!originalUrl) return '';
  
  // If using a CDN with on-the-fly transformation
  if (CDN_CONFIG.imageBaseUrl && originalUrl.includes(CDN_CONFIG.imageBaseUrl)) {
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', String(options.width));
    if (options.height) params.set('h', String(options.height));
    if (options.quality) params.set('q', String(options.quality));
    if (options.format) params.set('f', options.format);
    if (options.fit) params.set('fit', options.fit);
    
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}${params.toString()}`;
  }
  
  // For Supabase Storage with CDN
  if (originalUrl.includes('supabase.co') || originalUrl.includes('supabase.in')) {
    // Supabase doesn't support on-the-fly transforms in free tier
    // Return original with resize hint for client-side
    return originalUrl;
  }
  
  return originalUrl;
}

/**
 * Generate responsive image srcset for optimal loading
 */
export function generateResponsiveSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map(width => {
      const url = generateOptimizedImageUrl(baseUrl, {
        width,
        quality: 80,
        format: 'webp',
      });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get optimal image dimensions based on container size
 */
export function getOptimalImageDimensions(
  containerWidth: number,
  containerHeight?: number,
  maxDimension: number = 1920
): { width: number; height?: number } {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const targetWidth = Math.min(Math.round(containerWidth * dpr), maxDimension);
  
  if (containerHeight) {
    const targetHeight = Math.min(Math.round(containerHeight * dpr), maxDimension);
    return { width: targetWidth, height: targetHeight };
  }
  
  return { width: targetWidth };
}

/**
 * Storage optimization - determine best storage tier
 */
export function getStorageTier(file: {
  size: number;
  type: string;
  accessFrequency?: 'high' | 'medium' | 'low';
}): 'hot' | 'warm' | 'cold' {
  // Small images accessed frequently - hot storage
  if (file.size < 100 * 1024 && file.accessFrequency === 'high') {
    return 'hot';
  }
  
  // Medium files or infrequent access - warm storage
  if (file.size < 1024 * 1024 && file.accessFrequency !== 'low') {
    return 'warm';
  }
  
  // Large files or rare access - cold storage
  return 'cold';
}

/**
 * Calculate storage cost estimate
 */
export function calculateStorageCost(
  fileCount: number,
  avgFileSize: number,
  tier: 'hot' | 'warm' | 'cold'
): number {
  // Estimated costs per GB (adjust based on your provider)
  const costPerGB: Record<string, number> = {
    hot: 0.023,    // S3 Standard
    warm: 0.0125,  // S3 Standard-IA
    cold: 0.004,   // S3 Glacier
  };
  
  const totalGB = (fileCount * avgFileSize) / (1024 * 1024 * 1024);
  return totalGB * costPerGB[tier];
}

/**
 * Client-side image loading optimization
 * Returns loading strategy based on image position
 */
export function getImageLoadingStrategy(
  isAboveFold: boolean,
  isCritical: boolean
): {
  loading: 'eager' | 'lazy';
  decoding: 'async' | 'sync' | 'auto';
  fetchPriority: 'high' | 'low' | 'auto';
} {
  if (isAboveFold || isCritical) {
    return {
      loading: 'eager',
      decoding: 'sync',
      fetchPriority: 'high',
    };
  }
  
  return {
    loading: 'lazy',
    decoding: 'async',
    fetchPriority: 'low',
  };
}

/**
 * Bandwidth optimization - check if client should preload
 */
export function shouldPreloadAssets(connectionType?: string, saveData?: boolean): boolean {
  if (saveData) return false;
  if (!connectionType) return true;
  
  // Don't preload on slow connections
  const slowConnections = ['2g', 'slow-2g'];
  return !slowConnections.includes(connectionType);
}

/**
 * Service Worker cache configuration for PWA
 */
export const SW_CACHE_CONFIG = {
  staticAssets: {
    maxEntries: 100,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  },
  apiResponses: {
    maxEntries: 50,
    maxAgeSeconds: 5 * 60, // 5 minutes
  },
  images: {
    maxEntries: 200,
    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
  },
};

/**
 * Preload hints for critical resources
 */
export function generatePreloadHints(resources: Array<{
  url: string;
  type: 'image' | 'script' | 'style' | 'font';
  as?: string;
}>): string {
  return resources
    .map(resource => {
      const as = resource.as || resource.type;
      return `<link rel="preload" href="${resource.url}" as="${as}"${
        resource.type === 'image' ? ' type="image/webp"' : ''
      }>`;
    })
    .join('\n');
}

/**
 * Detect optimal image format support
 */
export function detectSupportedFormats(userAgent: string): {
  webp: boolean;
  avif: boolean;
  jpeg: boolean;
} {
  const ua = userAgent.toLowerCase();
  
  // AVIF support (modern browsers)
  const avif = /chrome\/9[0-9]|firefox\/9[0-9]|safari\/16/.test(ua);
  
  // WebP support (most modern browsers)
  const webp = /chrome|firefox|safari\/14|edge/.test(ua);
  
  // JPEG is universal
  return { webp, avif, jpeg: true };
}
