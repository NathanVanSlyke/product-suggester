'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- UPDATED USER TYPE ---
type User = {
  uid: string;
  isLoggedIn: boolean;
  allow_saving: boolean | null;
  email: string; // <-- ADDED EMAIL (though not used here, good for consistency)
};

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setCurrentUser(JSON.parse(userString));
    } else {
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

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

      const updatedUser = { ...currentUser, allow_saving: newConsent };
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess('Preference updated!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/user?uid=${currentUser.uid}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete account.');
      
      // Call the logout function to clear data and redirect
      handleLogout();

    } catch (err: any) {
      setError(err.message);
      setShowDeleteModal(false);
    }
  };
  
  // --- NEW LOGOUT FUNCTION ---
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
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
        
        <section className="w-full max-w-lg p-8 bg-gray-800 rounded-lg space-y-6 text-white">
          
          {/* --- NEW ACCOUNT ACTIONS SECTION --- */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">Account Actions</h2>
            <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
              <p>Log out of your account.</p>
              <button
                onClick={handleLogout}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* --- Privacy Settings --- */}
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
                onClick={() => setShowDeleteModal(true)}
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
      
      {/* --- Confirmation Modal (Unchanged) --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-black max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-4">Are you sure?</h2>
            <p className="mb-6">
              This action is permanent and cannot be undone. All of your favorites and search history will be erased.
            </p>
            <div className="flex justify-around">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-600 text-white py-2 px-6 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
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