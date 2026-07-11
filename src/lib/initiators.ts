import { supabase } from "@/lib/supabase";

export type InitiatorPerson = {
  slug: string;
  photo_url: string | null;
  display: string;
  kind: "depute" | "senateur";
};

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
    supabase.from("deputies").select("first_name,last_name,slug,photo_url"),
    supabase.from("senators").select("first_name,last_name,slug,photo_url"),
  ]);
  const map = new Map<string, InitiatorPerson>();
  const add = (rows: any[] | null, kind: InitiatorPerson["kind"]) => {
    for (const row of rows ?? []) {
      if (!row.slug) continue;
      const display = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
      const key = normalizeName(display);
      if (key) map.set(key, { slug: row.slug, photo_url: row.photo_url ?? null, display, kind });
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
