'use client';

import { useState, useEffect } from 'react';

interface MinisterImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

export default function MinisterImage({ src, fallbackSrc, alt, className }: MinisterImageProps) {
  // Wikipedia image proxy to avoid Referer/CORS issues
  const getProxiedUrl = (url: string) => {
    if (url.includes('upload.wikimedia.org')) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace('https://', ''))}&w=800&h=800&fit=cover&output=webp`;
    }
    return url;
  };

  const [imgSrc, setImgSrc] = useState(getProxiedUrl(src));
  const [errorCount, setErrorCount] = useState(0);

  // Reset if src changes
  useEffect(() => {
    setImgSrc(getProxiedUrl(src));
    setErrorCount(0);
  }, [src]);

  const handleError = () => {
    if (errorCount === 0) {
      // Try fallback (proxied if it's a URL)
      setImgSrc(getProxiedUrl(fallbackSrc));
      setErrorCount(1);
    } else if (errorCount === 1) {
      // Last resort: UI Avatar with premium look
      setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=0D8ABC&color=fff&size=512&bold=true`);
      setErrorCount(2);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}
