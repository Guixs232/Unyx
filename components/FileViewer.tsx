import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Trash2, FileText, Calendar, HardDrive, Info, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Box, File, Folder, Image, Code, History, AlertCircle, Film, ExternalLink, MapPin, Play } from 'lucide-react';
import { CloudFile, FileType, Language } from '../types';
import { Button } from './Button';
import { translations } from '../utils/translations';
import JSZip from 'jszip';

interface FileViewerProps {
  file: CloudFile;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onRestoreVersion?: (fileId: string, versionId: string) => void;
  onStartWatchParty?: (file: CloudFile) => void;
  language: Language;
}

export const FileViewer: React.FC<FileViewerProps> = ({ 
  file, 
  onClose, 
  onDelete,
  onRestore,
  onDeletePermanently,
  onRestoreVersion,
  onStartWatchParty,
  language
}) => {
  const t = translations[language];
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'versions'>('preview');
  
  // Archive State
  const [zipFiles, setZipFiles] = useState<Array<{ name: string, date: Date, size: number, dir: boolean }>>([]);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [errorZip, setErrorZip] = useState<string | null>(null);

  // Text/Code Preview State
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  // Video Player State
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    setZoomLevel(1);
    setActiveTab('preview');
    setZipFiles([]);
    setErrorZip(null);
    setTextContent(null);
  }, [file]);

  const isZip = file.name.toLowerCase().endsWith('.zip');
  const isArchive = ['rar', '7z', 'tar', 'gz'].some(ext => file.name.toLowerCase().endsWith(ext)) || isZip;
  const isPdf = file.name.toLowerCase().endsWith('pdf');
  const isCode = ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'txt', 'md', 'log', 'ini', 'xml'].some(ext => file.name.toLowerCase().endsWith(ext));

  // Load Archive Content
  useEffect(() => {
    if (isZip && file.url && !file.url.startsWith('http') && activeTab === 'preview') {
        const loadZip = async () => {
            setIsLoadingZip(true);
            setErrorZip(null);
            try {
                const response = await fetch(file.url!);
                if (!response.ok) throw new Error("Failed to fetch file");
                const blob = await response.blob();
                const zip = await JSZip.loadAsync(blob);
                const filesList: Array<{ name: string, date: Date, size: number, dir: boolean }> = [];
                zip.forEach((relativePath, zipEntry) => {
                    filesList.push({
                        name: zipEntry.name,
                        date: zipEntry.date,
                        size: (zipEntry as any)._data ? (zipEntry as any)._data.uncompressedSize : 0,
                        dir: zipEntry.dir
                    });
                });
                setZipFiles(filesList);
            } catch (e) {
                console.error("Failed to load zip", e);
                setErrorZip("Could not parse ZIP file. It might be corrupted or password protected.");
            } finally {
                setIsLoadingZip(false);
            }
        };
        loadZip();
    }
  }, [isZip, file.url, activeTab]);

  // Load Text Content
  useEffect(() => {
      if (isCode && file.url && activeTab === 'preview') {
          const loadText = async () => {
              setIsLoadingText(true);
              try {
                  const response = await fetch(file.url!);
                  if (!response.ok) throw new Error("Failed");
                  const text = await response.text();
                  setTextContent(text.slice(0, 50000)); // Limit size for performance
              } catch (e) {
                  console.error("Failed to load text", e);
                  setTextContent("Error loading preview.");
              } finally {
                  setIsLoadingText(false);
              }
          };
          loadText();
      }
  }, [isCode, file.url, activeTab]);

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    // 1. External Links
    if (file.type === FileType.LINK || file.embedUrl || (file.url && file.url.startsWith('http') && !file.url.startsWith('blob:'))) {
        const urlToShare = file.embedUrl || file.url || '';
        await navigator.clipboard.writeText(urlToShare);
        alert("Link copied to clipboard");
        return;
    }
    // 2. File Objects (Blob)
    try {
      if (file.url && navigator.canShare && navigator.share) {
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          const fileObj = new File([blob], file.name, { type: blob.type || 'application/octet-stream' });
          const fileShareData = { files: [fileObj], title: file.name, text: file.description || `Shared from ${t.appTitle}` };
          if (navigator.canShare(fileShareData)) { await navigator.share(fileShareData); return; }
        } catch (e) { console.warn('File sharing fallback', e); }
      }
      // 3. Fallback Text
      if (navigator.share) { await navigator.share({ title: file.name, text: file.description || `${file.name} - stored on ${t.appTitle}` }); } 
      else { await navigator.clipboard.writeText(file.name); alert('File name copied to clipboard!'); }
    } catch (error: any) { if (error.name !== 'AbortError') console.error("Share failed", error); }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to move this file to trash?')) {
      onDelete(file.id);
      onClose();
    }
  };

  const openMap = () => {
      if (file.exif?.location) {
          const { lat, lng } = file.exif.location;
          window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
      }
  };

  const renderContent = () => {
    if (file.embedUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <iframe 
                    src={file.embedUrl} 
                    className="w-full h-full border-0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerPolicy="origin"
                    allowFullScreen 
                    title={file.name}
                />
            </div>
        );
    }
    if (file.type === FileType.LINK) {
        return (<div className="flex flex-col items-center justify-center text-slate-400 h-full gap-6"><div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 animate-pulse"><ExternalLink className="h-10 w-10 text-blue-500" /></div><div className="text-center"><h3 className="text-xl font-bold text-white mb-2">External Link</h3><p className="text-sm max-w-md break-words text-slate-500 px-4">{file.url}</p></div><Button onClick={() => window.open(file.url, '_blank')} variant="primary">Open Link <ExternalLink className="h-4 w-4 ml-2" /></Button></div>);
    }
    if (file.type === FileType.IMAGE && file.url) {
        return (<div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#050505]" onWheel={(e) => { if (e.ctrlKey) { e.preventDefault(); const delta = e.deltaY > 0 ? -0.1 : 0.1; setZoomLevel(prev => Math.max(0.1, Math.min(5, prev + delta))); } }}><img src={file.url} alt={file.name} style={{ transform: `scale(${zoomLevel})` }} className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200 ease-out cursor-move" /><div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-xl z-20"><button onClick={() => setZoomLevel(z => Math.max(0.1, z - 0.2))} className="p-1 hover:text-blue-400 text-white transition-colors"><ZoomOut className="h-4 w-4" /></button><span className="text-xs font-mono w-12 text-center text-white">{Math.round(zoomLevel * 100)}%</span><button onClick={() => setZoomLevel(z => Math.min(5, z + 0.2))} className="p-1 hover:text-blue-400 text-white transition-colors"><ZoomIn className="h-4 w-4" /></button><div className="w-px h-4 bg-white/20 mx-1"></div><button onClick={() => setZoomLevel(1)} className="p-1 hover:text-blue-400 text-white transition-colors"><RotateCcw className="h-4 w-4" /></button></div></div>);
    }
    if (file.type === FileType.VIDEO && (file.url || file.thumbnail)) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black group p-0 md:p-10" onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)}>
                <div className="relative w-full h-full flex items-center justify-center">
                    <video 
                        src={file.url} 
                        poster={file.thumbnail} 
                        controls 
                        className="w-full h-full max-h-[80vh] rounded-xl shadow-2xl outline-none bg-black object-contain"
                        playsInline
                        autoPlay={true}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>
        );
    }
    if (isArchive) {
        return (<div className="w-full h-full flex items-center justify-center p-8"><div className="w-full max-w-2xl bg-[#0F0F11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"><div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3"><Box className="h-5 w-5 text-yellow-500" /><div><h3 className="text-sm font-bold text-white">{t.fileViewer.archiveContent}</h3><p className="text-xs text-slate-400">{isZip ? (isLoadingZip ? "Parsing..." : errorZip ? "Error" : `${zipFiles.length} ${t.fileViewer.filesInside}`) : "Preview unavailable for this format"}</p></div></div><div className="flex-1 overflow-y-auto">{!isZip ? (<div className="flex flex-col items-center justify-center h-40 text-slate-500"><p className="text-sm">Preview available for .ZIP files only.</p><Button onClick={handleDownload} variant="ghost" size="sm" className="mt-2 text-blue-400">{t.download}</Button></div>) : isLoadingZip ? (<div className="flex items-center justify-center h-40 text-slate-400 gap-3"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /><span className="text-xs">Unzipping file content...</span></div>) : errorZip ? (<div className="flex flex-col items-center justify-center h-40 text-red-400 p-4 text-center"><AlertCircle className="h-8 w-8 mb-2 opacity-80" /><p className="text-sm font-medium">{errorZip}</p><Button onClick={handleDownload} variant="secondary" size="sm" className="mt-4">{t.download}</Button></div>) : (<table className="w-full text-left"><thead className="bg-black/20 text-slate-500 text-xs uppercase font-semibold"><tr><th className="px-4 py-3 font-normal">Name</th><th className="px-4 py-3 font-normal text-right">Size</th></tr></thead><tbody className="divide-y divide-white/5">{zipFiles.map((f, i) => (<tr key={i} className="hover:bg-white/5 transition-colors"><td className="px-4 py-3 flex items-center gap-3">{f.dir ? <Folder className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-slate-400" />}<span className="text-sm text-slate-200 truncate max-w-[200px]">{f.name}</span></td><td className="px-4 py-3 text-sm text-slate-500 text-right font-mono">{formatBytes(f.size)}</td></tr>))}</tbody></table>)}</div></div></div>);
    }
    if (isPdf && file.url) { return (<iframe src={file.url} className="w-full h-full bg-slate-900 border-none" title="PDF Preview"></iframe>); }
    
    if (isCode && file.url) { 
        return (
            <div className="w-full h-full flex items-center justify-center p-8">
                <div className="w-full max-w-3xl bg-[#0F0F11] border border-white/10 rounded-2xl p-0 shadow-2xl overflow-hidden flex flex-col h-full max-h-[80vh]">
                    <div className="flex items-center gap-2 p-4 bg-white/5 border-b border-white/5">
                        <Code className="h-5 w-5 text-blue-400" />
                        <span className="font-mono text-sm text-white">{file.name}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-[#1e1e1e] p-4 text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {isLoadingText ? (
                            <div className="flex items-center justify-center h-full gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" /> Loading content...
                            </div>
                        ) : textContent ? textContent : (
                            <p className="opacity-50 italic">// Empty file or failed to load.</p>
                        )}
                    </div>
                </div>
            </div>
        ); 
    }

    return (<div className="flex flex-col items-center justify-center text-slate-400 h-full"><div className="w-32 h-32 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10"><FileText className="h-16 w-16 text-slate-500" /></div><p className="text-xl font-medium text-white mb-2">{file.name}</p><p className="text-sm">{t.fileViewer.previewNotAvailable}</p><Button onClick={handleDownload} className="mt-6" variant="primary"><Download className="h-4 w-4 mr-2" />{t.fileViewer.downloadToView}</Button></div>);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in p-0 md:p-8">
      <div className="w-full h-full max-w-6xl bg-[#09090b] md:rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden relative animate-scale-in">
        
        {/* Close Button - Always visible and prominent */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 p-2.5 bg-black/60 hover:bg-red-500/20 hover:text-red-500 backdrop-blur-md rounded-full text-white border border-white/10 transition-all shadow-lg hover:scale-110 active:scale-95"
        >
            <X className="h-6 w-6" />
        </button>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden absolute top-4 left-4 z-50 flex bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
            <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'preview' ? 'bg-white text-black' : 'text-white'}`}>{t.fileViewer.preview}</button>
            <button onClick={() => setActiveTab('details')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'details' ? 'bg-white text-black' : 'text-white'}`}>{t.fileViewer.details}</button>
            <button onClick={() => setActiveTab('versions')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'versions' ? 'bg-white text-black' : 'text-white'}`}>{t.fileViewer.versions}</button>
        </div>

        <div className={`flex-1 bg-[#050505] flex items-center justify-center relative overflow-hidden group ${activeTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative w-full h-full z-10 flex items-center justify-center">{renderContent()}</div>
        </div>

        <div className={`w-full md:w-96 bg-[#09090b] border-l border-white/10 flex flex-col h-full ${activeTab !== 'preview' ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-6 border-b border-white/10 flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-bold text-white leading-tight line-clamp-2 break-all">{file.name}</h2>
                    <span className="text-xs font-medium text-blue-500 uppercase tracking-wider mt-1 block">{file.type}</span>
                </div>
                {/* Spacer for close button on desktop */}
                <div className="w-8"></div>
            </div>
            <div className="hidden md:flex px-6 border-b border-white/10"><button onClick={() => setActiveTab('preview')} className={`py-3 px-1 mr-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'preview' || activeTab === 'details' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{t.fileViewer.details}</button><button onClick={() => setActiveTab('versions')} className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'versions' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{t.fileViewer.versions}</button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(activeTab === 'details' || activeTab === 'preview') && (
                    <>
                        {file.description && (<div className="bg-white/5 rounded-xl p-4 border border-white/5"><div className="flex items-center gap-2 mb-2 text-purple-400"><Info className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">{t.fileViewer.aiAnalysis}</span></div><p className="text-sm text-slate-300 leading-relaxed">{file.description}</p></div>)}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400"><HardDrive className="h-4 w-4" /></div><div><p className="text-slate-500 text-xs uppercase font-semibold">{t.fileViewer.size}</p><p className="text-slate-200">{file.size}</p></div></div>
                            <div className="flex items-center gap-4 text-sm"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400"><Calendar className="h-4 w-4" /></div><div><p className="text-slate-500 text-xs uppercase font-semibold">{t.fileViewer.dateCreated}</p><p className="text-slate-200">{file.date}</p></div></div>
                            {file.exif?.location && (
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400"><MapPin className="h-4 w-4" /></div>
                                    <div className="flex-1">
                                        <p className="text-slate-500 text-xs uppercase font-semibold">{t.location}</p>
                                        <p className="text-slate-200 text-xs mb-1">{file.exif.location.name || `${file.exif.location.lat}, ${file.exif.location.lng}`}</p>
                                        <button onClick={openMap} className="text-blue-400 text-xs hover:underline flex items-center gap-1">{t.viewOnMap} <ExternalLink className="h-3 w-3" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {file.tags && file.tags.length > 0 && (<div><p className="text-slate-500 text-xs uppercase font-semibold mb-3">{t.fileViewer.tags}</p><div className="flex flex-wrap gap-2">{file.tags.map(tag => (<span key={tag} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">#{tag}</span>))}</div></div>)}
                    </>
                )}
                {activeTab === 'versions' && (<div className="space-y-4"><div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"><p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">{t.fileViewer.currentVersion}</p><div className="flex justify-between items-center"><span className="text-sm text-white font-medium">{file.date}</span><span className="text-xs text-slate-400 bg-black/20 px-2 py-1 rounded">{file.size}</span></div></div><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">{t.fileViewer.versionHistory}</p>{file.versions && file.versions.length > 0 ? (<div className="space-y-2">{file.versions.map((v) => (<div key={v.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center hover:bg-white/10 transition-colors"><div><p className="text-sm text-slate-300 font-medium">{v.date}</p><p className="text-xs text-slate-500">{v.size}</p></div><Button variant="secondary" size="sm" className="h-8 px-2" onClick={() => onRestoreVersion && onRestoreVersion(file.id, v.id)}><History className="h-3 w-3 mr-1" />{t.fileViewer.restoreVersion}</Button></div>))}</div>) : (<div className="text-center py-8 text-slate-500 text-sm">{t.fileViewer.noVersions}</div>)}</div></div>)}
            </div>
            <div className="p-6 border-t border-white/10 bg-black/20 space-y-3 pb-safe">
                {file.type === FileType.VIDEO && !file.embedUrl && (<Button onClick={() => { onStartWatchParty && onStartWatchParty(file); onClose(); }} className="w-full justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-none"><Film className="h-4 w-4 mr-2" />{t.watchTogether}</Button>)}
                <div className="grid grid-cols-2 gap-3"><Button onClick={handleDownload} variant="secondary" className="w-full justify-center" disabled={!!file.embedUrl}><Download className="h-4 w-4 mr-2" />{t.download}</Button><Button onClick={handleShare} variant="secondary" className="w-full justify-center"><Share2 className="h-4 w-4 mr-2" />{t.share}</Button></div>
                {!file.deletedAt ? (<Button onClick={handleDelete} variant="danger" className="w-full justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 shadow-none"><Trash2 className="h-4 w-4 mr-2" />{t.moveTrash}</Button>) : (<div className="grid grid-cols-2 gap-3"><Button onClick={() => { onRestore(file.id); onClose(); }} variant="secondary" className="w-full justify-center text-green-500 border-green-500/30 hover:bg-green-500/10"><RefreshCw className="h-4 w-4 mr-2" />{t.restore}</Button><Button onClick={() => onDeletePermanently(file.id)} variant="danger" className="w-full justify-center"><Trash2 className="h-4 w-4 mr-2" />{t.deleteForever}</Button></div>)}
            </div>
        </div>
      </div>
    </div>
  );
};