// app/settings/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define the User type again, just like on the homepage
type User = {
  uid: string;
  isLoggedIn: boolean;
  allow_saving: boolean | null;
};

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for our custom "are you sure?" modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const router = useRouter();

  // 1. Get user from localStorage on page load
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setCurrentUser(JSON.parse(userString));
    } else {
      router.push('/login'); // Not logged in, send them away
    }
    setIsLoading(false);
  }, [router]);

  // 2. Handle the consent toggle
  const handleConsentChange = async (newConsent: boolean) => {
    if (!currentUser) return;
    
    setSuccess('');
    setError('');

    try {
      const response = await fetch('/api/user-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, consent: newConsent }),
      });
      
      if (!response.ok) throw new Error('Failed to update preference.');

      // IMPORTANT: We must update *both* state and localStorage
      const updatedUser = { ...currentUser, allow_saving: newConsent };
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess('Preference updated!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 3. Handle the final "Delete" click
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/user?uid=${currentUser.uid}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete account.');
      
      // If successful, log them out and send to homepage
      localStorage.removeItem('user');
      router.push('/');

    } catch (err: any) {
      setError(err.message);
      setShowDeleteModal(false); // Close the modal on error
    }
  };

  if (isLoading || !currentUser) {
    return (
      <main className="flex min-h-screen flex-col items-center p-24">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </main>
    );
  }

  return (
    <>
      {/* --- Main Page Content --- */}
      <main className="flex min-h-screen flex-col items-center p-12">
        <header className="w-full max-w-5xl flex justify-between items-center mb-16">
          <h1 className="text-4xl font-bold">Settings</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            Back to Search
          </button>
        </header>
        
        <section className="w-full max-w-lg p-8 bg-gray-800 rounded-lg space-y-6">
          {/* --- Consent Settings --- */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">Privacy Settings</h2>
            <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
              <label htmlFor="consent-toggle" className="text-lg">
                Allow saving search history & favorites
              </label>
              <button
                id="consent-toggle"
                onClick={() => handleConsentChange(!currentUser.allow_saving)}
                className={`w-14 h-8 rounded-full flex items-center transition-colors ${
                  currentUser.allow_saving ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    currentUser.allow_saving ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {/* --- Account Deletion --- */}
          <div>
            <h2 className="text-2xl font-semibold mb-2 text-red-400">Danger Zone</h2>
            <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
              <p>Permanently delete your account.</p>
              <button
                onClick={() => setShowDeleteModal(true)} // This opens the modal
                className="bg-red-600 text-white py-2 px-4 rounded-lg"
              >
                Delete Account
              </button>
            </div>
          </div>
          
          {success && <p className="text-green-500 text-center">{success}</p>}
          {error && <p className="text-red-500 text-center">{error}</p>}
        </section>
      </main>
      
      {/* --- Confirmation Modal --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-black max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-4">Are you sure?</h2>
            <p className="mb-6">
              This action is permanent and cannot be undone. All of your favorites and search history will be erased.
            </p>
            <div className="flex justify-around">
              <button
                onClick={() => setShowDeleteModal(false)} // Close modal
                className="bg-gray-600 text-white py-2 px-6 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount} // Call delete function
                className="bg-red-600 text-white py-2 px-6 rounded-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}