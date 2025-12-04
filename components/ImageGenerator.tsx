import React, { useState } from 'react';
import { Wand2, Download, Copy, X, ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { generateCloudImage } from '../services/geminiService';
import { AspectRatio, FileType, CloudFile, Language } from '../types';
import { translations } from '../utils/translations';

interface ImageGeneratorProps {
  onSave: (file: CloudFile) => void;
  onClose: () => void;
  language: Language;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onSave, onClose, language }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const t = translations[language];

  const ratios: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const base64Image = await generateCloudImage(prompt, aspectRatio);
      setGeneratedImage(base64Image);
    } catch (error) {
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (generatedImage) {
      const newFile: CloudFile = {
        id: Date.now().toString(),
        name: `AI-Gen-${prompt.slice(0, 10).replace(/\s/g, '-')}.png`,
        type: FileType.IMAGE,
        size: '1.2 MB',
        date: new Date().toLocaleDateString(),
        url: generatedImage,
        tags: ['ai-generated', 'creative'],
        description: prompt
      };
      onSave(newFile);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 md:p-4">
      <div className="bg-white dark:bg-black w-full h-full md:h-auto md:rounded-3xl shadow-2xl md:max-w-2xl overflow-hidden flex flex-col border-0 md:border border-slate-200 dark:border-white/10 relative">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 pt-safe md:pt-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{t.aiStudio}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Create with Gemini Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-black relative z-0">
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                className="w-full p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-oled-card text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-32 placeholder-slate-400 dark:placeholder-slate-600 text-base shadow-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.aspectRatio}</label>
              <div className="flex flex-wrap gap-2">
                {ratios.map((r) => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      aspectRatio === r 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-lg scale-105' 
                        : 'bg-white dark:bg-oled-card border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              {generatedImage ? (
                <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl relative">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 pointer-events-none">
                     <p className="text-white text-sm font-medium">{t.readyToSave}</p>
                   </div>
                  <img src={generatedImage} alt="Generated" className="w-full h-auto object-contain max-h-[40vh] md:max-h-72 mx-auto bg-checkerboard" />
                </div>
              ) : (
                <div className="mt-2 h-56 md:h-64 bg-slate-100/50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 transition-colors">
                  <div className="p-4 bg-white dark:bg-white/5 rounded-full mb-3 shadow-sm">
                    <ImageIcon className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">{t.previewArea}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-white/80 dark:bg-black/90 backdrop-blur-md flex justify-between md:justify-end gap-3 pb-safe md:pb-4 z-10">
          <Button variant="ghost" onClick={onClose} className="flex-1 md:flex-none">{t.cancel}</Button>
          {generatedImage ? (
            <Button onClick={handleSave} className="flex-1 md:flex-none">
              <Download className="h-4 w-4 mr-2" />
              {t.saveCloud}
            </Button>
          ) : (
            <Button onClick={handleGenerate} isLoading={isGenerating} disabled={!prompt.trim()} className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-none">
              <Wand2 className="h-4 w-4 mr-2" />
              {t.generate}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
