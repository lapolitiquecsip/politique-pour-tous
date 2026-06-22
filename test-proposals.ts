import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testProposals() {
  const { data, error } = await supabase
    .from('laws')
    .select('title, context, date_adopted')
    .is('date_adopted', null)
    .neq('context', 'dossier_premium')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Proposals fetched by frontend query:");
    console.log(data);
  }
}

testProposals();
