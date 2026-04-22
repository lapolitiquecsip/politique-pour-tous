import { supabase } from "./supabase";

/**
 * API Client — FULL SUPABASE MIGRATION (SERVERLESS)
 * 🏛️ Direct connection to Supabase DB, bypassing the need for Railway/Express.
 */

export const api = {
  health: async () => ({ status: 'ok', source: 'supabase-direct' }),

  getVocabulary: async () => {
    const { data, error } = await supabase.from('vocabulary').select('*').order('term');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getDeputies: async () => {
    const { data, error } = await supabase.from('deputies').select('*').order('last_name');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getDeputyBySlug: async (slug: string) => {
    const { data, error } = await supabase.from('deputies').select('*').eq('slug', slug).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  getSenators: async () => {
    const { data, error } = await supabase.from('senators').select('*').order('last_name');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getSenatorBySlug: async (slug: string) => {
    const { data, error } = await supabase.from('senators').select('*').eq('slug', slug).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  getPetitions: async () => {
    const { data, error } = await supabase.from('petitions').select('*').order('signatures', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getCalendarEvents: async () => {
    // Dynamic range to ensure we get relevant events without hitting row limits
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
    const sixMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', threeMonthsAgo)
      .lte('date', sixMonthsAhead)
      .order('date', { ascending: true });
    
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getContent: async (limit = 10) => {
    try {
      const { data, error } = await supabase.from('content').select('*').limit(limit).order('created_at', { ascending: false });
      if (error) { 
        console.warn('API Warning (Content):', error.message); 
        return []; 
      }
      return data || [];
    } catch (e) {
      console.error('API Error (Content):', e);
      return [];
    }
  },

  getPoliticians: async () => {
    const { data, error } = await supabase.from('politicians').select('*').order('last_name');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getPolitician: async (id: string) => {
    const { data, error } = await supabase.from('politicians').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  getPoliticianPromises: async (id: string) => {
    const { data, error } = await supabase.from('promises').select('*').eq('politician_id', id).order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getLaws: async () => {
    const { data, error } = await supabase.from('laws').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getLaw: async (id: string) => {
    const { data, error } = await supabase.from('laws').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  subscribeNewsletter: async (payload: { email: string, preferences: any, postal_code?: string, age?: string, csp?: string }) => {
    const { email, preferences, postal_code, age, csp } = payload;
    const { data, error } = await supabase
      .from('subscribers')
      .insert([{ 
        email, 
        preferences: { ...(preferences || {}), age, csp }, 
        postal_code: postal_code || null, 
        status: 'active' 
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error("Cet e-mail est déjà abonné.");
      throw new Error(error.message || "Erreur d'inscription.");
    }
    return data;
  },

  getProfile: async (email: string) => {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email)
      .single();
    if (error) {
      console.warn("Profile not found or error:", error.message);
      return null;
    }
    return data;
  },

  getSubscribers: async () => {
    const { data, error } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getPipelineLogs: async () => [], // Mode serverless : les logs de pipeline ne sont plus disponibles via Railway
  
  triggerAssembleePipeline: async () => ({ status: 'skipped', message: 'Pipeline requires a backend server. Run locally.' }),

  triggerAssembleePipelineByName: async (name: string) => ({ status: 'skipped', message: `Pipeline ${name} requires a backend server.` }),

  // --- USER ACTIVITY (VOte & Follow) ---
  
  getUserVotes: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_votes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  saveUserVote: async (userId: string, lawId: string, vote: string) => {
    const { data, error } = await supabase
      .from('user_votes')
      .upsert([{ user_id: userId, law_id: lawId, vote }], { onConflict: 'user_id,law_id' })
      .select()
      .single();
    if (error) { throw new Error(error.message); }
    return data;
  },

  getLawVoteStats: async (lawId: string) => {
    const { data, error } = await supabase
      .from('user_votes')
      .select('vote')
      .eq('law_id', lawId);
    
    if (error) {
      console.error("Erreur stats vote:", error);
      return { POUR: 0, CONTRE: 0, ABSTENTION: 0, total: 0 };
    }

    const stats = { POUR: 0, CONTRE: 0, ABSTENTION: 0, total: data.length };
    data.forEach((v: any) => {
      if (v.vote === 'POUR') stats.POUR++;
      else if (v.vote === 'CONTRE') stats.CONTRE++;
      else if (v.vote === 'ABSTENTION') stats.ABSTENTION++;
    });
    return stats;
  },

  getUserFollows: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*, deputies(*)')
      .eq('user_id', userId);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  followDeputy: async (userId: string, deputyId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .insert([{ user_id: userId, deputy_id: deputyId }])
      .select()
      .single();
    if (error) { throw new Error(error.message); }
    return data;
  },

  unfollowDeputy: async (userId: string, deputyId: string) => {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('user_id', userId)
      .eq('deputy_id', deputyId);
    if (error) { throw new Error(error.message); }
    return true;
  },


  getVotesByDeputy: async (anId: string) => {
    // Note: We filter for type 'LOI' as requested, to avoid useless amendment noise.
    // 'scrutins!inner' allows filtering on the related table
    const { data, error } = await supabase
      .from('deputy_votes')
      .select('*, scrutins!inner(id, numero, date_scrutin, objet, resultat, type, category, summary, why_it_matters)')
      .eq('deputy_an_id', anId)
      .in('scrutins.type', ['LOI', 'ARTICLE'])
      .order('date_scrutin', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.error("Erreur récupération votes député:", error);
      return [];
    }

    return data || [];
  }
};
