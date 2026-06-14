import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 80,
  maxSizeKB: 150,
  format: 'webp',
};

/**
 * Optimize image for upload - resize, convert to WebP, limit size
 * Returns optimized buffer and metadata
 */
export async function optimizeImage(
  buffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<{ buffer: Buffer; metadata: { width: number; height: number; size: number; format: string } }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let image = sharp(buffer);
  const metadata = await image.metadata();
  
  // Resize if larger than max dimensions
  if (metadata.width && metadata.height) {
    if (metadata.width > opts.maxWidth! || metadata.height > opts.maxHeight!) {
      image = image.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }
  
  // Convert to WebP with quality adjustment to meet size limit
  let quality = opts.quality!;
  let outputBuffer: Buffer;
  
  // Try to meet size constraint by reducing quality
  do {
    outputBuffer = await image
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer();
    
    const sizeKB = outputBuffer.length / 1024;
    
    if (sizeKB <= opts.maxSizeKB!) {
      break;
    }
    
    quality -= 10;
    if (quality < 30) {
      // If quality too low, reduce dimensions further
      const currentMeta = await sharp(outputBuffer).metadata();
      image = sharp(buffer).resize(
        Math.floor((currentMeta.width || opts.maxWidth!) * 0.7),
        Math.floor((currentMeta.height || opts.maxHeight!) * 0.7),
        { fit: 'inside' }
      );
      quality = opts.quality!;
    }
  } while (quality >= 30);
  
  const finalMetadata = await sharp(outputBuffer).metadata();
  
  return {
    buffer: outputBuffer,
    metadata: {
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      size: outputBuffer.length,
      format: 'webp',
    },
  };
}

/**
 * Validate file before processing
 * Blocks videos, large PDFs, large images
 */
export function validateFileUpload(
  file: { name: string; type: string; size: number }
): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB absolute max
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for images before optimization
  const MAX_PDF_SIZE = 1 * 1024 * 1024; // 1MB for PDFs
  
  // Block video files
  const blockedTypes = [
    'video/',
    'audio/',
    'application/x-msvideo',
    'application/x-shockwave-flash',
  ];
  
  if (blockedTypes.some(type => file.type.startsWith(type))) {
    return { valid: false, error: 'Video and audio files are not allowed. Please upload images only.' };
  }
  
  // Check file extension for additional security
  const blockedExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.mp3', '.wav', '.flac'];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (blockedExtensions.includes(ext)) {
    return { valid: false, error: 'This file type is not allowed.' };
  }
  
  // Size checks by type
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }
  
  if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Image too large. Maximum size is 2MB. Please resize before uploading.' };
  }
  
  if (file.type === 'application/pdf' && file.size > MAX_PDF_SIZE) {
    return { valid: false, error: 'PDF too large. Maximum size is 1MB. Please compress before uploading.' };
  }
  
  // Only allow specific file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
    return { valid: false, error: 'Invalid file type. Only images, PDFs, and Word documents are allowed.' };
  }
  
  return { valid: true };
}

/**
 * Generate optimized filename with timestamp
 */
export function generateOptimizedFilename(originalName: string): string {
  const timestamp = Date.now();
  const uuid = randomUUID().slice(0, 8);
  return `${timestamp}-${uuid}.webp`;
}

/**
 * Create placeholder/blurhash for loading states
 */
export async function createPlaceholder(buffer: Buffer): Promise<string> {
  try {
    const placeholder = await sharp(buffer)
      .resize(10, 10, { fit: 'fill' })
      .blur()
      .webp({ quality: 20 })
      .toBuffer();
    
    return `data:image/webp;base64,${placeholder.toString('base64')}`;
  } catch {
    return '';
  }
}
