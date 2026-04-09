import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getGlobalAiSettings, updateGlobalAiSettings, getCurrentMonth } from '@/lib/ai-usage';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const settings = await getGlobalAiSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.defaultMonthlyTokenLimit === 'number' && body.defaultMonthlyTokenLimit > 0) {
    update.defaultMonthlyTokenLimit = body.defaultMonthlyTokenLimit;
  }
  if (typeof body.defaultAiHardStop === 'boolean') {
    update.defaultAiHardStop = body.defaultAiHardStop;
  }
  if (typeof body.openaiReportedTokens === 'number' && body.openaiReportedTokens >= 0) {
    update.openaiReportedTokens = body.openaiReportedTokens;
    update.openaiReportedMonth = body.openaiReportedMonth || getCurrentMonth();
  }
  if (body.openaiReportedTokens === null) {
    update.openaiReportedTokens = null;
    update.openaiReportedMonth = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const settings = await updateGlobalAiSettings(update);
  return NextResponse.json(settings);
}
