
import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle, ShieldCheck, Zap, Hexagon, ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { Language, User } from '../types';
import { translations } from '../utils/translations';
import { Logo } from './Logo';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { saveUser, getUser } from '../utils/db';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  language: Language;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, language }) => {
  const [viewState, setViewState] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const t = translations[language];

  // Reset errors when switching views
  const switchView = (view: 'login' | 'register' | 'forgot') => {
    setViewState(view);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
      } else {
        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setSuccessMessage(`Reset link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewState === 'forgot') {
        await handleResetPassword(e);
        return;
    }

    if (!email || !password || (viewState === 'register' && !name)) return;
    
    setError(null);
    setIsLoading(true);

    try {
      // --- 1. SPECIAL BYPASS: DEMO/GUEST USERS ---
      if (email.toLowerCase().includes('demo') || email.toLowerCase().includes('guest')) {
         await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
         
         const demoUser: User = {
            id: 'demo-user-' + Date.now(),
            email: email,
            name: name || 'Demo User',
            avatar: name ? name.substring(0, 2).toUpperCase() : 'DU'
         };
         
         await saveUser(demoUser);
         setSuccessMessage("Demo access granted.");
         setTimeout(() => onLogin(demoUser), 1000);
         return;
      }

      // --- 2. DEMO / OFFLINE MODE (Fallback) ---
      if (!isSupabaseConfigured()) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network

        if (viewState === 'register') {
           const newUser: User = {
             id: 'local-user-' + Date.now(),
             email: email,
             name: name,
             avatar: name.substring(0, 2).toUpperCase()
           };
           await saveUser(newUser);
           setSuccessMessage("Account created locally.");
           setTimeout(() => onLogin(newUser), 1000);
           return;
        } else {
           const existingProfile = await getUser(email);
           if (existingProfile) {
              const appUser: User = {
                  id: existingProfile.id,
                  email: existingProfile.email,
                  name: existingProfile.name,
                  avatar: existingProfile.avatar || existingProfile.name.substring(0, 2).toUpperCase()
              };
              setSuccessMessage("Welcome back.");
              setTimeout(() => onLogin(appUser), 800);
              return;
           } else {
               throw new Error("User not found locally. Please register first.");
           }
        }
      }

      // --- 3. SUPABASE LIVE MODE ---
      if (viewState === 'register') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Sync profile to table if it exists
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              email: email,
              name: name,
              avatar: name.substring(0, 2).toUpperCase(),
              is_drive_connected: false
            });
            
          if (profileError) console.warn("Profile sync warning:", profileError.message);

          setSuccessMessage("Account created successfully!");
          setTimeout(() => {
             const user: User = {
                 id: authData.user!.id,
                 email: authData.user!.email!,
                 name: name,
                 avatar: name.substring(0, 2).toUpperCase()
             };
             onLogin(user);
          }, 1500);
        }

      } else {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            const appUser: User = {
                id: data.user.id,
                email: data.user.email!,
                name: profile?.name || data.user.user_metadata?.full_name || email.split('@')[0],
                avatar: profile?.avatar || data.user.user_metadata?.avatar_url || email.substring(0, 2).toUpperCase()
            };
            
            onLogin(appUser);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || t.authError;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-black text-white font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Left Panel - Brand / Artistic (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative p-16 overflow-hidden bg-[#050505] border-r border-white/5">
          {/* Background Effects */}
          <div className="absolute inset-0 z-0">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10"></div>
               <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[100px] animate-pulse-slow"></div>
               <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[80px] animate-pulse-slow delay-1000"></div>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
          </div>

          <div className="relative z-10 animate-fade-in select-none">
              <div className="flex items-center gap-3 mb-12">
                  <div className="h-10 w-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                     <Hexagon className="h-6 w-6 text-white stroke-[2.5]" />
                  </div>
                  <span className="font-bold text-xl tracking-tight">Unyx</span>
              </div>

              <div className="space-y-6 max-w-lg">
                  <h1 className="text-6xl font-extrabold leading-tight tracking-tight">
                      Future of <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Local Storage</span>
                  </h1>
                  <p className="text-lg text-slate-400 font-light leading-relaxed">
                      Secure, AI-powered cloud management that respects your privacy. 
                      Connect from anywhere, keep data everywhere.
                  </p>
              </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-6 max-w-lg animate-slide-up select-none">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                  <ShieldCheck className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="font-bold text-lg mb-1">Local Encryption</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Your files stay on your device until you decide otherwise.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                  <Zap className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="font-bold text-lg mb-1">Gemini AI</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Smart organization and generation at your fingertips.</p>
              </div>
          </div>
      </div>

      {/* Right Panel - Auth Form (Mobile & Desktop) */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-6 md:p-12 relative z-20 bg-black shadow-2xl pt-safe pb-safe">
          
          <div className={`w-full max-w-sm transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              
              <div className="lg:hidden mb-12 flex justify-center">
                  <Logo size="xl" />
              </div>

              <div className="mb-8 text-center lg:text-left select-none">
                  {viewState === 'forgot' ? (
                      <>
                        <button onClick={() => switchView('login')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
                            <ArrowLeft className="h-4 w-4" /> Back to Login
                        </button>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Reset Password</h2>
                        <p className="text-slate-400 text-sm">Enter your email to receive a reset link.</p>
                      </>
                  ) : (
                      <>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                            {viewState === 'register' ? t.createAccount : "Welcome Back"}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {viewState === 'register' ? "Start your secure journey today." : "Enter your credentials to access your vault."}
                        </p>
                      </>
                  )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs animate-fade-in">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 text-xs animate-fade-in">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                  {viewState === 'register' && (
                      <div className="space-y-1.5 animate-slide-up">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-wider">{t.fullName}</label>
                          <div className="relative group">
                              <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                              <input 
                                  type="text" 
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  className="w-full bg-[#111] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                  placeholder="John Doe"
                                  required={viewState === 'register'}
                                  disabled={isLoading || !!successMessage}
                              />
                          </div>
                      </div>
                  )}

                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-wider">{t.email}</label>
                      <div className="relative group">
                          <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-[#111] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                              placeholder="name@example.com"
                              required
                              disabled={isLoading || !!successMessage}
                          />
                      </div>
                  </div>

                  {viewState !== 'forgot' && (
                      <div className="space-y-1.5 animate-slide-up">
                          <div className="flex justify-between ml-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.password}</label>
                              {viewState === 'login' && (
                                  <button type="button" onClick={() => switchView('forgot')} className="text-[11px] text-blue-500 hover:text-blue-400 font-bold transition-colors">
                                      Forgot Password?
                                  </button>
                              )}
                          </div>
                          <div className="relative group">
                              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                              <input 
                                  type="password" 
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="w-full bg-[#111] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-base placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                  placeholder="••••••••"
                                  required
                                  minLength={6}
                                  disabled={isLoading || !!successMessage}
                              />
                          </div>
                      </div>
                  )}

                  <Button 
                        type="submit" 
                        isLoading={isLoading} 
                        disabled={!!successMessage}
                        className="w-full py-4 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        {viewState === 'forgot' ? 'Send Reset Link' : (viewState === 'register' ? t.register : t.login)} 
                        {viewState !== 'forgot' && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
              </form>

              {viewState !== 'forgot' && (
                  <div className="mt-8 text-center select-none">
                      <p className="text-sm text-slate-500">
                            {viewState === 'register' ? t.haveAccount : t.noAccount}{" "}
                            <button 
                                onClick={() => switchView(viewState === 'login' ? 'register' : 'login')}
                                className="text-white hover:text-blue-400 font-bold transition-colors ml-1"
                            >
                                {viewState === 'register' ? t.login : t.register}
                            </button>
                        </p>
                  </div>
              )}
          </div>

          {!isSupabaseConfigured() && (
              <div className="absolute bottom-6 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full select-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest font-bold">Offline / Demo Mode</span>
              </div>
          )}
      </div>
    </div>
  );
};
