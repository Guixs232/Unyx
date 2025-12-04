

/**
 * Generates a thumbnail image from a video file.
 * Captures a frame at the 1-second mark.
 */
export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    
    // Set up video element
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    
    // Once metadata is loaded, seek to 1 second
    video.onloadedmetadata = () => {
      // Ensure we don't seek past the duration
      const seekTime = Math.min(1, video.duration);
      video.currentTime = seekTime;
    };

    // Once seeking is done, we can capture the frame
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } else {
          resolve('');
        }
      } catch (e) {
        console.error("Error generating thumbnail", e);
        resolve('');
      } finally {
        // Cleanup
        URL.revokeObjectURL(video.src);
        video.remove();
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve('');
    };
  });
};

export const isImageUrl = (url: string): boolean => {
    return url.match(/\.(jpeg|jpg|gif|png)$/) != null;
};

/**
 * Resizes an image file to a specified width (default 300px)
 * Used for generating optimized thumbnails/covers
 */
export const resizeImage = (file: File, maxWidth = 300): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Calculate aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress quality
        } else {
            resolve('');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
