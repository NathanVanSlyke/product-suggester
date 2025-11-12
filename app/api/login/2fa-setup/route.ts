// app/api/login/2fa-setup/route.ts
import { pool } from '@/lib/db';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { NextResponse } from 'next/server';

// in app/api/login/2fa-setup/route.ts
export async function POST(request: Request) {
  try {
    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // --- MODIFIED QUERY ---
    const userResult = await pool.query(
      'SELECT email, two_factor_secret, allow_saving FROM users WHERE uid = $1',
      [uid]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const appName = "Product Suggester";

    // If user already has a secret, just tell the frontend they're set up.
    if (user.two_factor_secret) {
      // --- MODIFIED RESPONSE ---
      return NextResponse.json({ 
        email: user.email, 
        isSetup: true, 
        allow_saving: user.allow_saving // <-- ADDED
      });
    }

    // ... (rest of the setup logic is the same) ...
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    await pool.query('UPDATE users SET two_factor_secret = $1 WHERE uid = $2', [secret, uid]);
    const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);
    
    // --- MODIFIED RESPONSE ---
    return NextResponse.json({ 
      email: user.email, 
      isSetup: false, 
      qrCode: qrCodeDataURL,
      allow_saving: user.allow_saving // <-- ADDED
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}