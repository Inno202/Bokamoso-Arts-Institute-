export const cloudinaryService = {
  async upload(file: File, folder: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    try {
      const res = await fetch('/api/media/upload', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown server error' }));
        throw new Error(error.message || `Upload failed with status ${res.status}`);
      }
      
      return res.json(); // { url, publicId }
    } catch (err: any) {
      console.error('CloudinaryService.upload error:', err);
      if (err.message === 'Failed to fetch') {
        throw new Error('Could not connect to the upload server. The server might be restarting or down.');
      }
      throw err;
    }
  },

  async delete(publicId: string) {
    const res = await fetch(`/api/media/${publicId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  },

  getOptimizedUrl(publicIdOrUrl: string, width = 800, quality = 'auto') {
    if (!publicIdOrUrl || typeof publicIdOrUrl !== 'string') return '';
    
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
