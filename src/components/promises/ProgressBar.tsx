import React from 'react';

interface ProgressBarProps {
  total: number;
  kept: number;
  inProgress: number;
  broken: number;
  pending: number;
}

export default function ProgressBar({ total, kept, inProgress, broken, pending }: ProgressBarProps) {
  if (total === 0) {
    return (
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className="w-full h-full bg-gray-200"></div>
      </div>
    );
  }

  const keptPct = (kept / total) * 100;
  const inProgressPct = (inProgress / total) * 100;
  const brokenPct = (broken / total) * 100;
  const pendingPct = (pending / total) * 100;

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
      {keptPct > 0 && <div style={{ width: `${keptPct}%` }} className="h-full bg-green-500" title={`Tenues: ${kept}`} />}
      {inProgressPct > 0 && <div style={{ width: `${inProgressPct}%` }} className="h-full bg-yellow-400" title={`En cours: ${inProgress}`} />}
      {brokenPct > 0 && <div style={{ width: `${brokenPct}%` }} className="h-full bg-red-500" title={`Non tenues: ${broken}`} />}
      {pendingPct > 0 && <div style={{ width: `${pendingPct}%` }} className="h-full bg-gray-400" title={`En attente: ${pending}`} />}
    </div>
  );
}
