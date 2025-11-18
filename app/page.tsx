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
  email: string;
};

// --- CONSTANTS ---
const PRICE_MIN = 0;
const PRICE_MAX = 2000;

export default function Home() {
  const router = useRouter();

  // --- STATE HOOKS ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- NEW: Price Filter State (as strings for inputs) ---
  const [minPrice, setMinPrice] = useState('50');
  const [maxPrice, setMaxPrice] = useState('1000');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pastQueries, setPastQueries] = useState<PastQuery[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // --- (All useEffects are the same) ---
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
  
  // --- MODIFIED: getSuggestions ---
  const getSuggestions = async (searchText: string) => {
    if (!searchText) return;
    
    setIsLoading(true);
    setResults([]);
    setError('');

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // --- ADDED minPrice and maxPrice to the request ---
        body: JSON.stringify({ 
          query: searchText, 
          uid: currentUser?.uid,
          minPrice: minPrice, // Send the state
          maxPrice: maxPrice  // Send the state
        }),
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
  
  // --- NEW: Price filter handlers to sync inputs and sliders ---
  // (These prevent the min/max handles from crossing)
  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseInt(e.target.value);
    const currentMax = parseInt(maxPrice);
    if (newMin > currentMax) {
      setMinPrice(maxPrice); // Don't allow min to be > max
    } else {
      setMinPrice(e.target.value);
    }
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value);
    const currentMin = parseInt(minPrice);
    if (newMax < currentMin) {
      setMaxPrice(minPrice); // Don't allow max to be < min
    } else {
      setMaxPrice(e.target.value);
    }
  };
  
  // --- (All other handlers are identical) ---
  
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

  const handleLogin = () => router.push('/login');
  const handleSignup = () => router.push('/signup');

  // --- RENDER (JSX) ---
  
  // Calculate slider percentages for the track background
  const minPercent = (parseInt(minPrice) / PRICE_MAX) * 100;
  const maxPercent = (parseInt(maxPrice) / PRICE_MAX) * 100;

  return (
    <main className="flex min-h-screen">
      
      {/* --- SIDEBAR (Unchanged) --- */}
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

      {/* --- MAIN CONTENT (Header is Unchanged) --- */}
      <div className="flex-1 flex flex-col items-center p-12">
        <header className="w-full max-w-5xl flex justify-between items-center mb-16">
          <h1 className="text-4xl font-bold">Product Suggester</h1>
          <nav className="flex items-center space-x-4">
            {isLoadingAuth ? (
              <div className="h-10 w-24 bg-gray-700 rounded-lg animate-pulse"></div>
            ) : currentUser?.isLoggedIn ? (
              <>
                <span className="text-gray-400 hidden sm:inline">{currentUser.email}</span>
                {currentUser.allow_saving === true && (
                  <button
                    onClick={() => router.push('/favorites')}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg"
                  >
                    Favorites
                  </button>
                )}
                <button
                  onClick={() => router.push('/settings')}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg"
                >
                  Settings
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

        <section className="w-full max-w-lg">
          {/* --- MODIFIED: FORM --- */}
          <form onSubmit={handleSubmit} className="w-full mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What's the best laptop for a student under $800?"
              className="w-full p-4 border rounded-lg text-black bg-white"
            />
            
            {/* --- NEW: PRICE FILTER --- */}
            <div className="mt-6">
              <label className="block text-gray-300 mb-2">Price Range</label>
              
              {/* --- Slider Wrapper --- */}
              <div className="relative h-1 w-full flex items-center mb-4">
                {/* --- Track Background --- */}
                <div 
                  className="absolute h-1 bg-gray-700 rounded-full w-full"
                ></div>
                {/* --- Active Track --- */}
                <div 
                  className="absolute h-1 bg-blue-600 rounded-full"
                  style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
                ></div>
                
                {/* --- Min Slider (Bottom) --- */}
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step="50"
                  value={minPrice}
                  onChange={handleMinSliderChange}
                  className="range-slider"
                />
                {/* --- Max Slider (Top) --- */}
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step="50"
                  value={maxPrice}
                  onChange={handleMaxSliderChange}
                  className="range-slider"
                  style={{ background: 'none' }} // Hide top track
                />
              </div>

              {/* --- Min/Max Input Boxes --- */}
              <div className="flex justify-between items-center space-x-4">
                <div className="flex-1">
                  <label htmlFor="min-price" className="block text-sm text-gray-400">Min Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      id="min-price"
                      type="number"
                      step="50"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full p-2 pl-7 rounded-lg text-black bg-white"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="max-price" className="block text-sm text-gray-400">Max Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      id="max-price"
                      type="number"
                      step="50"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full p-2 pl-7 rounded-lg text-black bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* --- END: PRICE FILTER --- */}

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-blue-600 text-white p-2 rounded-lg mt-8 disabled:bg-gray-400"
            >
              {isLoading ? 'Getting suggestions...' : 'Get Suggestions'}
            </button>
          </form>

          {/* --- (Rest of the page is identical) --- */}
          {error && (
            <div className="w-full p-4 bg-red-800 text-white rounded-lg mb-4">
              <p><span className="font-bold">Error:</span> {error}</p>
            </div>
          )}

          <div className="w-full space-y-4">
            {results.map((product) => (
              <div key={product.product_id} className="p-4 border rounded-lg bg-gray-800 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-white">{product.product_name}</h3>
                  <p className="text-gray-300">{product.price_range}</p>
                  <p className="mt-2 text-gray-200">{product.ai_summary}</p>
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
      
      {/* --- NEW: CUSTOM CSS FOR SLIDERS --- */}
      <style jsx global>{`
        /* This is the magic for the dual slider */
        .range-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 0.5rem;
          background: transparent;
          position: absolute;
          left: 0;
          pointer-events: none; /* Allows clicks to "pass through" to slider below */
        }
        
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 1.25rem; /* 20px */
          height: 1.25rem; /* 20px */
          background: #3b82f6; /* blue-600 */
          border-radius: 50%;
          border: 2px solid white;
          cursor: pointer;
          pointer-events: auto; /* Re-enable pointer events on the thumb */
          position: relative;
          z-index: 10;
        }

        .range-slider::-moz-range-thumb {
          width: 1.25rem;
          height: 1.25rem;
          background: #3b82f6;
          border-radius: 50%;
          border: 2px solid white;
          cursor: pointer;
          pointer-events: auto;
          position: relative;
          z-index: 10;
        }
        
        /* Hide the default track */
        .range-slider::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 0;
        }
        .range-slider::-moz-range-track {
          -moz-appearance: none;
          height: 0;
        }
        /* Hide number input arrows in Chrome/Safari/Edge */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Hide number input arrows in Firefox */
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      
    </main>
  );
}