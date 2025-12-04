
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { CloudFile, DirectMessage, User } from '../types';

// Check if Supabase is configured
const USE_SUPABASE = isSupabaseConfigured();

// ============================================================================
// --- FALLBACK MOCK IMPLEMENTATION (IndexedDB) ---
// Defined first so they can be used as fallbacks
// ============================================================================

const DB_NAME = 'UnyxCloudDB';
const STORE_FILES = 'files';
const STORE_USERS = 'users';
const STORE_USER_FILES = 'user_files';
const STORE_MESSAGES = 'messages';
const DB_VERSION = 4;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject("IndexedDB not supported"); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
      if (!db.objectStoreNames.contains(STORE_USERS)) db.createObjectStore(STORE_USERS, { keyPath: 'email' });
      if (!db.objectStoreNames.contains(STORE_USER_FILES)) db.createObjectStore(STORE_USER_FILES, { keyPath: 'userId' });
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
    };
  });
};

const mockSaveFileContent = async (id: string, file: Blob) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_FILES, 'readwrite');
        tx.objectStore(STORE_FILES).put(file, id);
        return;
    } catch (e) { console.error("Local DB Error", e); }
};
const mockGetFileContent = async (id: string): Promise<Blob|null> => {
    try {
        const db = await initDB();
        return new Promise(resolve => {
            const req = db.transaction(STORE_FILES, 'readonly').objectStore(STORE_FILES).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
};
const mockRemoveFileContent = async (id: string) => {
    try {
        const db = await initDB();
        db.transaction(STORE_FILES, 'readwrite').objectStore(STORE_FILES).delete(id);
    } catch (e) { console.error("Local DB Error", e); }
};
const mockGetUser = async (email: string) => {
    try {
        const db = await initDB();
        return new Promise(resolve => {
            const req = db.transaction(STORE_USERS, 'readonly').objectStore(STORE_USERS).get(email);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
};
const mockSaveUser = async (user: any) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_USERS, 'readwrite');
        tx.objectStore(STORE_USERS).put(user);
    } catch (e) { console.error("Local DB Error", e); }
};
const mockGetUserFiles = async (userId: string) => {
    try {
        const db = await initDB();
        return new Promise<any[]>(resolve => {
            const req = db.transaction(STORE_USER_FILES, 'readonly').objectStore(STORE_USER_FILES).get(userId);
            req.onsuccess = () => resolve(req.result ? req.result.files : []);
            req.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
};
const mockSaveUserFiles = async (userId: string, files: any[]) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_USER_FILES, 'readwrite');
        tx.objectStore(STORE_USER_FILES).put({ userId, files });
    } catch (e) { console.error("Local DB Error", e); }
};
const mockSaveDirectMessage = async (msg: DirectMessage) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_MESSAGES, 'readwrite');
        tx.objectStore(STORE_MESSAGES).put(msg);
    } catch (e) { console.error("Local DB Error", e); }
};
const mockGetUserMessages = async (email: string): Promise<DirectMessage[]> => {
    try {
        const db = await initDB();
        return new Promise(resolve => {
            const store = db.transaction(STORE_MESSAGES, 'readonly').objectStore(STORE_MESSAGES);
            const req = store.getAll();
            req.onsuccess = () => {
                const all = req.result as DirectMessage[];
                resolve(all.filter(m => m.senderId === email || m.receiverId === email));
            };
            req.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
};
const mockSearchUsers = async (query: string): Promise<User[]> => {
    try {
        const db = await initDB();
        return new Promise(resolve => {
            const store = db.transaction(STORE_USERS, 'readonly').objectStore(STORE_USERS);
            const req = store.getAll();
            req.onsuccess = () => {
                const all = req.result as User[];
                const q = query.toLowerCase();
                resolve(all.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
            };
            req.onerror = () => resolve([]);
        });
    } catch (e) { return []; }
};

// ============================================================================
// --- MAIN IMPLEMENTATION (Hybrid Supabase + Fallback) ---
// ============================================================================

export const saveUser = async (user: any): Promise<void> => {
  if (USE_SUPABASE) {
      try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                is_drive_connected: user.isDriveConnected,
                drive_email: user.driveEmail
            });

          if (error) {
              console.warn("Supabase Save User failed (using local):", error.message || JSON.stringify(error));
              // Don't throw, allow app to continue
          }
          return;
      } catch (e: any) {
          // Fallback to local if Supabase fails (e.g. table doesn't exist)
          console.warn("Supabase Exception:", e?.message);
      }
  }
  return mockSaveUser(user);
};

export const getUser = async (email: string): Promise<any> => {
  if (USE_SUPABASE) {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

          if (error && error.code !== 'PGRST116') { // Ignore 'Row not found'
              console.warn("Supabase Get User failed:", error.message || JSON.stringify(error));
              // Don't throw to allow fallback
          }
          
          if (data) {
              return {
                  ...data,
                  isDriveConnected: data.is_drive_connected,
                  driveEmail: data.drive_email
              };
          }
      } catch (e: any) {
          console.warn("Supabase getUser Exception:", e?.message);
      }
  }
  return mockGetUser(email);
};

export const saveFileContent = async (id: string, file: Blob): Promise<void> => {
  if (USE_SUPABASE) {
      try {
          const { error } = await supabase.storage
            .from('user_files')
            .upload(`${id}`, file, { cacheControl: '3600', upsert: true });

          if (error) throw error;
          return;
      } catch (e: any) {
          console.warn("Supabase Upload failed (using local):", e?.message || JSON.stringify(e));
      }
  }
  return mockSaveFileContent(id, file);
};

export const getFileContent = async (id: string): Promise<Blob | null> => {
  if (USE_SUPABASE) {
      try {
          const { data, error } = await supabase.storage
            .from('user_files')
            .download(`${id}`);

          if (error) throw error;
          return data;
      } catch (e: any) {
          console.warn("Supabase Download failed (using local):", e?.message || JSON.stringify(e));
      }
  }
  return mockGetFileContent(id);
};

export const removeFileContent = async (id: string): Promise<void> => {
  if (USE_SUPABASE) {
      try {
          const { error } = await supabase.storage
            .from('user_files')
            .remove([`${id}`]);
          if (error) throw error;
          return;
      } catch (e: any) {
           console.warn("Supabase Remove failed (using local):", e?.message || JSON.stringify(e));
      }
  }
  return mockRemoveFileContent(id);
};

export const getUserFiles = async (userId: string): Promise<CloudFile[]> => {
  if (USE_SUPABASE) {
      try {
          const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', userId);

          if (error) throw error;

          return data.map((f: any) => ({
              id: f.id,
              name: f.name,
              type: f.type,
              size: f.size,
              date: new Date(f.created_at).toLocaleDateString(),
              url: f.url,
              thumbnail: f.thumbnail,
              tags: f.tags,
              description: f.description,
              deletedAt: f.deleted_at,
              embedUrl: f.embed_url,
              driveUrl: f.drive_url,
              parentId: f.parent_id // IMPORTANT: Map parent_id back
          }));
      } catch (e: any) {
          console.warn("Supabase Get Metadata failed (using local):", e?.message || JSON.stringify(e));
      }
  }
  return mockGetUserFiles(userId);
};

export const saveUserFiles = async (userId: string, files: CloudFile[]): Promise<void> => {
  if (USE_SUPABASE) {
      try {
          const dbRows = files.map(f => ({
              id: f.id,
              user_id: userId,
              name: f.name,
              type: f.type,
              size: f.size,
              url: f.url?.startsWith('blob:') ? 'BLOB_STORED' : f.url,
              thumbnail: f.thumbnail,
              tags: f.tags,
              description: f.description,
              deleted_at: f.deletedAt || null,
              embed_url: f.embedUrl || null,
              drive_url: f.driveUrl || null,
              parent_id: f.parentId || null // IMPORTANT: Save parent_id
          }));

          const { error } = await supabase
            .from('files')
            .upsert(dbRows, { onConflict: 'id' });

          if (error) throw error;
          return;
      } catch (e: any) {
          console.warn("Supabase Save Metadata failed (using local):", e?.message || JSON.stringify(e));
      }
  }
  return mockSaveUserFiles(userId, files);
};

export const saveDirectMessage = async (message: DirectMessage): Promise<void> => {
  if (USE_SUPABASE) {
      try {
          const { error } = await supabase
            .from('messages')
            .insert({
                id: message.id,
                sender_id: message.senderId,
                receiver_id: message.receiverId,
                text: message.text,
                timestamp: message.timestamp,
                is_read: message.isRead
            });
          if (error) throw error;
          return;
      } catch (e: any) {
          console.warn("Supabase Message Save failed:", e?.message || JSON.stringify(e));
      }
  }
  return mockSaveDirectMessage(message);
};

export const getUserMessages = async (email: string): Promise<DirectMessage[]> => {
  if (USE_SUPABASE) {
      try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${email},receiver_id.eq.${email}`);

          if (error) throw error;
          
          return data.map((m: any) => ({
              id: m.id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              text: m.text,
              timestamp: m.timestamp,
              isRead: m.is_read
          }));
      } catch (e: any) {
          console.warn("Supabase Get Messages failed:", e?.message || JSON.stringify(e));
      }
  }
  return mockGetUserMessages(email);
};

export const searchUsers = async (query: string): Promise<User[]> => {
    if (USE_SUPABASE) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(10);
                
            if (error) throw error;
            
            return data.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                avatar: u.avatar,
                isDriveConnected: u.is_drive_connected,
                driveEmail: u.drive_email
            }));
        } catch (e: any) {
            console.warn("Supabase Search failed:", e?.message || JSON.stringify(e));
        }
    }
    return mockSearchUsers(query);
};
