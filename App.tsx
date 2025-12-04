import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Layout, 
  Image, 
  FileText, 
  Folder, 
  Search, 
  Plus, 
  Settings, 
  Cloud, 
  HardDrive, 
  MoreVertical, 
  Trash2,
  UploadCloud,
  Moon,
  Sun,
  Play,
  Menu,
  Home,
  Command,
  Download,
  Share2,
  RefreshCw,
  Eye,
  List as ListIcon,
  Grid as GridIcon,
  ChevronRight,
  ArrowUpDown,
  Filter,
  X,
  AlertTriangle,
  Globe,
  LogOut,
  User as UserIcon,
  Smartphone,
  Box,
  Terminal,
  Code,
  File,
  Music,
  Edit2,
  Maximize2,
  Minimize2,
  CheckCircle,
  XCircle,
  Film,
  MessageCircle,
  Wand2,
  Link as LinkIcon,
  Shield,
  ShieldCheck,
  CloudUpload,
  Info,
  FolderPlus,
  ArrowLeft,
  ImageIcon
} from 'lucide-react';
import { Button } from './components/Button';
import { FileViewer } from './components/FileViewer';
import { AuthScreen } from './components/AuthScreen';
import { Logo } from './components/Logo';
import { ProfileEditor } from './components/ProfileEditor';
import { WatchParty } from './components/WatchParty';
import { SettingsModal } from './components/SettingsModal';
import { ImageGenerator } from './components/ImageGenerator';
import { SocialDownloader } from './components/SocialDownloader';
import { ChatScreen } from './components/ChatScreen';
import { CallOverlay } from './components/CallOverlay';
import { CloudFile, FileType, UserStats, Language, User, FileVersion, UploadTask, UploadStatus } from './types';
import { analyzeFileContent } from './services/geminiService';
import { generateVideoThumbnail, resizeImage } from './utils/videoUtils';
import { extractExifData } from './utils/exifUtils';
import { translations } from './utils/translations';
import { saveFileContent, getFileContent, removeFileContent, getUserFiles, saveUserFiles, saveUser, getUser } from './utils/db';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

// --- Mock Data ---
const INITIAL_FILES: CloudFile[] = [];

const LOCAL_STORAGE_BASE_KEY = 'unyx_files_';

// Helper for avatar display
const isImageAvatar = (avatar?: string) => (avatar?.length || 0) > 3 || avatar?.startsWith('http') || avatar?.startsWith('data:');

function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App State
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'photos' | 'trash' | 'chat'>('files'); 
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [optionsModalFile, setOptionsModalFile] = useState<CloudFile | null>(null); // New state for Action Modal
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Folder Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Tools State
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{name: string, isVideo: boolean} | null>(null);
  
  // Mobile FAB Menu State
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  // Global Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
  const [isUploadManagerOpen, setIsUploadManagerOpen] = useState(true);
  
  const isUploading = uploadQueue.some(task => task.status === 'uploading' || task.status === 'analyzing');

  // Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, fileId: string | null }>({ isOpen: false, fileId: null });
  const [logoutConfirmation, setLogoutConfirmation] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  
  // Watch Party State
  const [activeWatchPartyFile, setActiveWatchPartyFile] = useState<CloudFile | null>(null);

  // Device Storage
  const [deviceQuota, setDeviceQuota] = useState<{used: number, total: number}>({used: 0, total: 0});
  
  // Cover/Thumbnail Upload State
  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Theme & Language Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem('unyx_theme') as 'light' | 'dark') || 'dark'
  );
  const [language, setLanguage] = useState<Language>(() => 
    (localStorage.getItem('unyx_language') as Language) || 'en'
  );

  // Robust Notification State Initialization
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    // 1. Check browser permission first
    if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
    }
    // 2. If default, check localStorage preference
    const stored = localStorage.getItem('unyx_notifications');
    return stored === 'true';
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const t = translations[language];

  // --- Device Storage Detection ---
  useEffect(() => {
     if (navigator.storage && navigator.storage.estimate) {
         navigator.storage.estimate().then(estimate => {
             // Fallbacks for total if it returns 0 (some browsers/incognito)
             const total = estimate.quota || (256 * 1024 * 1024 * 1024); // Assume 256GB if unknown
             setDeviceQuota({ used: estimate.usage || 0, total });
         }).catch(e => {
             console.log("Storage estimate error", e);
             // Fallback visualization
             setDeviceQuota({ used: 0, total: 64 * 1024 * 1024 * 1024 }); 
         });
     }
  }, []);

  // --- Auth Persistence & Supabase Listener ---
  useEffect(() => {
    // 1. Check Local Storage first for immediate UI
    const savedUser = localStorage.getItem('unyx_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // 2. Only check Supabase session if properly configured to avoid crashes
    if (isSupabaseConfigured()) {
        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session) return;
                
                const session = data.session;
                if (session?.user) {
                    // Fetch complete profile from DB to get name/avatar
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    const appUser: User = {
                        id: session.user.id,
                        email: session.user.email || '',
                        name: profile?.name || session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
                        avatar: profile?.avatar || session.user.user_metadata.avatar_url || (session.user.email?.substring(0,2).toUpperCase())
                    };
                    handleLogin(appUser);
                }
            } catch (err) {
                console.error("Supabase session check failed", err);
            }
        };
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                 const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                 const appUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: profile?.name || session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
                    avatar: profile?.avatar || session.user.user_metadata.avatar_url || (session.user.email?.substring(0,2).toUpperCase())
                };
                handleLogin(appUser);
            } else if (_event === 'SIGNED_OUT') {
                handleLogin(null as any); // Force cleanup via handleLogin null handling if I modified it, but simpler to just:
                setUser(null);
                localStorage.removeItem('unyx_current_user');
            }
        });

        return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    if (newUser) {
        localStorage.setItem('unyx_current_user', JSON.stringify(newUser));
    } else {
        localStorage.removeItem('unyx_current_user');
    }
  };

  const handleLogoutClick = () => {
      // Trigger confirmation modal instead of immediate logout
      setIsSettingsOpen(false);
      setLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirmation(false);
    setUser(null);
    localStorage.removeItem('unyx_current_user');
    setFiles([]); 
    setIsDataLoaded(false);
    setActiveTab('files');
    setCurrentFolderId(null);
    if (isSupabaseConfigured()) {
        try { await supabase.auth.signOut(); } catch(e) { console.error(e); }
    }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    try {
        setUser(updatedUser);
        localStorage.setItem('unyx_current_user', JSON.stringify(updatedUser));
        const fullUserRecord = await getUser(updatedUser.email);
        if (fullUserRecord) {
            await saveUser({ ...fullUserRecord, name: updatedUser.name, avatar: updatedUser.avatar });
        }
    } catch (e: any) {
         console.error("Failed to update user registry", e);
    }
  };

  // --- File Persistence Logic ---
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setIsDataLoaded(false);
      try {
        const dbFiles = await getUserFiles(user.id);
        const rehydratedFiles = await Promise.all(dbFiles.map(async (file: CloudFile) => {
            if (file.url === 'BLOB_STORED') {
               const blob = await getFileContent(file.id);
               if (blob) {
                 return { ...file, url: URL.createObjectURL(blob) };
               } else {
                 return { ...file, url: undefined, description: file.description + ' (Content missing)' };
               }
            }
            return file;
        }));
        setFiles(rehydratedFiles);
      } catch (error) {
        console.error("Failed to load persistence data:", error);
        setFiles([]);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user || !isDataLoaded) return;
    const timer = setTimeout(async () => {
        const filesToSave = files.map(file => {
            if (file.url && file.url.startsWith('blob:')) {
                return { ...file, url: 'BLOB_STORED' };
            }
            return file;
        });
        try { await saveUserFiles(user.id, filesToSave); } catch (e) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [files, isDataLoaded, user]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isUploading = uploadQueue.some(task => task.status === 'uploading' || task.status === 'analyzing');
      if (isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadQueue]);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      setIsSidebarVisible(isDesktop);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
        const newTheme = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem('unyx_theme', newTheme);
        return newTheme;
    });
  };

  const handleSetLanguage = (lang: Language) => {
      setLanguage(lang);
      localStorage.setItem('unyx_language', lang);
  };

  const toggleNotifications = async () => {
      if (!('Notification' in window)) {
         alert('This browser does not support desktop notifications');
         return;
      }

      if (Notification.permission === 'denied') {
          // If denied, we must alert user to manual action
          alert('Notifications are currently blocked by your browser settings. Please click the lock icon in the address bar and allow notifications for this site.');
          setNotificationsEnabled(false);
          localStorage.setItem('unyx_notifications', 'false');
          return;
      }

      if (Notification.permission === 'granted') {
          // If permission is granted, simply toggle the preference
          const newState = !notificationsEnabled;
          setNotificationsEnabled(newState);
          localStorage.setItem('unyx_notifications', String(newState));
          if (newState) {
              try { new Notification('UnyxCloud', { body: 'Notifications enabled!' }); } catch(e) {}
          }
          return;
      }
      
      // Default: Request permission
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            localStorage.setItem('unyx_notifications', 'true');
            new Notification('UnyxCloud', { body: 'Notifications enabled!' });
        } else {
            setNotificationsEnabled(false);
            localStorage.setItem('unyx_notifications', 'false');
            if (permission === 'denied') {
                alert('Notifications blocked. Enable in browser settings to receive updates.');
            }
        }
      } catch (e) {
          console.error("Notification permission error", e);
      }
  };

  const toggleSort = (field: 'date' | 'name' | 'size') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const parseSizeToMB = (sizeStr: string): number => {
    if (sizeStr === '--' || !sizeStr) return 0;
    const value = parseFloat(sizeStr.replace(/,/g, ''));
    const unit = sizeStr.toUpperCase();
    if (unit.includes('GB')) return value * 1024;
    if (unit.includes('MB')) return value;
    if (unit.includes('KB')) return value / 1024;
    return 0;
  };

  const storageStats = useMemo(() => {
    let imageSize = 0;
    let videoSize = 0;
    let docSize = 0;
    let trashSize = 0;
    const filesWithSizes = files.map(f => ({ ...f, sizeMB: parseSizeToMB(f.size) }));

    filesWithSizes.forEach(f => {
      const size = f.sizeMB;
      if (f.deletedAt) {
        trashSize += size;
      } else {
        if (f.type === FileType.IMAGE) imageSize += size;
        else if (f.type === FileType.VIDEO) videoSize += size;
        else if (f.type !== FileType.FOLDER) docSize += size;
      }
    });

    const totalUsedMB = imageSize + videoSize + docSize + trashSize;
    // Use device quota if available, else fallback to 200GB
    const totalCapacityMB = deviceQuota.total > 0 ? deviceQuota.total / (1024 * 1024) : 200 * 1024;
    const totalCapacityGB = Math.round(totalCapacityMB / 1024);
    
    const breakdown = [
      { name: 'Images', value: imageSize, color: 'bg-blue-500', icon: Image },
      { name: 'Videos', value: videoSize, color: 'bg-purple-500', icon: Play },
      { name: 'Docs', value: docSize, color: 'bg-yellow-500', icon: FileText },
      { name: 'Trash', value: trashSize, color: 'bg-red-500', icon: Trash2 },
    ];

    const getFormattedSize = (mb: number) => mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb/1024).toFixed(2)} GB`;

    return {
      usedMBRaw: totalUsedMB,
      usedMB: totalUsedMB < 1024 ? totalUsedMB.toFixed(1) : (totalUsedMB / 1024).toFixed(2),
      usedUnit: totalUsedMB < 1024 ? 'MB' : 'GB',
      totalMB: totalCapacityMB,
      totalGB: totalCapacityGB,
      percent: Math.min((totalUsedMB / totalCapacityMB) * 100, 100).toFixed(1),
      breakdown: breakdown.map(b => ({
        ...b,
        percent: totalCapacityMB > 0 ? (b.value / totalCapacityMB) * 100 : 0,
        sizeStr: getFormattedSize(b.value)
      })),
      largestFiles: filesWithSizes.filter(f => !f.deletedAt && f.type !== FileType.FOLDER).sort((a, b) => b.sizeMB - a.sizeMB).slice(0, 5)
    };
  }, [files, theme, deviceQuota]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSaveGeneratedFile = async (file: CloudFile) => {
    // Ensure generated files go to current folder
    const fileWithParent = { ...file, parentId: currentFolderId };
    setFiles(prev => [fileWithParent, ...prev]);
    if (user) {
        try {
            await saveUserFiles(user.id, [fileWithParent, ...files]); 
        } catch (e) {
            console.error("Error saving generated file to DB", e);
        }
    }
  };

  // --- Folder Management ---
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: CloudFile = {
        id: 'folder-' + Date.now(),
        name: newFolderName,
        type: FileType.FOLDER,
        size: '--',
        date: new Date().toLocaleDateString(),
        parentId: currentFolderId || null
    };

    const updatedFiles = [newFolder, ...files];
    setFiles(updatedFiles);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
    
    if (user) {
        try {
            await saveUserFiles(user.id, updatedFiles);
        } catch (e) { console.error("Error saving folder", e); }
    }
  };

  const navigateToFolder = (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setSearchQuery(''); 
  };

  const getBreadcrumbs = () => {
      const path = [];
      let currentId = currentFolderId;
      while (currentId) {
          const folder = files.find(f => f.id === currentId);
          if (folder) {
              path.unshift(folder);
              currentId = folder.parentId || null;
          } else {
              break;
          }
      }
      return path;
  };
  
  // --- Cover / Thumbnail Management ---
  const triggerCoverUpload = (id: string) => {
    setCoverTargetId(id);
    setOptionsModalFile(null); // Close the modal
    setTimeout(() => coverInputRef.current?.click(), 100);
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !coverTargetId) return;

    try {
        const coverBase64 = await resizeImage(file, 300);
        
        setFiles(prev => prev.map(f => {
            if (f.id === coverTargetId) {
                return { ...f, thumbnail: coverBase64 };
            }
            return f;
        }));
    } catch (e) {
        console.error("Failed to set cover", e);
        alert("Failed to process image cover.");
    } finally {
        if (coverInputRef.current) coverInputRef.current.value = '';
        setCoverTargetId(null);
    }
  };

  // --- Version Restoration & Upload Handlers ---
  const handleRestoreVersion = async (fileId: string, versionId: string) => {
     try {
        const file = files.find(f => f.id === fileId);
        if (!file || !file.versions) return;
        const versionToRestore = file.versions.find(v => v.id === versionId);
        if (!versionToRestore) return;
        const currentBlob = await getFileContent(file.id);
        const newHistoryVersionId = file.id + '_v_' + Date.now();
        if (currentBlob) await saveFileContent(newHistoryVersionId, currentBlob);
        const versionBlob = await getFileContent(versionId);
        if (!versionBlob) { alert("Version content missing."); return; }
        await saveFileContent(file.id, versionBlob);
        const newHistoryEntry: FileVersion = { id: newHistoryVersionId, date: file.date, size: file.size };
        const updatedFile: CloudFile = { ...file, size: versionToRestore.size, date: new Date().toLocaleDateString(), url: URL.createObjectURL(versionBlob), versions: [newHistoryEntry, ...file.versions.filter(v => v.id !== versionId)] };
        setFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f));
        setSelectedFile(updatedFile); 
        alert("Version restored successfully.");
    } catch (e) { console.error("Failed to restore", e); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const fileSizeMB = file.size / 1024 / 1024;
    if (storageStats.usedMBRaw + fileSizeMB > storageStats.totalMB) { alert(`Storage Limit Exceeded!`); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    const taskId = Date.now().toString();
    setUploadQueue(prev => [...prev, { id: taskId, fileName: file.name, progress: 0, status: 'uploading' }]);
    setIsUploadManagerOpen(true);
    
    // Check if updating existing file
    const existingFileIndex = files.findIndex(f => f.name === file.name && !f.deletedAt && f.parentId === (currentFolderId || null));
    const isVersionUpdate = existingFileIndex !== -1;
    const fileId = isVersionUpdate ? files[existingFileIndex].id : (Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9));

    if (isVersionUpdate) {
        const currentFile = files[existingFileIndex];
        const currentBlob = await getFileContent(currentFile.id);
        if (currentBlob) {
            const versionId = currentFile.id + '_v_' + Date.now();
            await saveFileContent(versionId, currentBlob);
            currentFile.versions = [{ id: versionId, date: currentFile.date, size: currentFile.size }, ...(currentFile.versions || [])];
        }
    }
    // CRITICAL: saveFileContent ensures persistence in IndexedDB
    try { await saveFileContent(fileId, file); } catch (dbErr) { setUploadQueue(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t)); return; }

    const objectUrl = URL.createObjectURL(file);
    const sizeStr = fileSizeMB < 1024 ? `${fileSizeMB.toFixed(1)} MB` : `${(fileSizeMB/1024).toFixed(2)} GB`;
    
    const newFileData: CloudFile = isVersionUpdate 
      ? { ...files[existingFileIndex], size: sizeStr, date: new Date().toLocaleDateString(), url: objectUrl, uploadProgress: 0 }
      : { 
          id: fileId, 
          name: file.name, 
          type: file.type.startsWith('image/') ? FileType.IMAGE : (file.type.startsWith('video/') ? FileType.VIDEO : FileType.DOCUMENT), 
          size: sizeStr, 
          date: new Date().toLocaleDateString(), 
          tags: [], 
          url: objectUrl, 
          versions: [], 
          uploadProgress: 0,
          parentId: currentFolderId || null 
        };

    setFiles(prev => isVersionUpdate ? prev.map(f => f.id === fileId ? newFileData : f) : [newFileData, ...prev]);

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 95) progress = 95;
        setUploadQueue(prev => prev.map(t => t.id === taskId ? { ...t, progress } : t));
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: progress } : f));
    }, 300);

    try {
        let analysis = { description: '', tags: [] as string[] };
        let thumbnail = '';
        let exif = undefined;
        const isSmallEnoughForAI = file.size < 10 * 1024 * 1024;
        
        // Extract EXIF
        if (file.type.startsWith('image/')) {
             try { exif = await extractExifData(file); } catch(e) {}
        }

        if (file.type.startsWith('video/')) { try { thumbnail = await generateVideoThumbnail(file); analysis = { description: 'Video', tags: ['video'] }; } catch (e) {} }
        else if (file.type.startsWith('image/') && isSmallEnoughForAI) {
            setUploadQueue(prev => prev.map(t => t.id === taskId ? { ...t, status: 'analyzing' } : t));
            const base64Data = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
            try { analysis = await analyzeFileContent(base64Data, file.type); } catch (err) {}
        }
        setTimeout(() => {
            clearInterval(interval);
            setUploadQueue(prev => prev.map(t => t.id === taskId ? { ...t, progress: 100, status: 'completed' } : t));
            setFiles(prev => prev.map(f => f.id === fileId ? { 
                ...f, 
                thumbnail: thumbnail || f.thumbnail, 
                tags: analysis.tags.length ? analysis.tags : f.tags, 
                description: analysis.description || f.description, 
                exif: exif || f.exif,
                uploadProgress: undefined 
            } : f));
            setTimeout(() => setUploadQueue(prev => prev.filter(t => t.id !== taskId)), 3000);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }, 1000);
    } catch (e) { clearInterval(interval); setUploadQueue(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t)); if (!isVersionUpdate) setFiles(prev => prev.filter(f => f.id !== fileId)); }
  };

  const moveToTrash = (id: string) => { setFiles(prev => prev.map(f => f.id === id ? { ...f, deletedAt: new Date().toISOString() } : f)); setOptionsModalFile(null); };
  const restoreFromTrash = (id: string) => { setFiles(prev => prev.map(f => f.id === id ? { ...f, deletedAt: undefined } : f)); setOptionsModalFile(null); };
  const requestDelete = (id: string) => { setDeleteConfirmation({ isOpen: true, fileId: id }); setOptionsModalFile(null); };
  const confirmDelete = async () => { if (deleteConfirmation.fileId) { await removeFileContent(deleteConfirmation.fileId); const f = files.find(x => x.id === deleteConfirmation.fileId); if(f?.versions) for(const v of f.versions) await removeFileContent(v.id); setFiles(prev => prev.filter(f => f.id !== deleteConfirmation.fileId)); setDeleteConfirmation({ isOpen: false, fileId: null }); if (selectedFile?.id === deleteConfirmation.fileId) setSelectedFile(null); } };
  const downloadFile = (file: CloudFile) => { 
      if (file.url) { 
          const link = document.createElement('a'); 
          link.href = file.url; 
          link.download = file.name; 
          document.body.appendChild(link); 
          link.click(); 
          document.body.removeChild(link); 
      } else {
          alert("File URL expired. Please reload the page to refresh file links from local database.");
      }
      setOptionsModalFile(null); 
  };
  
  const shareFile = async (file: CloudFile) => { 
    setOptionsModalFile(null);
    try { 
        if (file.url && navigator.canShare && navigator.share) { 
            try { 
                const response = await fetch(file.url); 
                const blob = await response.blob(); 
                const fileObj = new File([blob], file.name, { type: blob.type || 'application/octet-stream' }); 
                const fileShareData = { files: [fileObj], title: file.name, text: file.description };
                if (navigator.canShare(fileShareData)) { await navigator.share(fileShareData); return; } 
            } catch (e: any) { 
                if (e.name === 'AbortError') return;
                console.warn("File share failed, trying fallback", e);
            } 
        } 
        if (navigator.share) { await navigator.share({ title: file.name, text: file.description || file.name }); } 
        else { await navigator.clipboard.writeText(file.name); alert("File name copied to clipboard"); }
    } catch (error: any) { if (error.name === 'AbortError') return; console.error("Share failed", error); } 
  };

  const handleStartWatchParty = (file: CloudFile) => {
      setActiveWatchPartyFile(file);
  };

  const handleStartCall = (name: string, isVideo: boolean) => {
    setActiveCall({ name, isVideo });
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const isDeleted = !!f.deletedAt;
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // If Searching, search global
      if (matchesSearch && searchQuery) return !isDeleted;
      if (!matchesSearch && searchQuery) return false;

      // Tab Filtering
      if (activeTab === 'trash') return isDeleted;
      if (isDeleted) return false; 
      if (activeTab === 'photos') return f.type === FileType.IMAGE || f.type === FileType.VIDEO;
      
      // File Hierarchy Logic
      if (activeTab === 'files') {
          if (currentFolderId) {
             return f.parentId === currentFolderId;
          } else {
             // Root: Show files with no parentId OR explicit null parentId
             return !f.parentId; 
          }
      }

      return true; 
    }).sort((a, b) => {
      // Always put folders first in grid/list
      if (a.type === FileType.FOLDER && b.type !== FileType.FOLDER) return -1;
      if (a.type !== FileType.FOLDER && b.type === FileType.FOLDER) return 1;

      let valA: any = a[sortBy], valB: any = b[sortBy];
      if (sortBy === 'size') { valA = parseSizeToMB(a.size); valB = parseSizeToMB(b.size); }
      else if (sortBy === 'date') { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
      else { 
          // FIX: Ensure values are strings and handle potential null/undefined values before toString()
          valA = (valA ? String(valA) : '').toLowerCase(); 
          valB = (valB ? String(valB) : '').toLowerCase(); 
      }
      return sortOrder === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });
  }, [files, activeTab, searchQuery, sortBy, sortOrder, currentFolderId]);

  // Group Photos by Date
  const groupedPhotos = useMemo(() => {
      if (activeTab !== 'photos') return null;
      
      const groups: { [key: string]: CloudFile[] } = {};
      filteredFiles.forEach(file => {
          // Parse date string (DD/MM/YYYY) to Date object logic or use existing string
          // Assuming file.date is formatted locale string, we group by it directly
          const dateKey = file.date; 
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(file);
      });
      return groups;
  }, [filteredFiles, activeTab]);

  const getFileIcon = (file: CloudFile) => {
    if (file.type === FileType.FOLDER) return <Folder className="h-10 w-10 text-blue-500 fill-blue-500/20" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'apk') return <Smartphone className="h-8 w-8 text-green-500" />;
    if (['exe', 'msi', 'bat', 'sh'].includes(ext || '')) return <Terminal className="h-8 w-8 text-slate-500 dark:text-slate-400" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <File className="h-8 w-8 text-yellow-500" />; // Changed from Box to File icon
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json'].includes(ext || '')) return <Code className="h-8 w-8 text-blue-400" />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText className="h-8 w-8 text-red-400" />;
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music className="h-8 w-8 text-pink-500" />;
    if (file.type === FileType.IMAGE) return <Image className="h-8 w-8 text-purple-500" />;
    if (file.type === FileType.VIDEO) return <div className="h-8 w-8 bg-red-500/20 rounded-md flex items-center justify-center text-red-500 font-bold text-[10px] border border-red-500/30">VID</div>;
    return <File className="h-8 w-8 text-slate-400" />;
  };

  if (!user) return <AuthScreen onLogin={handleLogin} language={language} />;
  
  if (!isDataLoaded) return (
        <div className="h-screen w-full bg-black flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-4">
                <Logo size="lg" showText={false} className="animate-bounce" />
                <p className="animate-pulse text-sm font-medium">Syncing {user.name}'s Cloud...</p>
            </div>
        </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden selection:bg-blue-500/30">
      
      {/* FAB Backdrop */}
      {isFabMenuOpen && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setIsFabMenuOpen(false)}></div>}

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#020202]">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse-slow delay-1000"></div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} disabled={isUploading} accept="*" />
      {/* Hidden Cover Input */}
      <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverUpload} accept="image/*" />

      <aside className="w-72 bg-white/80 dark:bg-black/40 border-r border-slate-200 dark:border-white/5 flex-col hidden md:flex transition-all duration-300 z-20 backdrop-blur-2xl">
        <div className="p-8 flex items-center gap-3"><Logo /></div>
        <div className="px-6 mb-6 space-y-2">
          <button onClick={triggerFileUpload} disabled={isUploading} className="group relative flex items-center justify-center w-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold py-3.5 px-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-xl overflow-hidden disabled:opacity-70">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="flex items-center gap-2 relative z-10">
               {isUploading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
               <span>{isUploading ? t.uploading : t.uploadNew}</span>
            </div>
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'files', icon: Folder, label: t.allFiles },
            { id: 'photos', icon: Image, label: t.photosMedia },
            { id: 'chat', icon: MessageCircle, label: 'Messages' },
            { id: 'trash', icon: Trash2, label: t.trash },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center w-full px-4 py-3 rounded-xl gap-3 text-sm font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-white shadow-sm ring-1 ring-blue-500/10 dark:ring-white/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 dark:hover:text-white'}`}>
              <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600 dark:text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          ))}
          
        </nav>
        <div className="p-6"><div className="bg-slate-50 dark:bg-[#09090b] rounded-2xl p-5 border border-slate-100 dark:border-white/10 shadow-sm relative overflow-hidden"><div className="flex justify-between items-end mb-3"><span className="text-sm font-bold text-slate-800 dark:text-white">{t.storage}</span><span className="text-xs font-medium text-slate-500">{storageStats.usedMB} / {storageStats.totalGB} GB</span></div><div className="w-full h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden flex mb-4">{storageStats.breakdown.map((item, idx) => (<div key={idx} className={`h-full ${item.color}`} style={{ width: `${Math.max(item.percent, 0)}%` }} />))}</div><div className="space-y-2">{storageStats.breakdown.map((item) => (<div key={item.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><div className={`w-2 h-2 rounded-full ${item.color}`}></div><span>{item.name}</span></div><span className="font-medium text-slate-900 dark:text-white">{item.sizeStr}</span></div>))}</div></div></div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 pt-safe">
            <div className="md:hidden flex items-center justify-between px-6 py-4 z-30 sticky top-0 bg-white/5 dark:bg-black/5 backdrop-blur-lg border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div onClick={() => setIsProfileEditorOpen(true)} className="relative h-10 w-10 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 to-purple-600 cursor-pointer shadow-lg">
                        <div className="h-full w-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                            {isImageAvatar(user.avatar) ? <img src={user.avatar} className="h-full w-full object-cover" /> : <span className="text-white text-xs font-bold">{user.avatar}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium">{t.welcomeBack},</span>
                        <span className="text-sm text-white font-bold">{user.name.split(' ')[0]}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10">
                        <Settings className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <header className="hidden md:flex h-20 bg-white/80 dark:bg-black/40 backdrop-blur-xl items-center justify-between px-8 border-b border-slate-200 dark:border-white/5 transition-all sticky top-0 z-20">
            <div className="flex flex-col">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                    {activeTab === 'files' ? t.allFiles : activeTab === 'photos' ? t.photosMedia : activeTab === 'chat' ? 'Messages' : t.trash}
                </h2>
                {activeTab === 'files' && currentFolderId && (
                     <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                         <button onClick={() => navigateToFolder(null)} className="hover:text-blue-500 transition-colors flex items-center gap-1">
                             <Home className="h-3 w-3" /> {t.home}
                         </button>
                         {getBreadcrumbs().map(folder => (
                             <React.Fragment key={folder.id}>
                                <ChevronRight className="h-3 w-3" />
                                <button onClick={() => navigateToFolder(folder.id)} className="hover:text-blue-500 transition-colors font-medium">
                                    {folder.name}
                                </button>
                             </React.Fragment>
                         ))}
                     </div>
                )}
            </div>
            <div className="flex items-center gap-4">
                    {/* New Folder Button */}
                    {activeTab === 'files' && (
                        <button onClick={() => setIsCreateFolderOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-700 dark:text-slate-200">
                             <FolderPlus className="h-4 w-4" />
                             <span className="hidden lg:inline">{t.createFolder}</span>
                        </button>
                    )}

                    <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-2 w-64 border border-transparent focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input type="text" placeholder={t.searchPlaceholder} className="bg-transparent border-none focus:outline-none ml-2 w-full text-sm text-slate-700 dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1 border border-slate-200 dark:border-white/5">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white' : 'text-slate-400'}`}><GridIcon className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white' : 'text-slate-400'}`}><ListIcon className="h-4 w-4" /></button>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] cursor-pointer" onClick={() => setIsProfileEditorOpen(true)}>
                    <div className="h-full w-full rounded-full bg-white dark:bg-black flex items-center justify-center overflow-hidden font-bold text-xs text-white">
                        {isImageAvatar(user.avatar) ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.avatar}
                    </div>
                    </div>
            </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-12 bg-transparent scroll-smooth no-scrollbar">
            
            {activeTab !== 'chat' && (
                <div className="md:hidden flex flex-col gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder={t.searchPlaceholder}
                            className="w-full bg-[#111] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {/* Mobile Folder Actions */}
                    {activeTab === 'files' && (
                        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                             <button onClick={() => setIsCreateFolderOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white whitespace-nowrap">
                                 <FolderPlus className="h-4 w-4" /> {t.createFolder}
                             </button>
                             {currentFolderId && (
                                <button onClick={() => navigateToFolder(files.find(f => f.id === currentFolderId)?.parentId || null)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 whitespace-nowrap">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>
                             )}
                        </div>
                    )}
                    
                    {/* Mobile Storage Widget */}
                    {!currentFolderId && (
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111] to-[#050505] border border-white/5 p-5 shadow-2xl animate-scale-in">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                                    <Cloud className="h-6 w-6 text-blue-500" />
                                </div>
                                <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20">{storageStats.percent}% Used</span>
                            </div>
                            <div className="space-y-1 relative z-10 mb-4">
                                <h3 className="text-2xl font-bold text-white tracking-tight">{storageStats.usedMB} {storageStats.usedUnit}</h3>
                                <p className="text-xs text-slate-500 font-medium">of {storageStats.totalGB} GB Available</p>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex relative z-10">
                                {storageStats.breakdown.map((item, idx) => (
                                    <div key={idx} className={`h-full ${item.color}`} style={{ width: `${Math.max(item.percent, 0)}%` }} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {[t.date, t.name, t.size].map((option) => (
                            <button 
                                key={option}
                                onClick={() => toggleSort(option.toLowerCase() as any)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${sortBy === option.toLowerCase() ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-white/10'}`}
                            >
                                {option} {sortBy === option.toLowerCase() && (sortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* --- CONTENT RENDERER --- */}
            {activeTab === 'chat' ? (
                <div className="h-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl animate-scale-in">
                    <ChatScreen user={user} language={language} onStartCall={handleStartCall} />
                </div>
            ) : activeTab === 'photos' && groupedPhotos ? (
                // Chronological Photo View
                <div className="space-y-8 animate-slide-up pb-24">
                    {Object.entries(groupedPhotos).map(([dateKey, dateFiles]) => (
                        <div key={dateKey}>
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider ml-1 sticky top-0 bg-slate-50/90 dark:bg-black/90 backdrop-blur-md py-2 z-10 w-fit px-3 rounded-xl">{dateKey}</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 md:gap-4">
                                {(dateFiles as CloudFile[]).map((file, index) => (
                                    <div 
                                      key={file.id} 
                                      onClick={() => setSelectedFile(file)} 
                                      className="aspect-square bg-white/5 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group animate-scale-in hover:-translate-y-1 hover:shadow-xl"
                                      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                                    >
                                         {(file.thumbnail || (file.type === FileType.IMAGE && file.url)) ? (
                                             <img src={file.thumbnail || file.url} className="w-full h-full object-cover" loading="lazy" />
                                         ) : (
                                             <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-purple-500" /></div>
                                         )}
                                         
                                         {file.type === FileType.VIDEO && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 backdrop-blur-[1px]">
                                                <Play className="h-8 w-8 text-white fill-white" />
                                            </div>
                                         )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Standard File List (Grid/List)
                filteredFiles.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 animate-slide-up pb-24">
                        {filteredFiles.map((file, index) => (
                            <div 
                            key={file.id} 
                            className="group bg-[#111] md:bg-white md:dark:bg-[#09090b] rounded-3xl md:rounded-2xl border border-white/5 md:border-slate-100 md:dark:border-white/10 hover:border-blue-500/50 transition-all duration-300 flex flex-col cursor-pointer relative overflow-hidden shadow-lg animate-scale-in hover:-translate-y-1 hover:shadow-2xl"
                            style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                            >
                            <div onClick={() => {
                                if (file.type === FileType.FOLDER) {
                                    navigateToFolder(file.id);
                                } else if (!file.uploadProgress) {
                                    setSelectedFile(file);
                                }
                            }} className="aspect-square bg-[#080808] md:bg-slate-50 md:dark:bg-[#050505] flex items-center justify-center relative overflow-hidden">
                                {file.uploadProgress !== undefined && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                                        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-blue-500 animate-spin mb-2"></div>
                                    </div>
                                )}
                                {(file.thumbnail || (file.type === FileType.IMAGE && file.url)) ? (
                                    <img 
                                        src={file.thumbnail || file.url} 
                                        alt={file.name} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    />
                                ) : (
                                    <div className="transform transition-transform duration-300 group-hover:scale-110 scale-90">{getFileIcon(file)}</div>
                                )}
                                
                                {file.type === FileType.VIDEO && (
                                   <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors backdrop-blur-[1px]">
                                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 shadow-lg scale-90 group-hover:scale-110 transition-transform">
                                            <Play className="h-8 w-8 text-white fill-white" />
                                        </div>
                                   </div>
                                )}

                            </div>
                            <div className="p-3 bg-[#111] md:bg-white md:dark:bg-[#09090b] absolute bottom-0 w-full backdrop-blur-md bg-opacity-90 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium text-white md:text-slate-800 md:dark:text-white truncate">{file.name}</span>
                                        <span className="text-[10px] text-slate-500">{file.size}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setOptionsModalFile(file); }} className="p-1 rounded-full text-slate-400 hover:text-white active:bg-white/10"><MoreVertical className="h-4 w-4" /></button>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="w-full bg-transparent md:bg-white md:dark:bg-[#09090b] md:rounded-2xl md:border md:border-slate-200 md:dark:border-white/10 shadow-sm overflow-hidden animate-slide-up mb-24">
                        <div className="flex flex-col gap-2 md:gap-0">
                            {filteredFiles.map((file, index) => (
                                <div key={file.id} onClick={() => {
                                    if (file.type === FileType.FOLDER) {
                                        navigateToFolder(file.id);
                                    } else if (!file.uploadProgress) {
                                        setSelectedFile(file);
                                    }
                                }} 
                                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                                className="relative flex items-center gap-4 p-4 bg-[#111] md:bg-transparent rounded-2xl md:rounded-none border border-white/5 md:border-none md:border-b md:border-slate-100 md:dark:border-white/5 active:scale-[0.98] transition-all duration-200 animate-slide-in-right hover:bg-white/5">
                                    <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-[#080808] md:bg-slate-100 md:dark:bg-black/20 flex items-center justify-center border border-white/5 md:border-slate-200 md:dark:border-white/10 overflow-hidden relative">
                                        {(file.thumbnail || (file.type === FileType.IMAGE && file.url)) ? (
                                            <img src={file.thumbnail || file.url} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="scale-75">{getFileIcon(file)}</div>
                                        )}
                                        {file.type === FileType.VIDEO && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="h-4 w-4 text-white fill-white" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-white md:text-slate-900 md:dark:text-white truncate">{file.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{file.size}</span>
                                            <span className="text-[10px] text-slate-500">{file.date}</span>
                                        </div>
                                        {file.uploadProgress !== undefined && (<div className="w-24 h-1 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="bg-blue-500 h-full rounded-full" style={{width: `${file.uploadProgress}%`}}></div></div>)}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setOptionsModalFile(file); }} className="p-2 text-slate-400 hover:text-white active:bg-white/10 rounded-full"><MoreVertical className="h-5 w-5" /></button>
                                </div>
                            ))}
                        </div>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 animate-fade-in">
                        <Folder className="h-12 w-12 opacity-20 mb-4" />
                        <p className="mb-4">{t.emptyFiles}</p>
                        <div className="flex gap-3">
                             <Button onClick={triggerFileUpload} variant="primary" size="sm">
                                 <UploadCloud className="h-4 w-4 mr-2" />
                                 {t.uploadNew}
                             </Button>
                             <Button onClick={() => setIsCreateFolderOpen(true)} variant="secondary" size="sm">
                                 <FolderPlus className="h-4 w-4 mr-2" />
                                 {t.createFolder}
                             </Button>
                        </div>
                    </div>
                )
            )}
            </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 flex items-center justify-between px-2 pb-safe">
         <button onClick={() => setActiveTab('files')} className={`flex-1 flex flex-col items-center justify-center h-full gap-1 ${activeTab === 'files' ? 'text-white' : 'text-slate-500'}`}>
            <Home className={`h-6 w-6 ${activeTab === 'files' ? 'fill-white/10' : ''}`} />
         </button>
         <button onClick={() => setActiveTab('photos')} className={`flex-1 flex flex-col items-center justify-center h-full gap-1 ${activeTab === 'photos' ? 'text-white' : 'text-slate-500'}`}>
            <Image className={`h-6 w-6 ${activeTab === 'photos' ? 'fill-white/10' : ''}`} />
         </button>
         
         <div className="relative -top-8">
             {/* FAB Menu */}
             {isFabMenuOpen && (
                 <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-3 mb-2 w-max animate-scale-in origin-bottom">
                     <button onClick={() => { setIsFabMenuOpen(false); setIsCreateFolderOpen(true); }} className="flex items-center gap-2 px-4 py-3 bg-[#111] border border-white/10 rounded-2xl text-white shadow-xl backdrop-blur-xl hover:bg-white/10 transition-colors">
                         <FolderPlus className="h-5 w-5 text-blue-500" />
                         <span className="font-bold text-sm">{t.createFolder}</span>
                     </button>
                     <button onClick={() => { setIsFabMenuOpen(false); triggerFileUpload(); }} className="flex items-center gap-2 px-4 py-3 bg-[#111] border border-white/10 rounded-2xl text-white shadow-xl backdrop-blur-xl hover:bg-white/10 transition-colors">
                         <UploadCloud className="h-5 w-5 text-purple-500" />
                         <span className="font-bold text-sm">{t.uploadNew}</span>
                     </button>
                 </div>
             )}
             
             <button 
                onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} 
                className={`h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center border-4 border-[#020202] active:scale-90 transition-transform ${isFabMenuOpen ? 'rotate-45' : ''}`}
             >
                 <Plus className="h-8 w-8 text-white" />
             </button>
         </div>

         <button onClick={() => setActiveTab('chat')} className={`flex-1 flex flex-col items-center justify-center h-full gap-1 ${activeTab === 'chat' ? 'text-white' : 'text-slate-500'}`}>
             <MessageCircle className={`h-6 w-6 ${activeTab === 'chat' ? 'fill-white/10' : ''}`} />
         </button>
         <button onClick={() => setActiveTab('trash')} className={`flex-1 flex flex-col items-center justify-center h-full gap-1 ${activeTab === 'trash' ? 'text-white' : 'text-slate-500'}`}>
             <Trash2 className={`h-6 w-6 ${activeTab === 'trash' ? 'fill-white/10' : ''}`} />
         </button>
      </div>

      {/* Global Modals & Overlays */}
      
      {/* --- File Options Modal (Better UX than Dropdown) --- */}
      {optionsModalFile && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4 animate-in fade-in pb-safe" onClick={() => setOptionsModalFile(null)}>
              <div 
                className="bg-[#18181b] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border border-white/10 overflow-hidden animate-slide-up" 
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Handle bar for mobile */}
                  <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                      <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                  </div>

                  {/* Header */}
                  <div className="p-6 border-b border-white/5 flex items-start gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {(optionsModalFile.thumbnail || (optionsModalFile.type === FileType.IMAGE && optionsModalFile.url)) ? (
                              <img src={optionsModalFile.thumbnail || optionsModalFile.url} className="w-full h-full object-cover" />
                          ) : (
                              <div className="scale-75">{getFileIcon(optionsModalFile)}</div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg truncate mb-1">{optionsModalFile.name}</h3>
                          <div className="flex gap-2 text-xs text-slate-400">
                              <span className="bg-white/5 px-2 py-0.5 rounded">{optionsModalFile.size}</span>
                              <span>{optionsModalFile.date}</span>
                          </div>
                      </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="p-4 grid grid-cols-2 gap-3">
                      {!optionsModalFile.deletedAt ? (
                          <>
                            <button onClick={() => { setSelectedFile(optionsModalFile); setOptionsModalFile(null); }} className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-4 rounded-2xl transition-colors group">
                                <div className="p-3 bg-blue-500/10 rounded-full text-blue-500 group-hover:scale-110 transition-transform"><Eye className="h-6 w-6" /></div>
                                <span className="text-xs font-medium text-slate-300">{t.open}</span>
                            </button>
                            <button onClick={() => downloadFile(optionsModalFile)} className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-4 rounded-2xl transition-colors group">
                                <div className="p-3 bg-green-500/10 rounded-full text-green-500 group-hover:scale-110 transition-transform"><Download className="h-6 w-6" /></div>
                                <span className="text-xs font-medium text-slate-300">{t.download}</span>
                            </button>
                            <button onClick={() => triggerCoverUpload(optionsModalFile.id)} className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-4 rounded-2xl transition-colors group">
                                <div className="p-3 bg-purple-500/10 rounded-full text-purple-500 group-hover:scale-110 transition-transform"><ImageIcon className="h-6 w-6" /></div>
                                <span className="text-xs font-medium text-slate-300">{t.setCover}</span>
                            </button>
                            <button onClick={() => shareFile(optionsModalFile)} className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-4 rounded-2xl transition-colors group">
                                <div className="p-3 bg-pink-500/10 rounded-full text-pink-500 group-hover:scale-110 transition-transform"><Share2 className="h-6 w-6" /></div>
                                <span className="text-xs font-medium text-slate-300">{t.share}</span>
                            </button>
                            <button onClick={() => moveToTrash(optionsModalFile.id)} className="col-span-2 flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 p-4 rounded-2xl transition-colors mt-2 text-red-500">
                                <Trash2 className="h-5 w-5" />
                                <span className="font-bold text-sm">{t.delete}</span>
                            </button>
                          </>
                      ) : (
                          <>
                            <button onClick={() => restoreFromTrash(optionsModalFile.id)} className="col-span-2 flex items-center justify-center gap-3 bg-green-500/10 hover:bg-green-500/20 p-4 rounded-2xl transition-colors text-green-500">
                                <RefreshCw className="h-5 w-5" />
                                <span className="font-bold text-sm">{t.restore}</span>
                            </button>
                            <button onClick={() => requestDelete(optionsModalFile.id)} className="col-span-2 flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 p-4 rounded-2xl transition-colors text-red-500">
                                <Trash2 className="h-5 w-5" />
                                <span className="font-bold text-sm">{t.deleteForever}</span>
                            </button>
                          </>
                      )}
                  </div>
                  
                  {/* Cancel */}
                  <div className="p-4 border-t border-white/5 pb-8 md:pb-4">
                      <button onClick={() => setOptionsModalFile(null)} className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-white/5 transition-colors">
                          {t.cancel}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-white/10 p-6 animate-scale-in">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.createFolder}</h3>
                  <div className="mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t.folderName}</label>
                      <input 
                        type="text" 
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        className="w-full bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        placeholder="My Folder"
                      />
                  </div>
                  <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setIsCreateFolderOpen(false)} className="flex-1">{t.cancel}</Button>
                      <Button variant="primary" onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="flex-1">{t.create}</Button>
                  </div>
              </div>
          </div>
      )}

      {isImageGenOpen && (
        <ImageGenerator 
          onSave={handleSaveGeneratedFile}
          onClose={() => setIsImageGenOpen(false)}
          language={language}
        />
      )}

      {isSocialOpen && (
        <SocialDownloader
          isOpen={isSocialOpen}
          onClose={() => setIsSocialOpen(false)}
          onSave={handleSaveGeneratedFile}
          language={language}
        />
      )}

      {activeCall && (
        <CallOverlay
          contactName={activeCall.name}
          isVideo={activeCall.isVideo}
          onEndCall={() => setActiveCall(null)}
          language={language}
        />
      )}

      {/* Upload Manager */}
      {uploadQueue.length > 0 && isUploadManagerOpen && (
        <div className="fixed bottom-24 right-4 z-[60] w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up pb-safe">
          <div className="bg-white/5 px-4 py-3 flex justify-between items-center border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">{uploadQueue.length} Uploads</span>
            <div className="flex gap-2">
              <button onClick={() => setIsUploadManagerOpen(false)}>
                <Minimize2 className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-2">
            {uploadQueue.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg">
                <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center">
                  {task.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <UploadCloud className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{task.fileName}</p>
                  <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                    <div className={`h-full ${task.status === 'error' ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-300`} style={{ width: `${task.progress}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {uploadQueue.length > 0 && !isUploadManagerOpen && (<button onClick={() => setIsUploadManagerOpen(true)} className="fixed bottom-24 right-4 z-[60] h-12 w-12 bg-blue-600 rounded-full shadow-xl flex items-center justify-center border-2 border-[#111]"><div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white border border-[#111]">{uploadQueue.length}</div><UploadCloud className="h-6 w-6 text-white animate-pulse" /></button>)}
      
      {selectedFile && <FileViewer file={selectedFile} onClose={() => setSelectedFile(null)} onDelete={moveToTrash} onRestore={restoreFromTrash} onDeletePermanently={requestDelete} onRestoreVersion={handleRestoreVersion} onStartWatchParty={handleStartWatchParty} language={language} />}
      
      {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            user={user}
            onLogout={handleLogoutClick}
            onEditProfile={() => { setIsSettingsOpen(false); setIsProfileEditorOpen(true); }}
            theme={theme}
            toggleTheme={toggleTheme}
            language={language}
            setLanguage={handleSetLanguage}
            notificationsEnabled={notificationsEnabled}
            toggleNotifications={toggleNotifications}
            storageStats={storageStats}
            deviceQuota={deviceQuota}
          />
      )}
      
      {isProfileEditorOpen && <ProfileEditor user={user} isOpen={isProfileEditorOpen} onClose={() => setIsProfileEditorOpen(false)} onSave={handleUpdateProfile} language={language} />}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#111] rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-white/10 animate-scale-in"><div className="flex flex-col items-center text-center"><div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-5 text-red-500 border border-red-500/20"><AlertTriangle className="h-8 w-8" /></div><h3 className="text-xl font-bold text-white mb-2">{t.fileViewer.deleteConfirmTitle}</h3><p className="text-sm text-slate-400 mb-6 leading-relaxed">{t.fileViewer.deleteConfirmText}</p><div className="grid grid-cols-2 gap-3 w-full"><Button variant="secondary" onClick={() => setDeleteConfirmation({ isOpen: false, fileId: null })} className="py-3 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10">{t.cancel}</Button><Button variant="danger" onClick={confirmDelete} className="py-3 rounded-xl bg-red-600 hover:bg-red-700">{t.deleteForever}</Button></div></div></div></div>)}
      
      {/* Logout Warning Modal (Backup Reminder) */}
      {logoutConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-[#111] rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-white/10 animate-scale-in">
                  <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-5 text-yellow-500 border border-yellow-500/20">
                          <CloudUpload className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{t.backupWarningTitle}</h3>
                      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                          {t.backupWarningText}
                      </p>
                      <div className="grid grid-cols-1 gap-3 w-full">
                          <Button 
                            variant="primary" 
                            onClick={() => { setLogoutConfirmation(false); triggerFileUpload(); }} 
                            className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 border-none"
                          >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              {t.backupNow}
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={confirmLogout} 
                            className="py-3 rounded-xl text-slate-500 hover:text-white hover:bg-white/5"
                          >
                              {t.exitAnyway}
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeWatchPartyFile && (<WatchParty file={activeWatchPartyFile} user={user} onClose={() => setActiveWatchPartyFile(null)} language={language} />)}

    </div>
  );
}

export default App;