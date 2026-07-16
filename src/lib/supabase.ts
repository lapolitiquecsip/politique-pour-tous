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
  
  const timeoutMs = isBuild ? 30000 : 15000; // 30s au build (CI + grosses requêtes) pour éviter des pages vides, 15s sinon

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

// La session doit persister DANS LE NAVIGATEUR (localStorage) pour rester connecté,
// mais pas au build/SSR (pas de window) → sinon on est déconnecté à chaque re-vérif.
const isBrowser = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
