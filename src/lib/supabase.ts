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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
