import React, { useState } from 'react';

interface FamHubLogoProps {
  className?: string;
  size?: number;
  src?: string;
}

const FamHubLogo: React.FC<FamHubLogoProps> = ({ className = '', size = 80, src }) => {
  // State to track if logo image failed to load
  const [logoError, setLogoError] = useState(false);
  
  // If a custom logo source is provided, use it
  if (src) {
    return (
      <img 
        src={src} 
        alt="FamHub Logo" 
        width={size} 
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  // Otherwise, try to load logo from public folder
  const logoPath = '/logo.png'; // Primary logo path - add your logo file to client/public/logo.png

  // Try to load custom logo from public folder
  if (!logoError) {
    return (
      <img 
        src={logoPath} 
        alt="FamHub Logo" 
        width={size} 
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
        onError={() => setLogoError(true)}
      />
    );
  }

  // Fallback to default SVG logo if no image is found
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* House outline - muted teal/blue-green (#4A90A4) with rounded corners */}
      <path
        d="M 25 35 Q 25 30, 30 30 L 70 30 Q 75 30, 75 35 L 75 70 Q 75 75, 70 75 L 30 75 Q 25 75, 25 70 Z"
        fill="none"
        stroke="#4A90A4"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Roof with rounded peak */}
      <path
        d="M 25 35 Q 50 18, 75 35"
        fill="none"
        stroke="#4A90A4"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Larger figure (adult) - right side, rounded body */}
      <circle cx="60" cy="58" r="3.5" fill="#4A90A4" />
      <ellipse 
        cx="60" 
        cy="68" 
        rx="4" 
        ry="3.5" 
        fill="#4A90A4"
      />
      
      {/* Smaller figure (child) - left side, rounded body, positioned slightly forward */}
      <circle cx="40" cy="60" r="2.5" fill="#4A90A4" />
      <ellipse 
        cx="40" 
        cy="68" 
        rx="3" 
        ry="2.5" 
        fill="#4A90A4"
      />
      
      {/* Orange circle (sun/notification) - upper right, partially overlapping roof */}
      <circle cx="82" cy="28" r="5.5" fill="#F7A845" />
    </svg>
  );
};

export default FamHubLogo;

