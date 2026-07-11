"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La section « Promesses » est remplacée par « Présidentielles 2027 ».
export default function PromessesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/presidentielles-2027/");
  }, [router]);
  return <div className="min-h-screen bg-slate-950" />;
}
