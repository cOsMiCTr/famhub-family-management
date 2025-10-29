import React, { useEffect, useRef, useCallback } from 'react';

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
  
  namespace JSX {
    interface IntrinsicElements {
      'gmp-places-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'placeholder'?: string;
        'types'?: string;
      }, HTMLElement>;
    }
  }
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Enter address...',
  className = '',
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);
  const handlePlaceSelectRef = useRef<((event: any) => void) | null>(null);
  const fallbackUsedRef = useRef<'new' | 'legacy' | 'regular'>('new');

  // Handle place selection
  const handlePlaceSelect = (event: any) => {
    const place = event.detail.place;
    
    if (place.formattedAddress) {
      onChange(place.formattedAddress);
      if (inputRef.current) {
        inputRef.current.value = place.formattedAddress;
      }
    } else if (place.displayName) {
      onChange(place.displayName);
      if (inputRef.current) {
        inputRef.current.value = place.displayName;
      }
    }
  };

  // Store handler in ref for cleanup
  handlePlaceSelectRef.current = handlePlaceSelect;

  const initializeAutocomplete = useCallback(() => {
    if (!containerRef.current || !inputRef.current || !window.google?.maps?.places) {
      // No Google Maps API, use regular input
      if (inputRef.current) {
        inputRef.current.style.display = 'block';
        fallbackUsedRef.current = 'regular';
      }
      return;
    }

    // Step 1: Try the new PlaceAutocompleteElement (requires Places API New)
    if (fallbackUsedRef.current === 'new' && window.google.maps.places.PlaceAutocompleteElement) {
      try {
        // Clear any previous attempts
        if (autocompleteElementRef.current) {
          try {
            containerRef.current?.removeChild(autocompleteElementRef.current);
          } catch (e) {
            // Element may have already been removed
          }
        }

        // Create the PlaceAutocompleteElement instance
        const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement();

        // PlaceAutocompleteElement is a web component, it has its own input
        // Hide our dummy input
        inputRef.current.style.display = 'none';
        
        // Set attributes on the autocomplete element
        autocompleteElement.setAttribute('placeholder', placeholder);
        if (disabled) {
          autocompleteElement.setAttribute('disabled', '');
        }
        
        // Apply custom styling via shadow DOM or wrapper
        autocompleteElement.setAttribute('style', `width: 100%; ${className.includes('dark:') ? '' : ''}`);
        
        // Listen for API errors - if it fails, fall back to legacy
        const errorHandler = (event: any) => {
          console.warn('PlaceAutocompleteElement API error, falling back to legacy:', event);
          fallbackUsedRef.current = 'legacy';
          // Remove failed element and try legacy
          try {
            containerRef.current?.removeChild(autocompleteElement);
          } catch (e) {
            // Element may have already been removed
          }
          // Retry with legacy
          setTimeout(() => initializeAutocomplete(), 100);
        };
        
        autocompleteElement.addEventListener('gmp-placeselect', handlePlaceSelectRef.current!);
        autocompleteElement.addEventListener('error', errorHandler);
        
        // Get the actual input from within the element (might be in shadow DOM)
        setTimeout(() => {
          const autocompleteInput = autocompleteElement.shadowRoot?.querySelector('input') as HTMLInputElement || 
                                  autocompleteElement.querySelector('input') as HTMLInputElement;
          
          if (autocompleteInput) {
            // Apply custom styling
            autocompleteInput.className = className;
            if (!autocompleteInput.placeholder) {
              autocompleteInput.placeholder = placeholder;
            }
            autocompleteInput.disabled = disabled;
            
            // Copy value
            if (value) {
              autocompleteInput.value = value;
            }
            
            // Sync input value changes
            autocompleteInput.addEventListener('input', (e: Event) => {
              const target = e.target as HTMLInputElement;
              onChange(target.value);
            });
          }
        }, 0);
        
        // Append autocomplete element to container
        containerRef.current.appendChild(autocompleteElement);
        
        autocompleteElementRef.current = autocompleteElement;
        fallbackUsedRef.current = 'new';
        return;
      } catch (error) {
        console.warn('Failed to initialize PlaceAutocompleteElement, falling back to legacy Autocomplete:', error);
        fallbackUsedRef.current = 'legacy';
        // Continue to legacy fallback below
      }
    }
    
    // Step 2: Fallback to legacy Autocomplete API (works with older Places API)
    if (fallbackUsedRef.current === 'legacy' && window.google.maps.places.Autocomplete && inputRef.current) {
      try {
        // Show our input for legacy autocomplete
        inputRef.current.style.display = 'block';
        
        // Clean up previous autocomplete if any
        if (autocompleteElementRef.current && typeof autocompleteElementRef.current.setBounds === 'undefined') {
          // This was a legacy autocomplete, we'll recreate it
          if (window.google?.maps?.event) {
            window.google.maps.event.clearInstanceListeners(autocompleteElementRef.current);
          }
        }

        // Create legacy Autocomplete instance
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          fields: ['formatted_address', 'name', 'geometry']
        });

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            onChange(place.formatted_address);
          } else if (place.name) {
            onChange(place.name);
          }
        });

        // Sync input value changes
        const inputHandler = (e: Event) => {
          const target = e.target as HTMLInputElement;
          onChange(target.value);
        };
        inputRef.current.addEventListener('input', inputHandler);

        autocompleteElementRef.current = autocomplete;
        fallbackUsedRef.current = 'legacy';
        return;
      } catch (error) {
        console.warn('Failed to initialize legacy Autocomplete, using regular input:', error);
        fallbackUsedRef.current = 'regular';
        // Continue to regular input fallback below
      }
    }
    
    // Step 3: Final fallback - use regular classic input field
    if (inputRef.current) {
      inputRef.current.style.display = 'block';
      fallbackUsedRef.current = 'regular';
    }
  }, [className, placeholder, disabled, value, onChange]);

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

    // Load the script with loading=async for best practices
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;

    window.initGooglePlaces = () => {
      scriptLoadedRef.current = true;
      initializeAutocomplete();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (autocompleteElementRef.current && handlePlaceSelectRef.current) {
        autocompleteElementRef.current.removeEventListener('gmp-placeselect', handlePlaceSelectRef.current);
      }
    };
  }, [initializeAutocomplete]);

  // Initialize autocomplete when container ref is ready and Google is loaded
  useEffect(() => {
    if (containerRef.current && inputRef.current && scriptLoadedRef.current && window.google?.maps?.places && !autocompleteElementRef.current) {
      initializeAutocomplete();
    }
  }, [initializeAutocomplete]);

  // Update input value when external value changes
  useEffect(() => {
    if (inputRef.current) {
      const autocompleteInput = autocompleteElementRef.current?.querySelector('input') as HTMLInputElement;
      const targetInput = autocompleteInput || inputRef.current;
      
      if (value !== targetInput.value) {
        targetInput.value = value;
      }
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div ref={containerRef} className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    </div>
  );
};

export default GooglePlacesAutocomplete;

