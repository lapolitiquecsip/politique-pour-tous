"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Relecture du récap Pro : le lien « Retirer de l'envoi » de l'aperçu du vendredi mène ici.
 * La ligne (ou l'édito, clé __edito__) est exclue du récap de samedi pour tous les membres.
 * Page protégée par la garde de /admin (administrateurs seulement).
 */
function Contenu() {
  const q = useSearchParams();
  const semaine = q.get("s"), cle = q.get("k"), titre = q.get("t") || "";
  const [etat, setEtat] = useState<"attente" | "ok" | "erreur" | "liste">("attente");
  const [retirees, setRetirees] = useState<{ cle: string; titre: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      if (semaine && cle) {
        const { data, error } = await supabase.rpc("exclure_du_recap", { p_semaine: semaine, p_cle: cle, p_titre: titre });
        setEtat(error || !data ? "erreur" : "ok");
      } else setEtat("liste");
      const s = semaine || new Date(Date.now() + ((6 - new Date().getUTCDay() + 7) % 7) * 864e5).toISOString().slice(0, 10);
      const { data } = await supabase.from("recap_exclusions").select("cle, titre").eq("semaine", s).order("cree_le");
      setRetirees(data || []);
    })();
  }, [semaine, cle, titre]);

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <h1 className="text-2xl font-black text-slate-900">Relecture du récap de samedi</h1>
      {etat === "attente" && <Loader2 className="mt-6 animate-spin text-slate-400" />}
      {etat === "ok" && <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><Check size={16} className="mt-0.5 shrink-0" /> Retiré de l&apos;envoi de samedi : « {titre} ».</p>}
      {etat === "erreur" && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Impossible de retirer cette ligne (êtes-vous connecté avec le compte administrateur ?).</p>}
      <h2 className="mt-8 text-xs font-black uppercase tracking-widest text-slate-500">Retiré pour ce samedi ({retirees.length})</h2>
      <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {retirees.length ? retirees.map(r => (
          <li key={r.cle} className="flex items-start gap-2 p-3 text-sm text-slate-700"><Trash2 size={14} className="mt-0.5 shrink-0 text-slate-400" /> {r.titre || r.cle}</li>
        )) : <li className="p-3 text-sm text-slate-500">Rien de retiré pour l&apos;instant.</li>}
      </ul>
      <p className="mt-4 text-xs text-slate-500">Le récap part samedi à 8 h. Sans action de votre part, il part tel que l&apos;aperçu.</p>
    </div>
  );
}

export default function RelectureRecap() {
  return <Suspense fallback={<Loader2 className="m-10 animate-spin text-slate-400" />}><Contenu /></Suspense>;
}
