import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Drawer({ open, onClose, children }: DrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] transition-all duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`} 
        onClick={onClose} 
      />
      <div className={`
        absolute right-0 top-0 h-full 
        w-full sm:w-[480px] lg:w-[520px] 
        bg-white shadow-2xl 
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
        overflow-hidden
      `}>
        <div className="flex flex-col h-full">
          {children}
        </div>
      </div>
    </div>
  );

  // Only use portal on client side
  if (typeof window !== 'undefined') {
    return createPortal(drawerContent, document.body);
  }
  
  return drawerContent;
}