// app/api/login/2fa-verify/route.ts
import { pool } from '@/lib/db';
import { authenticator } from 'otplib';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { uid, token } = await request.json();

    if (!uid || !token) {
      return NextResponse.json({ error: 'User ID and token are required.' }, { status: 400 });
    }

    // 1. Get the user's secret from the DB
    const userResult = await pool.query('SELECT two_factor_secret FROM users WHERE uid = $1', [uid]);
    if (userResult.rows.length === 0 || !userResult.rows[0].two_factor_secret) {
      return NextResponse.json({ error: 'User not found or 2FA not enabled.' }, { status: 404 });
    }

    const secret = userResult.rows[0].two_factor_secret;

    // 2. Check the token against the secret
    const isValid = authenticator.check(token, secret);

    if (isValid) {
      // In a real app, you'd create a session/JWT here.
      // For now, we'll just confirm success.
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}