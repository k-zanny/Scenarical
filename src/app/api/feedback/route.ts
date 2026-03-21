import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const FEEDBACK_FILE = path.join(process.cwd(), 'feedback.json');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface FeedbackEntry {
  id: string;
  tool_slug: string;
  message: string;
  email: string | null;
  created_at: string;
  user_agent: string;
  page_url: string;
}

/* ── Local file fallback ────────────────────────────────────────────── */

function readLocal(): FeedbackEntry[] {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function writeLocal(data: FeedbackEntry[]) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2));
}

/* ── Supabase helpers ───────────────────────────────────────────────── */

async function insertSupabase(entry: FeedbackEntry): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function readSupabase(): Promise<FeedbackEntry[] | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/feedback?order=created_at.desc&limit=200`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    );
    if (res.ok) return res.json();
  } catch {}
  return null;
}

/* ── POST — receive feedback ────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool_slug, message, email, url, user_agent } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const entry: FeedbackEntry = {
      id: crypto.randomUUID(),
      tool_slug: String(tool_slug || 'unknown').slice(0, 100),
      message: message.trim().slice(0, 5000),
      email: email ? String(email).slice(0, 200) : null,
      created_at: new Date().toISOString(),
      user_agent: String(user_agent || '').slice(0, 500),
      page_url: String(url || '').slice(0, 500),
    };

    // Try Supabase first, fall back to local file
    const saved = await insertSupabase(entry);
    if (!saved) {
      const feedback = readLocal();
      feedback.push(entry);
      writeLocal(feedback);
    }

    return NextResponse.json({ success: true, id: entry.id });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/* ── GET — read feedback (admin) ────────────────────────────────────── */

export async function GET() {
  // Try Supabase first
  const supabaseData = await readSupabase();
  if (supabaseData) return NextResponse.json(supabaseData);

  // Fall back to local
  const feedback = readLocal();
  return NextResponse.json(feedback);
}
