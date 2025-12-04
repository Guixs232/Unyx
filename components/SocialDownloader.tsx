
import React, { useState } from 'react';
import { Link, Download, X, Youtube, Instagram, Twitter, Video, Globe } from 'lucide-react';
import { Button } from './Button';
import { translations } from '../utils/translations';
import { Language, CloudFile, FileType } from '../types';

interface SocialDownloaderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: CloudFile) => void;
  language: Language;
}

export const SocialDownloader: React.FC<SocialDownloaderProps> = ({ isOpen, onClose, onSave, language }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const t = translations[language];

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    setStatus(t.analyzingLink);
    setProgress(10);

    try {
        // Simulate network request time
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress(40);
        setStatus(t.processingVideo);

        let fileData: Partial<CloudFile> = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            tags: ['downloaded'],
            uploadProgress: undefined
        };

        const lowerUrl = url.toLowerCase();
        // Crucial for fixing YouTube Error 153 - Must match the exact domain hosting the app
        const origin = encodeURIComponent(window.location.origin); 

        // --- YouTube Parser ---
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            let videoId = '';
            
            // robust regex for standard, short, embed, and mobile urls
            // Matches:
            // youtube.com/watch?v=ID
            // youtu.be/ID
            // youtube.com/shorts/ID
            // youtube.com/embed/ID
            const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
            const match = url.match(regExp);

            if (match && match[7].length === 11) {
                videoId = match[7];
            } else if (lowerUrl.includes('/shorts/')) {
                // Fallback for specific shorts structure if regex misses
                const parts = url.split('/shorts/');
                if (parts[1]) {
                    videoId = parts[1].split('?')[0];
                }
            }

            if (videoId) {
                fileData = {
                    ...fileData,
                    name: `YouTube Video (${videoId})`,
                    type: FileType.VIDEO,
                    size: 'Stream',
                    url: url, 
                    // FIX ERROR 153: 
                    // 1. origin param must be encoded
                    // 2. playsinline=1 helps on mobile
                    // 3. rel=0 prevents showing external videos at end
                    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&origin=${origin}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    description: `YouTube Video source: ${url}`,
                    tags: ['youtube', 'video', 'stream']
                };
            } else {
                throw new Error("Could not extract YouTube Video ID");
            }
        } 
        // --- Vimeo Parser ---
        else if (lowerUrl.includes('vimeo.com')) {
            const videoId = url.split('vimeo.com/')[1]?.split(/[?#]/)[0];
            if (videoId) {
                fileData = {
                    ...fileData,
                    name: `Vimeo Video (${videoId})`,
                    type: FileType.VIDEO,
                    size: 'Stream',
                    url: url,
                    embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
                    description: `Vimeo Video source: ${url}`,
                    tags: ['vimeo', 'video', 'stream']
                };
            }
        }
        // --- Direct Video File (MP4/WEBM) ---
        else if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/) != null) {
             const fileName = url.split('/').pop() || 'video.mp4';
             fileData = {
                 ...fileData,
                 name: fileName,
                 type: FileType.VIDEO,
                 size: 'External',
                 url: url,
                 // Direct files don't need embedUrl, they use the native player
                 description: `Direct video link: ${url}`,
                 tags: ['video', 'external']
             };
        }
        // --- Direct Image File ---
        else if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/) != null) {
             const fileName = url.split('/').pop() || 'image.jpg';
             fileData = {
                 ...fileData,
                 name: fileName,
                 type: FileType.IMAGE,
                 size: 'External',
                 url: url,
                 description: `Direct image link: ${url}`,
                 tags: ['image', 'external']
             };
        }
        // --- Fallback for other platforms (TikTok/Insta/X) ---
        else {
            let platform = 'Web Link';
            if (lowerUrl.includes('tiktok')) platform = 'TikTok';
            else if (lowerUrl.includes('instagram')) platform = 'Instagram';
            else if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) platform = 'X';
            
            // Default to LINK type
            fileData = {
                ...fileData,
                name: `${platform} Link`,
                type: FileType.LINK,
                size: 'Link',
                url: url,
                description: `External link to ${platform}: ${url}`,
                tags: [platform.toLowerCase(), 'link']
            };
        }

        setProgress(100);
        setStatus(t.successDownload);
        
        setTimeout(() => {
            onSave(fileData as CloudFile);
            setIsLoading(false);
            setUrl('');
            setStatus('');
            setProgress(0);
            onClose();
        }, 800);

    } catch (error) {
        console.error(error);
        setStatus(t.fetchError);
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden relative animate-slide-up">
        
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500" />
            {t.downloadLink}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
            <div className="flex justify-center gap-4 text-slate-400 mb-2">
                <Youtube className="h-6 w-6 hover:text-red-500 transition-colors" />
                <Instagram className="h-6 w-6 hover:text-pink-500 transition-colors" />
                <Twitter className="h-6 w-6 hover:text-blue-400 transition-colors" />
                <Globe className="h-6 w-6 hover:text-green-500 transition-colors" />
            </div>
            
            <div className="w-full space-y-2">
                <div className="relative">
                    <Link className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input 
                        type="text" 
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
                        placeholder={t.pasteLink}
                        disabled={isLoading}
                    />
                </div>
                <p className="text-[10px] text-slate-500 text-center">{t.supportedLinks}</p>
            </div>

            {isLoading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>{status}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            <Button onClick={handleDownload} className="w-full py-3" disabled={isLoading || !url.trim()}>
                {isLoading ? 'Processing...' : t.download}
            </Button>
        </div>

      </div>
    </div>
  );
};
