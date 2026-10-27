import { api } from "@/lib/api";
import CalendarClient from "./CalendarClient";
import { CalendarEvent } from '@/components/calendar/EventItem';

export const metadata = {
  title: "L'agenda politique",
  description: "Séances, commissions, élections et rendez-vous politiques à venir : l'agenda de l'Assemblée, du Sénat et du gouvernement.",
};

export default async function CalendarPage() {
  const eventsRaw = await api.getCalendarEvents();
  
  // Transform DB rows to expected format
  const cleanText = (text: string) => {
    if (!text) return '';
    return text.replace(/^\["/, '').replace(/"\]$/, '').replace(/\\"/g, '"').replace(/^"/, '').replace(/"$/, '').trim();
  };

  // La base nomme l'Assemblée « AN » ; l'agenda (filtres, détail du jour) attend « Assemblée
  // nationale » — sans cette traduction, aucune réunion de l'Assemblée ne s'affichait.
  // Les lignes techniques (résumé du jour, statistiques de la semaine) ne sont pas des rendez-vous.
  const events: CalendarEvent[] = eventsRaw
    .filter((e: any) => e.category !== 'DailySummary' && e.category !== 'WeeklyStats')
    .map((e: any) => ({
      id: e.id,
      date: new Date(e.date || e.created_at),
      title: cleanText(e.title || 'Réunion'),
      description: cleanText(e.description || ''),
      institution: !e.institution || e.institution === 'AN' ? 'Assemblée nationale' : e.institution,
      category: e.category || '',
      source_url: e.source_url || '',
      short_title: e.short_title || undefined,
    }));

  return <CalendarClient initialEvents={events} />;
}
