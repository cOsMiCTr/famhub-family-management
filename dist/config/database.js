"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initializeDatabase = initializeDatabase;
exports.getClient = getClient;
exports.query = query;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
async function initializeDatabase() {
    try {
        const client = await exports.pool.connect();
        console.log('📊 Database connection established');
        client.release();
        const { db } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔄 Running database migrations...');
            await db.migrate.latest();
            console.log('✅ Database migrations completed');
        }
        else {
            console.log('✅ Skipping migrations (handled by release phase in production)');
        }
        const seedClient = await exports.pool.connect();
        try {
            const translationCount = await seedClient.query('SELECT COUNT(*) as count FROM translations');
            const corruptedCount = await seedClient.query('SELECT COUNT(*) as count FROM translations WHERE en = \'\' OR en IS NULL');
            if (parseInt(translationCount.rows[0].count) === 0 || parseInt(corruptedCount.rows[0].count) > 0) {
                console.log('🌱 Seeding translations...');
                const { seed: seedTranslations } = await Promise.resolve().then(() => __importStar(require('../database/seeds/02_translations')));
                await seedTranslations(db);
                console.log('✅ Translations seeded successfully');
            }
            else {
                console.log('✅ Translations are intact');
            }
        }
        finally {
            seedClient.release();
        }
        const categoryClient = await exports.pool.connect();
        try {
            const categoryCount = await categoryClient.query('SELECT COUNT(*) as count FROM income_categories');
            if (parseInt(categoryCount.rows[0].count) === 0) {
                console.log('🌱 Seeding income categories...');
                const { seed: seedIncomeCategories } = await Promise.resolve().then(() => __importStar(require('../database/seeds/03_income_categories')));
                await seedIncomeCategories(db);
                console.log('✅ Income categories seeded successfully');
            }
            else {
                console.log('✅ Income categories are intact');
            }
        }
        finally {
            categoryClient.release();
        }
        const assetCategoryClient = await exports.pool.connect();
        try {
            const assetCategoryCount = await assetCategoryClient.query('SELECT COUNT(*) as count FROM asset_categories');
            const wrongTypeCount = await assetCategoryClient.query('SELECT COUNT(*) as count FROM asset_categories WHERE type = \'income\'');
            if (parseInt(assetCategoryCount.rows[0].count) === 0 || parseInt(wrongTypeCount.rows[0].count) > 0) {
                console.log('🌱 Seeding asset categories...');
                const { seed: seedAssetCategories } = await Promise.resolve().then(() => __importStar(require('../database/seeds/04_asset_categories')));
                await seedAssetCategories(db);
                console.log('✅ Asset categories seeded successfully');
            }
            else {
                console.log('✅ Asset categories are intact');
            }
        }
        finally {
            assetCategoryClient.release();
        }
        const currencyClient = await exports.pool.connect();
        try {
            const currencyCount = await currencyClient.query('SELECT COUNT(*) as count FROM currencies');
            if (parseInt(currencyCount.rows[0].count) === 0) {
                console.log('🌱 Seeding currencies...');
                const { seed: seedCurrencies } = await Promise.resolve().then(() => __importStar(require('../database/seeds/01_currencies')));
                await seedCurrencies(db);
                console.log('✅ Currencies seeded successfully');
            }
            else {
                console.log('✅ Currencies are intact');
            }
        }
        finally {
            currencyClient.release();
        }
        const modulesClient = await exports.pool.connect();
        try {
            const modulesCount = await modulesClient.query('SELECT COUNT(*) as count FROM modules');
            if (parseInt(modulesCount.rows[0].count) === 0) {
                console.log('🌱 Seeding modules...');
                const { seed: seedModules } = await Promise.resolve().then(() => __importStar(require('../database/seeds/05_modules')));
                await seedModules(db);
                console.log('✅ Modules seeded successfully');
            }
            else {
                console.log('✅ Modules are intact');
            }
        }
        finally {
            modulesClient.release();
        }
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}
async function getClient() {
    return await exports.pool.connect();
}
async function query(text, params) {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
}
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down database connection...');
    await exports.pool.end();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down database connection...');
    await exports.pool.end();
    process.exit(0);
});
//# sourceMappingURL=database.js.map