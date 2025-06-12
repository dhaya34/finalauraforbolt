
import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';

const ImageViewer = ({ imageUrl, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5)); // Changed from * 1.5 to + 0.25
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.1)); // Changed from / 1.5 to - 0.25
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="relative w-full h-full max-w-none max-h-none p-4 flex flex-col">
        {/* Top Controls */}
        <div className="flex justify-between items-center mb-4 z-10">
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleZoomIn}
              className="bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 rounded-lg p-2 transition-all duration-200 hover:scale-110 shadow-lg"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button 
              onClick={handleZoomOut}
              className="bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 rounded-lg p-2 transition-all duration-200 hover:scale-110 shadow-lg"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button 
              onClick={handleReset}
              className="bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 rounded-lg p-2 transition-all duration-200 hover:scale-110 shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <span className="text-white text-sm bg-slate-800/90 px-3 py-2 rounded-lg border border-slate-600">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 rounded-full p-3 transition-all duration-200 hover:scale-110 shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Image Container */}
        <div 
          className="flex-1 bg-slate-900/30 rounded-lg overflow-hidden backdrop-blur-sm border border-slate-700 shadow-2xl cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="Uploaded content"
              className="block shadow-2xl rounded-lg select-none"
              style={{
                transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: zoom <= 1 ? '100%' : 'none',
                maxHeight: zoom <= 1 ? '100%' : 'none',
                width: zoom > 1 ? 'auto' : undefined,
                height: zoom > 1 ? 'auto' : undefined
              }}
              draggable={false}
            />
          </div>
        </div>
        
        {/* Instructions */}
        <div className="text-center mt-3">
          <p className="text-slate-400 text-sm">
            Scroll to zoom • Drag to pan • Press Esc to close
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ImageViewer;
