"use client";

import { useGlossary } from "@/components/providers/GlossaryProvider";
import { ReactNode } from "react";

interface GlossaryTextProps {
  children: string | undefined;
  className?: string;
}

/**
 * A utility component that automatically wraps political terms in its children text
 * with hoverable definitions from the glossary database.
 */
export default function GlossaryText({ children, className }: GlossaryTextProps) {
  const { wrapWithGlossary } = useGlossary();

  if (!children) return null;

  return (
    <span className={className}>
      {wrapWithGlossary(children)}
    </span>
  );
}
