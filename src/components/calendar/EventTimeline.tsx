import EventItem, { CalendarEvent } from "./EventItem";

interface EventTimelineProps {
  events: CalendarEvent[];
}

export default function EventTimeline({ events }: EventTimelineProps) {
  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl bg-white">
        <p className="text-gray-500">Aucun événement prévu pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {sortedEvents.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </div>
  );
}
