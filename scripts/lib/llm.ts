/**
 * Client LLM gratuit d'abord.
 *
 * Les explications du Journal officiel doivent paraître chaque jour sans que le
 * service dépende d'un compte à recharger. Google AI Studio offre un palier
 * gratuit suffisant pour ce travail : on l'utilise en premier, et DeepSeek ne
 * sert plus que de secours, si une clé payante est présente.
 *
 * Deux pièges valent d'être écrits, parce qu'ils ne lèvent aucune erreur :
 *
 *  1. Les modèles « flash » récents RAISONNENT avant de répondre, et ces jetons de
 *     raisonnement se déduisent de maxOutputTokens. Un budget trop court est
 *     entièrement consommé par la réflexion : l'appel réussit, renvoie 200, et le
 *     texte est VIDE. On coupe donc le raisonnement (thinkingBudget à zéro) — la
 *     tâche est une reformulation, elle n'en a pas besoin — et on lit la cause
 *     d'arrêt plutôt que de supposer qu'une réponse 200 contient quelque chose.
 *
 *  2. Le palier gratuit est limité en requêtes PAR MINUTE. Dépasser ne coûte rien
 *     mais renvoie 429 ; on espace donc les appels soi-même et on réessaie avec
 *     attente croissante, sans quoi un rattrapage d'un mois perdrait la moitié de
 *     ses lots en silence.
 *
 * Variables d'environnement :
 *   LLM_FREE_API_KEY   clé Google AI Studio (https://aistudio.google.com/apikey)
 *   LLM_FREE_MODEL     défaut « gemini-2.5-flash »
 *   LLM_FREE_RPM       requêtes par minute tolérées, défaut 10
 *   DEEPSEEK_API_KEY   secours facultatif
 *
 * Vérification : npx tsx scripts/lib/llm.ts --test
 */

const GOOGLE = "https://generativelanguage.googleapis.com/v1beta/models";

const CLE_GRATUITE = process.env.LLM_FREE_API_KEY || process.env.GEMINI_API_KEY || "";
/**
 * Modèles essayés, dans l'ordre.
 *
 * Un seul ne suffit pas, et pour deux raisons observées l'une après l'autre :
 *
 *   — un modèle est retiré. gemini-2.5-flash, d'abord retenu, a été fermé aux
 *     nouveaux comptes et répond 404 en renvoyant vers son successeur ;
 *   — un modèle sature. Le palier gratuit est partagé : 3.8-flash et 3.5-flash
 *     répondaient 503 « high demand » quand 3.6-flash servait normalement. La
 *     saturation est propre au modèle, jamais au compte, si bien qu'attendre est
 *     la mauvaise réponse et changer de modèle la bonne.
 *
 * On épingle plutôt qu'un alias « latest » : ce qu'on produit est publié tel
 * quel, et un modèle qui changerait sous nos pieds changerait le ton sans que
 * rien ne le signale. L'alias ferme néanmoins la liste, comme filet.
 *
 * LLM_FREE_MODEL impose un modèle unique ; LLM_FREE_MODELS redéfinit la liste.
 */
const MODELES_GRATUITS = (
  process.env.LLM_FREE_MODEL ||
  process.env.LLM_FREE_MODELS ||
  // L'ordre n'est pas seulement une question de qualité : les quotas gratuits
  // sont comptés PAR LIGNÉE. 3.6, 3.7 et 3.8 puisent au même seau et tombent
  // ensemble ; 3.5 et la lignée « lite » ont le leur, et répondaient encore
  // quand les trois premiers renvoyaient 429. On alterne donc les lignées
  // plutôt que de descendre une gamme, et « lite » ferme la marche : moins fin,
  // mais amplement suffisant pour reformuler un intitulé en une phrase.
  "gemini-3.6-flash,gemini-3.5-flash,gemini-3.7-flash,gemini-3.8-flash,gemini-3.1-flash-lite,gemini-flash-latest"
).split(",").map(s => s.trim()).filter(Boolean);

/** Modèle qui a répondu en dernier : on repart de lui plutôt que de resonder. */
let modeleRetenu = MODELES_GRATUITS[0];

/**
 * Modèles à ne plus solliciter avant telle heure.
 *
 * Un 429 ne dit pas s'il s'agit du quota par minute ou de celui du jour. Plutôt
 * que de deviner, on met le modèle de côté quelques minutes : cela suffit à
 * absorber une limite par minute, et évite de rejouer à chaque lot une lignée
 * épuisée pour la journée — ce qui, sur un rattrapage, coûtait plus d'attente
 * que de travail.
 */
const enPause = new Map<string, number>();
const PAUSE_APRES_429 = Number(process.env.LLM_FREE_PAUSE_MS || 300000);
const RPM = Number(process.env.LLM_FREE_RPM || 10);

const CLE_SECOURS = process.env.DEEPSEEK_API_KEY || "";
const URL_SECOURS = process.env.JORF_BASE_URL || "https://api.deepseek.com/";
const MODELE_SECOURS = process.env.JORF_MODEL || "deepseek-v4-pro";

/** Vrai si une voie, gratuite ou payante, est configurée. */
export const llmDisponible = () => Boolean(CLE_GRATUITE || CLE_SECOURS);

/** Nom de la voie retenue, pour que les journaux disent ce qui a servi. */
export const llmVoie = () =>
  CLE_GRATUITE ? `Google AI Studio (${modeleRetenu}, gratuit)`
    : CLE_SECOURS ? `DeepSeek (${MODELE_SECOURS}, payant)`
      : "aucune";

const dors = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Espacement minimal entre deux appels AU MÊME MODÈLE.
 *
 * Le quota par minute est compté par modèle, pas par compte : espacer les
 * appels à des modèles différents ne protège de rien et ralentit tout. Une
 * horloge globale faisait attendre six secondes à chaque essai de la cascade,
 * si bien qu'un lot refusé coûtait une minute d'attente pure.
 */
const ECART = Math.ceil(60000 / Math.max(1, RPM));
const dernierAppel = new Map<string, number>();
async function attendreSonTour(modele: string) {
  const attente = (dernierAppel.get(modele) ?? 0) + ECART - Date.now();
  if (attente > 0) await dors(attente);
  dernierAppel.set(modele, Date.now());
}

class ErreurLLM extends Error {
  readonly reessayable: boolean;
  constructor(message: string, reessayable: boolean) {
    super(message);
    this.reessayable = reessayable;
  }
}

/**
 * Un appel, sur un modèle donné. La cascade est gérée par l'appelant.
 */
async function appelGoogleSur(modele: string, systeme: string, utilisateur: string, maxJetons: number): Promise<string> {
  await attendreSonTour(modele);
  const r = await fetch(`${GOOGLE}/${modele}:generateContent?key=${CLE_GRATUITE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systeme }] },
      contents: [{ role: "user", parts: [{ text: utilisateur }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: maxJetons,
        temperature: 0.2,
        // Voir le piège 1 en tête de fichier. Réservé aux modèles qui raisonnent :
        // Gemma refuse le champ d'un franc 400 « Thinking budget is not supported ».
        ...(modele.startsWith("gemini") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });

  const corps: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = corps?.error?.message || `HTTP ${r.status}`;
    // 429 : quota, par minute ou par jour — l'API ne le dit pas. On écarte le
    // modèle quelques minutes plutôt que de le rejouer à chaque lot.
    if (r.status === 429) enPause.set(modele, Date.now() + PAUSE_APRES_429);
    // 500/503 : indisponibilité passagère, le modèle reste dans la course.
    throw new ErreurLLM(`${r.status} — ${String(msg).slice(0, 180)}`, r.status === 429 || r.status >= 500);
  }

  const candidat = corps?.candidates?.[0];
  const texte = (candidat?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("").trim();
  if (!texte) {
    const raison = candidat?.finishReason || "inconnue";
    // MAX_TOKENS signale ici un budget mangé sans qu'un texte sorte : réessayer à
    // l'identique redonnerait le même vide, il faut réduire le lot.
    throw new ErreurLLM(`réponse vide (arrêt : ${raison})`, raison !== "MAX_TOKENS");
  }
  return texte;
}

/**
 * Parcourt les modèles jusqu'à ce que l'un réponde.
 *
 * On commence par celui qui a servi la dernière fois : une saturation dure des
 * minutes, et resonder la liste entière à chaque appel gaspillerait le quota.
 * Seuls les refus réessayables — saturation, indisponibilité — font passer au
 * suivant ; une clé invalide ou une requête mal formée échouent partout, autant
 * le dire tout de suite.
 */
async function appelGoogle(systeme: string, utilisateur: string, maxJetons: number): Promise<string> {
  const tous = [modeleRetenu, ...MODELES_GRATUITS.filter(m => m !== modeleRetenu)];
  const maintenant = Date.now();
  const libres = tous.filter(m => (enPause.get(m) ?? 0) <= maintenant);
  // Si tout est en pause, on réessaie quand même : mieux vaut un refus rapide
  // qu'une erreur « aucun modèle » qui masquerait la vraie cause.
  const ordre = libres.length ? libres : tous;
  let derniere: Error | null = null;
  for (const modele of ordre) {
    try {
      const texte = await appelGoogleSur(modele, systeme, utilisateur, maxJetons);
      if (modele !== modeleRetenu) {
        console.warn(`    ↳ bascule sur ${modele}`);
        modeleRetenu = modele;
      }
      return texte;
    } catch (e) {
      derniere = e as Error;
      if (!(e instanceof ErreurLLM) || !e.reessayable) throw e;
    }
  }
  throw derniere ?? new Error("aucun modèle disponible");
}

async function appelDeepSeek(systeme: string, utilisateur: string, maxJetons: number): Promise<string> {
  const r = await fetch(`${URL_SECOURS}chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLE_SECOURS}` },
    body: JSON.stringify({
      model: MODELE_SECOURS,
      messages: [{ role: "system", content: systeme }, { role: "user", content: utilisateur }],
      response_format: { type: "json_object" },
      max_tokens: maxJetons,
    }),
  });
  const corps: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurLLM(`${r.status} — ${JSON.stringify(corps).slice(0, 180)}`, r.status === 429 || r.status >= 500);
  const texte = String(corps?.choices?.[0]?.message?.content ?? "").trim();
  if (!texte) throw new ErreurLLM("réponse vide", false);
  return texte;
}

/**
 * Pose une question et rend l'objet JSON de la réponse.
 *
 * `maxJetons` est un plafond, pas une réservation : le rogner n'économise rien et
 * augmente le risque de réponse tronquée.
 */
export async function demanderJSON<T = any>(
  systeme: string,
  utilisateur: string,
  // Deux tours de cascade suffisent : chacun essaie déjà tous les modèles, et
  // quatre tours faisaient seize appels pour un lot condamné, en pure attente.
  { maxJetons = 8192, essais = 2 }: { maxJetons?: number; essais?: number } = {},
): Promise<T> {
  if (!llmDisponible()) {
    throw new Error("Aucune clé LLM : renseignez LLM_FREE_API_KEY (Google AI Studio, gratuit).");
  }

  let derniere: Error | null = null;
  for (let essai = 1; essai <= essais; essai++) {
    try {
      const brut = CLE_GRATUITE
        ? await appelGoogle(systeme, utilisateur, maxJetons)
        : await appelDeepSeek(systeme, utilisateur, maxJetons);
      // Certains modèles encadrent malgré tout le JSON d'une clôture Markdown.
      return JSON.parse(brut.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch (e) {
      derniere = e as Error;
      const reessayable = e instanceof ErreurLLM ? e.reessayable : e instanceof SyntaxError;
      if (!reessayable || essai === essais) break;
      // Attente croissante : 2 s, 8 s, 18 s. Une limite par minute se purge seule.
      await dors(2000 * essai * essai);
    }
  }
  throw derniere ?? new Error("échec inconnu");
}

/* ─────────────────────────── Vérification rapide ─────────────────────────── */

if (process.argv[1]?.endsWith("llm.ts") && process.argv.includes("--test")) {
  (async () => {
    console.log("Voie retenue :", llmVoie());
    if (!llmDisponible()) {
      console.error("❌ aucune clé configurée — posez LLM_FREE_API_KEY dans .env.local");
      process.exit(1);
    }
    try {
      const r = await demanderJSON<{ textes: { id: string; explication: string }[] }>(
        "Tu expliques des textes du Journal officiel. Pour CHAQUE texte reçu, écris UNE phrase de 15 à 35 mots disant ce qu'il change et pour qui.\nRéponds en JSON : { \"textes\": [ { \"id\": \"…\", \"explication\": \"…\" } ] }",
        "### T1\nArrêté du 14 septembre 2026 portant nomination au conseil d'administration de l'Office français de la biodiversité\n\n### T2\nDécret n° 2026-1102 du 12 septembre 2026 relatif aux modalités de calcul de l'indemnité de fin de contrat",
        { maxJetons: 2048 },
      );
      for (const t of r.textes ?? []) console.log(`  ${t.id} → ${t.explication}`);
      console.log("✓ la voie fonctionne");
    } catch (e) {
      console.error("❌", (e as Error).message);
      process.exit(1);
    }
  })();
}
