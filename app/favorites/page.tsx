'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Product = {
  product_id: number;
  name: string;
  ai_summary: string;
  price_range: string;
};

type User = {
  uid: string;
  isLoggedIn: boolean;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  // 1. Get user from localStorage
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setCurrentUser(JSON.parse(userString));
    } else {
      router.push('/login');
    }
  }, [router]);

  // 2. Fetch favorites when user is known
  useEffect(() => {
    if (!currentUser) return;

    const fetchFavorites = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/favorites?uid=${currentUser.uid}`);
        if (!res.ok) throw new Error('Failed to fetch favorites.');
        setFavorites(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavorites();
  }, [currentUser]);

  // 3. Handle "Un-favorite" click
  const handleUnfavorite = async (productId: number) => {
    if (!currentUser) return;
    
    setFavorites(favorites.filter(f => f.product_id !== productId));
    
    try {
      await fetch(
        `/api/favorites?uid=${currentUser.uid}&productId=${productId}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      console.error('Failed to unfavorite', error);
    }
  };

  return (
    <main className="flex flex-col items-center p-12">
      <header className="w-full max-w-5xl flex justify-between items-center mb-16">
        <h1 className="text-4xl font-bold">Your Favorites</h1>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg"
        >
          Back to Search
        </button>
      </header>

      {isLoading && <p>Loading favorites...</p>}
      
      <div className="w-full max-w-lg space-y-4">
        {!isLoading && favorites.length === 0 && (
          <p>You haven't favorited any products yet.</p>
        )}
        
        {favorites.map((product) => (
          <div key={product.product_id} className="p-4 border rounded-lg bg-gray-800 flex justify-between items-start">
            <div>
              {/* --- FIX 1 --- */}
              <h3 className="text-xl font-semibold text-white">{product.name}</h3>
              <p className="text-gray-300">{product.price_range}</p>
              {/* --- FIX 2 --- */}
              <p className="mt-2 text-gray-200">{product.ai_summary}</p>
            </div>
            <button
              onClick={() => handleUnfavorite(product.product_id)}
              className="p-2 text-gray-400 hover:text-white"
              title="Un-favorite"
            >
              💔
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}