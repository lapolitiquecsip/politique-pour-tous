import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('budget_sync')
      .select('aggregated_data, last_sync')
      .order('last_sync', { ascending: false })
      .limit(1)
      .single();

    if (error) {
       // Si la table est vide ou erreur, on renvoie une réponse vide pour trigger le fallback
       return NextResponse.json({ success: false, error: 'No data found' });
    }

    return NextResponse.json({ 
      success: true, 
      data: data.aggregated_data,
      last_sync: data.last_sync
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
