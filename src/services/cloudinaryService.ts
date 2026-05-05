export const cloudinaryService = {
  async upload(file: File, folder: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const res = await fetch('/api/media/upload', { 
      method: 'POST', 
      body: formData 
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Upload failed');
    }
    
    return res.json(); // { url, publicId }
  },

  async delete(publicId: string) {
    const res = await fetch(`/api/media/${publicId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  },

  getOptimizedUrl(publicIdOrUrl: string, width = 800, quality = 'auto') {
    if (!publicIdOrUrl) return '';
    if (publicIdOrUrl.startsWith('http')) return publicIdOrUrl; // Already a URL
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},q_${quality}/${publicIdOrUrl}`;
  }
};
