'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // To show login errors

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear old errors

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        router.push(`/login/2fa?uid=${data.uid}`);
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-3xl font-bold mb-8">Log In</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg text-black bg-white"
            placeholder="you@email.com"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg text-black bg-white"
            placeholder="••••••••"
            required
          />
        </div>
        
        {error && (
          <p className="text-red-500 text-center mb-4">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg"
        >
          Sign In
        </button>
        
        {/* --- NEW BACK BUTTON --- */}
        <div className="text-center mt-6">
          <button 
            type="button" // Important to prevent form submission
            onClick={() => router.push('/')} 
            className="text-gray-400 hover:text-white underline"
          >
            &larr; Back to Home
          </button>
        </div>
        {/* --- END OF NEW BUTTON --- */}
        
      </form>
    </main>
  );
}