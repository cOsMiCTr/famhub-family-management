import { Knex } from 'knex';

interface CurrencyData {
  code: string;
  name: string;
  name_de: string;
  name_tr: string;
  symbol: string;
  currency_type: 'fiat' | 'cryptocurrency' | 'precious_metal';
  order: number;
}

const currencies: CurrencyData[] = [
  // Fiat Currencies
  { code: 'USD', name: 'US Dollar', name_de: 'US-Dollar', name_tr: 'Amerikan Doları', symbol: '$', currency_type: 'fiat', order: 1 },
  { code: 'EUR', name: 'Euro', name_de: 'Euro', name_tr: 'Euro', symbol: '€', currency_type: 'fiat', order: 2 },
  { code: 'GBP', name: 'British Pound', name_de: 'Britisches Pfund', name_tr: 'İngiliz Sterlini', symbol: '£', currency_type: 'fiat', order: 3 },
  { code: 'TRY', name: 'Turkish Lira', name_de: 'Türkische Lira', name_tr: 'Türk Lirası', symbol: '₺', currency_type: 'fiat', order: 4 },
  { code: 'JPY', name: 'Japanese Yen', name_de: 'Japanischer Yen', name_tr: 'Japon Yeni', symbol: '¥', currency_type: 'fiat', order: 5 },
  { code: 'CNY', name: 'Chinese Yuan', name_de: 'Chinesischer Yuan', name_tr: 'Çin Yeni', symbol: '¥', currency_type: 'fiat', order: 6 },
  { code: 'CAD', name: 'Canadian Dollar', name_de: 'Kanadischer Dollar', name_tr: 'Kanada Doları', symbol: 'C$', currency_type: 'fiat', order: 7 },
  { code: 'AUD', name: 'Australian Dollar', name_de: 'Australischer Dollar', name_tr: 'Avustralya Doları', symbol: 'A$', currency_type: 'fiat', order: 8 },
  { code: 'CHF', name: 'Swiss Franc', name_de: 'Schweizer Franken', name_tr: 'İsviçre Frangı', symbol: 'Fr', currency_type: 'fiat', order: 9 },
  { code: 'SEK', name: 'Swedish Krona', name_de: 'Schwedische Krone', name_tr: 'İsveç Kronu', symbol: 'kr', currency_type: 'fiat', order: 10 },
  { code: 'NOK', name: 'Norwegian Krone', name_de: 'Norwegische Krone', name_tr: 'Norveç Kronu', symbol: 'kr', currency_type: 'fiat', order: 11 },
  { code: 'DKK', name: 'Danish Krone', name_de: 'Dänische Krone', name_tr: 'Danimarka Kronu', symbol: 'kr', currency_type: 'fiat', order: 12 },
  { code: 'PLN', name: 'Polish Zloty', name_de: 'Polnischer Zloty', name_tr: 'Polonya Zlotu', symbol: 'zł', currency_type: 'fiat', order: 13 },

  // Cryptocurrencies
  { code: 'BTC', name: 'Bitcoin', name_de: 'Bitcoin', name_tr: 'Bitcoin', symbol: '₿', currency_type: 'cryptocurrency', order: 20 },
  { code: 'ETH', name: 'Ethereum', name_de: 'Ethereum', name_tr: 'Ethereum', symbol: 'Ξ', currency_type: 'cryptocurrency', order: 21 },
  { code: 'BNB', name: 'Binance Coin', name_de: 'Binance Coin', name_tr: 'Binance Coin', symbol: 'BNB', currency_type: 'cryptocurrency', order: 22 },
  { code: 'XRP', name: 'Ripple', name_de: 'Ripple', name_tr: 'Ripple', symbol: 'XRP', currency_type: 'cryptocurrency', order: 23 },
  { code: 'ADA', name: 'Cardano', name_de: 'Cardano', name_tr: 'Cardano', symbol: 'ADA', currency_type: 'cryptocurrency', order: 24 },
  { code: 'SOL', name: 'Solana', name_de: 'Solana', name_tr: 'Solana', symbol: 'SOL', currency_type: 'cryptocurrency', order: 25 },
  { code: 'DOT', name: 'Polkadot', name_de: 'Polkadot', name_tr: 'Polkadot', symbol: 'DOT', currency_type: 'cryptocurrency', order: 26 },
  { code: 'DOGE', name: 'Dogecoin', name_de: 'Dogecoin', name_tr: 'Dogecoin', symbol: 'DOGE', currency_type: 'cryptocurrency', order: 27 },
  { code: 'LTC', name: 'Litecoin', name_de: 'Litecoin', name_tr: 'Litecoin', symbol: 'Ł', currency_type: 'cryptocurrency', order: 28 },
  { code: 'USDT', name: 'Tether', name_de: 'Tether', name_tr: 'Tether', symbol: 'USDT', currency_type: 'cryptocurrency', order: 29 },

  // Precious Metals
  { code: 'GOLD', name: 'Gold', name_de: 'Gold', name_tr: 'Altın', symbol: 'Au', currency_type: 'precious_metal', order: 50 },
  { code: 'SILVER', name: 'Silver', name_de: 'Silber', name_tr: 'Gümüş', symbol: 'Ag', currency_type: 'precious_metal', order: 51 },
  { code: 'PLATINUM', name: 'Platinum', name_de: 'Platin', name_tr: 'Platin', symbol: 'Pt', currency_type: 'precious_metal', order: 52 },
  { code: 'PALLADIUM', name: 'Palladium', name_de: 'Palladium', name_tr: 'Paladyum', symbol: 'Pd', currency_type: 'precious_metal', order: 53 }
];

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding currencies...');
  
  // Check if currencies table exists
  const tableExists = await knex.schema.hasTable('currencies');
  
  if (!tableExists) {
    console.log('⚠️ Currencies table does not exist yet. Please run migrations first.');
    return;
  }

  // Check if currencies already exist
  const existingCount = await knex('currencies').count('* as count').first();
  
  if (parseInt(existingCount?.count as string || '0') > 0) {
    console.log('✅ Currencies already seeded');
    return;
  }

  // Insert currencies (idempotent: check before insert)
  for (const currency of currencies) {
    const existing = await knex('currencies').where('code', currency.code).first();
    if (!existing) {
      await knex('currencies').insert({
        code: currency.code,
        name: currency.name,
        name_de: currency.name_de,
        name_tr: currency.name_tr,
        symbol: currency.symbol,
        currency_type: currency.currency_type,
        is_active: true,
        display_order: currency.order
      });
    }
  }

  console.log(`✅ Seeded ${currencies.length} currencies`);
}

