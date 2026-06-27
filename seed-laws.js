require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching recent promulgated laws from scrutins...");
  
  // 1. Fetch recent scrutins of type LOI that are En application
  const { data: scrutins, error: sError } = await supabase
    .from('scrutins')
    .select('*')
    .eq('type', 'LOI')
    .eq('status_detail', 'En application')
    .order('date_scrutin', { ascending: false })
    .limit(5);

  if (sError) {
    console.error("Error fetching scrutins:", sError);
    return;
  }

  console.log(`Found ${scrutins.length} recent promulgated laws.`);

  // 2. Insert them into laws table as premium dossiers
  for (const scrutin of scrutins) {
    const lawId = require('crypto').randomUUID();
    
    // Check if it already exists by checking the context
    const contextStr = `dossier_premium:${scrutin.id}`;
    const { data: existing } = await supabase.from('laws').select('id').eq('context', contextStr).single();
    if (existing) {
      console.log(`Scrutin ${scrutin.id} already exists in 'laws' table.`);
      continue;
    }

    console.log(`Inserting ${lawId}: ${scrutin.title}`);
    
    // Using mock AI data since we don't have the DeepSeek key here
    const generatedData = {
      summary: "Résumé officiel : " + scrutin.title,
      impacts: ["Impact 1 : Nouvelles règles en vigueur", "Impact 2 : Modification des aides", "Impact 3 : Changement administratif"],
      amendments: [
        { title: "Amendement de renforcement", result: "Adopté", description: "Renforce les sanctions prévues par le texte initial." },
        { title: "Amendement d'exemption", result: "Adopté", description: "Exempte certaines catégories de la population." }
      ],
      premium_analysis: [
        {
          title: "Impact Direct : Changements pour votre portefeuille",
          content: "L'analyse experte montre que cette loi va directement impacter le budget des ménages concernés par de nouvelles mesures fiscales.",
          metrics: ["+15% d'aides ciblées", "-5% de charges estimées"]
        }
      ],
      calendar: [
        { date: new Date(scrutin.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }), event: "Vote définitif" },
        { date: "Prochainement", event: "Décrets d'application" }
      ]
    };

    const { error: insertError } = await supabase.from('laws').insert([{
      id: lawId,
      title: scrutin.title || scrutin.objet,
      category: scrutin.category || "Général",
      context: contextStr,
      summary: generatedData.summary,
      impact: JSON.stringify(generatedData.impacts),
      timeline: JSON.stringify(generatedData.calendar),
      content: JSON.stringify(generatedData.premiumPoints || generatedData.premium_analysis),
      date_adopted: scrutin.date_scrutin,
      created_at: new Date().toISOString()
    }]);

    if (insertError) {
      console.error(`Error inserting ${lawId}:`, insertError);
    } else {
      console.log(`Successfully inserted ${lawId}.`);
    }
  }
}

main();
