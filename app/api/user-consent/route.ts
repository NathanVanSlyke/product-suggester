// app/api/user-consent/route.ts
import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { uid, consent } = await request.json(); // consent is true or false

  if (uid === undefined || consent === undefined) {
    return NextResponse.json({ error: 'User ID and consent are required.' }, { status: 400 });
  }

  try {
    await pool.query(
      'UPDATE users SET allow_saving = $1 WHERE uid = $2',
      [consent, uid]
    );
    return NextResponse.json({ success: true, allow_saving: consent }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}