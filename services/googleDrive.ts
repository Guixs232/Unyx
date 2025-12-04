
/**
 * Service to handle Google Drive interactions.
 * Note: Since we cannot expose a valid Client ID/Secret in client-side code without backend,
 * this service includes a robust simulation mode to demonstrate the UI flow.
 */

// Placeholder for Client ID - User would ideally provide this in a real env
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; 
const API_KEY = 'YOUR_GOOGLE_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let isInitialized = false;

export const initGoogleDrive = async (): Promise<void> => {
  if (isInitialized) return;
  
  // In a real app, we would load the gapi script here
  // For this demo, we assume we are in 'simulation' mode if no valid credentials
  console.log("Initializing Google Drive Service...");
  isInitialized = true;
};

export const authenticateUser = async (): Promise<{ success: boolean, email?: string }> => {
  // Simulate Auth Flow
  return new Promise((resolve) => {
    console.log("Requesting Google Drive Access...");
    
    // Open a popup to make it look real
    const width = 500;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    // We can't actually open accounts.google.com without a real Client ID
    // So we simulate the delay
    setTimeout(() => {
        // Mock successful auth
        resolve({ 
            success: true, 
            email: 'demo.user@gmail.com' 
        });
    }, 1500);
  });
};

export const disconnectUser = async (): Promise<boolean> => {
    // Simulate disconnect
    return new Promise((resolve) => {
        setTimeout(() => resolve(true), 500);
    });
};

export const uploadFileToDrive = async (file: File | Blob, name: string): Promise<{ id: string, webViewLink: string }> => {
  return new Promise((resolve, reject) => {
    console.log(`Uploading ${name} to Google Drive...`);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        // Return mock response
        resolve({
          id: 'mock-drive-id-' + Date.now(),
          webViewLink: 'https://drive.google.com/file/d/mock-file-id/view'
        });
      }
    }, 500);
  });
};
