#!/bin/bash

# FamHub Deployment Script for Heroku

echo "🚀 Starting FamHub deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Build backend
echo "📦 Building backend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd client
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

cd ..

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps for Heroku deployment:"
echo "1. Create Heroku app: heroku create your-app-name"
echo "2. Add PostgreSQL: heroku addons:create heroku-postgresql:mini"
echo "3. Set environment variables:"
echo "   heroku config:set JWT_SECRET=your-secret-key"
echo "   heroku config:set CURRENCY_API_KEY=your-api-key"
echo "   heroku config:set GOLD_API_KEY=your-api-key"
echo "4. Deploy: git push heroku main"
echo "5. Run migrations: heroku run npm run migrate"
echo "6. Seed database: heroku run npm run seed"
echo ""
echo "🎉 Ready for deployment!"
