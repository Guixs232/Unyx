
import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Plus, Search, MessageCircle, ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import { User, Language, DirectMessage, ChatSession } from '../types';
import { translations } from '../utils/translations';
import { saveDirectMessage, getUserMessages, getUser, searchUsers } from '../utils/db';
import { Button } from './Button';

interface ChatScreenProps {
  user: User;
  language: Language;
  onStartCall?: (contactName: string, isVideo: boolean) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ user, language, onStartCall }) => {
  const t = translations[language];
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  
  // New Chat Search State
  const [newChatSearch, setNewChatSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Chat Sessions
  useEffect(() => {
    const loadSessions = async () => {
      const allMsgs = await getUserMessages(user.email);
      const sessionMap = new Map<string, ChatSession>();

      allMsgs.forEach(msg => {
        const partnerId = msg.senderId === user.email ? msg.receiverId : msg.senderId;
        const existing = sessionMap.get(partnerId);
        
        // Check if this message is newer
        if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessageDate)) {
          sessionMap.set(partnerId, {
            partnerId,
            partnerName: partnerId.split('@')[0], // Fallback name
            lastMessage: msg.text,
            lastMessageDate: msg.timestamp,
            unreadCount: 0 
          });
        }
      });

      setSessions(Array.from(sessionMap.values()).sort((a, b) => 
        new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
      ));
    };

    loadSessions();
    const interval = setInterval(loadSessions, 5000); 
    return () => clearInterval(interval);
  }, [user.email]);

  // Load Active Chat Messages
  useEffect(() => {
    if (!activeChatId) return;

    const loadMessages = async () => {
      const allMsgs = await getUserMessages(user.email);
      const chatMsgs = allMsgs.filter(m => 
        (m.senderId === user.email && m.receiverId === activeChatId) ||
        (m.senderId === activeChatId && m.receiverId === user.email)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages(chatMsgs);
      scrollToBottom();
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [activeChatId, user.email]);

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatId) return;

    const msg: DirectMessage = {
      id: Date.now().toString(),
      senderId: user.email,
      receiverId: activeChatId,
      text: newMessage,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    await saveDirectMessage(msg);
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    scrollToBottom();

    if (activeChatId.includes('echo') || activeChatId.includes('bot')) {
        setTimeout(async () => {
            const reply: DirectMessage = {
                id: (Date.now() + 1).toString(),
                senderId: activeChatId,
                receiverId: user.email,
                text: `Echo: ${msg.text}`,
                timestamp: new Date().toISOString(),
                isRead: false
            };
            await saveDirectMessage(reply);
            setMessages(prev => [...prev, reply]);
            scrollToBottom();
        }, 1000);
    }
  };

  const handleSearchUsers = async () => {
      if (!newChatSearch.trim()) return;
      setIsSearching(true);
      try {
          const results = await searchUsers(newChatSearch);
          // Filter out myself
          const filtered = results.filter(u => u.email !== user.email);
          setSearchResults(filtered);
      } finally {
          setIsSearching(false);
      }
  };

  const startChatWithUser = (selectedUser: User) => {
    const email = selectedUser.email;
    setActiveChatId(email);
    setIsNewChatOpen(false);
    setNewChatSearch('');
    setSearchResults([]);
    
    if (!sessions.find(s => s.partnerId === email)) {
       setSessions(prev => [{
           partnerId: email,
           partnerName: selectedUser.name || email.split('@')[0],
           lastMessage: '',
           lastMessageDate: new Date().toISOString(),
           unreadCount: 0
       }, ...prev]);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-black overflow-hidden">
      {/* Sidebar (List) */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#09090b]`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-800 dark:text-white">{t.messages}</h2>
            <button onClick={() => setIsNewChatOpen(true)} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
                <Plus className="h-5 w-5" />
            </button>
        </div>
        
        <div className="p-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search chats..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white"
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <MessageCircle className="h-12 w-12 opacity-20 mb-2" />
                    <p className="text-sm">{t.noMessages}</p>
                </div>
            ) : (
                sessions
                  .filter(s => s.partnerId.includes(searchQuery) || s.partnerName.includes(searchQuery))
                  .map(session => (
                    <div 
                        key={session.partnerId}
                        onClick={() => setActiveChatId(session.partnerId)}
                        className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-100 dark:border-white/5 ${activeChatId === session.partnerId ? 'bg-blue-50 dark:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {session.partnerName.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{session.partnerName}</h3>
                                <span className="text-[10px] text-slate-400">{new Date(session.lastMessageDate).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.lastMessage}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${!activeChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#f8fafc] dark:bg-black relative`}>
         {!activeChatId ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                     <MessageCircle className="h-10 w-10 opacity-50" />
                 </div>
                 <p>{t.startChat}</p>
             </div>
         ) : (
             <>
                {/* Header */}
                <div className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center px-4 justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 -ml-2 text-slate-500">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                            {activeChatId.split('@')[0].substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{activeChatId.split('@')[0]}</h3>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-[10px] text-slate-500">Online</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Call Buttons */}
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => onStartCall && onStartCall(activeChatId || 'User', false)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <Phone className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={() => onStartCall && onStartCall(activeChatId || 'User', true)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <Video className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.senderId === user.email;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-br-sm' 
                                    : 'bg-white dark:bg-[#1a1a1a] border border-slate-100 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                                }`}>
                                    {msg.text}
                                    <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-black border-t border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={t.typeMessage}
                            className="flex-1 bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
             </>
         )}
      </div>

      {/* New Chat Modal with Search */}
      {isNewChatOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border border-slate-200 dark:border-white/10 flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <h3 className="font-bold text-lg dark:text-white">{t.newChat}</h3>
                      <button onClick={() => setIsNewChatOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
                  </div>
                  <div className="p-4 border-b border-slate-200 dark:border-white/10">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t.enterNameOrEmail}</label>
                      <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newChatSearch}
                            onChange={(e) => setNewChatSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                            className="flex-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="John / user@example.com"
                            autoFocus
                        />
                        <Button size="sm" onClick={handleSearchUsers} disabled={isSearching}>
                            {isSearching ? "..." : t.search}
                        </Button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2">
                      {searchResults.length > 0 ? (
                          <div className="space-y-1">
                              <p className="text-xs text-slate-500 px-2 mb-1">{t.selectUser}:</p>
                              {searchResults.map(u => (
                                  <div 
                                    key={u.id} 
                                    onClick={() => startChatWithUser(u)}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                  >
                                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                          {u.avatar && (u.avatar.startsWith('http') || u.avatar.length > 3) ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.avatar}
                                      </div>
                                      <div>
                                          <p className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</p>
                                          <p className="text-xs text-slate-500">{u.email}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                              <p className="text-sm">{isSearching ? 'Searching...' : t.noUsersFound}</p>
                              {!isSearching && newChatSearch === '' && <p className="text-xs mt-2">Try searching for <strong>Demo User</strong></p>}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
