import OpenAI from 'openai';
import { pool } from '@/lib/db'; 
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // --- MODIFIED: Get minPrice and maxPrice ---
  const { query, uid, minPrice, maxPrice } = await request.json();

  try {
    
    // --- NEW: Dynamic Price Constraint Logic ---
    let priceConstraint = '';
    const min = parseInt(minPrice);
    const max = parseInt(maxPrice);

    if (!isNaN(min) && min > 0 && !isNaN(max) && max > 0 && max > min) {
      priceConstraint = ` Please ensure all suggested products are between $${min} and $${max}.`;
    } else if (!isNaN(min) && min > 0) {
      priceConstraint = ` Please ensure all suggested products are above $${min}.`;
    } else if (!isNaN(max) && max > 0) {
      priceConstraint = ` Please ensure all suggested products are under $${max}.`;
    }
    // If no valid prices, the string remains empty (no constraint)
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using the best model
      messages: [
        {
          role: "system",
          // --- MODIFIED: Added priceConstraint to the prompt ---
          content: `You are a helpful product suggestion assistant. The user is looking for a product. Based on their query, suggest 3 products. For each product, provide a "product_name", a short "ai_summary", and a "price_range". Respond ONLY with the raw JSON array text. Do NOT include markdown code fences or any other text.${priceConstraint}`,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const rawResponse = response.choices[0].message?.content;

    // --- (Rest of the file is identical to the one we fixed) ---

    // --- Save the query (if allowed) ---
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

    // --- Robust JSON Parsing ---
    let suggestionsWithIds = [];
    try {
      if (!rawResponse) {
        throw new Error("AI returned an empty response.");
      }
      const jsonStart = rawResponse.indexOf('[');
      const jsonEnd = rawResponse.lastIndexOf(']');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No valid JSON array found in AI response.");
      }
      const jsonString = rawResponse.substring(jsonStart, jsonEnd + 1);
      const productSuggestions = JSON.parse(jsonString);

      // --- Save products to DB ---
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
    
    return NextResponse.json(suggestionsWithIds);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}