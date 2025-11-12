// app/api/login/route.ts
import { pool } from '@/lib/db';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Find the user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // User not found. Send a generic error for security.
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = result.rows[0];

    // 2. Compare the provided password with the stored hash
    const passwordsMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordsMatch) {
      // Passwords don't match. Send the same generic error.
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 3. Password is correct!
    // (For now, we're not creating a session, just confirming who they are)
    // We'll return the user's ID (uid) so the 2FA page knows who to verify.
    return NextResponse.json({ uid: user.uid, email: user.email }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}