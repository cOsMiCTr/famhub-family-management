# FamHub - Family Management System

A comprehensive family management system with contract tracking, income management, and multi-language support.

## Features

- **Multi-Household Support** - Manage multiple family units with inter-household connections
- **Asset & Income Tracking** - Track income and expenses with multi-currency support (TRY, GBP, USD, EUR, GOLD)
- **Contract Management** - Manage family contracts with renewal reminders
- **Multi-Language Support** - German, English, and Turkish interface
- **Admin Panel** - Complete user and household management
- **Real-time Currency Conversion** - Automatic exchange rate updates
- **Dashboard Analytics** - Comprehensive financial overview with charts

## Tech Stack

- **Backend**: Express.js + Node.js + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL
- **Deployment**: Heroku
- **APIs**: Exchange Rate API, Gold Price API

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Currency API key (optional)
- Gold API key (optional)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run migrate
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Default Admin Credentials

- **Email**: onurbaki@me.com
- **Password**: 1234

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/validate-invitation/:token` - Validate invitation token
- `POST /api/auth/complete-registration` - Complete user registration

### Admin
- `POST /api/admin/invite-user` - Create user invitation
- `GET /api/admin/invitations` - List pending invitations
- `GET /api/admin/users` - List all users
- `POST /api/admin/households` - Create household

### Assets & Income
- `POST /api/assets` - Create asset/income entry
- `GET /api/assets` - Get user's assets
- `GET /api/assets/household/:id` - Get household assets
- `GET /api/assets/summary/currency-conversion` - Get currency conversion summary

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard overview
- `GET /api/dashboard/stats` - Get statistics for charts

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `GET /api/settings/currencies` - Get available currencies

### Exchange Rates
- `GET /api/exchange-rates` - Get all exchange rates
- `GET /api/exchange-rates/convert` - Convert currency

## Environment Variables

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://localhost:5432/famhub_dev
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CURRENCY_API_KEY=your-currency-api-key
GOLD_API_KEY=your-gold-api-key
CLIENT_URL=http://localhost:3000
```

## Database Schema

### Core Tables
- `users` - User accounts with roles and preferences
- `households` - Family units managed by admins
- `household_permissions` - User permissions per household
- `assets` - Income and expense entries
- `contracts` - Family contract management
- `exchange_rates` - Currency conversion rates
- `invitation_tokens` - User invitation system

## Deployment

### Heroku Deployment

1. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```

2. Add PostgreSQL addon:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. Set environment variables:
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set CURRENCY_API_KEY=your-api-key
   heroku config:set GOLD_API_KEY=your-api-key
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

5. Run migrations and seed:
   ```bash
   heroku run npm run migrate
   heroku run npm run seed
   ```

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data

### Project Structure

```
src/
├── config/          # Database configuration
├── middleware/       # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic services
├── migrations/      # Database migrations and seeding
└── server.ts        # Main server file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details