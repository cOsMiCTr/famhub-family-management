import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
}
export declare class CustomError extends Error implements AppError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare const errorHandler: (error: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const createValidationError: (message: string, field?: string) => CustomError;
export declare const createNotFoundError: (resource: string) => CustomError;
export declare const createUnauthorizedError: (message?: string) => CustomError;
export declare const createForbiddenError: (message?: string) => CustomError;
//# sourceMappingURL=errorHandler.d.ts.map