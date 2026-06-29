"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export interface CommuneResult {
  nom: string;
  code: string;
  codesPostaux: string[];
  population: number;
  departement: { code: string; nom: string };
  region: { code: string; nom: string };
}

export interface MayorData {
  n: string; // name
  s: string; // sex M/F
  d: string; // mandate start date
  p?: string; // party (optional)
}

export interface ElectionResult {
  m_score: number | null; // mayor score
  comp: {
    p: string; // party nuance
    s: number; // score %
  }[];
}

export type MayorsDB = Record<string, MayorData>;

export function useCommuneSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommuneResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mayorsDb, setMayorsDb] = useState<MayorsDB | null>(null);
  const [mayorsLoading, setMayorsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load mayors DB on first search interaction
  const ensureMayorsLoaded = useCallback(async () => {
    if (mayorsDb || mayorsLoading) return;
    setMayorsLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const res = await fetch(`${basePath}/data/mayors.json`);
      const data = await res.json();
      setMayorsDb(data);
    } catch (e) {
      console.error("Failed to load mayors DB:", e);
    } finally {
      setMayorsLoading(false);
    }
  }, [mayorsDb, mayorsLoading]);

  // Search communes via geo.api.gouv.fr
  const searchCommunes = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        type: "municipality",
        limit: "20",
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      
      if (data && data.features) {
        const mappedResults: CommuneResult[] = data.features.map((f: any) => {
          const p = f.properties;
          const contextParts = p.context ? p.context.split(', ') : [];
          return {
            nom: p.name,
            code: p.citycode,
            codesPostaux: p.postcode ? [p.postcode] : [],
            population: p.population || 0,
            departement: { code: contextParts[0] || p.depcode || "", nom: contextParts[1] || "" },
            region: { code: "", nom: contextParts[2] || "" }
          };
        });
        setResults(mappedResults);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error("Search error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => searchCommunes(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchCommunes]);

  const getMayor = useCallback(
    (code: string): MayorData | null => {
      if (!mayorsDb) return null;
      return mayorsDb[code] || null;
    },
    [mayorsDb]
  );

  return {
    query,
    setQuery,
    results,
    loading,
    mayorsDb,
    getMayor,
    ensureMayorsLoaded,
    mayorsLoading,
  };
}
