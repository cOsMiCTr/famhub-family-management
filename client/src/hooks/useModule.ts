import { useModuleContext } from '../contexts/ModuleContext';

/**
 * Hook to check module access for a specific module
 * @param moduleKey - The module key to check access for
 * @returns Object with hasAccess and isGranted booleans
 */
export const useModule = (moduleKey: string) => {
  const { hasModule, userModules } = useModuleContext();
  
  return {
    hasAccess: hasModule(moduleKey),
    isGranted: userModules.includes(moduleKey),
  };
};

