"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogIn } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.judge?.role !== 'admin') {
        setError('Admin access required');
        setLoading(false);
        return;
      }

      localStorage.setItem('adminToken', data.token);
      router.push('/admin/dashboard');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg border-2 border-black shadow-[4px_4px_0_#000] p-8">
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 mx-auto text-[#ff1a1a] mb-4" />
          <h1 className="font-display text-3xl">ADMIN LOGIN</h1>
          <p className="text-gray-500 text-sm mt-2">TECHBLITZ Administration</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-heading mb-1">Email / Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-black rounded px-4 py-2 focus:border-[#ff1a1a] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-heading mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-black rounded px-4 py-2 focus:border-[#ff1a1a] outline-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff1a1a] text-white py-3 rounded font-heading text-lg hover:bg-[#cc0000] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
