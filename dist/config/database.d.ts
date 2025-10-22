import { Pool, PoolClient } from 'pg';
export declare const pool: Pool;
export declare function initializeDatabase(): Promise<void>;
export declare function getClient(): Promise<PoolClient>;
export declare function query(text: string, params?: any[]): Promise<any>;
//# sourceMappingURL=database.d.ts.map