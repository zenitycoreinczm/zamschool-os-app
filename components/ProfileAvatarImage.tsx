"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { isNextImageCompatibleUrl } from "@/lib/remote-image-hosts";
import { isProtectedAvatarUrl } from "@/lib/avatar-url";

type ProfileAvatarImageProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  fallback?: ReactNode;
};

export function ProfileAvatarImage(props: ProfileAvatarImageProps) {
  return <ProfileAvatarImageInner key={props.src?.trim() || ""} {...props} />;
}

function ProfileAvatarImageInner({
  src,
  alt,
  width,
  height,
  className,
  priority,
  fallback = null,
}: ProfileAvatarImageProps) {
  const [broken, setBroken] = useState(false);

  if (!src?.trim() || broken) {
    return <>{fallback}</>;
  }

  const normalizedSrc = src.trim();

  // Protected avatar URLs are authenticated API routes that must use <img>
  // because next/image optimization strips auth cookies.
  if (isProtectedAvatarUrl(normalizedSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- authenticated avatar proxy
      <img
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }

  if (isNextImageCompatibleUrl(normalizedSrc)) {
    return (
      <Image
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        referrerPolicy="no-referrer"
        priority={priority}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- host not in next/image remotePatterns (legacy/private R2 URLs)
    <img
      src={normalizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}