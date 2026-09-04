"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loader2, Search, X, ArrowRight } from "lucide-react";

type Person = {
  type: "depute" | "senateur"; slug: string; name: string; party: string | null; color: string;
  photo: string | null; department: string | null;
  participation: number | null; amendments: number | null; cosigned: number | null;
  loyalty: number | null; majorite: number | null; mandats: number | null;
};

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const fmtPct = (v: number | null) => (v == null ? "—" : `${Math.round(v)}%`);
const fmtNum = (v: number | null) => (v == null ? "—" : v.toLocaleString("fr-FR"));

function toPerson(r: any, type: Person["type"]): Person {
  return {
    type, slug: r.slug, name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
    party: r.party || (type === "senateur" ? r.senate_group : null) || null,
    color: r.party_color || "#64748b", photo: r.photo_url || null, department: r.department || null,
    participation: r.participation_rate ?? null,
    amendments: r.initiative_primary_count ?? null, cosigned: r.initiative_count ?? null,
    loyalty: r.group_loyalty ?? null, majorite: r.score_majorite ?? null, mandats: r.nombre_mandats ?? null,
  };
}

// Sélecteur avec recherche (dropdown des correspondances).
function Picker({ people, value, onPick, placeholder }: { people: Person[]; value: Person | null; onPick: (p: Person | null) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const s = norm(q.trim()); if (!s || s.length < 2) return [];
    return people.filter(p => norm(p.name).includes(s)).slice(0, 8);
  }, [q, people]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 p-3" style={{ borderColor: value.color }}>
        <Avatar p={value} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-900">{value.name}</p>
          <p className="truncate text-xs font-bold text-slate-500">{value.party || "—"} · {value.type === "depute" ? "Député·e" : "Sénateur·rice"}</p>
        </div>
        <button onClick={() => onPick(null)} className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4">
        <Search size={18} className="text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
          className="w-full bg-transparent py-3.5 outline-none placeholder:text-slate-400" />
      </div>
      {matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {matches.map(p => (
            <button key={`${p.type}-${p.slug}`} onClick={() => { onPick(p); setQ(""); }}
              className="flex w-full items-center gap-3 border-b border-slate-50 p-2.5 text-left transition hover:bg-slate-50">
              <Avatar p={p} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{p.name}</p>
                <p className="truncate text-[11px] font-bold text-slate-500">{p.party || "—"} · {p.type === "depute" ? "Député·e" : "Sénateur·rice"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ p, size }: { p: Person; size: number }) {
  const initials = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=64748b&color=fff&size=128&bold=true`;
  return <img src={p.photo || initials} alt={p.name} width={size} height={size} className="shrink-0 rounded-full object-cover object-top ring-2 ring-white" style={{ width: size, height: size }} onError={e => { (e.target as HTMLImageElement).src = initials; }} />;
}

// Ligne de comparaison ; surligne la meilleure valeur (higherBetter).
function Row({ label, a, b, fmt, higherBetter = true, aRaw, bRaw }: { label: string; a: string; b: string; fmt?: string; higherBetter?: boolean; aRaw: number | null; bRaw: number | null }) {
  const aWin = aRaw != null && bRaw != null && aRaw !== bRaw && (higherBetter ? aRaw > bRaw : aRaw < bRaw);
  const bWin = aRaw != null && bRaw != null && aRaw !== bRaw && (higherBetter ? bRaw > aRaw : bRaw < aRaw);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-100 py-3">
      <p className={`text-right text-lg font-black tabular-nums ${aWin ? "text-emerald-600" : "text-slate-800"}`}>{a}{fmt}</p>
      <p className="px-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-left text-lg font-black tabular-nums ${bWin ? "text-emerald-600" : "text-slate-800"}`}>{b}{fmt}</p>
    </div>
  );
}

export default function ParliamentComparator() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [a, setA] = useState<Person | null>(null);
  const [b, setB] = useState<Person | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getDeputies(), api.getSenators()]).then(([d, s]) => {
      if (!active) return;
      const list = [...(d as any[]).map(r => toPerson(r, "depute")), ...(s as any[]).map(r => toPerson(r, "senateur"))]
        .filter(p => p.name).sort((x, y) => x.name.localeCompare(y.name));
      setPeople(list);
    }).catch(() => setPeople([]));
    return () => { active = false; };
  }, []);

  if (!people) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-red-600" /></div>;

  const bothDeputies = a?.type === "depute" && b?.type === "depute";
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <div className="grid gap-4 sm:grid-cols-2">
        <Picker people={people} value={a} onPick={setA} placeholder="1er parlementaire…" />
        <Picker people={people} value={b} onPick={setB} placeholder="2e parlementaire…" />
      </div>

      {a && b ? (
        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-b-2 border-slate-100 pb-5">
            <PersonHead p={a} align="right" />
            <span className="pb-2 font-staatliches text-2xl text-slate-300">VS</span>
            <PersonHead p={b} align="left" />
          </div>
          <div className="mt-2">
            <Row label="Participation" a={fmtPct(a.participation)} b={fmtPct(b.participation)} aRaw={a.participation} bRaw={b.participation} />
            <Row label="Amendements déposés" a={fmtNum(a.amendments)} b={fmtNum(b.amendments)} aRaw={a.amendments} bRaw={b.amendments} />
            <Row label="Amendements cosignés" a={fmtNum(a.cosigned)} b={fmtNum(b.cosigned)} aRaw={a.cosigned} bRaw={b.cosigned} />
            {bothDeputies && <Row label="Loyauté au groupe" a={fmtPct(a.loyalty)} b={fmtPct(b.loyalty)} aRaw={a.loyalty} bRaw={b.loyalty} />}
            {bothDeputies && <Row label="Mandats" a={fmtNum(a.mandats)} b={fmtNum(b.mandats)} aRaw={a.mandats} bRaw={b.mandats} />}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
              <p className="text-right text-sm font-bold text-slate-600">{a.department || "—"}</p>
              <p className="px-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Département</p>
              <p className="text-left text-sm font-bold text-slate-600">{b.department || "—"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href={`/${a.type === "depute" ? "deputes" : "senateurs"}/${a.slug}`} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700">Fiche de {a.name.split(" ")[0]} <ArrowRight size={15} /></Link>
            <Link href={`/${b.type === "depute" ? "deputes" : "senateurs"}/${b.slug}`} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700">Fiche de {b.name.split(" ")[0]} <ArrowRight size={15} /></Link>
          </div>
          {!bothDeputies && (a.type !== b.type) && <p className="mt-4 text-[11px] italic text-slate-400">Comparaison député·e ↔ sénateur·rice : certains indicateurs (loyauté, mandats) ne sont pas comparables entre les deux chambres.</p>}
        </div>
      ) : (
        <p className="mt-12 text-center text-slate-400">Choisissez deux parlementaires pour les comparer côte à côte.</p>
      )}
    </div>
  );
}

function PersonHead({ p, align }: { p: Person; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${align === "right" ? "sm:items-end" : "sm:items-start"}`}>
      <Avatar p={p} size={72} />
      <div className={align === "right" ? "text-center sm:text-right" : "text-center sm:text-left"}>
        <p className="font-black leading-tight text-slate-900">{p.name}</p>
        <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white" style={{ background: p.color }}>{p.party || "—"}</span>
      </div>
    </div>
  );
}
