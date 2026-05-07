import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '../../services/imageUtils';

interface ImageCropperModalProps {
  image: string;
  onConfirm: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ 
  image, 
  onConfirm, 
  onCancel, 
  aspect = 1 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onConfirm(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bai-black/90 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <div className="p-6 border-b border-bai-black/5 flex justify-between items-center bg-bai-bone">
          <h3 className="font-display font-black uppercase italic tracking-tight text-xl">Adjust Image</h3>
          <button onClick={onCancel} className="p-2 hover:bg-bai-black/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="relative flex-grow bg-bai-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-8 bg-white space-y-6">
          <div className="flex items-center space-x-4">
            <ZoomOut size={20} className="text-bai-black/40" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-grow accent-bai-black h-1 bg-bai-black/10 rounded-full appearance-none cursor-pointer"
            />
            <ZoomIn size={20} className="text-bai-black/40" />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 py-4 px-6 border-2 border-bai-black text-bai-black font-display font-black uppercase tracking-widest text-xs rounded-xl hover:bg-bai-black/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 px-6 bg-bai-black text-white font-display font-black uppercase tracking-widest text-xs rounded-xl hover:bg-bai-blue transition-all flex items-center justify-center space-x-2 shadow-lg"
            >
              <Check size={18} />
              <span>Confirm Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
