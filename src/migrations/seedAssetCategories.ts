import { query } from '../config/database';

const seedAssetCategories = async () => {
  try {
    console.log('🌱 Starting asset categories seeding...');

    // Clear existing asset categories
    await query('DELETE FROM asset_categories');

    // Define predefined asset categories
    const categories = [
      // Real Estate
      { 
        name_en: 'Real Estate', 
        name_de: 'Immobilien', 
        name_tr: 'Gayrimenkul', 
        type: 'income',
        category_type: 'real_estate',
        icon: 'home-modern',
        requires_ticker: false,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Stocks
      { 
        name_en: 'Stocks', 
        name_de: 'Aktien', 
        name_tr: 'Hisse Senedi', 
        type: 'income',
        category_type: 'stocks',
        icon: 'chart-bar',
        requires_ticker: true,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // ETFs/Mutual Funds
      { 
        name_en: 'ETFs & Mutual Funds', 
        name_de: 'ETFs & Investmentfonds', 
        name_tr: 'ETF ve Yatırım Fonları', 
        type: 'income',
        category_type: 'etf',
        icon: 'chart-bar-square',
        requires_ticker: true,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Bonds
      { 
        name_en: 'Bonds', 
        name_de: 'Anleihen', 
        name_tr: 'Tahvil', 
        type: 'income',
        category_type: 'bonds',
        icon: 'document-text',
        requires_ticker: false,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Cryptocurrency
      { 
        name_en: 'Cryptocurrency', 
        name_de: 'Kryptowährung', 
        name_tr: 'Kripto Para', 
        type: 'income',
        category_type: 'crypto',
        icon: 'currency-bitcoin',
        requires_ticker: true,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Gold & Precious Metals
      { 
        name_en: 'Gold & Precious Metals', 
        name_de: 'Gold & Edelmetalle', 
        name_tr: 'Altın ve Değerli Metaller', 
        type: 'income',
        category_type: 'gold',
        icon: 'sparkles',
        requires_ticker: false,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Vehicles
      { 
        name_en: 'Vehicles', 
        name_de: 'Fahrzeuge', 
        name_tr: 'Araçlar', 
        type: 'income',
        category_type: 'vehicles',
        icon: 'truck',
        requires_ticker: false,
        depreciation_enabled: true,
        is_default: true 
      },
      
      // Collectibles & Art
      { 
        name_en: 'Collectibles & Art', 
        name_de: 'Sammlerstücke & Kunst', 
        name_tr: 'Koleksiyon ve Sanat', 
        type: 'income',
        category_type: 'collectibles',
        icon: 'paint-brush',
        requires_ticker: false,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Bank Accounts
      { 
        name_en: 'Bank Accounts', 
        name_de: 'Bankkonten', 
        name_tr: 'Banka Hesapları', 
        type: 'income',
        category_type: 'cash',
        icon: 'banknotes',
        requires_ticker: false,
        depreciation_enabled: false,
        is_default: true 
      },
      
      // Other Assets
      { 
        name_en: 'Other Assets', 
        name_de: 'Sonstige Vermögenswerte', 
        name_tr: 'Diğer Varlıklar', 
        type: 'income',
        category_type: 'other',
        icon: 'cube',
        requires_ticker: false,
        depreciation_enabled: false,
        is_default: true 
      }
    ];

    // Insert categories
    for (const category of categories) {
      await query(
        `INSERT INTO asset_categories (name_en, name_de, name_tr, type, category_type, icon, requires_ticker, depreciation_enabled, is_default) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          category.name_en, 
          category.name_de, 
          category.name_tr, 
          category.type,
          category.category_type,
          category.icon,
          category.requires_ticker,
          category.depreciation_enabled,
          category.is_default
        ]
      );
    }

    // Get count of inserted categories
    const countResult = await query('SELECT COUNT(*) as count FROM asset_categories');
    const count = countResult.rows[0].count;

    console.log(`✅ Successfully seeded ${count} asset categories`);
  } catch (error) {
    console.error('❌ Error seeding asset categories:', error);
    throw error;
  }
};

export default seedAssetCategories;

// Run if called directly
if (require.main === module) {
  seedAssetCategories()
    .then(() => {
      console.log('✅ Asset categories seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Asset categories seeding failed:', error);
      process.exit(1);
    });
}
