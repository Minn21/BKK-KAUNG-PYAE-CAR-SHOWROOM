"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PhotoViewer({
  src,
  alt,
  className = "",
  enableFullScreen = false,
}) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      closeFullScreen();
    }
  };

  const openFullScreen = () => {
    if (!enableFullScreen) return;
    setIsFullScreen(true);
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    // Add global keyboard listener
    document.addEventListener('keydown', handleKeyDown);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
    
    // Restore scrolling
    document.body.style.overflow = 'unset';
    
    // Remove global keyboard listener
    document.removeEventListener('keydown', handleKeyDown);
  };

  // Cleanup effect
  useEffect(() => {
    setIsMounted(true);
    return () => {
      // Clean up event listener when component unmounts
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* Clickable thumbnail */}
      <img 
        src={src} 
        alt={alt}
        className={`${className}${enableFullScreen ? " cursor-pointer transition-transform hover:scale-105" : ""}`}
        onClick={enableFullScreen ? openFullScreen : undefined}
        onError={(e) => {
          e.target.src = '/admin.png'; // Fallback image
        }}
      />

      {/* Full-screen overlay */}
      {enableFullScreen && isFullScreen && isMounted && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
              onClick={closeFullScreen}
              role="dialog"
              aria-modal="true"
            >
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  e.target.src = "/admin.png";
                }}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
