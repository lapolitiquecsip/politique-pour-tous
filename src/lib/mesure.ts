"use client";

import { supabase } from "@/lib/supabase";

/**
 * Mesure d'audience du site, sans cookie et sans service tiers.
 *
 * Deux identifiants tirés au hasard, qui ne disent rien de la personne : un par
 * navigateur (« visiteur », gardé 13 mois au plus) et un par onglet (« session »).
 * Les événements vont dans la base du site par une fonction qui ne fait
 * qu'écrire ; seuls les administrateurs peuvent en lire les totaux. La CNIL
 * exempte de consentement ce type de mesure, anonyme et limitée à l'audience.
 *
 * Le module porte aussi le PARRAINAGE : un lien « ?ref=CODE » est mémorisé 90
 * jours, puis le nouveau membre est rattaché à son parrain après son inscription.
 */

const CLE_VISITEUR = "lpcs.visiteur";
const CLE_SESSION = "lpcs.session";
const CLE_PARRAIN = "lpcs.parrain";
const TREIZE_MOIS = 395 * 864e5;
const QUATRE_VINGT_DIX_JOURS = 90 * 864e5;

const hasard = () =>
  (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "");

function lire<T>(stockage: Storage | undefined, cle: string): T | null {
  try { const v = stockage?.getItem(cle); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function ecrire(stockage: Storage | undefined, cle: string, valeur: unknown) {
  try { stockage?.setItem(cle, JSON.stringify(valeur)); } catch { /* navigation privée : tant pis */ }
}

function visiteur(): string {
  const v = lire<{ id: string; depuis: number }>(window.localStorage, CLE_VISITEUR);
  if (v && Date.now() - v.depuis < TREIZE_MOIS) return v.id;
  const neuf = { id: hasard(), depuis: Date.now() };
  ecrire(window.localStorage, CLE_VISITEUR, neuf);
  return neuf.id;
}

function session(): string {
  const s = lire<string>(window.sessionStorage, CLE_SESSION);
  if (s) return s;
  const neuve = hasard();
  ecrire(window.sessionStorage, CLE_SESSION, neuve);
  return neuve;
}

function appareil(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablette";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "ordinateur";
}

/** Robots, navigateurs pilotés, pré-rendus : rien à compter. */
function estRobot(): boolean {
  return (navigator as Navigator & { webdriver?: boolean }).webdriver === true
    || /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent);
}

/** Domaine d'où vient la visite, s'il est extérieur au site. */
function provenance(): string {
  try {
    if (!document.referrer) return "";
    const h = new URL(document.referrer).hostname.replace(/^www\./, "");
    return h === window.location.hostname.replace(/^www\./, "") ? "" : h;
  } catch { return ""; }
}

/** Le code de parrainage en cours de validité, s'il y en a un. */
export function codeParrain(): string | null {
  if (typeof window === "undefined") return null;
  const p = lire<{ code: string; depuis: number }>(window.localStorage, CLE_PARRAIN);
  return p && Date.now() - p.depuis < QUATRE_VINGT_DIX_JOURS ? p.code : null;
}

let niveauConnu = "anonyme";
export function definirNiveau(niveau: string) { niveauConnu = niveau; }

async function envoyer(kind: "vue" | "action", name: string | null, path: string) {
  if (typeof window === "undefined" || estRobot()) return;
  if (/^(localhost|127\.)/.test(window.location.hostname)) return;   // pas les essais en local
  try { if (window.localStorage.getItem("lpcs.sans-mesure") === "1") return; } catch { /* rien */ }   // droit d'opposition
  try {
    await supabase.rpc("enregistrer_evenement", {
      p_kind: kind, p_name: name, p_path: path, p_referrer: kind === "vue" ? provenance() : "",
      p_visiteur: visiteur(), p_session: session(), p_device: appareil(),
      p_ref: codeParrain() ?? "", p_niveau: niveauConnu,
    });
  } catch { /* la mesure ne doit jamais gêner la navigation */ }
}

export function mesurerVue(path: string) { void envoyer("vue", null, path); }

/** Une action qui compte : inscription, clic vers le paiement, partage… */
export function mesurerAction(nom: string, path?: string) {
  void envoyer("action", nom, path ?? (typeof window !== "undefined" ? window.location.pathname : "/"));
}

/**
 * À l'arrivée sur le site : un « ?ref=CODE » dans l'adresse est mémorisé (le
 * dernier lien suivi l'emporte) puis retiré de la barre d'adresse, pour qu'un
 * membre qui partage la page ne propage pas le code de quelqu'un d'autre.
 */
export function capterParrainage() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const code = (url.searchParams.get("ref") || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,40}$/.test(code)) return;
  ecrire(window.localStorage, CLE_PARRAIN, { code, depuis: Date.now() });
  url.searchParams.delete("ref");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  mesurerAction("arrivee_parrainage");
}

/**
 * Après connexion : rattache le compte à son parrain, une fois. Le serveur refuse
 * seul ce qui ne doit pas passer (code inconnu, soi-même, compte de plus de 30
 * jours, déjà rattaché) ; dans ces cas aussi, inutile de redemander.
 */
export async function rattacherParrainSiBesoin() {
  // Le code mémorisé ici, sinon celui enregistré dans le compte à l'inscription.
  let code = codeParrain();
  if (!code) {
    const { data } = await supabase.auth.getSession();
    const meta = data.session?.user?.user_metadata?.parrain;
    const neuf = data.session?.user?.created_at && Date.now() - new Date(data.session.user.created_at).getTime() < 30 * 864e5;
    if (typeof meta === "string" && neuf) code = meta;
  }
  if (!code) return;
  const { data, error } = await supabase.rpc("rattacher_parrain", { p_code: code });
  if (error) return;   // réseau : on retentera à la prochaine connexion
  if (data === "ok") mesurerAction("parrainage_rattache");
  try { window.localStorage.removeItem(CLE_PARRAIN); } catch { /* rien */ }
}
