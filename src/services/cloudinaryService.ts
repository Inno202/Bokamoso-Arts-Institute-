export const cloudinaryService = {
  async upload(file: File, folder: string) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Limit width to keep payload sizes reasonable for Firestore
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
             resolve({ url: dataUrl, publicId: dataUrl });
          } else {
             // Fallback if canvas context fails
             resolve({ url: img.src, publicId: img.src });
          }
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  },

  async delete(publicId: string) {
    // With Data URI uploads straight to Firestore, there is no remote file to delete.
    return { success: true };
  },

  getOptimizedUrl(publicIdOrUrl: string, width = 800, quality = 'auto') {
    if (!publicIdOrUrl || typeof publicIdOrUrl !== 'string') return '';
    
    // For local Data URIs, return directly
    if (publicIdOrUrl.startsWith('data:image')) {
      return publicIdOrUrl;
    }
    
    // If it's a full Cloudinary URL without transformations
    if (publicIdOrUrl.startsWith('http') && publicIdOrUrl.includes('cloudinary.com')) {
       if (publicIdOrUrl.includes('/upload/') && !publicIdOrUrl.includes('/upload/w_')) {
         return publicIdOrUrl.replace('/upload/', `/upload/w_${width},q_${quality}/`);
       }
       return publicIdOrUrl;
    }
    
    if (publicIdOrUrl.startsWith('http')) return publicIdOrUrl; // Other URLs
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'undefined';
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},q_${quality}/${publicIdOrUrl}`;
  }
};
