import React, { useState } from 'react';
import { X, Moon, Sun, Globe, Bell, Trash2, HelpCircle, ChevronRight, LogOut, Shield, HardDrive, ArrowLeft, RefreshCw, User as UserIcon, Heart, Copy, Check, Database, Lock, Server, Cpu, CreditCard, Wallet, Star, ShieldCheck, Code, Zap, Github, Youtube, Instagram } from 'lucide-react';
import { Language, User as UserType } from '../types';
import { translations } from '../utils/translations';
import { Logo } from './Logo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onLogout: () => void;
  onEditProfile: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  storageStats: {
    percent: string;
    usedMB: string;
    totalGB: number;
  };
  deviceQuota?: {
    used: number;
    total: number;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onEditProfile,
  theme,
  toggleTheme,
  language,
  setLanguage,
  notificationsEnabled,
  toggleNotifications,
  storageStats,
  deviceQuota
}) => {
  if (!isOpen) return null;

  const t = translations[language];
  const [activeSubPage, setActiveSubPage] = useState<'privacy' | 'about' | 'support' | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // DONATION DETAILS
  const PIX_KEY = "88c11f7f-ff00-48cb-a2ae-969badcdcc35";
  const PIX_NAME = "Guilherme Augusto Santos de Souza";
  const PIX_BANK = "Mercado Pago";

  const isImageAvatar = (avatar?: string) => (avatar?.length || 0) > 3 || avatar?.startsWith('http') || avatar?.startsWith('data:');

  const handleCopyPix = () => {
      navigator.clipboard.writeText(PIX_KEY);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
  };

  const clearCache = async () => {
      if(window.confirm(t.clearCacheConfirm)) {
          setIsClearingCache(true);
          
          // 1. Clear Storage
          localStorage.clear();
          sessionStorage.clear();
          
          // 2. Clear Service Workers
          if ('serviceWorker' in navigator) {
             try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
             } catch(e) { console.error(e); }
          }

          // 3. Clear IndexedDB
          if (window.indexedDB) {
             const DB_NAME = 'UnyxCloudDB';
             try {
                 // Close any open connections if possible (not possible without handle)
                 // Just attempt delete
                 const req = window.indexedDB.deleteDatabase(DB_NAME);
                 
                 req.onsuccess = () => {
                     console.log("DB Deleted Successfully");
                     window.location.reload();
                 };
                 req.onerror = () => {
                     console.error("DB Delete Failed");
                     window.location.reload();
                 };
                 req.onblocked = () => {
                     console.warn("DB Delete Blocked");
                     // Force reload which closes connections, allowing pending delete to happen by browser
                     window.location.reload(); 
                 };
             } catch (e) {
                 console.error("IDB Error", e);
                 window.location.reload();
             }
          } else {
              window.location.reload();
          }
      }
  };

  // Format device quota bytes to GB
  const deviceTotalGB = deviceQuota ? (deviceQuota.total / (1024 * 1024 * 1024)).toFixed(1) : '0';
  const deviceUsedGB = deviceQuota ? (deviceQuota.used / (1024 * 1024 * 1024)).toFixed(2) : '0';
  const devicePercent = deviceQuota && deviceQuota.total > 0 ? ((deviceQuota.used / deviceQuota.total) * 100).toFixed(1) : '0';

  const renderSubPage = () => {
      if (activeSubPage === 'support') {
          return (
              <div className="flex-1 overflow-y-auto p-6 animate-fade-in flex flex-col relative bg-slate-50 dark:bg-black/20">
                  <div className="text-center mb-8 mt-4">
                      <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-500 shadow-lg shadow-orange-500/20 mb-4 animate-slide-up">
                          <Heart className="h-8 w-8 text-white fill-white/20" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.donateTitle}</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                          {t.donateText}
                      </p>
                  </div>

                  <div className="w-full max-w-sm mx-auto space-y-6">
                      {/* Pix Digital Card */}
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#111] dark:to-black text-white shadow-2xl border border-white/10 group">
                           {/* Decorative Elements */}
                           <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                           <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                           
                           <div className="relative p-6 z-10">
                               <div className="flex justify-between items-start mb-8">
                                   <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                                            <Wallet className="h-4 w-4 text-teal-400" />
                                       </div>
                                       <span className="font-bold text-lg tracking-tight">Pix</span>
                                   </div>
                                   <CreditCard className="h-6 w-6 text-slate-500" />
                               </div>

                               <div className="space-y-1 mb-8">
                                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Chave Pix (Key)</p>
                                   <p className="font-mono text-sm md:text-base text-teal-300 break-all select-all">
                                       {PIX_KEY}
                                   </p>
                               </div>

                               <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                   <div>
                                       <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Beneficiary</p>
                                       <p className="text-xs font-semibold text-white">{PIX_NAME}</p>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Institution</p>
                                       <p className="text-xs font-semibold text-white">{PIX_BANK}</p>
                                   </div>
                               </div>
                           </div>
                      </div>

                      {/* Copy Action */}
                      <button 
                          onClick={handleCopyPix}
                          className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                              copiedKey 
                              ? 'bg-green-500 text-white shadow-green-500/30 scale-[0.98]' 
                              : 'bg-white dark:bg-white text-slate-900 shadow-slate-200/50 dark:shadow-none hover:-translate-y-0.5'
                          }`}
                      >
                          {copiedKey ? (
                              <>
                                <Check className="h-5 w-5" />
                                {t.copied}
                              </>
                          ) : (
                              <>
                                <Copy className="h-5 w-5" />
                                {t.copy} Key
                              </>
                          )}
                      </button>

                      <p className="text-center text-xs text-slate-400 leading-relaxed px-4">
                          Your support helps keep the servers running and fuels development of new AI features. Thank you! 🌟
                      </p>
                  </div>
              </div>
          );
      }
      if (activeSubPage === 'privacy') {
          return (
              <div className="flex-1 overflow-y-auto p-6 animate-fade-in bg-slate-50 dark:bg-black relative">
                  <div className="max-w-xl mx-auto space-y-8 pb-10">
                      
                      {/* Header with Hero Icon */}
                      <div className="text-center space-y-2 py-4">
                          <div className="inline-flex p-4 rounded-full bg-blue-500/10 mb-2">
                              <ShieldCheck className="h-10 w-10 text-blue-500" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t.privacyPolicy}</h3>
                          <p className="text-sm text-slate-500">{t.privacy?.lastUpdated}</p>
                      </div>

                      {/* Mission Statement */}
                      <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed" 
                             dangerouslySetInnerHTML={{ __html: t.privacy?.intro.replace('**Local-First**', '<span class="text-blue-500 font-bold">Local-First</span>') }} />
                      </div>

                      {/* Cards Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                          {/* Data Storage Card */}
                          <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col">
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 bg-purple-500/10 rounded-lg"><Database className="h-5 w-5 text-purple-500" /></div>
                                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{t.privacy?.dataStorageTitle}</h4>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                                  {t.privacy?.dataStorageText}
                              </p>
                              <ul className="space-y-2">
                                  {t.privacy?.dataStorageList.map((item: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                  ))}
                              </ul>
                          </div>

                          {/* Rights Card */}
                          <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col">
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 bg-green-500/10 rounded-lg"><Lock className="h-5 w-5 text-green-500" /></div>
                                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{t.privacy?.rightsTitle}</h4>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                                  {t.privacy?.rightsIntro}
                              </p>
                              <ul className="space-y-2">
                                 {t.privacy?.rightsList.map((right: string, idx: number) => (
                                     <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 flex-shrink-0"></div>
                                        <span>{right}</span>
                                     </li>
                                 ))}
                              </ul>
                          </div>
                      </div>

                      {/* Footer Contact */}
                      <div className="text-center pt-4 border-t border-slate-200 dark:border-white/10">
                          <p className="text-xs text-slate-400">
                              {t.privacy?.contact} <a href="mailto:privacy@unyxcloud.com" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">privacy@unyxcloud.com</a>
                          </p>
                      </div>
                  </div>
              </div>
          );
      }
      if (activeSubPage === 'about') {
          return (
              <div className="flex-1 overflow-y-auto animate-fade-in bg-slate-50 dark:bg-black">
                  <div className="flex flex-col items-center pt-12 pb-8 px-6">
                      
                      {/* Hero Section */}
                      <div className="relative mb-6 group cursor-default">
                          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                          <div className="relative bg-black rounded-3xl p-1 shadow-2xl">
                             <div className="bg-gradient-to-br from-slate-900 to-black rounded-2xl p-6 border border-white/10">
                                <Logo size="xl" showText={false} />
                             </div>
                          </div>
                      </div>

                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Unyx</h3>
                      
                      <div className="flex items-center gap-2 mb-8">
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                              v2.1.0 Beta
                          </span>
                      </div>
                      
                      {/* Info Cards */}
                      <div className="w-full max-w-md space-y-3">
                          {/* Updated Developer Card with Socials */}
                          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                              <div className="flex items-center gap-4">
                                  <div className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
                                      <UserIcon className="h-5 w-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Developer</p>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">Guixs232</p>
                                  </div>
                              </div>
                              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                   <a href="https://github.com/Guixs232" target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-white/5 text-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center justify-center gap-2">
                                       <Github className="h-3.5 w-3.5" /> GitHub
                                   </a>
                                   <a href="https://youtube.com/@gui.xs23?si=kIb9WfBs80D6R_oj" target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-center text-xs font-bold text-red-600 dark:text-red-500 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-2">
                                       <Youtube className="h-3.5 w-3.5" /> YouTube
                                   </a>
                                   <a href="https://www.instagram.com/gui.xs23?igsh=OXJ5dHpyZmtlZTlx" target="_blank" rel="noreferrer" className="flex-1 py-2 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-center text-xs font-bold text-pink-600 dark:text-pink-500 hover:bg-pink-600 hover:text-white transition-colors flex items-center justify-center gap-2">
                                       <Instagram className="h-3.5 w-3.5" /> Instagram
                                   </a>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                              <div className="flex items-center gap-4">
                                  <div className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 group-hover:text-green-500 transition-colors">
                                      <Server className="h-5 w-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Build Date</p>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">December 03, 2025</p>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                              <div className="flex items-center gap-4">
                                  <div className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 group-hover:text-purple-500 transition-colors">
                                      <Cpu className="h-5 w-5" />
                                  </div>
                                  <div>
                                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Engine</p>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">Unyx Core (React + Tailwind)</p>
                                  </div>
                              </div>
                              <div className="p-2 text-slate-400">
                                  <Code className="h-4 w-4" />
                              </div>
                          </div>
                      </div>

                      <div className="mt-12 text-center space-y-2">
                          <p className="text-xs text-slate-400">© 2025 Unyx. All rights reserved.</p>
                          <p className="text-[10px] text-slate-500">Made with ❤️ for the community.</p>
                      </div>
                  </div>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md animate-fade-in flex justify-end md:justify-center md:items-center p-0 md:p-4">
      <div className="bg-[#f2f2f7] dark:bg-[#000] w-full md:max-w-2xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up md:border border-slate-200 dark:border-white/10 relative">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-[#111] border-b border-slate-200 dark:border-white/10 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
              {activeSubPage && (
                  <button onClick={() => setActiveSubPage(null)} className="mr-2 p-1 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                      <ArrowLeft className="h-5 w-5 text-slate-900 dark:text-white" />
                  </button>
              )}
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeSubPage === 'privacy' ? t.privacyPolicy : activeSubPage === 'about' ? t.about : activeSubPage === 'support' ? t.supportDeveloper : t.settings}
              </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        {activeSubPage ? renderSubPage() : (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
                
                {/* Account Info */}
                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase ml-4 mb-2">{t.account}</h3>
                    <div className="bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
                        <div onClick={onEditProfile} className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                             <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[2px]">
                                {isImageAvatar(user.avatar) ? 
                                    <img src={user.avatar} className="h-full w-full rounded-full object-cover" alt="Avatar" /> : 
                                    <div className="h-full w-full bg-black rounded-full flex items-center justify-center font-bold text-white text-xl">{user.avatar}</div>
                                }
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h4>
                                <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                        </div>
                        
                        <div className="border-t border-slate-100 dark:border-white/5 p-4">
                            {/* App Storage */}
                            <div className="flex justify-between items-end mb-2">
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.storage} (App)</span>
                                 <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{storageStats.usedMB} / {storageStats.totalGB} GB</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${storageStats.percent}%` }}></div>
                            </div>

                            {/* Device Storage (Real) */}
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <HardDrive className="h-3 w-3" /> {t.deviceStorage}
                                </span>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{deviceUsedGB} / {deviceTotalGB} GB</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${devicePercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preferences Section */}
                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase ml-4 mb-2">{t.preferences}</h3>
                    <div className="bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                        
                        {/* Theme */}
                        <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                                    {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{theme === 'light' ? t.lightMode : t.darkMode}</span>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-green-500' : 'bg-slate-300 dark:bg-white/20'}`}>
                                 <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${theme === 'dark' ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </button>

                        {/* Language */}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Globe className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{t.language}</span>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-white/10 rounded-lg p-1">
                                 {(['en', 'pt', 'es'] as Language[]).map(lang => (
                                    <button 
                                        key={lang} 
                                        onClick={() => setLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${language === lang ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        {lang.toUpperCase()}
                                    </button>
                                 ))}
                            </div>
                        </div>

                        {/* Notifications Toggle */}
                        <button onClick={toggleNotifications} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
                                    <Bell className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{t.notifications}</span>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${notificationsEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-white/20'}`}>
                                 <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${notificationsEnabled ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Data & Privacy */}
                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase ml-4 mb-2">{t.dataPrivacy}</h3>
                    <div className="bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                         <button onClick={clearCache} disabled={isClearingCache} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-200 dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300">
                                    {isClearingCache ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{isClearingCache ? 'Cleaning...' : t.clearCache}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                         <button onClick={() => setActiveSubPage('privacy')} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-200 dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{t.privacyPolicy}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>
                </section>

                 {/* Support */}
                <section>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase ml-4 mb-2">{t.helpSupport}</h3>
                    <div className="bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                         {/* SUPPORT BUTTON */}
                         <button onClick={() => setActiveSubPage('support')} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-lg text-white">
                                    <Star className="h-5 w-5 fill-white" />
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{t.supportDeveloper}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>

                         <button onClick={() => setActiveSubPage('about')} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600 dark:text-yellow-400">
                                    <HelpCircle className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{t.about}</span>
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1">{t.version} <ChevronRight className="h-3 w-3" /></span>
                        </button>
                    </div>
                </section>

                 <button onClick={onLogout} className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-red-500/20 mb-safe">
                    <LogOut className="h-5 w-5" />
                    {t.logout}
                 </button>
            </div>
        )}
      </div>
    </div>
  );
};