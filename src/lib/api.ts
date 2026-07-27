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
  getMepVotes: async (mepId: string, opts?: { limit?: number; offset?: number; onlyMain?: boolean; category?: string }) => {
    if (!mepId) return [];
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let q = supabase
      .from('mep_votes')
      .select('vote_id, title, reference, voted_at, position, result, url, is_main, category')
      .eq('mep_id', mepId);
    if (opts?.onlyMain) q = q.eq('is_main', true);
    if (opts?.category) q = q.eq('category', opts.category);
    const { data, error } = await q
      .order('voted_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error || !data) return [];
    return data;
  },

  // Domaines de vote d'un eurodéputé + nombre de votes par domaine (pour les filtres).
  getMepVoteCategories: async (mepId: string, onlyMain = true) => {
    if (!mepId) return [] as { category: string; count: number }[];
    const counts = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      let q = supabase.from('mep_votes').select('category').eq('mep_id', mepId);
      if (onlyMain) q = q.eq('is_main', true);
      const { data, error } = await q.range(from, from + 999);
      if (error || !data) break;
      for (const r of data as any[]) { const c = r.category || 'Autres'; counts.set(c, (counts.get(c) || 0) + 1); }
      if (data.length < 1000) break;
    }
    return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  },

  // Taux d'activité de tous les élus d'une chambre, pour situer un élu par rapport aux autres
  // (classement de présence). mep = participation aux votes ; deputy/senator = participation.
  getActivityRates: async (kind: 'mep' | 'deputy' | 'senator') => {
    const table = kind === 'mep' ? 'meps' : kind === 'deputy' ? 'deputies' : 'senators';
    const col = kind === 'mep' ? 'attendance_rate' : 'participation_rate';
    const rows: { id: string; rate: number }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select(`id, ${col}`).not(col, 'is', null).range(from, from + 999);
      if (error || !data) break;
      for (const r of data as any[]) rows.push({ id: String(r.id), rate: Number(r[col]) });
      if (data.length < 1000) break;
    }
    return rows;
  },

  // Nombre d'initiatives (auteur principal) de tous les élus d'une chambre, pour le classement.
  getInitiativeCounts: async (kind: 'deputy' | 'senator') => {
    const table = kind === 'deputy' ? 'deputies' : 'senators';
    const rows: { id: string; count: number }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select('id, initiative_primary_count').not('initiative_primary_count', 'is', null).range(from, from + 999);
      if (error || !data) break;
      for (const r of data as any[]) rows.push({ id: String(r.id), count: Number(r.initiative_primary_count) });
      if (data.length < 1000) break;
    }
    return rows;
  },

  // Résultats de vote par groupe politique du Parlement européen (officiel, par scrutin).
  getVoteGroupResults: async (voteId: string) => {
    if (!voteId) return null;
    const { data } = await supabase.from('vote_group_results').select('groups').eq('vote_id', voteId).maybeSingle();
    return (data?.groups as any[]) || null;
  },

  // Explication pédagogique d'un vote (pré-générée par IA à partir des métadonnées officielles).
  getVoteExplanation: async (voteId: string) => {
    if (!voteId) return null;
    const { data } = await supabase
      .from('vote_explanations')
      .select('vote_id, title, reference, subject, explanation, stakes')
      .eq('vote_id', voteId)
      .maybeSingle();
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
    const base = 'id, type, title, detail, position, event_at, read, created_at, deputy_id, senator_id';
    let res: any = await supabase.from('user_notifications').select(`${base}, mep_id`).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (res.error) { // colonne mep_id absente (migration non appliquée) → repli
      res = await supabase.from('user_notifications').select(base).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    }
    if (res.error) { console.error(res.error); return []; }
    return res.data || [];
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
  // Fil vidéo du Sénat — chaîne officielle Public Sénat.
  getSenatVideos: async (limit = 12) => {
    const { data, error } = await supabase
      .from('senat_videos')
      .select('video_id, title, published_at, url, thumbnail_url, description')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data;
  },

  // Fil vidéo de l'Assemblée (séances, auditions) — chaîne officielle LCP · Assemblée nationale.
  getAnVideos: async (limit = 12) => {
    const { data, error } = await supabase
      .from('an_videos')
      .select('video_id, title, published_at, url, thumbnail_url, description')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data;
  },

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
    const items = (data || []) as LegislativeListItem[];
    if (items.length) {
      const { data: titles } = await supabase.from('dossier_display_title').select('dossier_id, display_title').in('dossier_id', items.map(i => i.id));
      const byId = new Map((titles || []).map((t: any) => [t.dossier_id, t.display_title]));
      for (const it of items) it.display_title = byId.get(it.id) || null;
    }
    return items;
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
    const items = (data || []) as LegislativeListItem[];
    // Enrichissement (le RPC ne les renvoie pas) : type de texte + titre synthétisé.
    if (items.length) {
      const ids = items.map(i => i.id);
      const [types, titles] = await Promise.all([
        supabase.from('legislative_dossiers').select('id, text_type').in('id', ids),
        supabase.from('dossier_display_title').select('dossier_id, display_title').in('dossier_id', ids),
      ]);
      const typeById = new Map((types.data || []).map((t: any) => [t.id, t.text_type]));
      const titleById = new Map((titles.data || []).map((t: any) => [t.dossier_id, t.display_title]));
      for (const it of items) { (it as any).text_type = typeById.get(it.id) || null; it.display_title = titleById.get(it.id) || null; }
    }
    return items;
  },

  // Résumés « impact citoyen » (À partir de maintenant…) pour un lot de lois promulguées.
  getLawCitizenImpacts: async (ids: string[]) => {
    if (!ids || ids.length === 0) return [] as { dossier_id: string; impact: string }[];
    const { data } = await supabase.from('law_citizen_impact').select('dossier_id, impact').in('dossier_id', ids);
    return (data || []) as { dossier_id: string; impact: string }[];
  },

  // Fil chronologique des derniers votes SOLENNELS (vote sur l'ensemble d'un texte + motions),
  // déjà décryptés (catégorie, résumé). Source : scrutins publics de l'Assemblée nationale.
  getRecentSolemnVotes: async (limit = 16) => {
    const { data, error } = await supabase
      .from('scrutins')
      .select('id, numero, date_scrutin, title, objet, resultat, category, summary, why_it_matters, pour, contre, abstention, dossier_url, type')
      .in('type', ['LOI', 'MOTION'])
      .order('date_scrutin', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  // Derniers votes solennels « sur l'ensemble » d'un texte à l'Assemblée : issue, votes par
  // parti (group_results) et étape suivante vérifiée (via scrutin_navette). Pour la page AN.
  getRecentAssemblyTexts: async (limit = 12) => {
    const { data, error } = await supabase
      .from('scrutins')
      .select('id, numero, date_scrutin, title, objet, resultat, category, summary, why_it_matters, pour, contre, abstention, non_votant, group_results, dossier_url')
      .eq('type', 'LOI')
      .ilike('title', "l'ensemble%")
      .order('date_scrutin', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    const scrutins = data || [];
    if (scrutins.length === 0) return [];
    // Étape suivante (table séparée, tolérante si absente / migration non encore appliquée).
    try {
      const ids = scrutins.map((s: any) => s.id);
      const { data: nav } = await supabase.from('scrutin_navette').select('scrutin_id, navette_status, navette_label').in('scrutin_id', ids);
      const byId = new Map((nav || []).map((n: any) => [n.scrutin_id, n]));
      return scrutins.map((s: any) => ({ ...s, navette: byId.get(s.id) || null }));
    } catch { return scrutins.map((s: any) => ({ ...s, navette: null })); }
  },

  // Fil « Décisions de l'UE concernant la France » (communiqués officiels de la Commission).
  getEuFranceDecisions: async (limit = 30) => {
    const { data, error } = await supabase
      .from('eu_france_decisions')
      .select('id, title, summary, url, published_at, category, institution')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  // Projets concrets cofinancés par l'UE en France (base officielle Kohesio).
  getEuFranceProjects: async (limit = 300) => {
    const { data, error } = await supabase
      .from('eu_france_projects')
      .select('id, name, eu_budget_eur, total_budget_eur, region, image_url, description, url')
      .order('eu_budget_eur', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  // France ↔ budget de l'UE (donnée curée annuelle officielle).
  getEuFranceBudget: async () => {
    const { data, error } = await supabase
      .from('eu_france_budget')
      .select('year, contribution_eur, spending_eur, breakdown, source_url, source_label')
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  },

  getLegislativeDossier: async (id: string) => {
    const { data, error } = await supabase.rpc('public_legislative_dossier', { p_id: id });
    if (error) throw error;
    const detail = data as LegislativeDossierDetail | null;
    // Enrichit la fiche avec la chambre saisie, le type et l'étape (non portés par le RPC).
    if (detail?.dossier?.id) {
      const { data: meta } = await supabase.from('legislative_dossiers').select('current_chamber, text_type, status_code').eq('id', detail.dossier.id).maybeSingle();
      if (meta) Object.assign(detail.dossier, meta);
    }
    return detail;
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

  // Composition du Sénat par groupe (pour l'hémicycle). Compte les sénateurs par groupe.
  getSenateComposition: async () => {
    const counts = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('senators').select('senate_group').range(from, from + 999);
      if (error || !data) break;
      for (const r of data as any[]) { const g = (r.senate_group || 'NI').trim(); counts.set(g, (counts.get(g) || 0) + 1); }
      if (data.length < 1000) break;
    }
    return [...counts.entries()].map(([group, seats]) => ({ group, seats }));
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
    // Embed complet (députés + sénateurs + eurodéputés). Si la relation `meps` n'existe pas
    // encore en base (migration non appliquée), on ne casse pas TOUTE la liste : on retente
    // sans les eurodéputés pour que députés et sénateurs restent visibles.
    let data: any[] | null = null;
    let res: any = await supabase.from('user_follows').select('*, deputies(*), senators(*), meps(*)').eq('user_id', userId);
    if (res.error) {
      console.warn('getUserFollows: embed meps indisponible, repli sans eurodéputés —', res.error.message);
      res = await supabase.from('user_follows').select('*, deputies(*), senators(*)').eq('user_id', userId);
    }
    if (res.error) { console.error(res.error); return []; }
    data = res.data;
    return (data || []).map((f: any) => {
      const type = f.senator_id ? 'senator' : f.mep_id ? 'mep' : 'deputy';
      const elu = type === 'senator' ? f.senators : type === 'mep' ? f.meps : f.deputies;
      const base = type === 'senator' ? 'senateurs' : type === 'mep' ? 'eurodeputes' : 'deputes';
      return {
        ...f,
        elu_type: type,
        elu,
        // Route de la fiche selon la chambre.
        elu_href: elu?.slug ? `/${base}/${elu.slug}` : null,
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

  // Résout un NOM d'élu vers sa fiche principale (pour interconnecter le site : ex. le
  // dirigeant d'un parti → sa fiche). Cherche par ordre de priorité entre les chambres,
  // les candidats et le gouvernement. Renvoie { href, kind } ou null.
  resolvePersonHref: async (fullName: string) => {
    const name = (fullName || "").trim();
    if (!name) return null;
    const sources: Array<{ table: string; base: (r: any) => string; kind: string; nameCol?: string }> = [
      { table: 'meps', base: r => `/eurodeputes/${r.slug}`, kind: 'Eurodéputé·e' },
      { table: 'deputies', base: r => `/deputes/${r.slug}`, kind: 'Député·e' },
      { table: 'senators', base: r => `/senateurs/${r.slug}`, kind: 'Sénateur·rice' },
      { table: 'presidential_candidates', base: r => `/presidentielles-2027/?candidat=${r.slug}`, kind: 'Candidat·e 2027', nameCol: 'full_name' },
      { table: 'minister_profiles', base: r => `/executif/ministre/${r.slug}`, kind: 'Gouvernement', nameCol: 'full_name' },
    ];
    for (const s of sources) {
      let q = supabase.from(s.table).select('slug, ' + (s.nameCol || 'first_name, last_name'));
      if (s.nameCol) q = q.ilike(s.nameCol, name);
      else { const parts = name.split(/\s+/); q = q.ilike('last_name', parts[parts.length - 1]).ilike('first_name', parts[0]); }
      const { data } = await q.limit(1);
      if (data && data[0] && (data[0] as any).slug) return { href: s.base(data[0]), kind: s.kind };
    }
    return null;
  },

  // Autres fonctions/rôles d'un·e élu·e EN PARALLÈLE de son mandat (ex. eurodéputé ET
  // président d'un parti). Croise le nom avec les partis (dirigeant), le gouvernement,
  // les candidats à la présidentielle, les présidents de département et les maires.
  getParallelRoles: async (fullName: string, selfHref?: string) => {
    const name = (fullName || "").trim();
    if (!name) return [] as { label: string; kind: string; href: string }[];
    const roles: { label: string; kind: string; href: string }[] = [];
    const push = (label: string, kind: string, href: string) => { if (href !== selfHref) roles.push({ label, kind, href }); };

    const [parties, cands, mins, deps, mayors] = await Promise.all([
      supabase.from('political_parties').select('slug, name, leader').ilike('leader', name),
      supabase.from('presidential_candidates').select('slug, full_name, category').ilike('full_name', name),
      supabase.from('minister_profiles').select('slug, full_name, title, ministry_name').ilike('full_name', name),
      supabase.from('department_presidents').select('slug, full_name, dep_name').ilike('full_name', name),
      supabase.from('mayors').select('slug, full_name, commune_name, insee_code, population').ilike('full_name', name),
    ]);
    for (const p of (parties.data || []) as any[]) push(`Dirigeant·e — ${p.name}`, 'Parti', `/partis/${p.slug}`);
    for (const c of (cands.data || []) as any[]) push(c.category?.startsWith('Primaire') ? `Candidat·e à la ${String(c.category).toLowerCase()}` : 'Candidat·e à la présidentielle 2027', 'Présidentielle', `/presidentielles-2027/?candidat=${c.slug}`);
    for (const m of (mins.data || []) as any[]) push(m.title || m.ministry_name || 'Membre du gouvernement', 'Gouvernement', `/executif/ministre/${m.slug}`);
    for (const d of (deps.data || []) as any[]) push(`Président·e du conseil départemental (${d.dep_name})`, 'Département', `/departements/${d.slug}`);
    for (const my of (mayors.data || []) as any[]) push(`Maire de ${my.commune_name}`, 'Commune', `/maires/app?insee=${my.insee_code}`);
    return roles;
  },

  // Vérifie si l'utilisateur suit déjà un élu (toutes chambres).
  checkFollowing: async (userId: string, kind: 'deputy' | 'senator' | 'mep', id: string) => {
    if (!userId || !id) return false;
    const col = kind === 'senator' ? 'senator_id' : kind === 'mep' ? 'mep_id' : 'deputy_id';
    const { data } = await supabase.from('user_follows').select('id').eq('user_id', userId).eq(col, String(id)).maybeSingle();
    return !!data;
  },

  followMep: async (userId: string, mepId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .insert([{ user_id: userId, mep_id: String(mepId) }])
      .select()
      .single();
    if (error) { throw new Error(error.message); }
    return data;
  },

  unfollowMep: async (userId: string, mepId: string) => {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('user_id', userId)
      .eq('mep_id', String(mepId));
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
