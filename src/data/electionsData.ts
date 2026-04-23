export interface Election {
  id: string;
  type: string;
  title: string;
  date: string; // Display date
  exactDate: Date; // For sorting/calendar
  description: string;
  howItWorks: string;
  color: string;
  icon: string;
}

export const upcomingElections: Election[] = [
  {
    id: 'senat-2026',
    type: 'Sénatoriales',
    title: 'Élections Sénatoriales',
    date: 'Septembre 2026',
    exactDate: new Date('2026-09-27'), // Approx date for calendar
    description: 'Renouvellement de la moitié des sièges du Sénat (Série 1).',
    howItWorks: 'Les sénateurs sont élus au suffrage universel indirect par un collège de "grands électeurs" (députés, conseillers régionaux, départementaux et municipaux). Le mandat dure 6 ans.',
    color: 'indigo',
    icon: 'Building2',
  },
  {
    id: 'pres-2027',
    type: 'Présidentielle',
    title: 'Élection Présidentielle',
    date: 'Avril 2027',
    exactDate: new Date('2027-04-11'), // Approx date
    description: 'Élection du Président de la République au suffrage universel direct.',
    howItWorks: 'Le scrutin se déroule en deux tours (sauf si un candidat obtient la majorité absolue au premier). Le Président est élu pour un mandat de 5 ans (quinquennat).',
    color: 'blue',
    icon: 'User',
  },
  {
    id: 'leg-2027',
    type: 'Législatives',
    title: 'Élections Législatives',
    date: 'Juin 2027',
    exactDate: new Date('2027-06-13'), // Approx date
    description: 'Élection des 577 députés de l\'Assemblée Nationale.',
    howItWorks: 'Les députés sont élus au suffrage universel direct pour 5 ans. Le scrutin est uninominal majoritaire à deux tours par circonscription.',
    color: 'red',
    icon: 'Users',
  },
  {
    id: 'euro-2029',
    type: 'Européennes',
    title: 'Élections Européennes',
    date: 'Juin 2029',
    exactDate: new Date('2029-06-07'),
    description: 'Élection des représentants au Parlement Européen.',
    howItWorks: 'Le scrutin est proportionnel à un seul tour au niveau national. Les députés européens sont élus pour une durée de 5 ans.',
    color: 'blue-800',
    icon: 'Globe',
  }
];
