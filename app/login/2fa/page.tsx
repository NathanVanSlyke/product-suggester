'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function TwoFactorAuth() {
  const [allowSaving, setAllowSaving] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');

  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false); // We need this back!
  const [qrCode, setQrCode] = useState('');
  const [email, setEmail] = useState('');

  const setupHasRun = useRef(false); // The gate to stop the flash

  useEffect(() => {
    if (!uid) {
      setError('No user ID found. Please log in again.');
      setIsLoading(false);
      return;
    }

    const setup2FA = async () => {
      try {
        // --- FIX: MOVED THE FETCH CALL *BEFORE* USING 'data' ---
        const response = await fetch('/api/login/2fa-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
        });

        const data = await response.json(); // <-- 'data' is created here

        // --- FIX: MOVED THIS LINE *AFTER* 'data' IS CREATED ---
        setAllowSaving(data.allow_saving); 

        if (!response.ok) {
          throw new Error(data.error || 'Failed to set up 2FA.');
        }
        
        setEmail(data.email);
        setIsSetup(data.isSetup); // We get this from the secure API

        if (!data.isSetup) { // Only set QR code if it's a new setup
          setQrCode(data.qrCode);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (setupHasRun.current === false) {
      setup2FA();
      setupHasRun.current = true; // Close the gate
    }
  }, [uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!uid) {
      setError('User session expired. Please log in again.');
      return;
    }

    try {
      const response = await fetch('/api/login/2fa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed.');
      }
      
      localStorage.setItem('user', JSON.stringify({ 
        uid: uid, 
        isLoggedIn: true, 
        allow_saving: allowSaving // This will now have the correct value
        }));
      router.push('/');

    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center p-24">
        <h1 className="text-2xl font-bold">Loading 2FA...</h1>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-2xl font-bold mb-4">Two-Factor Authentication</h1>
      <p className="text-gray-400 mb-8">Verifying identity for {email}</p>

      {/* --- THIS IS THE SECURE RENDER LOGIC --- */}
      {!isSetup && qrCode && (
        <div className="mb-6 text-center max-w-sm">
          <p className="text-gray-300 mb-4">
            This is your first time. Scan this QR code with your authenticator app (like Google Authenticator).
          </p>
          
          {/* --- FIX: Removed the stray text tag that was here --- */}

          <Image src={qrCode} alt="2FA QR Code" width={200} height={200} className="bg-white p-2 mx-auto"/>
        </div>
      )}
      
      {isSetup && (
        <p className="text-gray-300 mb-6 text-center">
          Enter the 6-digit code from your authenticator app.
        </p>
      )}
      {/* --- END OF SECURE RENDER LOGIC --- */}

      <form onSubmit={handleSubmit} className="w-full max-w-xs mt-4">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="123456"
          maxLength={6}
          className="w-full p-3 border rounded-lg text-black bg-white text-center text-2xl tracking-[.2em]"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded-lg mt-4"
        >
          Verify Code
        </button>
        {error && (
          <p className="text-red-500 mt-4 text-center">{error}</p>
        )}
      </form>
    </main>
  );
}