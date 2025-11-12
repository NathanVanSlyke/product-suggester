// app/api/signup/route.ts
import { pool } from '@/lib/db'; // Use our shared DB connection
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Validate input (basic)
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // 2. Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists.' }, { status: 409 }); // 409 Conflict
    }

    // 3. Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 4. Store new user in the database [cite: 51, 53]
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING uid, email',
      [email, password_hash]
    );

    return NextResponse.json(newUser.rows[0], { status: 201 }); // 201 Created

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}