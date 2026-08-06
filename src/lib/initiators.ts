import { supabase } from "@/lib/supabase";

export type InitiatorPerson = {
  slug: string;
  display: string;
  initials: string;
  kind: "depute" | "senateur";
  /** URLs de photo à essayer dans l'ordre (cascade en cas d'échec de chargement). */
  photoSources: string[];
};

// Sources photo d'un député, dans l'ordre d'essai (cascade en cas d'échec de chargement) :
// 1) photo Wikimedia Commons HD si disponible (photo_url enrichi, ~800 px, net) ;
// 2) image officielle AN via an_id (miniature carrée ~240 px, repli propre) ;
// 3) tout autre photo_url stocké.
// NB : nosdeputes.fr est écarté — il ne renvoie plus qu'un placeholder vide (cercle noir).
const isHdPhoto = (u: string | null): u is string => !!u && /wikimedia\.org|wikipedia\.org|commons/i.test(u);

export function deputyPhotoSources(anId: string | null, slug: string, photoUrl: string | null): string[] {
  const out: string[] = [];
  if (isHdPhoto(photoUrl)) out.push(photoUrl);
  if (anId) {
    const id = anId.replace("PA", "");
    out.push(`https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/${id}.jpg`);
    out.push(`https://www.assemblee-nationale.fr/dyn/static/tribun/photos/carre/${id}.jpg`);
  }
  if (photoUrl && !out.includes(photoUrl)) out.push(photoUrl);
  return out.length ? out : [`https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/0.jpg`];
}

function makeInitials(first: string, last: string): string {
  return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}` || "?";
}

/** Normalise un nom pour la comparaison : minuscules, sans accents ni ponctuation. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Extrait la liste des personnes initiatrices depuis le champ `author_name`.
 * Gère « Le Gouvernement » (aucune personne), un nom simple (« Philippe Bonnecarrère »)
 * et les listes « Par Mme X, MM. Y et Z, Sénateurs ».
 */
export function parseInitiators(raw?: string | null): string[] {
  if (!raw) return [];
  let s = raw.trim();
  if (/^le gouvernement$/i.test(s)) return [];
  // Retire le rôle final (Sénateur, Députés, « Sénateur et Sénatrices »…)
  s = s.replace(/,?\s*(s[ée]nateur|s[ée]natrice|d[ée]put[ée])s?(\s+et\s+(s[ée]nateur|s[ée]natrice)s?)?\.?\s*$/i, "").trim();
  s = s.replace(/^par\s+/i, "").trim();
  if (!s) return [];
  return s
    .split(/,|\s+et\s+/i)
    .map(part => part.replace(/^\s*(MM\.|Mmes|Mme|M\.)\s*/i, "").trim())
    .filter(Boolean);
}

let indexCache: Promise<Map<string, InitiatorPerson>> | null = null;

async function fetchPeopleIndex(): Promise<Map<string, InitiatorPerson>> {
  const [deputies, senators] = await Promise.all([
    supabase.from("deputies").select("first_name,last_name,slug,photo_url,an_id"),
    supabase.from("senators").select("first_name,last_name,slug,photo_url"),
  ]);
  const map = new Map<string, InitiatorPerson>();
  const add = (rows: any[] | null, kind: InitiatorPerson["kind"]) => {
    for (const row of rows ?? []) {
      if (!row.slug) continue;
      const first = row.first_name ?? "";
      const last = row.last_name ?? "";
      const display = `${first} ${last}`.trim();
      const key = normalizeName(display);
      if (!key) continue;
      const photoSources = kind === "depute"
        ? deputyPhotoSources(row.an_id ?? null, row.slug, row.photo_url ?? null)
        : (row.photo_url ? [row.photo_url] : []);
      map.set(key, { slug: row.slug, display, initials: makeInitials(first, last), kind, photoSources });
    }
  };
  add(deputies.data, "depute");
  add(senators.data, "senateur");
  return map;
}

/** Charge (une seule fois) l'index nom → député/sénateur. */
export function loadPeopleIndex(): Promise<Map<string, InitiatorPerson>> {
  if (!indexCache) indexCache = fetchPeopleIndex().catch(error => {
    indexCache = null; // permet un nouvel essai en cas d'échec réseau
    throw error;
  });
  return indexCache;
}

export function personHref(person: InitiatorPerson): string {
  return `/${person.kind === "senateur" ? "senateurs" : "deputes"}/${person.slug}`;
}
