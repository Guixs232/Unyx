import React, { useState, useRef, useEffect } from 'react';
import { User, Language } from '../types';
import { Button } from './Button';
import { X, Camera, User as UserIcon, Edit2 } from 'lucide-react';
import { translations } from '../utils/translations';

interface ProfileEditorProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
  language: Language;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, isOpen, onClose, onSave, language }) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  // Heuristic: if avatar is long (data URL) or http, it's an image. If short (Initials), it's text.
  const isImageAvatar = (avatar?.length > 3) || avatar?.startsWith('http') || avatar?.startsWith('data:');

  useEffect(() => {
    if(isOpen) {
        setName(user.name);
        setAvatar(user.avatar || '');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Optimized for LocalStorage: Small dimensions, lower quality
          const MAX_SIZE = 128; 
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG 0.6 quality
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const resizedAvatar = await resizeImage(file);
        setAvatar(resizedAvatar);
      } catch (error) {
        console.error("Error resizing image", error);
        alert("Failed to process image. Please try another one.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSave = () => {
    onSave({ ...user, name, avatar });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden relative animate-slide-up">
        
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.editProfile}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center gap-6">
            {/* Avatar Section */}
            <div className={`relative group cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => fileInputRef.current?.click()}>
                <div className="h-28 w-28 rounded-full border-4 border-slate-100 dark:border-white/10 overflow-hidden relative shadow-xl">
                    {isImageAvatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
                            {avatar}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-8 w-8 text-white" />
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 bg-white dark:bg-blue-600 rounded-full p-2 shadow-lg border border-slate-100 dark:border-transparent">
                    <Edit2 className="h-4 w-4 text-slate-700 dark:text-white" />
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                />
            </div>

            {/* Name Input */}
            <div className="w-full space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase ml-1">{t.fullName}</label>
                <div className="relative">
                    <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
                        placeholder="Your Name"
                    />
                </div>
            </div>

            <Button onClick={handleSave} className="w-full py-3 mt-2" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : t.saveChanges}
            </Button>
        </div>

      </div>
    </div>
  );
};