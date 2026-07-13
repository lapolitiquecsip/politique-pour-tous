import { supabase } from "./supabase";
import type { LegislativeCategory, LegislativeDossierDetail, LegislativeListItem } from "./legislative";
import { parseInitiators, normalizeName } from "./initiators";

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

  getRecentPetitions: async () => {
    const { data, error } = await supabase
      .from('petitions')
      .select('*')
      .eq('institution', 'AN')
      .order('created_at', { ascending: false })
      .limit(20);
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
      let query = supabase.from('content').select('*').limit(limit).order('date_publication', { ascending: false }).order('created_at', { ascending: false });
      
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
  
  getTerritories: async (type?: 'region' | 'department') => {
    let query = supabase.from('territories').select('*').order('name');
    if (type) {
      query = query.eq('type', type);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Territories table not found or empty, falling back to local data.");
      return [];
    }
    return data || [];
  },

  getPolitician: async (id: string) => {
    const { data, error } = await supabase.from('politicians').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  getPoliticianPromises: async (id: string) => {
    const { data, error } = await supabase.rpc('public_promises', { p_politician: id, p_status: null, p_offset: 0, p_limit: 100 });
    if (error) { console.error(error); return []; }
    return (data || []).map((item: any) => ({
      id: item.id,
      citation: item.statement,
      status: item.assessment?.status,
      date_made: item.made_at,
      category: item.category,
      source_url: item.primary_source_url,
      actions: (item.evidence || []).map((evidence: any) => evidence.title),
      justification: item.assessment?.justification,
    }));
  },

  getTerritory: async (code: string) => {
    const { data, error } = await supabase.rpc('public_territory', { p_code: code });
    if (error) { console.error(error); return null; }
    return data;
  },

  getTerritoryIndicators: async (code: string, domain?: string) => {
    const { data, error } = await supabase.rpc('public_territory_indicators', { p_code: code, p_domain: domain || null });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getDataFreshness: async (domain?: string) => {
    const { data, error } = await supabase.rpc('public_data_freshness', { p_domain: domain || null });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getGovernment: async (date?: string) => {
    const { data, error } = await supabase.rpc('public_government', { p_date: date || new Date().toISOString().slice(0, 10) });
    if (error) { console.error(error); return null; }
    return data;
  },

  getStateBudget: async (year: number) => {
    const { data, error } = await supabase.rpc('public_state_budget', { p_year: year });
    if (error) { console.error(error); return null; }
    return data;
  },

  getElectionResults: async (election: string, round: number, territory?: string, offset = 0, limit = 100) => {
    const { data, error } = await supabase.rpc('public_elections', { p_election: election, p_round: round, p_territory: territory || null, p_offset: offset, p_limit: limit });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getPromulgatedLaws: async (filters: { category?: LegislativeCategory | null; search?: string; cursorDate?: string; cursorId?: string; limit?: number } = {}) => {
    const { data, error } = await supabase.rpc('public_promulgated_laws', {
      p_category: filters.category || null,
      p_search: filters.search?.trim() || null,
      p_cursor_date: filters.cursorDate || null,
      p_cursor_id: filters.cursorId || null,
      p_limit: filters.limit || 20,
    });
    if (error) throw error;
    return (data || []) as LegislativeListItem[];
  },

  getLegislativeDossiers: async (filters: { status?: string; chamber?: string; category?: LegislativeCategory | null; search?: string; cursorDate?: string; cursorId?: string; limit?: number } = {}) => {
    const { data, error } = await supabase.rpc('public_legislative_dossiers', {
      p_status: filters.status || null,
      p_chamber: filters.chamber || null,
      p_category: filters.category || null,
      p_search: filters.search?.trim() || null,
      p_cursor_date: filters.cursorDate || null,
      p_cursor_id: filters.cursorId || null,
      p_limit: filters.limit || 20,
    });
    if (error) throw error;
    return (data || []) as LegislativeListItem[];
  },

  getLegislativeDossier: async (id: string) => {
    const { data, error } = await supabase.rpc('public_legislative_dossier', { p_id: id });
    if (error) throw error;
    return data as LegislativeDossierDetail | null;
  },

  getProposals: async () => {
    // Les propositions en cours n'ont généralement pas de date d'adoption ni de contexte 'dossier_premium'
    const { data, error } = await supabase
      .from('laws')
      .select('*')
      .is('date_adopted', null)
      .neq('context', 'dossier_premium')
      .order('created_at', { ascending: false })
      .limit(5000);
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

    const { data: laws, error } = await query.limit(50);
    if (error) { console.error(error); return []; }
    if (!laws) return [];
    
    // Enrich with actual vote counts from scrutins table
    const scrutinIds = laws
      .map(l => l.context?.startsWith('dossier_premium:') ? l.context.split(':')[1] : null)
      .filter(Boolean);
      
    if (scrutinIds.length > 0) {
      const { data: scrutins, error: sError } = await supabase
        .from('scrutins')
        .select('id, pour, contre, abstention, group_results')
        .in('id', scrutinIds);
        
      if (!sError && scrutins) {
        return laws.map(law => {
          if (law.context?.startsWith('dossier_premium:')) {
            const sid = law.context.split(':')[1];
            const s = scrutins.find((x: any) => x.id === sid);
            if (s) {
              law.scrutin_data = s;
            }
          }
          return law;
        });
      }
    }

    return laws;
  },

  getLaw: async (id: string) => {
    const { data, error } = await supabase.from('laws').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },
  
  getItddIndicators: async (level: 'region' | 'department' | 'commune', code: string) => {
    const { data, error } = await supabase
      .from('itdd_indicators')
      .select('variable,sub_field,year,value,unit,label,odd')
      .eq('level', level)
      .eq('territory_code', code)
      .order('year');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getRegionFinances: async (regionCode: string) => {
    const { data, error } = await supabase
      .from('region_finances')
      .select('year,indicator,montant_millions,euros_par_habitant')
      .eq('region_code', regionCode)
      .order('year');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getCandidates: async () => {
    const { data, error } = await supabase
      .from('presidential_candidates')
      .select('*')
      .eq('status', 'declared')
      .order('full_name');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  // --- Fil conducteur : relier une même personne entre ses différentes pages ---

  // Cette personne (nom complet) est-elle candidate déclarée à la présidentielle ?
  findCandidateByName: async (fullName: string) => {
    const target = normalizeName(fullName);
    if (!target) return null;
    const { data, error } = await supabase
      .from('presidential_candidates')
      .select('slug, full_name, political_side, party')
      .eq('status', 'declared');
    if (error || !data) return null;
    return data.find((c: any) => normalizeName(c.full_name) === target) ?? null;
  },

  // Cette personne (nom complet) a-t-elle une fiche député ou sénateur ?
  findMandateByName: async (fullName: string) => {
    const target = normalizeName(fullName);
    if (!target) return null;
    const parts = fullName.trim().split(/\s+/);
    const lastToken = parts[parts.length - 1] || fullName;
    for (const [table, type] of [['deputies', 'depute'], ['senators', 'senateur']] as const) {
      const { data } = await supabase
        .from(table)
        .select('slug, first_name, last_name')
        .ilike('last_name', `%${lastToken}%`);
      const hit = (data || []).find((p: any) => normalizeName(`${p.first_name} ${p.last_name}`) === target);
      if (hit) return { type, slug: hit.slug };
    }
    return null;
  },

  getCandidateNews: async (candidateId: string) => {
    const { data, error } = await supabase
      .from('candidate_news')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('date', { ascending: false })
      .limit(50);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  getLawsByAuthor: async (authorName: string) => {
    // Les dossiers législatifs relient l'auteur via le champ texte author_name.
    // On pré-filtre par le nom de famille (ilike), puis on confirme côté client que
    // l'élu figure bien parmi les initiateurs analysés — automatique pour toute
    // nouvelle proposition synchronisée dans legislative_dossiers.
    const parts = authorName.trim().split(/\s+/);
    const lastName = parts[parts.length - 1] || authorName;

    const { data, error } = await supabase
      .from('legislative_dossiers')
      .select('id,title,status_label,text_type,author_name,latest_step_at')
      .ilike('author_name', `%${lastName}%`)
      .order('latest_step_at', { ascending: false, nullsFirst: false });

    if (error) { console.error(error); return []; }

    const target = normalizeName(authorName);
    return (data || [])
      .filter((dossier: any) => parseInitiators(dossier.author_name).some(name => normalizeName(name) === target))
      .map((dossier: any) => ({ id: dossier.id, title: dossier.title, timeline: dossier.status_label }));
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
    try {
      const { data, error } = await supabase
        .from('user_votes')
        .select('*, laws(*), scrutins(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Retrying getUserVotes without relations...");
      const { data, error } = await supabase
        .from('user_votes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data || [];
    }
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
  },

  // Formulaire de contact — insert direct Supabase (site statique, pas de backend).
  // RLS autorise l'insert anon uniquement ; pas de .select() (aucune lecture publique).
  sendContactMessage: async (payload: { name: string; email: string; subject: string; message: string }) => {
    const { error } = await supabase.from('contact_messages').insert(payload);
    if (error) { throw new Error(error.message); }
    return true;
  },

  // Détail territorial (région/département/commune) en direct Supabase — remplace l'ancien
  // endpoint Express /api/comparateur/:code (backend absent sur l'hébergement statique GitHub Pages).
  // Réplique le mapping canonique du backend (routes/comparateur.ts).
  getTerritoryDetail: async (code: string, name?: string) => {
    const [{ data: territory, error: tErr }, { data: indicators, error: iErr }] = await Promise.all([
      supabase.rpc('public_territory', { p_code: code }),
      supabase.rpc('public_territory_indicators', { p_code: code, p_domain: null }),
    ]);
    if (tErr || iErr || !territory) { console.error(tErr || iErr || 'Territoire absent du référentiel'); return null; }
    const payload: any = {
      id: territory.code, name: territory.name || name, type: territory.type,
      demographie: {}, economie: {}, education: {}, sante: {}, securite: {}, logement: {}, finances: {}, environnement: {},
      source_urls: territory.source_urls || [], source_updated_at: territory.source_updated_at,
      collected_at: territory.collected_at, data_freshness: territory.data_freshness,
      quality_status: territory.quality_status, isEstimated: false,
    };
    const mappings: Record<string, [string, string]> = {
      populationTotal: ['demographie', 'populationTotal'], densite: ['demographie', 'densite'], evolution10ans: ['demographie', 'evolution10ans'], moins25ans: ['demographie', 'moins25ans'], plus65ans: ['demographie', 'plus65ans'],
      chomage: ['economie', 'chomage'], revenuMedian: ['economie', 'revenuMedian'], pauvrete: ['economie', 'pauvrete'],
      bac: ['education', 'bac'], diplomesSup: ['education', 'diplomesSup'], decrochage: ['education', 'decrochage'], education_bac_success: ['education', 'bac'],
      medecins10k: ['sante', 'medecins10k'], scoreAPL: ['sante', 'scoreAPL'], health_apl_gp: ['sante', 'scoreAPL'], esperanceVie: ['sante', 'esperanceVie'],
      atteintesPersonnes: ['securite', 'atteintesPersonnes'], atteintesBiens: ['securite', 'atteintesBiens'], security_violence_rate: ['securite', 'atteintesPersonnes'], security_theft_burglary_rate: ['securite', 'atteintesBiens'],
      prixM2: ['logement', 'prixM2'], logementsSociaux: ['logement', 'logementsSociaux'], proprietaires: ['logement', 'proprietaires'], housing_sale_price_m2: ['logement', 'prixM2'], housing_social_share: ['logement', 'logementsSociaux'],
      budgetHabitant: ['finances', 'budgetHabitant'], endettement: ['finances', 'endettement'], investissement: ['finances', 'investissement'],
      qualiteAir: ['environnement', 'qualiteAir'], surfaceNaturelle: ['environnement', 'surfaceNaturelle'], risques: ['environnement', 'risques'], environment_atmo_mean_index: ['environnement', 'qualiteAir'], environment_risk_exposure_level: ['environnement', 'risques'], environment_major_risk_count: ['environnement', 'nombreRisques'],
    };
    const newest = new Map<string, any>();
    for (const indicator of (indicators || []) as any[]) {
      const current = newest.get(indicator.indicator_code);
      if (!current || indicator.reference_year > current.reference_year) newest.set(indicator.indicator_code, indicator);
    }
    payload.indicator_provenance = {};
    for (const [icode, indicator] of newest) {
      const mapping = mappings[icode];
      if (!mapping) continue;
      payload[mapping[0]][mapping[1]] = indicator.value;
      payload.indicator_provenance[icode] = { reference_year: indicator.reference_year, unit: indicator.unit, methodology_version: indicator.methodology_version, source_urls: indicator.source_urls, quality_status: indicator.quality_status };
      payload.source_urls.push(...(indicator.source_urls || []));
    }
    payload.source_urls = [...new Set(payload.source_urls)];
    payload.sources = payload.source_urls.join(' | ');
    return payload;
  }

};
