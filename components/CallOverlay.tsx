
import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, User as UserIcon } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface CallOverlayProps {
  contactName: string;
  contactAvatar?: string;
  isVideo: boolean;
  onEndCall: () => void;
  language: Language;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({ 
  contactName, 
  contactAvatar, 
  isVideo, 
  onEndCall,
  language 
}) => {
  const [status, setStatus] = useState<'dialing' | 'connected'>('dialing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const t = translations[language];

  useEffect(() => {
    // Simulate connection after 3 seconds
    const connectTimer = setTimeout(() => {
      setStatus('connected');
    }, 3000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Access Camera if Video Call
  useEffect(() => {
    if (isVideo && !isCamOff) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.log("Cam permission denied or not available", err));
    } else {
        // Stop streams
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }
  }, [isVideo, isCamOff]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between py-12 animate-fade-in">
      
      {/* Top Info */}
      <div className="text-center space-y-2 z-10 mt-12">
        <div className="relative inline-block">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] mx-auto overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                {contactAvatar ? (
                    <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-2xl font-bold text-white">
                        {contactAvatar.length > 2 ? <img src={contactAvatar} className="h-full w-full object-cover" /> : contactAvatar}
                    </div>
                ) : (
                    <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-white">
                        <UserIcon className="h-10 w-10" />
                    </div>
                )}
            </div>
            {status === 'dialing' && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping"></div>
            )}
        </div>
        <h2 className="text-2xl font-bold text-white">{contactName}</h2>
        <p className="text-blue-400 font-medium animate-pulse">
            {status === 'dialing' ? t.calling : formatTime(duration)}
        </p>
      </div>

      {/* Self Video Preview (Simulated) */}
      {isVideo && (
          <div className="absolute inset-0 z-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=1887&auto=format&fit=crop')] bg-cover bg-center blur-lg"></div>
      )}
      
      {/* User Camera Feed */}
      {isVideo && !isCamOff && (
          <div className="absolute top-8 right-8 w-32 h-48 bg-black rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-20">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
          </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6 z-20 mb-12">
        <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full backdrop-blur-md transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        {isVideo && (
            <button 
                onClick={() => setIsCamOff(!isCamOff)}
                className={`p-4 rounded-full backdrop-blur-md transition-all ${isCamOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                {isCamOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
        )}

        <button 
            onClick={onEndCall}
            className="p-5 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/40 transform hover:scale-110 transition-all"
        >
            <PhoneOff className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
};
