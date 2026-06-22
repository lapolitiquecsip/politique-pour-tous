import React from 'react';

type PromiseStatus = 'kept' | 'in-progress' | 'broken' | 'pending';

export default function PromiseStatusBadge({ status }: { status: PromiseStatus }) {
  const config = {
    'kept': { bg: 'bg-green-100 text-green-800 border-green-200', text: '🟢 Tenue' },
    'in-progress': { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: '🟡 En cours' },
    'broken': { bg: 'bg-red-100 text-red-800 border-red-200', text: '🔴 Non tenue' },
    'pending': { bg: 'bg-gray-100 text-gray-800 border-gray-200', text: '⚪ En attente' },
  };

  const badge = config[status] || config['pending'];

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.bg}`}>
      {badge.text}
    </span>
  );
}
