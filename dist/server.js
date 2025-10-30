"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const user_1 = __importDefault(require("./routes/user"));
const assets_1 = __importDefault(require("./routes/assets"));
const contracts_1 = __importDefault(require("./routes/contracts"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const settings_1 = __importDefault(require("./routes/settings"));
const exchange_1 = __importDefault(require("./routes/exchange"));
const translations_1 = __importDefault(require("./routes/translations"));
const household_members_1 = __importDefault(require("./routes/household-members"));
const income_categories_1 = __importDefault(require("./routes/income-categories"));
const income_1 = __importDefault(require("./routes/income"));
const asset_categories_1 = __importDefault(require("./routes/asset-categories"));
const currencies_1 = __importDefault(require("./routes/currencies"));
const export_1 = __importDefault(require("./routes/export"));
const twoFactor_1 = __importDefault(require("./routes/twoFactor"));
const modules_1 = __importDefault(require("./routes/modules"));
const vouchers_1 = __importDefault(require("./routes/vouchers"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./config/database");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://maps.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://maps.googleapis.com", "https://places.googleapis.com"],
        },
    },
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../client/build')));
}
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/user', user_1.default);
app.use('/api/assets', assets_1.default);
app.use('/api/contracts', contracts_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/exchange', exchange_1.default);
app.use('/api/translations', translations_1.default);
app.use('/api/household-members', household_members_1.default);
app.use('/api/income-categories', income_categories_1.default);
app.use('/api/income', income_1.default);
app.use('/api/asset-categories', asset_categories_1.default);
app.use('/api/currencies', currencies_1.default);
app.use('/api/users/export', export_1.default);
app.use('/api/two-factor', twoFactor_1.default);
app.use('/api/modules', modules_1.default);
app.use('/api/vouchers', vouchers_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../client/dist/index.html'));
    });
}
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        await (0, database_1.initializeDatabase)();
        console.log('✅ Database connected successfully');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV}`);
            console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map