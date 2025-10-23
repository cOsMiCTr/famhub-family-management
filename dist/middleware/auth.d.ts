import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                role: string;
                household_id?: number;
                main_currency?: string;
            };
        }
    }
}
export interface JWTPayload {
    userId: number;
    email: string;
    role: string;
    household_id?: number;
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireHouseholdAccess: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map