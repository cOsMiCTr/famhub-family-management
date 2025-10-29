import React, { useEffect, useRef } from 'react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Enter address...',
  className = '',
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // If no API key, just use regular input (no autocomplete)
    if (!apiKey) {
      return;
    }

    if (scriptLoadedRef.current) {
      initializeAutocomplete();
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      scriptLoadedRef.current = true;
      initializeAutocomplete();
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;

    window.initGooglePlaces = () => {
      scriptLoadedRef.current = true;
      initializeAutocomplete();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  // Initialize autocomplete when input ref is ready and Google is loaded
  useEffect(() => {
    if (inputRef.current && scriptLoadedRef.current && window.google?.maps?.places && !autocompleteRef.current) {
      initializeAutocomplete();
    }
  }, [inputRef.current, scriptLoadedRef.current]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'], // Can search for addresses and establishments
      fields: ['formatted_address', 'name', 'geometry', 'address_components']
    });

    autocompleteRef.current = autocomplete;

    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place.formatted_address) {
        onChange(place.formatted_address);
      } else if (place.name) {
        onChange(place.name);
      }
    });
  };

  // Update autocomplete value when external value changes
  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value;
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
};

export default GooglePlacesAutocomplete;

