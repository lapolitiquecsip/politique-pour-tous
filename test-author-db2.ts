import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
async function t() {
  const { data } = await supabase.from('laws').select('title, author, content, timeline').ilike('title', '%universel%').limit(1);
  console.log(data);
}
t();
