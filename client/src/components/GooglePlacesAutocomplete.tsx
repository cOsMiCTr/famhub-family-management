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
  const fallbackUsedRef = useRef<'legacy' | 'regular'>('legacy');

  const initializeAutocomplete = useCallback(() => {
    console.log('[GooglePlacesAutocomplete] 🔄 Initializing autocomplete...');
    
    if (!containerRef.current || !inputRef.current || !window.google?.maps?.places) {
      // No Google Maps API, use regular input
      console.log('[GooglePlacesAutocomplete] ❌ Google Maps API not loaded, using regular input');
      if (inputRef.current) {
        inputRef.current.style.display = 'block';
        fallbackUsedRef.current = 'regular';
      }
      return;
    }

    // Try Legacy Autocomplete API (works with standard Places API)
    console.log('[GooglePlacesAutocomplete] 🔄 Attempting Legacy Autocomplete...');
    console.log('[GooglePlacesAutocomplete] - Autocomplete available:', !!window.google.maps.places.Autocomplete);
    console.log('[GooglePlacesAutocomplete] - Input ref available:', !!inputRef.current);
    
    if (window.google.maps.places.Autocomplete && inputRef.current) {
      console.log('[GooglePlacesAutocomplete] ✅ Initializing Legacy Autocomplete...');
      try {
        // Show our input for legacy autocomplete
        inputRef.current.style.display = 'block';
        
        // Ensure input has proper styling before Google Maps attaches to it
        inputRef.current.className = className;
        inputRef.current.placeholder = placeholder;
        inputRef.current.disabled = disabled;
        
        // Set proper background color immediately to prevent black/dark gray background
        // Check if we're in dark mode by checking the document or className
        const isDarkMode = document.documentElement.classList.contains('dark') || className.includes('dark:bg-gray-700');
        inputRef.current.style.backgroundColor = isDarkMode ? 'rgb(55, 65, 81)' : '#ffffff';
        inputRef.current.style.color = isDarkMode ? '#ffffff' : '#111827';
        inputRef.current.style.backgroundImage = 'none';
        inputRef.current.style.borderColor = isDarkMode ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)';
        // Force remove any dark styling that Google Maps might add
        inputRef.current.style.setProperty('background-color', isDarkMode ? 'rgb(55, 65, 81)' : '#ffffff', 'important');
        inputRef.current.style.setProperty('color', isDarkMode ? '#ffffff' : '#111827', 'important');
        
        // Clean up previous autocomplete if any
        if (autocompleteElementRef.current && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteElementRef.current);
        }

        // Continuously override Google Maps default styling that causes black background
        // Use multiple timeouts to catch when Google Maps applies styles
        const overrideStyles = () => {
          if (inputRef.current) {
            // Force proper styling with !important to override Google Maps
            inputRef.current.style.setProperty('background-color', isDarkMode ? 'rgb(55, 65, 81)' : '#ffffff', 'important');
            inputRef.current.style.setProperty('color', isDarkMode ? '#ffffff' : '#111827', 'important');
            inputRef.current.style.setProperty('background-image', 'none', 'important');
            inputRef.current.style.setProperty('border-color', isDarkMode ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)', 'important');
            // Ensure className is still applied
            if (!inputRef.current.className.includes(className.split(' ')[0])) {
              inputRef.current.className = className;
            }
          }
        };

        // Create legacy Autocomplete instance
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          fields: ['formatted_address', 'name', 'geometry']
        });
        
        // Store autocomplete instance first
        autocompleteElementRef.current = autocomplete;
        // Now we can safely set the override function
        autocompleteElementRef.current._overrideStyles = overrideStyles;
        
        // Override immediately and multiple times to catch late style applications
        // More frequent overrides to catch Google Maps style application
        setTimeout(overrideStyles, 0);
        setTimeout(overrideStyles, 10);
        setTimeout(overrideStyles, 25);
        setTimeout(overrideStyles, 50);
        setTimeout(overrideStyles, 75);
        setTimeout(overrideStyles, 100);
        setTimeout(overrideStyles, 150);
        setTimeout(overrideStyles, 200);
        setTimeout(overrideStyles, 300);
        setTimeout(overrideStyles, 400);
        
        // Also override on focus (when user starts typing)
        inputRef.current.addEventListener('focus', overrideStyles);
        inputRef.current.addEventListener('input', overrideStyles);
        inputRef.current.addEventListener('keydown', overrideStyles);
        inputRef.current.addEventListener('keyup', overrideStyles);
        
        // Use MutationObserver to watch for style attribute changes and override them
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style' && inputRef.current) {
              const currentBg = window.getComputedStyle(inputRef.current).backgroundColor;
              const currentColor = window.getComputedStyle(inputRef.current).color;
              // Check if Google Maps has applied dark colors
              if (currentBg.includes('54') || currentBg.includes('59') || currentBg === 'rgb(54, 59, 71)' || currentBg.includes('36, 59, 71')) {
                overrideStyles();
              }
              // Also check for dark text colors
              if (currentColor === 'rgb(255, 255, 255)' && !isDarkMode) {
                overrideStyles();
              }
            }
          });
        });
        
        // Start observing the input for style changes
        if (inputRef.current) {
          observer.observe(inputRef.current, {
            attributes: true,
            attributeFilter: ['style', 'class']
          });
        }
        
        // Store observer for cleanup
        autocompleteElementRef.current._styleObserver = observer;

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

        fallbackUsedRef.current = 'legacy';
        console.log('[GooglePlacesAutocomplete] ✅ Legacy Autocomplete initialized successfully');
        console.log('[GooglePlacesAutocomplete] 📊 Current state: LEGACY API');
        
        // One more style override after everything is set up
        setTimeout(() => {
          if (inputRef.current && autocompleteElementRef.current && autocompleteElementRef.current._overrideStyles) {
            autocompleteElementRef.current._overrideStyles();
          }
        }, 500);
        
        return;
      } catch (error) {
        console.warn('[GooglePlacesAutocomplete] ❌ Legacy Autocomplete failed:', error);
        fallbackUsedRef.current = 'regular';
        // Continue to regular input fallback below
      }
    }
    
    // Fallback - use regular classic input field
    console.log('[GooglePlacesAutocomplete] 🔄 Falling back to Regular Input Field');
    if (inputRef.current) {
      inputRef.current.style.display = 'block';
      fallbackUsedRef.current = 'regular';
      console.log('[GooglePlacesAutocomplete] ✅ Using regular input field (no autocomplete)');
      console.log('[GooglePlacesAutocomplete] 📊 Current state: REGULAR INPUT');
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
      if (autocompleteElementRef.current) {
        // For legacy Autocomplete, use Google Maps event system
        if (window.google?.maps?.event && typeof autocompleteElementRef.current.setBounds !== 'undefined') {
          window.google.maps.event.clearInstanceListeners(autocompleteElementRef.current);
        }
        // Remove style override event listeners
        if (inputRef.current && autocompleteElementRef.current._overrideStyles) {
          inputRef.current.removeEventListener('focus', autocompleteElementRef.current._overrideStyles);
          inputRef.current.removeEventListener('input', autocompleteElementRef.current._overrideStyles);
          inputRef.current.removeEventListener('keydown', autocompleteElementRef.current._overrideStyles);
          inputRef.current.removeEventListener('keyup', autocompleteElementRef.current._overrideStyles);
        }
        // Disconnect MutationObserver
        if (autocompleteElementRef.current._styleObserver) {
          autocompleteElementRef.current._styleObserver.disconnect();
        }
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
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value;
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
