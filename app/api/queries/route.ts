// app/api/queries/route.ts
import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

// --- THIS IS YOUR EXISTING GET FUNCTION (NO CHANGE) ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
  }

  try {
    const queries = await pool.query(
      'SELECT query_id, query_text FROM queries WHERE uid = $1 ORDER BY created_at DESC LIMIT 10',
      [uid]
    );
    return NextResponse.json(queries.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// --- THIS IS THE NEW DELETE FUNCTION ---
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // This is the query_id
  const uid = searchParams.get('uid'); // This is the user_id for security

  if (!id || !uid) {
    return NextResponse.json({ error: 'Query ID and User ID are required.' }, { status: 400 });
  }

  try {
    // We only delete the query if the ID *and* the user ID match.
    // This stops a user from deleting other users' queries.
    const result = await pool.query(
      'DELETE FROM queries WHERE query_id = $1 AND uid = $2',
      [id, uid]
    );

    if (result.rowCount === 0) {
      // This means no query was found, or the user didn't have permission
      return NextResponse.json({ error: 'Query not found or permission denied.' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}