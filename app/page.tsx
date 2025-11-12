// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- TYPES ---
type ProductSuggestion = {
  product_id: number;
  product_name: string;
  ai_summary: string;
  price_range: string;
};

type PastQuery = {
  query_id: number;
  query_text: string;
};

type User = {
  uid: string;
  isLoggedIn: boolean;
  allow_saving: boolean | null;
};

export default function Home() {
  const router = useRouter();

  // --- STATE HOOKS ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pastQueries, setPastQueries] = useState<PastQuery[]>([]);
  
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // --- DATA FETCHING ---
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setCurrentUser(JSON.parse(userString));
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.allow_saving !== true) {
      return;
    }
    const fetchInitialData = async () => {
      try {
        const queryRes = await fetch(`/api/queries?uid=${currentUser.uid}`);
        if (queryRes.ok) setPastQueries(await queryRes.json());
        
        const favRes = await fetch(`/api/favorites?uid=${currentUser.uid}`);
        if (favRes.ok) {
          const favs: ProductSuggestion[] = await favRes.json();
          setFavoriteIds(new Set(favs.map(f => f.product_id)));
        }
      } catch (err: any) {
        console.error(err.message);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  // --- LOGIC ---
  const getSuggestions = async (searchText: string) => {
    if (!searchText) return;
    setIsLoading(true);
    setResults([]);
    setError('');
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchText, uid: currentUser?.uid }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setResults(data);
        if (currentUser && currentUser.allow_saving === true) {
          const res = await fetch(`/api/queries?uid=${currentUser.uid}`);
          setPastQueries(await res.json());
        }
      } else {
        throw new Error('Invalid response format. Expected an array.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    getSuggestions(query);
  };
  
  const handlePastQueryClick = (pastQueryText: string) => {
    setQuery(pastQueryText);
    getSuggestions(pastQueryText);
  };
  
  const handleDeleteQuery = async (queryId: number) => {
    if (!currentUser) return;
    try {
      const response = await fetch(
        `/api/queries?id=${queryId}&uid=${currentUser.uid}`, 
        { method: 'DELETE' }
      );
      if (response.ok) {
        setPastQueries(pastQueries.filter(q => q.query_id !== queryId));
      }
    } catch (err) {
      console.error('An error occurred while deleting:', err);
    }
  };

  const handleFavorite = async (productId: number) => {
    if (!currentUser || currentUser.allow_saving !== true) return;
    setFavoriteIds(new Set(favoriteIds.add(productId)));
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.uid, productId: productId }),
    });
  };
  
  const handleUnfavorite = async (productId: number) => {
    if (!currentUser || currentUser.allow_saving !== true) return;
    const newIds = new Set(favoriteIds);
    newIds.delete(productId);
    setFavoriteIds(newIds);
    await fetch(
      `/api/favorites?uid=${currentUser.uid}&productId=${productId}`,
      { method: 'DELETE' }
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setPastQueries([]);
    setFavoriteIds(new Set());
    router.push('/');
  };
  const handleLogin = () => router.push('/login');
  const handleSignup = () => router.push('/signup');

  // --- RENDER (JSX) ---
  return (
    <main className="flex min-h-screen">
      
      {/* --- SIDEBAR --- */}
      {currentUser && currentUser.allow_saving === true && (
        <aside className="w-64 bg-gray-900 p-4 space-y-2 overflow-y-auto">
          <h2 className="text-lg font-semibold text-white mb-2">Past Searches</h2>
          {pastQueries.map((q) => (
            <div key={q.query_id} className="flex justify-between items-center bg-gray-800 rounded-lg group">
              <button
                onClick={() => handlePastQueryClick(q.query_text)}
                className="p-2 text-left truncate flex-1 text-gray-300 hover:bg-gray-700 rounded-l-lg"
              >
                {q.query_text}
              </button>
              <button
                onClick={() => handleDeleteQuery(q.query_id)}
                className="p-2 text-gray-500 hover:bg-red-800 hover:text-white rounded-r-lg"
                title="Delete search"
              >
                🗑️
              </button>
            </div>
          ))}
        </aside>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col items-center p-12">
        {/* --- HEADER (THIS IS THE MODIFIED PART) --- */}
        <header className="w-full max-w-5xl flex justify-between items-center mb-16">
          <h1 className="text-4xl font-bold">Product Suggester</h1>
          <nav className="flex items-center space-x-4">
            {isLoadingAuth ? (
              <div className="h-10 w-24 bg-gray-700 rounded-lg animate-pulse"></div>
            ) : currentUser?.isLoggedIn ? (
              <>
                {currentUser.allow_saving === true && (
                  <button
                    onClick={() => router.push('/favorites')}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg"
                  >
                    Favorites
                  </button>
                )}
                
                {/* --- THIS IS THE NEW "SETTINGS" BUTTON --- */}
                <button
                  onClick={() => router.push('/settings')}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg"
                >
                  Settings
                </button>
                
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg"
                >
                  Login
                </button>
                <button
                  onClick={handleSignup}
                  className="bg-gray-700 text-white py-2 px-4 rounded-lg"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </header>
        {/* --- END OF MODIFIED HEADER --- */}

        <section className="w-full max-w-lg">
          <form onSubmit={handleSubmit} className="w-full mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What's the best laptop for a student under $800?"
              className="w-full p-4 border rounded-lg text-black bg-white"
            />
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-blue-600 text-white p-2 rounded-lg mt-4 disabled:bg-gray-400"
            >
              {isLoading ? 'Getting suggestions...' : 'Get Suggestions'}
            </button>
          </form>

          {error && (
            <div className="w-full p-4 bg-red-800 text-white rounded-lg mb-4">
              <p><span className="font-bold">Error:</span> {error}</p>
            </div>
          )}

          <div className="w-full space-y-4">
            {results.map((product) => (
              <div key={product.product_id} className="p-4 border rounded-lg bg-gray-800 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{product.product_name}</h3>
                  <p className="text-gray-300">{product.price_range}</p>
                  <p className="mt-2">{product.ai_summary}</p>
                </div>
                
                {currentUser && currentUser.allow_saving === true && (
                  favoriteIds.has(product.product_id) ? (
                    <button
                      onClick={() => handleUnfavorite(product.product_id)}
                      className="p-2 text-2xl"
                      title="Un-favorite"
                    >
                      💔
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFavorite(product.product_id)}
                      className="p-2 text-2xl"
                      title="Favorite"
                    >
                      ❤️
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}