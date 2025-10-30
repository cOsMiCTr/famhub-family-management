import { Request, Response, NextFunction } from 'express';
import ModuleService from '../services/moduleService';

/**
 * Middleware to protect routes by module access
 * Requires authentication middleware to run first
 */
export const requireModule = (moduleKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    // Free modules always allowed
    const freeModules = ['dashboard', 'settings', 'family_members'];
    if (freeModules.includes(moduleKey)) {
      return next();
    }

    // Check module access
    try {
      const hasAccess = await ModuleService.hasModuleAccess(user.id, moduleKey);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Module access required',
          code: 'MODULE_ACCESS_REQUIRED',
          requiredModule: moduleKey
        });
      }

      next();
    } catch (error) {
      console.error('Error checking module access:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Optional middleware to attach user's modules to request
 * Useful for frontend context or conditional logic
 */
export const attachUserModules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  if (!user) {
    return next();
  }

  try {
    const modules = await ModuleService.getUserModules(user.id);
    req.userModules = modules;
    next();
  } catch (error) {
    console.error('Error fetching user modules:', error);
    // Don't fail the request, just continue without modules
    req.userModules = [];
    next();
  }
};

// Extend Request interface to include userModules
declare global {
  namespace Express {
    interface Request {
      userModules?: string[];
    }
  }
}

