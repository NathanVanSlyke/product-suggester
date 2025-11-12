// app/api/favorites/route.ts
import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

// --- GET: Fetch all of a user's favorite products ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
  }
  
  try {
    // Join the tables to get product info for all favorites
    const favorites = await pool.query(
      `SELECT p.* FROM products p
       JOIN user_favorites f ON p.product_id = f.product_id
       WHERE f.uid = $1
       ORDER BY f.created_at DESC`,
      [uid]
    );
    return NextResponse.json(favorites.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// --- POST: Add a new favorite ---
export async function POST(request: Request) {
  const { uid, productId } = await request.json();

  if (!uid || !productId) {
    return NextResponse.json({ error: 'User ID and Product ID are required.' }, { status: 400 });
  }
  const userRes = await pool.query('SELECT allow_saving FROM users WHERE uid = $1', [uid]);
    if (userRes.rows[0]?.allow_saving !== true) {
  return NextResponse.json({ error: 'User has not consented to saving data.' }, { status: 403 });
}
  try {
    await pool.query(
      'INSERT INTO user_favorites (uid, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [uid, productId]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// --- DELETE: Remove a favorite ---
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const productId = searchParams.get('productId');

  if (!uid || !productId) {
    return NextResponse.json({ error: 'User ID and Product ID are required.' }, { status: 400 });
  }
  const userRes = await pool.query('SELECT allow_saving FROM users WHERE uid = $1', [uid]);
  if (userRes.rows[0]?.allow_saving !== true) {
  return NextResponse.json({ error: 'User has not consented to saving data.' }, { status: 403 });
}
  try {
    await pool.query(
      'DELETE FROM user_favorites WHERE uid = $1 AND product_id = $2',
      [uid, productId]
    );
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}