import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetcher(endpoint: string) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Fetch API Error on ${endpoint}:`, error);
    return []; // Return empty array on failure
  }
}

export const api = {
  health: async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error("API Error (health):", error);
      throw error;
    }
  },
  getVocabulary: async () => fetcher('/vocabulary'),
  getDeputies: async () => fetcher('/deputies'),
  getCalendarEvents: async () => fetcher('/calendar'),
  getContent: async (limit = 10) => fetcher(`/content?limit=${limit}`),
  getPoliticians: async () => fetcher('/politicians'),
  getPolitician: async (id: string) => fetcher(`/politicians/${id}`),
  getPoliticianPromises: async (id: string) => fetcher(`/politicians/${id}/promises`),
  getLaws: async () => fetcher('/laws'),
  getLaw: async (id: string) => fetcher(`/laws/${id}`),
  subscribeNewsletter: async (payload: { email: string, preferences: any, postal_code?: string }) => {
    const { email, preferences, postal_code } = payload;
    
    const { data, error } = await supabase
      .from('subscribers')
      .insert([
        { 
          email, 
          preferences: preferences || {},
          postal_code: postal_code || null,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error("Cet e-mail est déjà abonné.");
      }
      throw new Error(error.message || "Une erreur est survenue lors de l'inscription.");
    }
    
    return data;
  },
  getSubscribers: async () => fetcher('/subscribers'),
  getPipelineLogs: async () => fetcher('/admin/pipeline-logs'),
  triggerAssembleePipeline: async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    const res = await fetch(`${API_URL}/admin/run-pipeline?name=assemblee`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Pipeline error");
    }
    return res.json();
  }
};
