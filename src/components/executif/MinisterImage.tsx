'use client';

import { useState, useEffect } from 'react';

interface MinisterImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MinisterImage({ src, fallbackSrc, alt, className, style }: MinisterImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [errorCount, setErrorCount] = useState(0);

  // Reset if src changes
  useEffect(() => {
    setImgSrc(src);
    setErrorCount(0);
  }, [src]);

  const handleError = () => {
    if (errorCount === 0) {
      // Try fallback
      setImgSrc(fallbackSrc);
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
      style={style}
      onError={handleError}
      loading="lazy"
    />
  );
}
