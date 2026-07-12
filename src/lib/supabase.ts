import { createClient } from "@supabase/supabase-js";

// On récupère les clés mais on ne force pas le "!" pour éviter les crashs au build
const getValidSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.trim() === '' || url === 'undefined' || url === 'null' || !url.trim().toLowerCase().startsWith('http')) {
    return 'https://placeholder.supabase.co';
  }
  return url.trim();
};

const getValidSupabaseKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key.trim() === '' || key === 'undefined' || key === 'null') {
    return 'placeholder-key';
  }
  return key.trim();
};

const supabaseUrl = getValidSupabaseUrl();
const supabaseAnonKey = getValidSupabaseKey();

// Custom fetch wrapper to enforce a strict timeout during build time
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  // Detect if we are in the static build phase of Next.js or production build environment
  const isBuild = typeof window === 'undefined' && (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NODE_ENV === 'production'
  );
  
  const timeoutMs = isBuild ? 2500 : 15000; // 2.5s timeout during build to prevent hangs, 15s otherwise

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[Supabase Fetch] Request to ${url} timed out after ${timeoutMs}ms.`);
      controller.abort();
    }, timeoutMs);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
