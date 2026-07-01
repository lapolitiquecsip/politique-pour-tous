"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import AnimatedCardStack, { CardData } from "@/components/ui/animate-card-animation";

interface RawSlide {
  id?: number;
  type?: string;
  value?: string;
  label?: string;
  content?: string;
  debunk?: string;
  color?: string;
}

export default function StatsPanel() {
  const [cards, setCards] = useState<CardData[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('description')
        .eq('category', 'WeeklyStats')
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      let rawSlides = [];
      if (data && data[0]) {
        rawSlides = JSON.parse(data[0].description);
      }

      const formattedCards: CardData[] = rawSlides.map((slide: RawSlide, index: number) => {
        let title = "Statistique";
        let description = "";

        if (slide.type === 'intox') {
          title = "Intox de la semaine";
          description = `« ${slide.content || ""} »\nRéalité : ${slide.debunk || ""}`;
        } else {
          title = "Le Saviez-Vous ?";
          description = slide.value ? `${slide.value} ${slide.label || ""}` : (slide.content || "");
        }

        return {
          id: slide.id || index + 1,
          title,
          description,
          color: slide.color || ["bg-emerald-600", "bg-blue-600", "bg-rose-600", "bg-amber-600"][index % 4],
          value: slide.value,
          label: slide.label,
          intoxContent: slide.type === 'intox' ? slide.content : undefined,
          intoxDebunk: slide.type === 'intox' ? slide.debunk : undefined
        };
      });

      setCards(formattedCards);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setCards([]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (cards.length === 0) return null;
  return (
    <div className="w-full relative py-6 flex justify-center items-center h-full">
      <AnimatedCardStack items={cards} />
    </div>
  );
}
