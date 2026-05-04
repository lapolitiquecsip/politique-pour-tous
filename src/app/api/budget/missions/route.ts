import { NextResponse } from 'next/server';
import { getOrUpdateBudgetData } from '@/lib/services/budgetService';

export const dynamic = 'force-dynamic'; // Désactive le cache Next.js
export const revalidate = 0;

/**
 * GET /api/budget/missions
 * Retourne toutes les missions budgétaires
 */
export async function GET() {
  try {
    console.log('[API /budget/missions] Request received');
    const missions = await getOrUpdateBudgetData();
    
    console.log(`[API /budget/missions] ✅ Returning ${missions.length} missions`);
    return NextResponse.json({
      success: true,
      count: missions.length,
      data: missions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API /budget/missions] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch budget data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/missions/refresh
 * Force le rafraîchissement du cache
 */
export async function POST() {
  try {
    console.log('[API /budget/missions] Force refresh requested');
    
    // Force le rafraîchissement en supprimant le cache
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    await supabase
      .from('budget_sync')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Récupère les nouvelles données
    const missions = await getOrUpdateBudgetData();
    
    console.log(`[API /budget/missions] ✅ Cache refreshed, ${missions.length} missions`);
    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      count: missions.length,
      data: missions
    });
  } catch (error) {
    console.error('[API /budget/missions] ❌ Refresh error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
