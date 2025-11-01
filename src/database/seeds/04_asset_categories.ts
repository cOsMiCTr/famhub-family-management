import type { Knex } from 'knex';

const categories = [
  // Real Estate
  { 
    name_en: 'Real Estate', 
    name_de: 'Immobilien', 
    name_tr: 'Gayrimenkul', 
    type: 'asset',
    category_type: 'real_estate',
    icon: 'home-modern',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // Stocks
  { 
    name_en: 'Stocks', 
    name_de: 'Aktien', 
    name_tr: 'Hisse Senedi', 
    type: 'asset',
    category_type: 'stocks',
    icon: 'chart-bar',
    requires_ticker: true,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // ETFs/Mutual Funds
  { 
    name_en: 'ETFs & Mutual Funds', 
    name_de: 'ETFs & Investmentfonds', 
    name_tr: 'ETF ve Yatırım Fonları', 
    type: 'asset',
    category_type: 'etf',
    icon: 'chart-bar-square',
    requires_ticker: true,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // Bonds
  { 
    name_en: 'Bonds', 
    name_de: 'Anleihen', 
    name_tr: 'Tahvil', 
    type: 'asset',
    category_type: 'bonds',
    icon: 'document-text',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // Cryptocurrency
  { 
    name_en: 'Cryptocurrency', 
    name_de: 'Kryptowährung', 
    name_tr: 'Kripto Para', 
    type: 'asset',
    category_type: 'crypto',
    icon: 'currency-bitcoin',
    requires_ticker: true,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['cryptocurrency']
  },
  
  // Gold & Precious Metals
  { 
    name_en: 'Gold & Precious Metals', 
    name_de: 'Gold & Edelmetalle', 
    name_tr: 'Altın ve Değerli Metaller', 
    type: 'asset',
    category_type: 'gold',
    icon: 'sparkles',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['precious_metal', 'fiat']
  },
  
  // Vehicles
  { 
    name_en: 'Vehicles', 
    name_de: 'Fahrzeuge', 
    name_tr: 'Araçlar', 
    type: 'asset',
    category_type: 'vehicles',
    icon: 'truck',
    requires_ticker: false,
    depreciation_enabled: true,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // Collectibles & Art
  { 
    name_en: 'Collectibles & Art', 
    name_de: 'Sammlerstücke & Kunst', 
    name_tr: 'Koleksiyon ve Sanat', 
    type: 'asset',
    category_type: 'collectibles',
    icon: 'paint-brush',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // Bank Accounts
  { 
    name_en: 'Bank Accounts', 
    name_de: 'Bankkonten', 
    name_tr: 'Banka Hesapları', 
    type: 'asset',
    category_type: 'cash',
    icon: 'banknotes',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  },
  
  // Other Assets
  { 
    name_en: 'Other Assets', 
    name_de: 'Sonstige Vermögenswerte', 
    name_tr: 'Diğer Varlıklar', 
    type: 'asset',
    category_type: 'other',
    icon: 'cube',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: true,
    allowed_currency_types: ['fiat']
  }
];

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Starting asset categories seeding...');

  // Default field requirements for all asset categories
  const defaultFieldRequirements = {
    name: { required: true },
    category_id: { required: true },
    value: { required: false },
    currency: { required: false },
    location: { required: false },
    purchase_date: { required: false },
    purchase_price: { required: false },
    description: { required: false },
    ownership_type: { required: false },
    ticker: { required: false, conditional: { field: 'category_type', value: 'stocks' } }
  };

  // Clear existing asset categories (idempotent - check before clearing)
  const existingCount = await knex('asset_categories').count('* as count').first();
  
  if (parseInt(existingCount?.count as string || '0') > 0) {
    await knex('asset_categories').del();
  }

  // Insert categories (idempotent - check before insert)
  for (const category of categories) {
    const existing = await knex('asset_categories')
      .where('name_en', category.name_en)
      .first();
    
    if (!existing) {
      // Customize field requirements for stocks (ticker required)
      const fieldReqs = { ...defaultFieldRequirements };
      if (category.category_type === 'stocks' || category.requires_ticker) {
        fieldReqs.ticker = { required: true, conditional: { field: 'category_type', value: 'stocks' } };
      }

      await knex('asset_categories').insert({
        name_en: category.name_en,
        name_de: category.name_de,
        name_tr: category.name_tr,
        type: category.type,
        category_type: category.category_type,
        icon: category.icon,
        requires_ticker: category.requires_ticker,
        depreciation_enabled: category.depreciation_enabled,
        is_default: category.is_default,
        allowed_currency_types: category.allowed_currency_types,
        field_requirements: JSON.stringify(fieldReqs)
      });
    }
  }

  const count = await knex('asset_categories').count('* as count').first();
  console.log(`✅ Successfully seeded ${count?.count || 0} asset categories`);
}

