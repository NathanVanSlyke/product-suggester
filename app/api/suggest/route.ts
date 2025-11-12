import OpenAI from 'openai';
import { pool } from '@/lib/db'; 
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { query, uid } = await request.json();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful product suggestion assistant. The user is looking for a product. Based on their query, suggest 6 products. For each product, provide a "product_name", a short "ai_summary", and a "price_range". Respond ONLY with the raw JSON array text. Do NOT include markdown code fences or any other text.`,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const rawResponse = response.choices[0].message?.content;

    // --- Save the query (this part is fine) ---
    if (uid) {
      try {
        const userRes = await pool.query('SELECT allow_saving FROM users WHERE uid = $1', [uid]);
        const userAllowsSaving = userRes.rows[0]?.allow_saving;
        
        if (userAllowsSaving === true) {
          await pool.query('INSERT INTO queries (uid, query_text) VALUES ($1, $2)', [uid, query]);
        }
      } catch (dbError) {
        console.error("Failed to save query:", dbError);
      }
    }

    // --- THIS IS THE NEW, SMARTER PARSING BLOCK ---
    let suggestionsWithIds = [];
    try {
      if (!rawResponse) {
        throw new Error("AI returned an empty response.");
      }

      // 1. Find the start of the JSON array
      const jsonStart = rawResponse.indexOf('[');
      // 2. Find the end of the JSON array
      const jsonEnd = rawResponse.lastIndexOf(']');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No valid JSON array found in AI response.");
      }

      // 3. Extract the clean JSON string
      const jsonString = rawResponse.substring(jsonStart, jsonEnd + 1);

      // 4. Parse the *clean* string
      const productSuggestions = JSON.parse(jsonString);

      // --- This is the product-saving logic from before ---
      suggestionsWithIds = await Promise.all(
        productSuggestions.map(async (product: any) => {
          const { product_name, ai_summary, price_range } = product;
          
          const res = await pool.query(
            `WITH new_row AS (
               INSERT INTO products (name, ai_summary, price_range)
               VALUES ($1, $2, $3)
               ON CONFLICT (name) DO NOTHING
               RETURNING product_id
             )
             SELECT product_id FROM new_row
             UNION
             SELECT product_id FROM products WHERE name = $1;`,
            [product_name, ai_summary, price_range]
          );
          
          const productId = res.rows[0].product_id;
          return { ...product, product_id: productId };
        })
      );

    } catch (parseError: any) {
      console.error("Failed to parse JSON. AI response was:", rawResponse);
      return NextResponse.json(
        { error: `The AI returned an invalid response: ${parseError.message}` }, 
        { status: 502 }
      );
    }
    // --- END OF NEW BLOCK ---
    
    return NextResponse.json(suggestionsWithIds);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}