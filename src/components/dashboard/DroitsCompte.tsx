"use client";

import { useState } from "react";
import { Download, Trash2, Loader2, AlertTriangle, Check, XCircle } from "lucide-react";
import { api, type AbonnementEnCours } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const carte = "rounded-3xl border border-white/10 bg-white/[0.04] p-6";
const titre = "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300";

/**
 * Résiliation en ligne (C. conso. L215-1-1) : un bouton toujours visible pour un abonné,
 * un écran de confirmation qui dit ce qui va se passer, puis l'accusé par e-mail.
 */
export function ResiliationAbonnement() {
  const [etape, setEtape] = useState<"repos" | "chargement" | "confirmer" | "fait" | "aucun" | "erreur">("repos");
  const [subs, setSubs] = useState<AbonnementEnCours[]>([]);
  const [erreur, setErreur] = useState("");

  const ouvrir = async () => {
    setEtape("chargement");
    try {
      const l = await api.etatAbonnement();
      setSubs(l);
      setEtape(l.length ? "confirmer" : "aucun");
    } catch (e) { setErreur((e as Error).message); setEtape("erreur"); }
  };
  const confirmer = async () => {
    setEtape("chargement");
    try { setSubs(await api.resilierAbonnement()); setEtape("fait"); }
    catch (e) { setErreur((e as Error).message); setEtape("erreur"); }
  };

  if (etape === "repos" || etape === "chargement") {
    return (
      <button onClick={ouvrir} disabled={etape === "chargement"}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 transition hover:border-rose-300/60 hover:text-white disabled:opacity-50">
        {etape === "chargement" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Résilier mon abonnement
      </button>
    );
  }
  return (
    <div className="w-full rounded-2xl border border-white/15 bg-black/30 p-4 text-[13px] leading-relaxed text-white/80">
      {etape === "confirmer" && (
        <>
          <p className="font-bold text-white">Confirmer la résiliation</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {subs.map((s, i) => (
              <li key={i}>
                Offre {s.nom}{s.montant ? ` (${s.montant} par ${s.periode})` : ""} :{" "}
                {s.resilie ? <>déjà résiliée, fin le {s.fin_texte}.</> : <>accès conservé jusqu&apos;au <strong>{s.fin_texte}</strong>, puis plus aucun prélèvement.</>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-white/50">Votre compte gratuit reste ouvert. Un e-mail vous confirmera la résiliation et sa date.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={confirmer} className="rounded-xl bg-rose-500 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-rose-600">Confirmer la résiliation</button>
            <button onClick={() => setEtape("repos")} className="rounded-xl px-4 py-2 text-[11px] font-bold text-white/60 hover:text-white">Garder mon abonnement</button>
          </div>
        </>
      )}
      {etape === "fait" && (
        <p className="flex items-start gap-2 text-emerald-300"><Check size={15} className="mt-0.5 shrink-0" />
          Résiliation enregistrée{subs[0] ? ` : fin le ${subs[0].fin_texte}` : ""}. Un e-mail de confirmation vient de vous être envoyé.</p>
      )}
      {etape === "aucun" && (
        <p>Aucun abonnement payant n&apos;est en cours sur ce compte (accès offert, ou déjà terminé) : il n&apos;y a rien à résilier.</p>
      )}
      {etape === "erreur" && (
        <p className="flex items-start gap-2 text-rose-300"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {erreur || "La résiliation a échoué."} Réessayez, ou écrivez-nous depuis la page Contact : la demande sera traitée à sa date d&apos;envoi.</p>
      )}
    </div>
  );
}

/** Droits RGPD en libre-service : accès et portabilité (art. 15, 20), effacement (art. 17). */
export function MesDonnees() {
  const [export_, setExport] = useState<"repos" | "en_cours" | "erreur">("repos");
  const [suppr, setSuppr] = useState<"repos" | "confirmer" | "en_cours" | "abonnement" | "erreur">("repos");
  const [saisie, setSaisie] = useState("");
  const [positions, setPositions] = useState<"repos" | "fait" | "erreur">("repos");

  const telecharger = async () => {
    setExport("en_cours");
    try {
      const d = await api.exporterMesDonnees();
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `mes-donnees-lapolitiquecestsimple-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setExport("repos");
    } catch { setExport("erreur"); }
  };
  const supprimer = async () => {
    setSuppr("en_cours");
    try {
      const r = await api.supprimerMonCompte();
      if (r === "abonnement_actif") { setSuppr("abonnement"); return; }
      try { localStorage.removeItem("lpcs.tier"); localStorage.removeItem("lpcs.connecte"); } catch { /* rien */ }
      await supabase.auth.signOut().catch(() => {});
      window.location.href = "/?compte=supprime";
    } catch { setSuppr("erreur"); }
  };

  return (
    <div className={carte}>
      <p className={titre}><Download size={13} /> Mes données</p>
      <p className="mt-2 text-[13px] leading-snug text-white/55">
        Téléchargez tout ce que votre compte contient (préférences, suivis, alertes reçues, accords donnés), ou supprimez
        définitivement votre compte. Détails dans la <a href="/confidentialite" className="underline hover:text-white">politique de confidentialité</a>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={telecharger} disabled={export_ === "en_cours"}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-900 transition hover:brightness-95 disabled:opacity-50">
          {export_ === "en_cours" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Télécharger mes données
        </button>
        <button onClick={async () => { try { await api.effacerMesPositions(); setPositions("fait"); } catch { setPositions("erreur"); } }}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/80 transition hover:text-white">
          {positions === "fait" ? <Check size={14} /> : <XCircle size={14} />} {positions === "fait" ? "Positions effacées" : "Effacer mes positions sur les lois"}
        </button>
        {suppr === "repos" && (
          <button onClick={() => setSuppr("confirmer")}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20">
            <Trash2 size={14} /> Supprimer mon compte
          </button>
        )}
      </div>
      {positions === "erreur" && <p className="mt-3 text-[13px] text-rose-300">L&apos;effacement a échoué. Réessayez dans un instant.</p>}
      {export_ === "erreur" && <p className="mt-3 text-[13px] text-rose-300">Le téléchargement a échoué. Réessayez dans un instant.</p>}

      {(suppr === "confirmer" || suppr === "en_cours") && (
        <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/[0.08] p-4 text-[13px] leading-relaxed text-white/80">
          <p className="font-bold text-white">Suppression définitive</p>
          <p className="mt-1">Votre compte, vos préférences, vos suivis et vos alertes seront effacés tout de suite, sans retour possible.
            Les factures restent conservées par notre prestataire de paiement, comme la loi l&apos;impose (10 ans).</p>
          <label className="mt-3 block text-[12px] text-white/60">Tapez <strong className="text-white">SUPPRIMER</strong> pour confirmer :
            <input value={saisie} onChange={e => setSaisie(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-rose-300/60" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={supprimer} disabled={saisie.trim().toUpperCase() !== "SUPPRIMER" || suppr === "en_cours"}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-40">
              {suppr === "en_cours" && <Loader2 size={13} className="animate-spin" />} Supprimer définitivement
            </button>
            <button onClick={() => { setSuppr("repos"); setSaisie(""); }} className="rounded-xl px-4 py-2 text-[11px] font-bold text-white/60 hover:text-white">Annuler</button>
          </div>
        </div>
      )}
      {suppr === "abonnement" && (
        <p className="mt-3 flex items-start gap-2 text-[13px] text-amber-200"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Un abonnement payant est encore en cours : résiliez-le d&apos;abord (carte « Abonnement » ci-dessus), pour qu&apos;aucun prélèvement ne
          continue. Vous pourrez ensuite supprimer le compte.</p>
      )}
      {suppr === "erreur" && <p className="mt-3 text-[13px] text-rose-300">La suppression a échoué. Réessayez, ou écrivez-nous depuis la page Contact.</p>}
    </div>
  );
}
