
import { ExifData } from "../types";

/**
 * Simulates extraction of EXIF data.
 * In a real app, this would use 'exif-js' to read binary data.
 * Here, we use file metadata and randomized locations for demonstration.
 */
export const extractExifData = async (file: File): Promise<ExifData> => {
  return new Promise((resolve) => {
    // Use actual file date
    const dateTaken = new Date(file.lastModified).toISOString();
    
    // Randomly simulate location data for 30% of images to demonstrate the map feature
    // (Since we can't access real GPS without a heavy library parsing the ArrayBuffer)
    const hasLocation = Math.random() > 0.7;
    
    let location;
    if (hasLocation) {
        // Simulating a few famous locations or generic coordinates
        const locations = [
            { lat: 40.7128, lng: -74.0060, name: "New York, USA" },
            { lat: 48.8566, lng: 2.3522, name: "Paris, France" },
            { lat: -22.9068, lng: -43.1729, name: "Rio de Janeiro, Brazil" },
            { lat: 35.6762, lng: 139.6503, name: "Tokyo, Japan" },
            { lat: 51.5074, lng: -0.1278, name: "London, UK" }
        ];
        location = locations[Math.floor(Math.random() * locations.length)];
    }

    const img = new Image();
    img.onload = () => {
        resolve({
            dateTaken,
            location,
            resolution: `${img.width}x${img.height}`,
            camera: "Digital Camera" // Placeholder
        });
    };
    img.onerror = () => {
        resolve({ dateTaken });
    };
    img.src = URL.createObjectURL(file);
  });
};
