import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Sparkles, User, Zap } from 'lucide-react';
import { fastAssistant } from '../services/geminiService';
import { ChatMessage, Language } from '../types';
import { translations } from '../utils/translations';

interface AssistantProps {
    language: Language;
}

export const Assistant: React.FC<AssistantProps> = ({ language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[language];

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize greeting only once or when language changes if empty
  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{ 
            id: '1', 
            role: 'model', 
            text: t.aiGreeting, 
            timestamp: new Date() 
        }]);
    }
  }, [language, t.aiGreeting]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await fastAssistant(input);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 group transition-all duration-300 z-30"
        >
          <div className="absolute inset-0 bg-purple-600 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
          <div className="relative bg-black dark:bg-white text-white dark:text-black p-4 rounded-full shadow-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200 border border-white/10">
             <Sparkles className="h-6 w-6" />
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 w-full md:w-[400px] bg-white dark:bg-black md:rounded-3xl shadow-2xl border-0 md:border border-slate-200 dark:border-white/10 z-50 flex flex-col overflow-hidden animate-slide-up h-full md:h-[600px]">
          
          {/* Header */}
          <div className="relative bg-white/90 dark:bg-black/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-slate-100 dark:border-white/10 pt-safe md:pt-4 z-20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{t.assistantTitle}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gemini Flash-Lite</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-black relative">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in relative z-10`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-oled-card border border-slate-100 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white dark:bg-oled-card border border-slate-100 dark:border-white/10 rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-black/90 backdrop-blur-md border-t border-slate-100 dark:border-white/10 pb-safe md:pb-4 z-20">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.askAi}
                className="w-full pl-5 pr-12 py-3.5 bg-slate-100 dark:bg-oled-card border-none rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
