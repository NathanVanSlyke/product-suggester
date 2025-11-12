// app/api/user/route.ts
import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
  }

  // A "client" is a single connection from the pool.
  // We need one for a transaction.
  const client = await pool.connect();

  try {
    // Start the transaction
    await client.query('BEGIN');

    // 1. Delete all of the user's favorites
    await client.query('DELETE FROM user_favorites WHERE uid = $1', [uid]);

    // 2. Delete all of the user's past queries
    await client.query('DELETE FROM queries WHERE uid = $1', [uid]);

    // 3. Finally, delete the user themselves
    await client.query('DELETE FROM users WHERE uid = $1', [uid]);

    // If all commands succeed, commit the transaction
    await client.query('COMMIT');

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    // If any command fails, roll back the entire transaction
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  } finally {
    // Release the client back to the pool, no matter what
    client.release();
  }
}