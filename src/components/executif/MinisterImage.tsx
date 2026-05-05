'use client';

import { useState, useEffect } from 'react';

interface MinisterImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

export default function MinisterImage({ src, fallbackSrc, alt, className }: MinisterImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [errorCount, setErrorCount] = useState(0);

  // Reset error state if src changes
  useEffect(() => {
    setImgSrc(src);
    setErrorCount(0);
  }, [src]);

  const handleError = () => {
    if (errorCount === 0) {
      setImgSrc(fallbackSrc);
      setErrorCount(1);
    } else if (errorCount === 1) {
      // If even fallback fails, use a dead-simple placeholder
      setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=random&color=fff&size=512`);
      setErrorCount(2);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}

