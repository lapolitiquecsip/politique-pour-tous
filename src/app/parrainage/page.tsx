"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Parrainage from "@/components/dashboard/Parrainage";

/**
 * Le parrainage, à sa propre adresse.
 *
 * Le bouton cadeau de l'en-tête menait au tableau de bord, où l'onglet n'était
 * pas visible sans faire défiler la page : on cherchait ses parrainages. Ici,
 * le lien, les chiffres et les gains sont le premier écran, sur mobile comme
 * sur ordinateur. L'onglet de l'espace personnel reste, pour qui passe par là.
 */
export default function PageParrainage() {
  const [etat, setEtat] = useState<"verification" | "connecte" | "anonyme">("verification");

  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => { if (actif) setEtat(data.session ? "connecte" : "anonyme"); });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { if (actif) setEtat(session ? "connecte" : "anonyme"); });
    return () => { actif = false; data.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="dark min-h-screen bg-gradient-to-b from-[#0b1020] via-[#0a0e1c] to-[#070a14] px-4 pb-20 pt-8 text-white md:pt-12">
      <div className="mx-auto max-w-5xl">
        {etat === "verification" && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-teal-300" /></div>}

        {etat === "anonyme" && (
          <div className="mx-auto mt-10 max-w-lg rounded-[2rem] border border-teal-300/25 bg-gradient-to-br from-teal-500/[0.12] to-transparent p-8 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-lg">
              <Gift size={26} />
            </span>
            <h1 className="font-staatliches text-4xl uppercase leading-none">Recommandez le site</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              Connectez-vous pour obtenir votre lien personnel et suivre les personnes que vous avez invitées.
            </p>
            <Link href="/login?suite=/parrainage"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-teal-400 px-6 py-3 font-black text-slate-950 transition hover:bg-teal-300">
              <LogIn size={17} /> Se connecter
            </Link>
          </div>
        )}

        {etat === "connecte" && <Parrainage />}
      </div>
    </div>
  );
}
