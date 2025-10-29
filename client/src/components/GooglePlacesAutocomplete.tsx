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
    console.log('[GooglePlacesAutocomplete] 🔄 Initializing autocomplete...');
    console.log('[GooglePlacesAutocomplete] 📊 Current fallback state:', fallbackUsedRef.current);
    
    if (!containerRef.current || !inputRef.current || !window.google?.maps?.places) {
      // No Google Maps API, use regular input
      console.log('[GooglePlacesAutocomplete] ❌ Google Maps API not loaded, using regular input');
      if (inputRef.current) {
        inputRef.current.style.display = 'block';
        fallbackUsedRef.current = 'regular';
      }
      return;
    }

    // Step 1: Try the new PlaceAutocompleteElement (requires Places API New)
    // But first check if we've already detected that it's not working
    const hasDetectedError = sessionStorage.getItem('placesApiError') === 'true';
    console.log('[GooglePlacesAutocomplete] 🆕 Tier 1: PlaceAutocompleteElement (New API)');
    console.log('[GooglePlacesAutocomplete] - Has detected error:', hasDetectedError);
    console.log('[GooglePlacesAutocomplete] - PlaceAutocompleteElement available:', !!window.google.maps.places.PlaceAutocompleteElement);
    
    // If previous error detected, force legacy mode
    if (hasDetectedError) {
      console.log('[GooglePlacesAutocomplete] ⏭️ Skipping Tier 1 (previous error detected), forcing legacy mode');
      fallbackUsedRef.current = 'legacy';
    } else if (fallbackUsedRef.current === 'regular') {
      // Reset to new if we're starting fresh
      console.log('[GooglePlacesAutocomplete] 🔄 Resetting fallback state to new');
      fallbackUsedRef.current = 'new';
    }
    
    if (!hasDetectedError && fallbackUsedRef.current === 'new' && window.google.maps.places.PlaceAutocompleteElement) {
      console.log('[GooglePlacesAutocomplete] ✅ Attempting Tier 1: PlaceAutocompleteElement...');
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
        
        // Fallback function to switch to legacy
        const switchToLegacy = () => {
          console.warn('[GooglePlacesAutocomplete] ⚠️ Tier 1 FAILED: PlaceAutocompleteElement API error detected');
          console.log('[GooglePlacesAutocomplete] 🔄 Switching to Tier 2: Legacy Autocomplete');
          fallbackUsedRef.current = 'legacy';
          // Remove failed element
          try {
            if (containerRef.current && autocompleteElement.parentNode) {
              containerRef.current.removeChild(autocompleteElement);
            }
          } catch (e) {
            // Element may have already been removed
          }
          // Retry with legacy
          setTimeout(() => initializeAutocomplete(), 100);
        };
        
        // Listen for various error events
        autocompleteElement.addEventListener('gmp-placeselect', handlePlaceSelectRef.current!);
        autocompleteElement.addEventListener('error', switchToLegacy);
        autocompleteElement.addEventListener('gmp-error', switchToLegacy);
        
        // Intercept fetch requests to detect API failures
        const originalFetch = window.fetch;
        const fetchInterceptor = async (...args: Parameters<typeof fetch>) => {
          try {
            const response = await originalFetch(...args);
            // Check if this is a Places API request that failed
            if (args[0]?.toString().includes('places.googleapis.com')) {
              console.log('[GooglePlacesAutocomplete] 🌐 Fetch request to Places API:', args[0]);
              console.log('[GooglePlacesAutocomplete] - Response status:', response.status, response.statusText);
              if (!response.ok && (response.status === 403 || response.status === 404)) {
                console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: Fetch returned', response.status);
                switchToLegacy();
                window.fetch = originalFetch; // Restore
              } else {
                console.log('[GooglePlacesAutocomplete] ✅ Fetch request successful');
              }
            }
            return response;
          } catch (error: any) {
            if (args[0]?.toString().includes('places.googleapis.com')) {
              console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: Fetch error', error);
              switchToLegacy();
              window.fetch = originalFetch; // Restore
            }
            throw error;
          }
        };
        window.fetch = fetchInterceptor;
        
        // Also intercept XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        let currentXHRUrl = '';
        
        XMLHttpRequest.prototype.open = function(...args: any[]) {
          currentXHRUrl = args[1]?.toString() || '';
          return originalXHROpen.apply(this, args as any);
        };
        
        XMLHttpRequest.prototype.send = function(...args: any[]) {
          if (currentXHRUrl.includes('places.googleapis.com')) {
            this.addEventListener('error', () => {
              console.warn('Places API (New) XHR error, switching to legacy');
              switchToLegacy();
              XMLHttpRequest.prototype.open = originalXHROpen;
              XMLHttpRequest.prototype.send = originalXHRSend;
            });
            this.addEventListener('load', function() {
              console.log('[GooglePlacesAutocomplete] 🌐 XHR request to Places API:', currentXHRUrl);
              console.log('[GooglePlacesAutocomplete] - Response status:', this.status, this.statusText);
              if (this.status === 403 || this.status === 404) {
                console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: XHR returned', this.status);
                switchToLegacy();
                XMLHttpRequest.prototype.open = originalXHROpen;
                XMLHttpRequest.prototype.send = originalXHRSend;
              } else if (this.status >= 200 && this.status < 300) {
                console.log('[GooglePlacesAutocomplete] ✅ XHR request successful');
              }
            });
          }
          return originalXHRSend.apply(this, args);
        };
        
        // Fallback: Set a short timeout to detect if API calls are failing
        const timeoutId = setTimeout(() => {
          // After 2 seconds, check if user tried to interact but got errors
          // This catches cases where the element loads but API calls fail
          if (fallbackUsedRef.current === 'new' && autocompleteElement.parentNode) {
            // Check console for recent errors
            const hadError = sessionStorage.getItem('placesApiError');
            if (hadError === 'true') {
              console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: Detected previous errors in sessionStorage');
              switchToLegacy();
            } else {
              console.log('[GooglePlacesAutocomplete] ⏱️ Timeout check: No errors detected, Tier 1 still active');
            }
          }
        }, 2000);
        
        // Store cleanup function
        autocompleteElement._cleanup = () => {
          clearTimeout(timeoutId);
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXHROpen;
          XMLHttpRequest.prototype.send = originalXHRSend;
        };
        
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
        console.log('[GooglePlacesAutocomplete] ✅ Tier 1 SUCCESS: PlaceAutocompleteElement initialized');
        console.log('[GooglePlacesAutocomplete] 📊 Current fallback state: NEW API');
        
        // Monitor for API call failures by intercepting console errors
        const originalConsoleError = console.error;
        const consoleErrorInterceptor = (...args: any[]) => {
          const errorMessage = args.join(' ');
          if (errorMessage.includes('places.googleapis.com') && 
              (errorMessage.includes('403') || errorMessage.includes('Forbidden') ||
               errorMessage.includes('not been used') || errorMessage.includes('disabled') ||
               errorMessage.includes('Places API (New) has not been used'))) {
            console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: Intercepted error in console:', errorMessage);
            sessionStorage.setItem('placesApiError', 'true');
            switchToLegacy();
            console.error = originalConsoleError; // Restore
            return;
          }
          originalConsoleError.apply(console, args);
        };
        console.error = consoleErrorInterceptor;
        
        // Also listen for unhandled promise rejections
        const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
          const reason = event.reason?.toString() || '';
          if (reason.includes('places.googleapis.com') && 
              (reason.includes('403') || reason.includes('Forbidden') ||
               reason.includes('not been used') || reason.includes('disabled'))) {
            console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: Unhandled rejection from Places API:', reason);
            sessionStorage.setItem('placesApiError', 'true');
            switchToLegacy();
          }
        };
        window.addEventListener('unhandledrejection', unhandledRejectionHandler);
        
        // Store additional cleanup
        const oldCleanup = autocompleteElement._cleanup;
        autocompleteElement._cleanup = () => {
          if (oldCleanup) oldCleanup();
          console.error = originalConsoleError;
          window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
          sessionStorage.removeItem('placesApiError');
        };
        
        return;
      } catch (error) {
        console.warn('[GooglePlacesAutocomplete] ❌ Tier 1 FAILED: Exception during initialization:', error);
        fallbackUsedRef.current = 'legacy';
        // Continue to legacy fallback below
      }
    }
    
    // Step 2: Fallback to legacy Autocomplete API (works with older Places API)
    console.log('[GooglePlacesAutocomplete] 🔄 Tier 2: Legacy Autocomplete');
    console.log('[GooglePlacesAutocomplete] - Current fallback state:', fallbackUsedRef.current);
    console.log('[GooglePlacesAutocomplete] - Autocomplete available:', !!window.google.maps.places.Autocomplete);
    console.log('[GooglePlacesAutocomplete] - Input ref available:', !!inputRef.current);
    
    // Attempt Tier 2 if we're in legacy mode OR if Tier 1 was skipped
    if ((fallbackUsedRef.current === 'legacy' || hasDetectedError) && window.google.maps.places.Autocomplete && inputRef.current) {
      console.log('[GooglePlacesAutocomplete] ✅ Attempting Tier 2: Legacy Autocomplete...');
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
        console.log('[GooglePlacesAutocomplete] ✅ Tier 2 SUCCESS: Legacy Autocomplete initialized');
        console.log('[GooglePlacesAutocomplete] 📊 Current fallback state: LEGACY API');
        // Clear the error flag since legacy is working
        sessionStorage.removeItem('placesApiError');
        return;
      } catch (error) {
        console.warn('[GooglePlacesAutocomplete] ❌ Tier 2 FAILED: Exception during initialization:', error);
        fallbackUsedRef.current = 'regular';
        // Continue to regular input fallback below
      }
    }
    
    // Step 3: Final fallback - use regular classic input field
    console.log('[GooglePlacesAutocomplete] 🔄 Tier 3: Regular Input Field');
    if (inputRef.current) {
      inputRef.current.style.display = 'block';
      fallbackUsedRef.current = 'regular';
      console.log('[GooglePlacesAutocomplete] ✅ Tier 3 ACTIVE: Using regular input field (no autocomplete)');
      console.log('[GooglePlacesAutocomplete] 📊 Current fallback state: REGULAR INPUT');
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
        // Check if it's a PlaceAutocompleteElement (has removeEventListener) or legacy Autocomplete
        if (typeof autocompleteElementRef.current.removeEventListener === 'function' && handlePlaceSelectRef.current) {
          autocompleteElementRef.current.removeEventListener('gmp-placeselect', handlePlaceSelectRef.current);
        }
        // For legacy Autocomplete, use Google Maps event system
        if (window.google?.maps?.event && typeof autocompleteElementRef.current.setBounds !== 'undefined') {
          window.google.maps.event.clearInstanceListeners(autocompleteElementRef.current);
        }
        // Call custom cleanup if it exists
        if (typeof autocompleteElementRef.current._cleanup === 'function') {
          autocompleteElementRef.current._cleanup();
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
    if (inputRef.current) {
      // Check if autocompleteElementRef is a PlaceAutocompleteElement (has querySelector)
      let autocompleteInput: HTMLInputElement | null = null;
      if (autocompleteElementRef.current && typeof autocompleteElementRef.current.querySelector === 'function') {
        autocompleteInput = autocompleteElementRef.current.querySelector('input') as HTMLInputElement;
      } else if (autocompleteElementRef.current?.shadowRoot && typeof autocompleteElementRef.current.shadowRoot.querySelector === 'function') {
        autocompleteInput = autocompleteElementRef.current.shadowRoot.querySelector('input') as HTMLInputElement;
      }
      
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

