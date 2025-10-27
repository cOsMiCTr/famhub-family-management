import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  assetName?: string;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  assetName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-gray-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-black bg-opacity-50">
            {assetName && (
              <h3 className="text-lg font-semibold text-white truncate pr-8">
                {assetName}
              </h3>
            )}
            <button
              type="button"
              className="text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Photo */}
          <div className="flex items-center justify-center bg-black min-h-[400px]">
            <img
              src={photoUrl}
              alt={assetName || 'Asset photo'}
              className="max-h-[80vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Click instruction */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm text-gray-300 bg-black bg-opacity-50 px-3 py-2 rounded-lg inline-block">
              Click outside to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoViewerModal;

