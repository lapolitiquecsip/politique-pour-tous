"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, Check, Loader2, ChevronDown, Mail, Bell, User, Briefcase, MapPin, Pencil, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { INTEREST_DOMAINS, interestByCode } from "@/lib/data/interestDomains";

const AGES: [string, string][] = [
  ["-18", "Moins de 18 ans"], ["18-24", "18 – 24 ans"], ["25-34", "25 – 34 ans"],
  ["35-49", "35 – 49 ans"], ["50-64", "50 – 64 ans"], ["65+", "65 ans et +"],
];
const PROFESSIONS: [string, string][] = [
  ["etudiant", "Étudiant·e"], ["salarie_prive", "Salarié·e (privé)"], ["fonctionnaire", "Fonctionnaire / service public"],
  ["independant", "Indépendant·e / chef·fe d'entreprise"], ["demandeur", "Demandeur d'emploi"], ["retraite", "Retraité·e"], ["autre", "Autre"],
];
const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse",
  "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur", "Guadeloupe", "Guyane", "Martinique", "La Réunion", "Mayotte",
];
const IMPORTANCE: [number, string][] = [
  [5, "Uniquement l'essentiel"], [4, "Important et +"], [3, "Notable et +"], [2, "Presque tout"], [1, "Tout"],
];

const labelOf = (list: [string, string][], v: string) => list.find(x => x[0] === v)?.[1];
const importanceLabel = (v: number) => IMPORTANCE.find(x => x[0] === v)?.[1] || "";

const fieldCls = "w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

export default function PremiumPreferences({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [interests, setInterests] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [profession, setProfession] = useState("");
  const [region, setRegion] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [minImportance, setMinImportance] = useState(3);

  useEffect(() => {
    let active = true;
    api.getUserPreferences(userId).then((p: any) => {
      if (!active || !p) { setLoading(false); return; }
      setInterests(p.interests || []);
      setAge(p.age_range || ""); setProfession(p.profession || "");
      setRegion(p.region || ""); setDepartment(p.department || ""); setCity(p.city || ""); setPostal(p.postal_code || "");
      setNotifyEmail(p.notify_email ?? true); setMinImportance(p.email_min_importance ?? 3);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [userId]);

  const toggle = (code: string) =>
    setInterests(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await api.saveUserPreferences(userId, {
        interests, age_range: age || null, profession: profession || null,
        region: region || null, department: department || null, city: city || null, postal_code: postal || null,
        notify_email: notifyEmail, email_min_importance: minImportance,
      });
      setSaving(false);
      setSaved(true);                       // ✓ vert « Profil enregistré »
      setTimeout(() => setOpen(false), 900);  // puis le menu se referme sur le résumé
      setTimeout(() => setSaved(false), 2600);
    } catch (e) {
      console.error("saveUserPreferences", e);
      setSaving(false);
    }
  };

  const count = interests.length;
  const hasData = count > 0 || !!age || !!profession || !!region || !!city || !!department || !!postal;
  const locationStr = [city, department, region].filter(Boolean).join(" · ");

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
      {/* En-tête cliquable */}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-6 md:p-8 text-left">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25">
            <Sliders size={22} />
          </span>
          <div>
            <h2 className="text-2xl font-staatliches uppercase tracking-tight text-white leading-none">
              Mon profil & mes <span className="text-amber-400">notifications</span>
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {loading ? "Chargement…" : hasData ? "Vos alertes personnalisées sont actives" : "Complétez votre profil pour des alertes sur mesure"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/30">
                <Check size={14} /> Profil enregistré
              </motion.span>
            )}
          </AnimatePresence>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300 ring-1 ring-white/10 transition-transform duration-500 ${open ? "rotate-180" : ""}`}>
            <ChevronDown size={20} />
          </span>
        </div>
      </button>

      {/* RÉSUMÉ (menu fermé + profil rempli) : toutes les infos avec icônes. */}
      {!open && hasData && !loading && (
        <div className="px-6 md:px-8 pb-8 -mt-1 space-y-5">
          {count > 0 && (
            <div className="flex flex-wrap gap-2">
              {interests.map(code => {
                const d = interestByCode(code); if (!d) return null;
                return (
                  <span key={code} style={{ backgroundColor: d.color }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-black/40" /> {d.label}
                  </span>
                );
              })}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile icon={<User size={16} />} label="Tranche d'âge" value={labelOf(AGES, age) || "—"} />
            <InfoTile icon={<Briefcase size={16} />} label="Profession" value={labelOf(PROFESSIONS, profession) || "—"} />
            <InfoTile icon={<MapPin size={16} />} label="Localisation" value={locationStr || "—"} />
            <InfoTile icon={notifyEmail ? <Mail size={16} /> : <Bell size={16} />} label="Alertes e-mail"
              value={notifyEmail ? importanceLabel(minImportance) : "Désactivées"} accent={notifyEmail} />
          </div>
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-300 transition hover:border-amber-400/40 hover:text-amber-300">
            <Pencil size={13} /> Modifier mon profil
          </button>
        </div>
      )}

      {/* Invitation à compléter (menu fermé + profil vide). */}
      {!open && !hasData && !loading && (
        <div className="px-6 md:px-8 pb-8 -mt-1">
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-900 shadow-lg shadow-amber-500/20 transition hover:brightness-110">
            <Sparkles size={14} /> Compléter mon profil
          </button>
        </div>
      )}

      {/* FORMULAIRE (menu ouvert). */}
      <AnimatePresence initial={false}>
        {open && !loading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }} className="overflow-hidden"
          >
            <div className="px-6 md:px-8 pb-8 space-y-8">
              {/* Centres d'intérêt */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Mes centres d'intérêt</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_DOMAINS.map(d => {
                    const on = interests.includes(d.code);
                    return (
                      <button key={d.code} onClick={() => toggle(d.code)} type="button"
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${on ? "text-slate-900 shadow-lg" : "bg-white/5 text-slate-300 hover:bg-white/10 ring-1 ring-white/10"}`}
                        style={on ? { backgroundColor: d.color } : undefined}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? "rgba(0,0,0,0.4)" : d.color }} />
                        {d.label}
                        {on && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Âge + profession */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tranche d'âge</label>
                  <div className="relative">
                    <select value={age} onChange={e => setAge(e.target.value)} className={fieldCls}>
                      <option value="">Non renseignée</option>
                      {AGES.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Profession</label>
                  <div className="relative">
                    <select value={profession} onChange={e => setProfession(e.target.value)} className={fieldCls}>
                      <option value="">Non renseignée</option>
                      {PROFESSIONS.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Localisation */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Ma localisation</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <select value={region} onChange={e => setRegion(e.target.value)} className={fieldCls}>
                      <option value="">Ma région…</option>
                      {REGIONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                  <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Département (ex. Rhône)" className={fieldCls} />
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ma ville" className={fieldCls} />
                  <input value={postal} onChange={e => setPostal(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="Code postal" className={fieldCls} />
                </div>
              </div>

              {/* Réglages notifications */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-300"><Bell size={14} /> Réglages des alertes</p>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-200"><Mail size={16} className="text-slate-400" /> Recevoir aussi les alertes importantes par e-mail</span>
                  <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)}
                    className="h-5 w-5 rounded accent-amber-500" />
                </label>
                {notifyEmail && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Quels e-mails recevoir ?</label>
                    <div className="relative">
                      <select value={minImportance} onChange={e => setMinImportance(Number(e.target.value))} className={fieldCls}>
                        {IMPORTANCE.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                    <p className="mt-2 text-[11px] italic text-slate-500">Toutes les notifications restent visibles ici, dans votre fil. Seules celles au niveau choisi (et au-dessus) partent aussi par e-mail.</p>
                  </div>
                )}
              </div>

              {/* Enregistrer */}
              <div className="flex items-center gap-4">
                <button onClick={save} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-900 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? "Enregistrement…" : "Enregistrer mon profil"}
                </button>
                <AnimatePresence>
                  {saved && (
                    <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-emerald-400">
                      <Check size={16} /> Profil enregistré
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <span className={accent ? "text-amber-300" : "text-slate-400"}>{icon}</span> {label}
      </p>
      <p className="mt-1.5 text-sm font-bold text-white leading-snug">{value}</p>
    </div>
  );
}
