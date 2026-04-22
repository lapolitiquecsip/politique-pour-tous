import { api } from "@/lib/api";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const eventsRaw = await api.getCalendarEvents();
  
  // Transform DB rows to expected format
  const cleanText = (text: string) => {
    if (!text) return '';
    return text.replace(/^\["/, '').replace(/"\]$/, '').replace(/\\"/g, '"').replace(/^"/, '').replace(/"$/, '').trim();
  };

  const events: CalendarEvent[] = eventsRaw.map((e: any) => ({
    id: e.id,
    date: new Date(e.date || e.created_at),
    title: cleanText(e.title || 'Réunion'),
    description: cleanText(e.description || ''),
    institution: e.institution || 'Assemblée nationale',
    category: e.category || '',
    source_url: e.source_url || '',
  }));

  return <CalendarClient initialEvents={events} />;
}
