"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Toute la zone /admin est réservée à l'administrateur du site
 * (lapolitiquecsimple@gmail.com, seul inscrit dans la table `administrateurs`).
 *
 * Les données sont déjà protégées par la base : chaque fonction d'administration
 * refuse quiconque n'est pas administrateur. Ce garde ajoute qu'un autre compte —
 * quel que soit son abonnement — ne voit même pas l'habillage de l'administration
 * (menu, intitulés) s'il tape l'adresse à la main.
 */
export default function GardeAdministrateur({ children }: { children: React.ReactNode }) {
  const [etat, setEtat] = useState<"verification" | "autorise" | "refuse">("verification");

  useEffect(() => {
    let actif = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { if (actif) setEtat("refuse"); return; }
      const { data } = await supabase.rpc("est_administrateur");
      if (actif) setEtat(data === true ? "autorise" : "refuse");
    })();
    return () => { actif = false; };
  }, []);

  if (etat === "verification") {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }
  if (etat === "refuse") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <Lock className="mx-auto mb-3 text-slate-400" />
          <h1 className="text-xl font-bold text-foreground">Page introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">Cette page n&apos;existe pas ou ne vous est pas accessible.</p>
          <Link href="/" className="mt-5 inline-block rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
