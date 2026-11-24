/**
 * Les questions fréquentes, en texte complet : affichées sur /faq dans le HTML construit, et servies
 * en données structurées FAQPage (24/11/2026, GEO). Une réponse doit tenir seule : un moteur
 * génératif la reprend telle quelle. Rien d'invérifiable, pas de chiffre sans source.
 */
export type QuestionReponse = { question: string; reponse: string };

export const FAQ_COMPLETE: { theme: string; questions: QuestionReponse[] }[] = [
  {
    theme: "Le site",
    questions: [
      {
        question: "Qu'est-ce que La politique, c'est simple ?",
        reponse: "La politique, c'est simple (lapolitiquecestsimple.fr) est un site indépendant qui explique la politique française en langage clair : chaque loi résumée, ce qu'elle change et pour qui, le vote de chaque député et sénateur, le budget de l'État, le Journal officiel, les partis, le gouvernement et l'élection présidentielle de 2027.",
      },
      {
        question: "Qui a créé le site ?",
        reponse: "Le site a été créé par Hippolyte, un étudiant, frustré par le manque de transparence de la vie politique et convaincu que chacun doit pouvoir comprendre ce que votent ses élus.",
      },
      {
        question: "Le site est-il neutre ?",
        reponse: "Oui. Le site ne prend pas position : il présente les textes, les votes et les chiffres officiels. Les fiches des partis, des élus et des candidats sont construites de la même façon pour tous.",
      },
    ],
  },
  {
    theme: "Les données",
    questions: [
      {
        question: "D'où viennent les données ?",
        reponse: "Des publications officielles : l'open data de l'Assemblée nationale et du Sénat (dossiers législatifs, scrutins, amendements, comptes rendus de séance et de commission), le Journal officiel et Légifrance (DILA), data.gouv.fr, les documents budgétaires publiés avec chaque projet de loi de finances, et le Parlement européen. Chaque fiche indique sa source et renvoie au document officiel.",
      },
      {
        question: "À quelle fréquence le site est-il mis à jour ?",
        reponse: "Chaque jour, automatiquement. Les votes de l'Assemblée nationale apparaissent en général la nuit qui suit le scrutin, ceux du Sénat quelques jours après, au rythme de leur publication officielle. Le Journal officiel est relu chaque matin.",
      },
      {
        question: "Les résumés des lois sont-ils écrits par une intelligence artificielle ?",
        reponse: "Les résumés et les analyses sont rédigés avec l'aide d'une intelligence artificielle, à partir des documents officiels eux-mêmes (texte de loi, exposé des motifs, étude d'impact, compte rendu). Ils sont contrôlés : une citation qui ne figure pas mot pour mot dans la source est retirée. Le texte officiel, toujours en lien, est le seul qui fait foi.",
      },
    ],
  },
  {
    theme: "Utiliser le site",
    questions: [
      {
        question: "Comment savoir ce qu'a voté mon député ?",
        reponse: "Dans la rubrique Assemblée nationale (/deputes/), cherchez votre commune ou le nom de votre député : sa fiche montre son vote sur chaque loi (pour, contre, abstention ou absence), ses propositions de loi, ses amendements et son parcours. La même chose existe pour les sénateurs (/senateurs/) et les eurodéputés (/eurodeputes/).",
      },
      {
        question: "Où trouver une loi expliquée simplement ?",
        reponse: "Dans la rubrique Lois (/lois/) : chaque texte a sa page avec un résumé en clair, ce qui change et pour qui, son parcours au Parlement (Assemblée, Sénat, commission mixte paritaire, Conseil constitutionnel, promulgation) et les liens vers les sources officielles.",
      },
      {
        question: "Le site est-il gratuit ?",
        reponse: "Oui : les lois résumées, les votes des élus, les fiches des députés, sénateurs, partis et ministres, le budget de l'État et la présidentielle 2027 sont gratuits. Deux abonnements facultatifs financent le site et ajoutent des outils : Premium (3,99 € par mois, avec 7 jours d'essai gratuit) et Pro (24,99 € par mois).",
      },
      {
        question: "Que contient l'abonnement Premium ?",
        reponse: "L'analyse détaillée complète de chaque loi (chaque mesure avec ce qui existait avant et ce qui change, les chiffres clés, le calendrier, les sanctions), le suivi de ses élus avec des alertes par e-mail à chaque vote, le budget de l'État en détail, et un espace personnel qui centralise tout. Il coûte 3,99 € par mois, sans engagement, avec 7 jours d'essai gratuit.",
      },
      {
        question: "À qui s'adresse l'abonnement Pro ?",
        reponse: "Aux professionnels qui suivent la vie parlementaire (collaborateurs, journalistes, associations, entreprises) : en plus du Premium, le suivi des commissions avec les comptes rendus et les vidéos, le Journal officiel du jour, les amendements, et des alertes par e-mail réglables rubrique par rubrique. Il coûte 24,99 € par mois.",
      },
    ],
  },
];

export const FAQ_PLATE: QuestionReponse[] = FAQ_COMPLETE.flatMap(t => t.questions);
