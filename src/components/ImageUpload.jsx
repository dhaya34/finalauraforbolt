import React, { useState, useRef, useEffect } from 'react';
import { Upload, ImageIcon, Eye } from 'lucide-react';

const ImageUpload = ({ label, image, onImageChange }) => {
  const [showViewer, setShowViewer] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file && file.type.match('image.*')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageChange(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
    e.target.value = ''; // Reset input
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handlePaste = (e) => {
    if (!focused) return;
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        handleFileSelect(blob);
        break;
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    container.addEventListener('paste', handlePaste);
    return () => {
      container.removeEventListener('paste', handlePaste);
    };
  }, [focused]);

  const triggerFileInput = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    fileInputRef.current.click();
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={(e) => {
          if (image) {
            setShowViewer(true);
          }
        }}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-300 min-h-[120px]
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${image 
            ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500 cursor-pointer' 
            : dragOver 
              ? 'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20'
              : focused 
                ? 'bg-slate-700/30 border-blue-500 shadow-lg shadow-blue-500/10'
                : 'bg-slate-700/20 border-slate-600 hover:bg-slate-700/30 hover:border-slate-500'
          }
        `}
        tabIndex={0}
      >
        {image ? (
          <div className="flex flex-col items-center justify-center space-y-3 text-center p-6">
            <div className="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
              <ImageIcon className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-green-300 font-medium">Image Uploaded</p>
              <div className="flex items-center justify-center space-x-4 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewer(true);
                  }}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Image
                </button>
                <button
                  onClick={triggerFileInput}
                  className="flex items-center justify-center px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Replace
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 text-center p-6">
            <div 
              className={`p-3 rounded-lg transition-colors ${
                dragOver ? 'bg-blue-500/30' : focused ? 'bg-slate-600/70' : 'bg-slate-600/50'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Upload className={`w-8 h-8 transition-colors ${
                dragOver ? 'text-blue-400' : focused ? 'text-slate-300' : 'text-slate-400'
              }`} />
            </div>
            <div>
              <span className="text-slate-300 font-medium block">{label}</span>
              <span className="text-slate-500 text-xs mt-1 block">
                {focused ? 'Now you can paste an image or click upload below' : 'Click to select, then paste or upload'}
              </span>
              {focused && (
                <button
                  onClick={triggerFileInput}
                  onMouseDown={(e) => e.preventDefault()} // Prevents focus loss
                  className="mt-3 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm mx-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Click to Upload
                </button>
              )}
            </div>
          </div>
        )}

        {dragOver && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 rounded-lg flex items-center justify-center pointer-events-none">
            <p className="text-blue-400 font-medium">Drop image here</p>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {showViewer && image && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-screen">
            <img 
              src={image} 
              alt="Preview" 
              className="max-w-full max-h-screen"
            />
            <button
              onClick={() => setShowViewer(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white
                         hover:bg-black/75 hover:text-red-500 focus:outline-none focus:ring-2
                         focus:ring-white transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;