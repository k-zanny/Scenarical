import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEEPALIVE_SECRET = process.env.KEEPALIVE_SECRET;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!KEEPALIVE_SECRET || secret !== KEEPALIVE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // INSERT
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      tool_slug: 'keepalive',
      message: 'keepalive ping',
      email: null,
    }),
  });

  if (!insertRes.ok) {
    return NextResponse.json({ error: 'Insert failed' }, { status: 502 });
  }

  // DELETE
  const deleteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback?tool_slug=eq.keepalive`,
    { method: 'DELETE', headers },
  );

  if (!deleteRes.ok) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
