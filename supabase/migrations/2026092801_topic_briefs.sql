-- ─────────────────────────────────────────────────────────────────────────────
-- « Tout sur un sujet » — le récap thématique des abonnés.
--
-- Un lecteur tape « panneau solaire » et veut savoir ce que dit la loi, quelles
-- aides existent, ce qui est en train de changer. La matière est déjà là —
-- Journal officiel, lois promulguées, textes en cours, actualité — mais elle est
-- éparpillée et écrite en langue administrative. Cette table garde la synthèse
-- produite pour chaque sujet, afin que le travail ne soit fait qu'une fois :
-- le premier abonné qui demande un sujet paie l'attente, les suivants l'ont
-- immédiatement.
--
-- Écrite par la fonction Edge `topic-brief`, jamais par le navigateur.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.topic_briefs (
  -- Le sujet, réduit à sa forme comparable : sans accents, sans majuscules,
  -- sans pluriel. « Panneaux solaires » et « panneau solaire » sont le même
  -- sujet et ne doivent pas être calculés deux fois.
  slug text primary key,
  -- Ce que la première personne a réellement tapé, pour l'afficher tel quel.
  keyword text not null,
  -- La synthèse structurée : en bref, règles, aides, ce qui est en cours…
  brief jsonb not null,
  -- Les textes sur lesquels elle s'appuie, avec leur lien. Une synthèse sans
  -- ses sources n'est pas vérifiable, donc pas utilisable.
  sources jsonb not null default '[]'::jsonb,
  -- Combien de documents ont été trouvés par corpus. Sert à dire honnêtement
  -- « peu de matière sur ce sujet » plutôt qu'à faire semblant.
  counts jsonb,
  model text,
  generated_at timestamptz not null default now(),
  -- Nombre de consultations : dira quels sujets méritent d'être rafraîchis en
  -- priorité quand la matière aura bougé.
  hits integer not null default 0
);

create index if not exists topic_briefs_recent_idx
  on public.topic_briefs (generated_at desc);

-- ── Réservé aux abonnés ──────────────────────────────────────────────────────
-- La réserve est posée ICI, dans la base, et pas seulement dans l'interface :
-- une règle d'affichage se contourne, une politique de lecture non.
alter table public.topic_briefs enable row level security;

drop policy if exists "lecture abonnes" on public.topic_briefs;
create policy "lecture abonnes" on public.topic_briefs
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (coalesce(p.subscription_tier, '') in ('elite', 'pro') or p.is_premium = true)
    )
  );

-- L'écriture passe par la clé de service de la fonction Edge : aucune politique
-- d'insertion n'est ouverte, ce qui la ferme à tout le monde d'autre.
