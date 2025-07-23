import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);
    
    if (!success) {
      setError('Invalid credentials or account inactive');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#34256B] via-[#2a1f5a] to-[#1e1749] flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[#34256B]/20">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#DD3C27] to-[#F59888] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <img 
              src="https://thebackroomop.com/hs-fs/hubfs/The%20Back%20Room%20Logo%20WHT_optimised.png?width=100&height=94&name=The%20Back%20Room%20Logo%20WHT_optimised.png" 
              alt="The Backroom Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-[#34256B] mb-2">Welcome Back</h1>
          <p className="text-[#34256B]/70">Wither - OJT Daily Time Record</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#34256B] mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#34256B]/60 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#34256B]/20 rounded-lg focus:ring-2 focus:ring-[#DD3C27] focus:border-[#DD3C27] transition-all duration-200 text-[#34256B] placeholder-[#34256B]/50"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#34256B] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#34256B]/60 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#34256B]/20 rounded-lg focus:ring-2 focus:ring-[#DD3C27] focus:border-[#DD3C27] transition-all duration-200 text-[#34256B] placeholder-[#34256B]/50"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#DD3C27] bg-[#DD3C27]/10 p-3 rounded-lg border border-[#DD3C27]/30">
              <AlertCircle className="w-5 h-5 text-[#DD3C27]" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#DD3C27] to-[#F59888] text-white py-3 px-4 rounded-lg font-medium hover:from-[#c23420] hover:to-[#f28a7a] focus:ring-2 focus:ring-[#DD3C27] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#34256B]/70">
          <p>Default OJT Password: <span className="font-mono bg-[#F5CE00]/20 px-2 py-1 rounded text-[#34256B] border border-[#F5CE00]/30">Spl3ndid2025</span></p>
        </div>
      </div>
    </div>
  );
}