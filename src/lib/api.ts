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
    const { data, error } = await supabase
      .from('petitions')
      .select('*')
      .eq('institution', 'AN')
      .order('signatures', { ascending: false })
      .limit(50);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getVotedLaws: async (limit = 20) => {
    const { data, error } = await supabase
      .from('scrutins')
      .select('*')
      .eq('type', 'LOI')
      .order('date_scrutin', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getScrutin: async (id: string) => {
    const { data, error } = await supabase.from('scrutins').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  getCalendarEvents: async () => {
    // Dynamic range to ensure we get relevant events without hitting row limits
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', oneWeekAgo)
      .lte('date', twoMonthsAhead)
      .order('date', { ascending: true })
      .limit(300);
    
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getContent: async (limit = 10, institution?: string) => {
    try {
      let query = supabase.from('content').select('*').limit(limit).order('created_at', { ascending: false });
      
      if (institution) {
        query = query.eq('institution', institution);
      }

      const { data, error } = await query;
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

  getProposals: async () => {
    // Les propositions en cours n'ont généralement pas de date d'adoption ni de contexte 'dossier_premium'
    const { data, error } = await supabase
      .from('laws')
      .select('*')
      .is('date_adopted', null)
      .neq('context', 'dossier_premium')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getPremiumDossiers: async (categoryFilter?: string | null) => {
    // Les dossiers premium sont des lois adoptées (avec date_adopted et context='dossier_premium')
    let query = supabase
      .from('laws')
      .select('*')
      .ilike('context', 'dossier_premium%')
      .order('date_adopted', { ascending: false });
      
    if (categoryFilter) {
      // Support for exact match or 'includes' match if category string contains multiple
      query = query.or(`category.eq.${categoryFilter},category.ilike.%${categoryFilter}%`);
    }

    const { data, error } = await query.limit(50);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getLaw: async (id: string) => {
    const { data, error } = await supabase.from('laws').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },
  
  getLawsByAuthor: async (authorName: string) => {
    // Search for the name with various common prefixes
    const searchTerms = [
      `%${authorName}%`,
      `%M. ${authorName}%`,
      `%Mme ${authorName}%`
    ];

    const { data, error } = await supabase
      .from('laws')
      .select('*')
      .or(`author.ilike.${searchTerms[0]},author.ilike.${searchTerms[1]},author.ilike.${searchTerms[2]}`)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return []; }
    return data || [];
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
  },

  getUserSavedItems: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_saved_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  saveItem: async (userId: string, itemId: string, itemType: 'scrutin' | 'law' | 'commune' | 'department' | 'region') => {
    const { data, error } = await supabase
      .from('user_saved_items')
      .upsert([{ user_id: userId, item_id: itemId, item_type: itemType }], { onConflict: 'user_id,item_id,item_type' })
      .select()
      .single();
    if (error) { throw new Error(error.message); }
    return data;
  },

  unsaveItem: async (userId: string, itemId: string, itemType: 'scrutin' | 'law' | 'commune' | 'department' | 'region') => {
    const { error } = await supabase
      .from('user_saved_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    if (error) { throw new Error(error.message); }
    return true;
  }

};
