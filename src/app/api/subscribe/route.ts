import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const email = body.get('email') as string;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // TODO: Integrate with Beehiiv API
    // const response = await fetch('https://api.beehiiv.com/v2/publications/YOUR_PUB_ID/subscriptions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.BEEHIIV_API_KEY}`,
    //   },
    //   body: JSON.stringify({ email, utm_source: 'scenarical' }),
    // });

    return NextResponse.redirect(new URL('/?subscribed=true', request.url));
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
