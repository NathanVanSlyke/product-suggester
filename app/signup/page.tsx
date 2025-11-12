'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [newUserId, setNewUserId] = useState<number | null>(null);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setNewUserId(data.uid);
        setShowConsentModal(true);
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };
  
  const handleConsent = async (consent: boolean) => {
    if (!newUserId) return;
    
    try {
      await fetch('/api/user-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: newUserId, consent: consent }),
      });
      router.push('/login');
      
    } catch (err) {
      setError('Failed to save preference. Please try logging in.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {showConsentModal ? (
        <div className="bg-white p-8 rounded-lg shadow-xl text-black max-w-sm text-center">
          <h2 className="text-2xl font-bold mb-4">One Last Thing...</h2>
          <p className="mb-6">
            Do you want to allow us to save your search history and favorites?
            This information will be tied to your account.
          </p>
          <div className="flex justify-around">
            <button
              onClick={() => handleConsent(true)}
              className="bg-green-600 text-white py-2 px-6 rounded-lg"
            >
              Yes, Save
            </button>
            <button
              onClick={() => handleConsent(false)}
              className="bg-red-600 text-white py-2 px-6 rounded-lg"
            >
              No, Don't
            </button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-8">Create Account</h1>
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg text-black bg-white" required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg text-black bg-white" required />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border rounded-lg text-black bg-white" required />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg">
              Sign Up
            </button>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            
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
        </>
      )}
    </main>
  );
}