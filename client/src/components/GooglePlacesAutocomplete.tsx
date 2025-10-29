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
  const inputIdRef = useRef<string>(`google-places-input-${Math.random().toString(36).substr(2, 9)}`);

  const initializeAutocomplete = useCallback(() => {
    if (!containerRef.current || !inputRef.current || !window.google?.maps?.places) {
      // No Google Maps API, use regular input
      if (inputRef.current) {
        inputRef.current.style.display = 'block';
        fallbackUsedRef.current = 'regular';
      }
      return;
    }

    // Try Legacy Autocomplete API (works with standard Places API)
    if (window.google.maps.places.Autocomplete && inputRef.current) {
      try {
        // Show our input for legacy autocomplete
        inputRef.current.style.display = 'block';
        
        // Ensure input has proper styling before Google Maps attaches to it
        inputRef.current.className = className;
        inputRef.current.placeholder = placeholder;
        inputRef.current.disabled = disabled;
        
        // Set proper background color immediately to prevent black/dark gray background
        // Check if we're in dark mode by checking the document, body, or className
        const htmlHasDark = document.documentElement.classList.contains('dark');
        const bodyHasDark = document.body.classList.contains('dark');
        const classNameHasDark = className.includes('dark:bg-gray-700') || className.includes('dark:');
        const isDarkMode = htmlHasDark || bodyHasDark || classNameHasDark;
        
        console.log('[GooglePlacesAutocomplete] 🌙 Dark mode detection:', {
          htmlHasDark,
          bodyHasDark,
          classNameHasDark,
          className,
          isDarkMode,
          computedBackground: window.getComputedStyle(inputRef.current).backgroundColor
        });
        
        // FORCE white background in light mode - assume light mode unless explicitly dark
        // Google Maps might apply dark styles, so we need to be very aggressive
        const bgColor = isDarkMode ? 'rgb(55, 65, 81)' : '#ffffff';
        const textColor = isDarkMode ? '#ffffff' : '#111827';
        const borderColor = isDarkMode ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)';
        
        // Apply styles directly first
        inputRef.current.style.backgroundColor = bgColor;
        inputRef.current.style.color = textColor;
        inputRef.current.style.backgroundImage = 'none';
        inputRef.current.style.borderColor = borderColor;
        
        // Force with !important using setProperty
        inputRef.current.style.setProperty('background-color', bgColor, 'important');
        inputRef.current.style.setProperty('color', textColor, 'important');
        inputRef.current.style.setProperty('border-color', borderColor, 'important');
        inputRef.current.style.setProperty('background-image', 'none', 'important');
        
        // Also remove any inline styles that might have dark colors
        const currentStyle = inputRef.current.getAttribute('style') || '';
        if (currentStyle.includes('rgb(54, 59, 71)') || currentStyle.includes('#363B47') || currentStyle.includes('rgb(54,59,71)')) {
          // Remove dark background from inline style
          inputRef.current.setAttribute('style', currentStyle.replace(/background[-\w]*(:\s*[^;]+)/gi, ''));
          // Reapply our styles
          inputRef.current.style.setProperty('background-color', bgColor, 'important');
        }
        
        // Clean up previous autocomplete if any
        if (autocompleteElementRef.current && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteElementRef.current);
        }

        // Continuously override Google Maps default styling that causes black background
        // Use multiple timeouts to catch when Google Maps applies styles
        const overrideStyles = () => {
          if (inputRef.current) {
            // Re-check dark mode each time (in case theme changed)
            const currentDarkMode = document.documentElement.classList.contains('dark') || 
                                   document.body.classList.contains('dark') || 
                                   className.includes('dark:bg-gray-700') || 
                                   className.includes('dark:');
            
            // ALWAYS white background in light mode - FORCE IT
            const bgColor = currentDarkMode ? 'rgb(55, 65, 81)' : '#ffffff';
            const textColor = currentDarkMode ? '#ffffff' : '#111827';
            const borderColor = currentDarkMode ? 'rgb(75, 85, 99)' : 'rgb(209, 213, 219)';
            
            // Get current computed styles to check what Google Maps has applied
            const computedBg = window.getComputedStyle(inputRef.current).backgroundColor;
            const hasDarkBg = computedBg.includes('54, 59, 71') || computedBg.includes('54,59,71') || 
                            computedBg.includes('#363B47') || computedBg.includes('rgb(54') ||
                            (computedBg.includes('rgb') && computedBg.includes('255') && computedBg.includes('255') && computedBg.includes('255') && !currentDarkMode);
            
            // If we detect dark background in light mode, FORCE white
            const finalBgColor = (hasDarkBg && !currentDarkMode) ? '#ffffff' : bgColor;
            const finalTextColor = (hasDarkBg && !currentDarkMode) ? '#111827' : textColor;
            
            // Force proper styling with !important to override Google Maps
            inputRef.current.style.setProperty('background-color', finalBgColor, 'important');
            inputRef.current.style.setProperty('color', finalTextColor, 'important');
            inputRef.current.style.setProperty('background-image', 'none', 'important');
            inputRef.current.style.setProperty('border-color', borderColor, 'important');
            
            // Also set directly as fallback
            inputRef.current.style.backgroundColor = finalBgColor;
            inputRef.current.style.color = finalTextColor;
            inputRef.current.style.backgroundImage = 'none';
            inputRef.current.style.borderColor = borderColor;
            
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
        
        // Inject a style tag to force white background with highest specificity
        // Target all possible Google Maps classes, attributes, and our specific input ID
        const inputId = inputRef.current?.id || inputIdRef.current;
        if (!document.getElementById('google-places-autocomplete-override')) {
          const style = document.createElement('style');
          style.id = 'google-places-autocomplete-override';
          style.textContent = `
            /* Target our specific input by ID first (highest specificity) */
            input#${inputId},
            input#${inputId}[class*="pac"],
            input#${inputId}.pac-target-input {
              background-color: #ffffff !important;
              color: #111827 !important;
              background-image: none !important;
              border-color: rgb(209, 213, 219) !important;
            }
            /* Target Google Maps classes */
            input[type="text"].pac-target-input,
            input.pac-target-input,
            input[autocomplete="off"],
            input[class*="pac"],
            input[id*="pac"] {
              background-color: #ffffff !important;
              color: #111827 !important;
              background-image: none !important;
              border-color: rgb(209, 213, 219) !important;
            }
            /* Dark mode variants */
            .dark input#${inputId},
            .dark input#${inputId}[class*="pac"],
            .dark input#${inputId}.pac-target-input,
            .dark input[type="text"].pac-target-input,
            .dark input.pac-target-input,
            .dark input[autocomplete="off"],
            .dark input[class*="pac"],
            .dark input[id*="pac"] {
              background-color: rgb(55, 65, 81) !important;
              color: #ffffff !important;
              background-image: none !important;
              border-color: rgb(75, 85, 99) !important;
            }
          `;
          document.head.appendChild(style);
        } else {
          // Update existing style to include this input's ID
          const existingStyle = document.getElementById('google-places-autocomplete-override') as HTMLStyleElement;
          if (existingStyle && !existingStyle.textContent?.includes(`input#${inputId}`)) {
            // Add this specific input ID to the existing styles
            const newRules = `
              input#${inputId},
              input#${inputId}[class*="pac"],
              input#${inputId}.pac-target-input {
                background-color: #ffffff !important;
                color: #111827 !important;
                background-image: none !important;
                border-color: rgb(209, 213, 219) !important;
              }
              .dark input#${inputId},
              .dark input#${inputId}[class*="pac"],
              .dark input#${inputId}.pac-target-input {
                background-color: rgb(55, 65, 81) !important;
                color: #ffffff !important;
                background-image: none !important;
                border-color: rgb(75, 85, 99) !important;
              }
            `;
            existingStyle.textContent += newRules;
          }
        }
        
        // Wait for Google Maps to add its classes, then reapply our className
        setTimeout(() => {
          if (inputRef.current) {
            // Add our className to whatever Google Maps added
            const currentClasses = inputRef.current.className || '';
            const ourClasses = className.split(' ').filter(c => c && !currentClasses.includes(c));
            if (ourClasses.length > 0) {
              inputRef.current.className = `${currentClasses} ${ourClasses.join(' ')}`.trim();
            }
            overrideStyles();
          }
        }, 50);
        
        // Use MutationObserver to watch for style attribute changes and override them
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style' && inputRef.current) {
              const currentBg = window.getComputedStyle(inputRef.current).backgroundColor;
              const currentColor = window.getComputedStyle(inputRef.current).color;
              // Check if Google Maps has applied dark colors (including #363B47 = rgb(54, 59, 71))
              const darkColors = ['54', '59', '71', '36, 59, 71', '#363B47', 'rgb(54, 59, 71)', 'rgb(54,59,71)'];
              const hasDarkBg = darkColors.some(color => currentBg.includes(color));
              if (hasDarkBg && !isDarkMode) {
                overrideStyles();
              }
              // Also check for white text in light mode (indicates dark background was applied)
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
        
        // One more style override after everything is set up
        setTimeout(() => {
          if (inputRef.current && autocompleteElementRef.current && autocompleteElementRef.current._overrideStyles) {
            autocompleteElementRef.current._overrideStyles();
          }
        }, 500);
        
        return;
      } catch (error) {
        fallbackUsedRef.current = 'regular';
        // Continue to regular input fallback below
      }
    }
    
    // Fallback - use regular classic input field
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
        id={inputIdRef.current}
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
