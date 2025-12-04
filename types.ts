
export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  FOLDER = 'folder',
  LINK = 'link'
}

export interface ExifData {
  dateTaken: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  camera?: string;
  resolution?: string;
}

export interface FileVersion {
  id: string;
  date: string;
  size: string;
}

export interface CloudFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  date: string;
  url?: string;
  thumbnail?: string;
  tags?: string[];
  description?: string;
  deletedAt?: string;
  uploadProgress?: number;
  versions?: FileVersion[];
  driveUrl?: string;
  embedUrl?: string;
  exif?: ExifData;
  parentId?: string | null; // Adicionado para suporte a hierarquia de pastas
}

export interface UserStats {
  usedStorage: number;
  totalStorage: number;
  fileCount: number;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatSession {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

export type Language = 'en' | 'pt' | 'es';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isDriveConnected?: boolean;
  driveEmail?: string;
  password?: string;
}

export type UploadStatus = 'uploading' | 'analyzing' | 'completed' | 'error';

export interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
}
