import { supabase } from "./supabase";
import type { LegislativeCategory, LegislativeDossierDetail, LegislativeListItem } from "./legislative";
import { parseInitiators, normalizeName } from "./initiators";

/**
 * API Client — FULL SUPABASE MIGRATION (SERVERLESS)
 * 🏛️ Direct connection to Supabase DB, bypassing the need for Railway/Express.
 */

/**
 * Finances locales réelles (OFGL) — commune ou département.
 * Sélectionne toujours le millésime le plus récent présent en base, pour que le site
 * suive automatiquement l'évolution des données (ex. passage 2024 → 2025).
 */
async function fetchLocalFinances(table: 'commune_finances' | 'department_finances', codeColumn: 'insee_code' | 'dep_code', code: string) {
  if (!code) return null;
  const { data, error } = await supabase
    .from(table)
    .select(table === 'department_finances'
      ? 'indicator, montant, euros_par_habitant, source_url, year, entity_note'
      : 'indicator, montant, euros_par_habitant, source_url, year')
    .eq(codeColumn, code)
    .order('year', { ascending: false });
  if (error || !data || data.length === 0) return null;
  const year = (data as any[])[0].year;
  const rows = (data as any[]).filter(r => r.year === year);
  const m: Record<string, number> = {};
  const eph: Record<string, number> = {};
  let source_url = '';
  let entity_note: string | null = null;
  for (const r of rows) {
    m[r.indicator] = Number(r.montant);
    eph[r.indicator] = r.euros_par_habitant != null ? Number(r.euros_par_habitant) : NaN;
    if (r.source_url) source_url = r.source_url;
    if (r.entity_note) entity_note = r.entity_note;
  }
  const get = (k: string) => (k in m ? m[k] : null);
  const getEph = (k: string) => (Number.isFinite(eph[k]) ? eph[k] : null);
  return {
    year,
    recettes: get('recettes_fonctionnement'), recettes_hab: getEph('recettes_fonctionnement'),
    depenses: get('depenses_fonctionnement'), depenses_hab: getEph('depenses_fonctionnement'),
    epargne: get('epargne_brute'), epargne_hab: getEph('epargne_brute'),
    investissement: get('depenses_investissement'), investissement_hab: getEph('depenses_investissement'),
    encours_dette: get('encours_dette'), encours_dette_hab: getEph('encours_dette'),
    // Action sociale — spécifique aux départements (absent pour les communes).
    rsa: get('allocations_rsa'), rsa_hab: getEph('allocations_rsa'),
    apa: get('allocations_apa'), apa_hab: getEph('allocations_apa'),
    pch: get('allocations_pch'), pch_hab: getEph('allocations_pch'),
    entity_note,
    source_url,
  };
}

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

  // Eurodéputés (députés européens français).
  getMeps: async () => {
    const { data, error } = await supabase
      .from('meps')
      .select('id, full_name, first_name, last_name, slug, photo_url, national_party, ep_group, ep_group_code, country')
      .order('last_name');
    if (error) { console.error(error); return []; }
    return data || [];
  },
  getMepBySlug: async (slug: string) => {
    const { data, error } = await supabase.from('meps').select('*').eq('slug', slug).maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  },
  // Historique de votes d'un eurodéputé (votes principaux du Parlement européen).
  getMepVotes: async (mepId: string, opts?: { limit?: number; offset?: number; onlyMain?: boolean }) => {
    if (!mepId) return [];
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let q = supabase
      .from('mep_votes')
      .select('vote_id, title, reference, voted_at, position, result, url, is_main')
      .eq('mep_id', mepId);
    if (opts?.onlyMain) q = q.eq('is_main', true);
    const { data, error } = await q
      .order('voted_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error || !data) return [];
    return data;
  },

  // Présidents des conseils départementaux.
  getDepartmentPresidents: async () => {
    const { data, error } = await supabase.from('department_presidents').select('dep_code, dep_name, full_name, slug, photo_url, party').order('dep_name');
    if (error) { console.error(error); return []; }
    return data || [];
  },
  getDepartmentPresidentByDep: async (depCode: string) => {
    if (!depCode) return null;
    const { data } = await supabase.from('department_presidents').select('dep_code, full_name, slug, photo_url').eq('dep_code', depCode).maybeSingle();
    return data;
  },
  getDepartmentPresidentBySlug: async (slug: string) => {
    const { data } = await supabase.from('department_presidents').select('*').eq('slug', slug).maybeSingle();
    return data;
  },

  // Maires — fiche détaillée par commune (code INSEE) ou par slug.
  getMayorByInsee: async (insee: string) => {
    if (!insee) return null;
    const { data } = await supabase.from('mayors').select('*').eq('insee_code', insee).maybeSingle();
    return data;
  },
  getMayorBySlug: async (slug: string) => {
    if (!slug) return null;
    const { data } = await supabase.from('mayors').select('*').eq('slug', slug).maybeSingle();
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
    // maybeSingle : un identifiant orphelin (favori d'un ancien schéma) est un cas normal,
    // pas une erreur — .single() faisait remonter une exception à chaque fois.
    if (!id) return null;
    const { data, error } = await supabase.from('scrutins').select('*').eq('id', id).maybeSingle();
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

  // Fiche détaillée d'un membre du gouvernement (bio Wikipédia + IA).
  getMinisterBySlug: async (slug: string) => {
    const { data, error } = await supabase.from('minister_profiles').select('*').eq('slug', slug).single();
    if (error) return null;
    return data;
  },
  getMinisters: async () => {
    const { data, error } = await supabase.from('minister_profiles').select('slug, full_name, normalized_name, photo_url');
    if (error || !data) return [];
    return data;
  },
  // Résout un nom de ministre vers sa fiche (slug), pour rendre le nom cliquable.
  findMinisterByName: async (fullName: string) => {
    if (!fullName) return null;
    const target = fullName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const { data } = await supabase.from('minister_profiles').select('slug, normalized_name, full_name');
    return (data || []).find((m: any) => m.normalized_name === target) ?? null;
  },
  // Répartition du budget par programme d'une mission (PLF 2026).
  getMinistryProgrammes: async (missionName: string) => {
    if (!missionName) return [];
    const { data, error } = await supabase
      .from('state_budget_programmes')
      .select('programme_name, programme_num, amount_2026')
      .eq('mission_name', missionName)
      .order('amount_2026', { ascending: false });
    if (error || !data) return [];
    return data;
  },

  // Finances réelles d'une commune (source OFGL, agrégée dans commune_finances).
  // Renvoie le millésime le plus récent disponible pour cette commune.
  getCommuneFinances: async (inseeCode: string) =>
    fetchLocalFinances('commune_finances', 'insee_code', inseeCode),

  // Finances réelles d'un département (source OFGL, agrégée dans department_finances).
  // Même forme que getCommuneFinances : millésime le plus récent disponible.
  // Le script de sync écrit déjà les lignes sur les codes utilisés par le site (67 et 68 pour
  // la Collectivité européenne d'Alsace ; 2A/2B, 972, 973 pour les collectivités uniques,
  // reprises de la base régions), chacune avec son entity_note. Aucune correspondance de code
  // n'est donc nécessaire ici.
  getDepartmentFinances: async (depCode: string) =>
    fetchLocalFinances('department_finances', 'dep_code', depCode),

  // Fiscalité locale d'une commune (REI) : taux votés + produits de la part communale.
  // Millésime le plus récent en base (le REI est publié plus tôt que les comptes OFGL).
  getCommuneFiscalite: async (inseeCode: string) => {
    if (!inseeCode) return null;
    const { data, error } = await supabase
      .from('commune_fiscalite')
      .select('indicator, valeur, source_url, year')
      .eq('insee_code', inseeCode)
      .order('year', { ascending: false });
    if (error || !data || data.length === 0) return null;
    const year = (data as any[])[0].year;
    const rows = (data as any[]).filter(r => r.year === year);
    const v: Record<string, number> = {};
    let source_url = '';
    for (const r of rows) { v[r.indicator] = Number(r.valeur); if (r.source_url) source_url = r.source_url; }
    const get = (k: string) => (k in v && Number.isFinite(v[k]) ? v[k] : null);
    return {
      year,
      taux_fb: get('taux_fb'), produit_fb: get('produit_fb'),
      taux_th: get('taux_th'), produit_th: get('produit_th'),
      taux_fnb: get('taux_fnb'), produit_fnb: get('produit_fnb'),
      source_url,
    };
  },

  // Publications de la présidence (elysee.fr) par type : conseil_ministres, discours,
  // deplacement, actualite. Tri antéchronologique.
  getElyseePublications: async (type: string, limit = 6) => {
    const { data, error } = await supabase
      .from('elysee_publications')
      .select('id, type, title, url, published_at, summary')
      .eq('type', type)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data;
  },

  // Programme présidentiel et son avancement.
  // ATTENTION : `engagement`/`theme` sont des faits (programme officiel), mais
  // `status`/`justification` sont générés par IA (ai_generated) — le front doit le dire.
  getPresidentialProgram: async (year = 2022) => {
    const { data, error } = await supabase
      .from('presidential_program')
      .select('id, pacte, theme, engagement, source_url, status, justification, ai_generated, assessed_at, evidence, evidence_count, certitudes, arguments_pour, arguments_contre, confidence, verified')
      .eq('year', year);
    if (error || !data) return [];
    return data;
  },

  // Vrais votes d'un sénateur (scrutins solennels du Sénat).
  // Côté Sénat, le votant est identifié par son nom (pas d'id commun avec notre table),
  // d'où le rapprochement par nom insensible à la casse + filtre chambre = SENAT.
  getSenatorVotes: async (firstName: string, lastName: string, limit = 12) => {
    const name = `${firstName || ''} ${lastName || ''}`.trim();
    if (!name) return [];
    const { data, error } = await supabase
      .from('legislative_votes')
      .select('id, position, legislative_scrutins!inner(title, voted_at, chamber)')
      .ilike('voter_name', name)
      .eq('legislative_scrutins.chamber', 'SENAT')
      .limit(200);
    if (error || !data) return [];
    const STYLE: Record<string, { vote: string; color: string; bg: string }> = {
      for:        { vote: 'POUR',        color: 'text-emerald-600', bg: 'bg-emerald-50' },
      against:    { vote: 'CONTRE',      color: 'text-red-600',     bg: 'bg-red-50' },
      abstention: { vote: 'ABSTENTION',  color: 'text-slate-600',   bg: 'bg-slate-100' },
      non_voting: { vote: "N'a pas voté", color: 'text-slate-400', bg: 'bg-slate-50' },
    };
    return (data as any[])
      .map(r => {
        const sc = r.legislative_scrutins || {};
        const st = STYLE[String(r.position || '').toLowerCase()] || STYLE.abstention;
        const d = sc.voted_at ? new Date(sc.voted_at) : null;
        return {
          id: r.id,
          title: sc.title || 'Scrutin',
          _ts: d ? d.getTime() : 0,
          date: d ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '',
          ...st,
        };
      })
      .sort((a, b) => b._ts - a._ts)
      .slice(0, limit);
  },

  // Fil de notifications de l'utilisateur (votes de ses élus suivis).
  getNotifications: async (userId: string, limit = 30) => {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id, type, title, detail, position, event_at, read, created_at, deputy_id, senator_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  },
  getUnreadNotificationCount: async (userId: string) => {
    const { count, error } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  },
  markNotificationsRead: async (userId: string, ids?: string[]) => {
    let q = supabase.from('user_notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    if (ids && ids.length) q = q.in('id', ids);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return true;
  },

  // Fil vidéo de la présidence (chaîne YouTube officielle de l'Élysée).
  getElyseeVideos: async (limit = 12) => {
    const { data, error } = await supabase
      .from('elysee_videos')
      .select('video_id, title, published_at, url, thumbnail_url, description')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data;
  },

  // Derniers décrets d'un ministère (filtre par mots-clés du nom du ministère).
  getDecreesForMinistry: async (keywords: string[], limit = 5) => {
    if (!keywords.length) return [];
    const or = keywords.map(k => `title.ilike.*${k}*`).join(',');
    const { data, error } = await supabase.from('decrees').select('jorf_id, title, decree_type, date_publi, source_url, summary').or(or).order('date_publi', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data;
  },

  // Derniers décrets publiés au Journal Officiel (source DILA, sans IA).
  getDecrees: async (limit = 6) => {
    const { data, error } = await supabase
      .from('decrees')
      .select('jorf_id, title, decree_type, date_publi, source_url, summary')
      .order('date_publi', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
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
    // laws.id est un uuid : d'anciens votes référencent encore des slugs (« loi-immigration »).
    // Sans ce garde-fou, Postgres renvoie une erreur 22P02 et pollue la console à chaque appel.
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    const { data, error } = await supabase.from('laws').select('*').eq('id', id).maybeSingle();
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

  // Synthèse du dernier millésime pour une région, au même format que les communes et
  // les départements (LocalFinancesSection). region_finances stocke des millions d'euros,
  // on repasse en euros pour homogénéiser l'affichage.
  getRegionFinancesSummary: async (regionCode: string) => {
    const { data, error } = await supabase
      .from('region_finances')
      .select('year,indicator,montant_millions,euros_par_habitant')
      .eq('region_code', regionCode)
      .order('year', { ascending: false });
    if (error || !data || data.length === 0) return null;
    const year = (data as any[])[0].year;
    const rows = (data as any[]).filter(r => r.year === year);
    const m: Record<string, number> = {};
    const eph: Record<string, number> = {};
    for (const r of rows) {
      if (r.montant_millions != null) m[r.indicator] = Number(r.montant_millions) * 1e6;
      eph[r.indicator] = r.euros_par_habitant != null ? Number(r.euros_par_habitant) : NaN;
    }
    const get = (k: string) => (k in m ? m[k] : null);
    const getEph = (k: string) => (Number.isFinite(eph[k]) ? eph[k] : null);
    return {
      year,
      recettes: get('recettes_fonctionnement'), recettes_hab: getEph('recettes_fonctionnement'),
      depenses: get('depenses_fonctionnement'), depenses_hab: getEph('depenses_fonctionnement'),
      epargne: get('epargne_brute'), epargne_hab: getEph('epargne_brute'),
      investissement: get('depenses_investissement'), investissement_hab: getEph('depenses_investissement'),
      encours_dette: get('encours_dette'), encours_dette_hab: getEph('encours_dette'),
      // Renseigné uniquement pour les collectivités uniques (Corse…).
      rsa: get('allocations_rsa'), rsa_hab: getEph('allocations_rsa'),
      apa: get('allocations_apa'), apa_hab: getEph('allocations_apa'),
      pch: get('allocations_pch'), pch_hab: getEph('allocations_pch'),
      entity_note: null as string | null,
      source_url: 'https://data.ofgl.fr/explore/dataset/ofgl-base-regions/',
    };
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

  // Députés d'un département (par nom de département) — pour le fil conducteur local ↔ élus.
  getDeputiesByDepartment: async (departmentName: string) => {
    const { data, error } = await supabase
      .from('deputies')
      .select('slug, first_name, last_name, party, constituency_number, an_id, photo_url')
      .eq('department', departmentName)
      .order('constituency_number');
    if (error || !data) return [];
    return data;
  },

  // Sénateurs d'un département (par nom de département).
  getSenatorsByDepartment: async (departmentName: string) => {
    const { data, error } = await supabase
      .from('senators')
      .select('slug, first_name, last_name, party')
      .eq('department', departmentName)
      .order('last_name');
    if (error || !data) return [];
    return data;
  },

  // Explications concrètes des affaires judiciaires (générées + mises en cache côté backend).
  getLegalExplanations: async (caseKeys: string[]) => {
    if (!caseKeys.length) return {} as Record<string, string>;
    const { data, error } = await supabase
      .from('legal_case_explanations')
      .select('case_key, explanation')
      .in('case_key', caseKeys);
    if (error || !data) return {} as Record<string, string>;
    return Object.fromEntries(data.map((r: any) => [r.case_key, r.explanation])) as Record<string, string>;
  },

  // Historique d'un parti (adhérents + résultats électoraux).
  getPartyHistory: async (slug: string) => {
    const { data, error } = await supabase
      .from('party_history')
      .select('kind, year, value, label, source')
      .eq('party_slug', slug)
      .order('year');
    if (error || !data) return [];
    return data;
  },

  // --- Fiches partis ---
  getParties: async () => {
    const { data, error } = await supabase.from('political_parties').select('*').order('effectif', { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data;
  },

  getPartyBySlug: async (slug: string) => {
    const { data, error } = await supabase.from('political_parties').select('*').eq('slug', slug).single();
    if (error) return null;
    return data;
  },

  // Résout la valeur `party` d'un élu/candidat vers sa fiche parti, via les alias.
  findPartyByAlias: async (value: string | null | undefined) => {
    if (!value) return null;
    const target = value.trim().toLowerCase();
    const { data, error } = await supabase.from('political_parties').select('slug, name, abbrev, color, aliases');
    if (error || !data) return null;
    return data.find((p: any) => (p.aliases || []).some((a: string) => a.toLowerCase() === target)) ?? null;
  },

  // Membres d'un parti (députés / sénateurs / candidats) via ses alias.
  getPartyMembers: async (aliases: string[]) => {
    if (!aliases?.length) return { deputies: [], senators: [], candidates: [], meps: [] };
    const lower = new Set(aliases.map(a => a.toLowerCase()));
    const [dep, sen, cand, mepsAll] = await Promise.all([
      supabase.from('deputies').select('slug, first_name, last_name, party, an_id, photo_url, department').in('party', aliases).order('last_name'),
      supabase.from('senators').select('slug, first_name, last_name, party').in('party', aliases).order('last_name'),
      supabase.from('presidential_candidates').select('slug, full_name, party').in('party', aliases).eq('status', 'declared'),
      // Casse variable côté Parlement européen → filtrage insensible à la casse.
      supabase.from('meps').select('id, full_name, national_party, ep_group').order('full_name'),
    ]);
    const meps = (mepsAll.data || []).filter((m: any) => lower.has((m.national_party || '').toLowerCase()));
    return { deputies: dep.data || [], senators: sen.data || [], candidates: cand.data || [], meps };
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

  getIssues: async () => {
    const { data, error } = await supabase.from('issues').select('*').order('sort_order');
    if (error || !data) return [];
    return data;
  },

  getCandidatePositions: async () => {
    const { data, error } = await supabase.from('candidate_positions').select('candidate_slug, issue_slug, stance, summary, source_url');
    if (error || !data) return [];
    return data;
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

  // Suivis de l'utilisateur : députés ET sénateurs. Une ligne porte l'un ou l'autre
  // (contrainte CHECK en base), on expose donc un `elu` normalisé pour le front.
  getUserFollows: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*, deputies(*), senators(*)')
      .eq('user_id', userId);
    if (error) { console.error(error); return []; }
    return (data || []).map((f: any) => {
      const isSenator = !!f.senator_id;
      const elu = isSenator ? f.senators : f.deputies;
      return {
        ...f,
        elu_type: isSenator ? 'senator' : 'deputy',
        elu,
        // Route de la fiche selon la chambre.
        elu_href: elu?.slug ? `/${isSenator ? 'senateurs' : 'deputes'}/${elu.slug}` : null,
      };
    });
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

  followSenator: async (userId: string, senatorId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .insert([{ user_id: userId, senator_id: senatorId }])
      .select()
      .single();
    if (error) { throw new Error(error.message); }
    return data;
  },

  unfollowSenator: async (userId: string, senatorId: string) => {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('user_id', userId)
      .eq('senator_id', senatorId);
    if (error) { throw new Error(error.message); }
    return true;
  },

  // Retire un suivi par l'identifiant de la ligne : marche pour les deux chambres,
  // sans que l'appelant ait à savoir de quel type d'élu il s'agit.
  unfollowById: async (followId: string) => {
    const { error } = await supabase.from('user_follows').delete().eq('id', followId);
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
