
import React, { useState } from 'react';
import { X, Send, MessageCircle, Film, Users } from 'lucide-react';
import { CloudFile, Language, User } from '../types';
import { translations } from '../utils/translations';

interface WatchPartyProps {
  file: CloudFile;
  user: User;
  onClose: () => void;
  language: Language;
}

export const WatchParty: React.FC<WatchPartyProps> = ({ file, user, onClose, language }) => {
  const t = translations[language];
  const [messages, setMessages] = useState<{id: string, user: string, text: string}[]>([
      { id: '1', user: 'System', text: `Started watching ${file.name}` }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
      if(!input.trim()) return;
      setMessages(prev => [...prev, { id: Date.now().toString(), user: user.name, text: input }]);
      setInput('');
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col md:flex-row animate-fade-in">
      
      {/* Video Area */}
      <div className="flex-1 flex flex-col bg-black relative">
          {/* Header Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                  <Film className="h-5 w-5 text-red-500" />
                  <span className="font-bold drop-shadow-md">{t.watchPartyMode}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2 flex items-center gap-1"><Users className="h-3 w-3" /> 2</span>
              </div>
              <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white hover:bg-white/20 backdrop-blur-sm">
                  <X className="h-5 w-5" />
              </button>
          </div>

          {/* Player */}
          <div className="flex-1 flex items-center justify-center">
              <video 
                src={file.url} 
                controls 
                autoPlay 
                className="max-w-full max-h-full w-full aspect-video shadow-2xl"
              />
          </div>
      </div>

      {/* Chat Sidebar */}
      <div className="h-64 md:h-full md:w-80 bg-[#09090b] border-t md:border-t-0 md:border-l border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.user === 'System' ? 'items-center' : (msg.user === user.name ? 'items-end' : 'items-start')}`}>
                      {msg.user === 'System' ? (
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest my-2">{msg.text}</span>
                      ) : (
                          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.user === user.name ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                              <span className="block text-[9px] opacity-50 mb-0.5">{msg.user}</span>
                              {msg.text}
                          </div>
                      )}
                  </div>
              ))}
          </div>

          <div className="p-3 bg-black border-t border-white/10">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t.typeMessage}
                    className="bg-transparent border-none text-white text-xs w-full focus:outline-none"
                  />
                  <button onClick={handleSend} className="text-blue-500 hover:text-blue-400"><Send className="h-4 w-4" /></button>
              </div>
          </div>
      </div>
    </div>
  );
};
