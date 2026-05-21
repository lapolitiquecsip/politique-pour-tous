"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import AnimatedCardStack, { CardData } from "@/components/ui/animate-card-animation";

// Unsplash stock images for the cards
const fallbackImages = [
  "https://images.unsplash.com/photo-1549221530-5800fb7383a1?q=80&w=800&auto=format&fit=crop", // Paris Gov / Building
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop", // Eiffel
  "https://images.unsplash.com/photo-1522093537031-3ee9eb53c0ce?q=80&w=800&auto=format&fit=crop", // People/Gov meeting
  "https://images.unsplash.com/photo-1541604193435-22287d32c2c2?q=80&w=800&auto=format&fit=crop"  // Justice/Law
];

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
      } else {
        rawSlides = [
          { id: 1, value: "11", label: "groupes politiques : un record historique sous la Ve République" },
          { id: 2, value: "1000", label: "heures de débats cumulées durant la première session" },
          { id: 3, value: "47%", label: "des textes du Sénat votés à l'unanimité depuis juin 2022" }
        ];
      }

      const formattedCards: CardData[] = rawSlides.map((slide: any, index: number) => {
        let title = "Statistique";
        let description = "";

        if (slide.type === 'intox') {
          title = "Intox de la semaine";
          description = `« ${slide.content} »\nRéalité : ${slide.debunk}`;
        } else {
          title = "Le Saviez-Vous ?";
          description = slide.value ? `${slide.value} ${slide.label}` : slide.content;
        }

        return {
          id: slide.id || index + 1,
          title,
          description,
          color: slide.color || ["bg-emerald-600", "bg-blue-600", "bg-rose-600", "bg-amber-600"][index % 4],
          value: slide.value,
          label: slide.label
        };
      });

      setCards(formattedCards);
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Fallback
      setCards([
        { id: 1, title: "Le Saviez-Vous ?", description: "11 groupes politiques : un record historique sous la Ve République", value: "11", label: "groupes politiques : un record historique sous la Ve République", color: "bg-blue-600" },
        { id: 2, title: "Le Saviez-Vous ?", description: "1000 heures de débats cumulées durant la première session", value: "1000", label: "heures de débats cumulées durant la première session", color: "bg-rose-600" },
        { id: 3, title: "Le Saviez-Vous ?", description: "47% des textes du Sénat votés à l'unanimité depuis juin 2022", value: "47%", label: "des textes du Sénat votés à l'unanimité depuis juin 2022", color: "bg-emerald-600" }
      ]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full relative py-6 flex justify-center items-center h-full">
      <AnimatedCardStack items={cards} />
    </div>
  );
}
