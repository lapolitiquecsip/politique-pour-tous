import { NextResponse } from 'next/server';
import { fetchGovernmentComposition } from '@/lib/services/governmentService';

export const dynamic = 'force-dynamic'; // On force le dynamique pour que les données puissent être actualisées si le cache expire
export const revalidate = 86400; // 24h

export async function GET() {
  try {
    const ministers = await fetchGovernmentComposition();
    
    return NextResponse.json({
      success: true,
      count: ministers.length,
      data: ministers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API /government] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch government composition',
      },
      { status: 500 }
    );
  }
}
