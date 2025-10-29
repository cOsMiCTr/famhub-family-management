import type { Knex } from 'knex';

const categories = [
  // Employment & Salary
  { name_en: 'Salary', name_de: 'Gehalt', name_tr: 'Maaş', is_default: true },
  { name_en: 'Hourly Wage', name_de: 'Stundenlohn', name_tr: 'Saatlik Ücret', is_default: false },
  { name_en: 'Commission', name_de: 'Provision', name_tr: 'Komisyon', is_default: false },
  { name_en: 'Overtime Pay', name_de: 'Überstunden', name_tr: 'Mesai Ücreti', is_default: false },
  { name_en: 'Performance Bonus', name_de: 'Leistungsbonus', name_tr: 'Performans Bonusu', is_default: false },
  { name_en: 'Annual Bonus', name_de: 'Jahresbonus', name_tr: 'Yıllık Bonus', is_default: false },
  { name_en: 'Sales Commission', name_de: 'Verkaufsprovision', name_tr: 'Satış Komisyonu', is_default: false },
  { name_en: 'Profit Sharing', name_de: 'Gewinnbeteiligung', name_tr: 'Kar Paylaşımı', is_default: false },
  { name_en: 'Stock Options', name_de: 'Aktienoptionen', name_tr: 'Hisse Senedi Opsiyonları', is_default: false },
  { name_en: 'Housing Allowance', name_de: 'Wohnungszuschuss', name_tr: 'Konut Yardımı', is_default: false },
  { name_en: 'Transportation Allowance', name_de: 'Fahrtkostenzuschuss', name_tr: 'Ulaşım Yardımı', is_default: false },
  { name_en: 'Meal Allowance', name_de: 'Essenszuschuss', name_tr: 'Yemek Yardımı', is_default: false },
  { name_en: 'Education Allowance', name_de: 'Bildungszuschuss', name_tr: 'Eğitim Yardımı', is_default: false },
  { name_en: 'Childcare Allowance', name_de: 'Kinderbetreuungszuschuss', name_tr: 'Çocuk Bakım Yardımı', is_default: false },

  // Self-Employment & Business
  { name_en: 'Freelance/Side Income', name_de: 'Freiberuflich/Nebeneinkommen', name_tr: 'Serbest/Yan Gelir', is_default: true },
  { name_en: 'Consulting Fees', name_de: 'Beratungshonorar', name_tr: 'Danışmanlık Ücreti', is_default: false },
  { name_en: 'Contract Work', name_de: 'Vertragsarbeit', name_tr: 'Sözleşmeli İş', is_default: false },
  { name_en: 'Project-Based Work', name_de: 'Projektarbeit', name_tr: 'Proje Bazlı İş', is_default: false },
  { name_en: 'Online Services', name_de: 'Online-Dienstleistungen', name_tr: 'Online Hizmetler', is_default: false },
  { name_en: 'Business Revenue', name_de: 'Geschäftsumsatz', name_tr: 'İş Geliri', is_default: false },
  { name_en: 'Service Revenue', name_de: 'Dienstleistungsumsatz', name_tr: 'Hizmet Geliri', is_default: false },
  { name_en: 'Product Sales', name_de: 'Produktverkäufe', name_tr: 'Ürün Satışları', is_default: false },
  { name_en: 'Subscription Revenue', name_de: 'Abonnementeinnahmen', name_tr: 'Abonelik Geliri', is_default: false },
  { name_en: 'Licensing Fees', name_de: 'Lizenzgebühren', name_tr: 'Lisans Ücretleri', is_default: false },
  { name_en: 'Digital Products', name_de: 'Digitale Produkte', name_tr: 'Dijital Ürünler', is_default: false },
  { name_en: 'Online Courses', name_de: 'Online-Kurse', name_tr: 'Online Kurslar', is_default: false },
  { name_en: 'Content Creation', name_de: 'Content-Erstellung', name_tr: 'İçerik Oluşturma', is_default: false },
  { name_en: 'Affiliate Marketing', name_de: 'Affiliate-Marketing', name_tr: 'Affiliate Pazarlama', is_default: false },
  { name_en: 'Ad Revenue', name_de: 'Werbeeinnahmen', name_tr: 'Reklam Geliri', is_default: false },
  { name_en: 'Retail Sales', name_de: 'Einzelhandelsverkäufe', name_tr: 'Perakende Satış', is_default: false },
  { name_en: 'Wholesale Sales', name_de: 'Großhandelsverkäufe', name_tr: 'Toptan Satış', is_default: false },
  { name_en: 'Restaurant Revenue', name_de: 'Restaurantumsatz', name_tr: 'Restoran Geliri', is_default: false },
  { name_en: 'Professional Services', name_de: 'Professionelle Dienstleistungen', name_tr: 'Profesyonel Hizmetler', is_default: false },
  { name_en: 'Trade Services', name_de: 'Handwerksdienstleistungen', name_tr: 'Zanaat Hizmetleri', is_default: false },

  // Investment & Financial
  { name_en: 'Investment Returns', name_de: 'Investitionsrenditen', name_tr: 'Yatırım Getirileri', is_default: true },
  { name_en: 'Stock Dividends', name_de: 'Aktiendividenden', name_tr: 'Hisse Senedi Temettüleri', is_default: false },
  { name_en: 'Bond Interest', name_de: 'Anleihenzinsen', name_tr: 'Tahvil Faizleri', is_default: false },
  { name_en: 'Mutual Fund Returns', name_de: 'Investmentfondsrenditen', name_tr: 'Yatırım Fonu Getirileri', is_default: false },
  { name_en: 'ETF Returns', name_de: 'ETF-Renditen', name_tr: 'ETF Getirileri', is_default: false },
  { name_en: 'REIT Dividends', name_de: 'REIT-Dividenden', name_tr: 'REIT Temettüleri', is_default: false },
  { name_en: 'Cryptocurrency', name_de: 'Kryptowährung', name_tr: 'Kripto Para', is_default: false },
  { name_en: 'Precious Metals', name_de: 'Edelmetalle', name_tr: 'Değerli Metaller', is_default: false },
  { name_en: 'Commodities', name_de: 'Rohstoffe', name_tr: 'Emtia', is_default: false },
  { name_en: 'Art & Collectibles', name_de: 'Kunst & Sammlerstücke', name_tr: 'Sanat ve Koleksiyon', is_default: false },
  { name_en: 'CD Interest', name_de: 'Festgeldzinsen', name_tr: 'Vadeli Mevduat Faizi', is_default: false },
  { name_en: 'Savings Account Interest', name_de: 'Sparkontozinsen', name_tr: 'Tasarruf Hesabı Faizi', is_default: false },
  { name_en: 'Money Market Returns', name_de: 'Geldmarktrenditen', name_tr: 'Para Piyasası Getirileri', is_default: false },
  { name_en: 'Annuity Payments', name_de: 'Rentenauszahlungen', name_tr: 'Anüite Ödemeleri', is_default: false },
  { name_en: 'Insurance Payouts', name_de: 'Versicherungsauszahlungen', name_tr: 'Sigorta Ödemeleri', is_default: false },
  { name_en: 'Day Trading Profits', name_de: 'Daytrading-Gewinne', name_tr: 'Günlük Alım Satım Karı', is_default: false },
  { name_en: 'Options Trading', name_de: 'Optionshandel', name_tr: 'Opsiyon İşlemleri', is_default: false },
  { name_en: 'Forex Trading', name_de: 'Devisenhandel', name_tr: 'Döviz İşlemleri', is_default: false },
  { name_en: 'Futures Trading', name_de: 'Termingeschäfte', name_tr: 'Vadeli İşlemler', is_default: false },
  { name_en: 'P2P Lending', name_de: 'P2P-Kredite', name_tr: 'P2P Krediler', is_default: false },
  { name_en: 'Crowdfunding Returns', name_de: 'Crowdfunding-Renditen', name_tr: 'Kitle Fonlama Getirileri', is_default: false },
  { name_en: 'Crypto Mining', name_de: 'Krypto-Mining', name_tr: 'Kripto Madenciliği', is_default: false },
  { name_en: 'Staking Rewards', name_de: 'Staking-Belohnungen', name_tr: 'Staking Ödülleri', is_default: false },
  { name_en: 'Yield Farming', name_de: 'Yield Farming', name_tr: 'Yield Farming', is_default: false },

  // Real Estate & Property
  { name_en: 'Rental Income', name_de: 'Mieteinnahmen', name_tr: 'Kira Geliri', is_default: true },
  { name_en: 'Residential Rental', name_de: 'Wohnungsmiete', name_tr: 'Konut Kira Geliri', is_default: false },
  { name_en: 'Commercial Rental', name_de: 'Gewerbemiete', name_tr: 'Ticari Kira Geliri', is_default: false },
  { name_en: 'Vacation Rental', name_de: 'Ferienvermietung', name_tr: 'Tatil Kira Geliri', is_default: false },
  { name_en: 'Room Rental', name_de: 'Zimmervermietung', name_tr: 'Oda Kira Geliri', is_default: false },
  { name_en: 'Storage Rental', name_de: 'Lagervermietung', name_tr: 'Depo Kira Geliri', is_default: false },
  { name_en: 'Property Sale', name_de: 'Immobilienverkauf', name_tr: 'Gayrimenkul Satışı', is_default: false },
  { name_en: 'Land Sale', name_de: 'Grundstücksverkauf', name_tr: 'Arsa Satışı', is_default: false },
  { name_en: 'Property Development', name_de: 'Immobilienentwicklung', name_tr: 'Gayrimenkul Geliştirme', is_default: false },
  { name_en: 'Property Management', name_de: 'Immobilienverwaltung', name_tr: 'Gayrimenkul Yönetimi', is_default: false },
  { name_en: 'Real Estate Commission', name_de: 'Immobilienprovision', name_tr: 'Emlak Komisyonu', is_default: false },
  { name_en: 'Property Appraisal', name_de: 'Immobilienbewertung', name_tr: 'Gayrimenkul Değerleme', is_default: false },
  { name_en: 'Utility Rebates', name_de: 'Versorgungsrabatte', name_tr: 'Fatura İndirimleri', is_default: false },
  { name_en: 'Property Tax Refund', name_de: 'Grundsteuererstattung', name_tr: 'Emlak Vergisi İadesi', is_default: false },
  { name_en: 'Home Improvement Grants', name_de: 'Modernisierungszuschüsse', name_tr: 'Ev İyileştirme Hibeleri', is_default: false },
  { name_en: 'Energy Credits', name_de: 'Energiecredits', name_tr: 'Enerji Kredileri', is_default: false },

  // Retirement & Benefits
  { name_en: 'Pension', name_de: 'Rente', name_tr: 'Emekli Maaşı', is_default: true },
  { name_en: 'Social Benefits', name_de: 'Sozialleistungen', name_tr: 'Sosyal Yardımlar', is_default: true },
  { name_en: 'Social Security', name_de: 'Sozialversicherung', name_tr: 'Sosyal Güvenlik', is_default: false },
  { name_en: 'Unemployment Benefits', name_de: 'Arbeitslosengeld', name_tr: 'İşsizlik Maaşı', is_default: false },
  { name_en: 'Disability Benefits', name_de: 'Behindertenrente', name_tr: 'Engellilik Maaşı', is_default: false },
  { name_en: 'Child Benefits', name_de: 'Kindergeld', name_tr: 'Çocuk Parası', is_default: false },
  { name_en: 'Housing Benefits', name_de: 'Wohngeld', name_tr: 'Konut Yardımı', is_default: false },
  { name_en: 'Private Pension', name_de: 'Private Rente', name_tr: 'Özel Emeklilik', is_default: false },
  { name_en: '401k Distributions', name_de: '401k-Auszahlungen', name_tr: '401k Ödemeleri', is_default: false },
  { name_en: 'IRA Distributions', name_de: 'IRA-Auszahlungen', name_tr: 'IRA Ödemeleri', is_default: false },
  { name_en: 'Roth IRA', name_de: 'Roth IRA', name_tr: 'Roth IRA', is_default: false },
  { name_en: 'Pension Plan', name_de: 'Rentenplan', name_tr: 'Emeklilik Planı', is_default: false },
  { name_en: 'Health Insurance Rebate', name_de: 'Krankenversicherungsrabatt', name_tr: 'Sağlık Sigortası İadesi', is_default: false },
  { name_en: 'Life Insurance Payout', name_de: 'Lebensversicherungsauszahlung', name_tr: 'Hayat Sigortası Ödemesi', is_default: false },
  { name_en: 'Disability Insurance', name_de: 'Berufsunfähigkeitsversicherung', name_tr: 'Maluliyet Sigortası', is_default: false },
  { name_en: 'Long-term Care Benefits', name_de: 'Pflegeversicherungsleistungen', name_tr: 'Uzun Vadeli Bakım Yardımları', is_default: false },
  { name_en: 'Workers Compensation', name_de: 'Arbeitsunfallversicherung', name_tr: 'İş Kazası Sigortası', is_default: false },

  // Gifts & Windfalls
  { name_en: 'Gift/Inheritance', name_de: 'Geschenk/Erbschaft', name_tr: 'Hediye/Miras', is_default: true },
  { name_en: 'Cash Gifts', name_de: 'Bargeldgeschenke', name_tr: 'Nakit Hediye', is_default: false },
  { name_en: 'Wedding Gifts', name_de: 'Hochzeitsgeschenke', name_tr: 'Düğün Hediyeleri', is_default: false },
  { name_en: 'Birthday Gifts', name_de: 'Geburtstagsgeschenke', name_tr: 'Doğum Günü Hediyeleri', is_default: false },
  { name_en: 'Holiday Gifts', name_de: 'Feiertagsgeschenke', name_tr: 'Bayram Hediyeleri', is_default: false },
  { name_en: 'Inheritance', name_de: 'Erbschaft', name_tr: 'Miras', is_default: false },
  { name_en: 'Legal Settlement', name_de: 'Rechtsvergleich', name_tr: 'Hukuki Anlaşma', is_default: false },
  { name_en: 'Insurance Claim', name_de: 'Versicherungsanspruch', name_tr: 'Sigorta Talebi', is_default: false },
  { name_en: 'Tax Refund', name_de: 'Steuererstattung', name_tr: 'Vergi İadesi', is_default: false },
  { name_en: 'Lottery Winnings', name_de: 'Lotteriegewinne', name_tr: 'Piyango Kazancı', is_default: false },
  { name_en: 'Gambling Winnings', name_de: 'Glücksspielgewinne', name_tr: 'Kumar Kazancı', is_default: false },

  // Education & Training
  { name_en: 'Scholarship', name_de: 'Stipendium', name_tr: 'Burs', is_default: false },
  { name_en: 'Education Grants', name_de: 'Bildungszuschüsse', name_tr: 'Eğitim Hibeleri', is_default: false },
  { name_en: 'Student Loans', name_de: 'Studentendarlehen', name_tr: 'Öğrenci Kredileri', is_default: false },
  { name_en: 'Research Funding', name_de: 'Forschungsförderung', name_tr: 'Araştırma Fonu', is_default: false },
  { name_en: 'Teaching Income', name_de: 'Lehreinkommen', name_tr: 'Öğretim Geliri', is_default: false },
  { name_en: 'Tutoring', name_de: 'Nachhilfe', name_tr: 'Özel Ders', is_default: false },
  { name_en: 'Training Fees', name_de: 'Schulungsgebühren', name_tr: 'Eğitim Ücretleri', is_default: false },
  { name_en: 'Conference Speaking', name_de: 'Konferenzvorträge', name_tr: 'Konferans Konuşmaları', is_default: false },

  // International & Remote
  { name_en: 'Foreign Income', name_de: 'Auslandseinkommen', name_tr: 'Yurtdışı Gelir', is_default: false },
  { name_en: 'Remote Work', name_de: 'Remote-Arbeit', name_tr: 'Uzaktan Çalışma', is_default: false },
  { name_en: 'Expatriate Allowance', name_de: 'Expatriatenzuschuss', name_tr: 'Yurtdışı Görev Zammı', is_default: false },
  { name_en: 'Currency Exchange Gains', name_de: 'Währungsgewinne', name_tr: 'Döviz Kuru Kazançları', is_default: false },
  { name_en: 'International Transfers', name_de: 'Internationale Überweisungen', name_tr: 'Uluslararası Transferler', is_default: false },
  { name_en: 'Offshore Income', name_de: 'Offshore-Einkommen', name_tr: 'Offshore Gelir', is_default: false },
  { name_en: 'Diplomatic Income', name_de: 'Diplomateneinkommen', name_tr: 'Diplomatik Gelir', is_default: false },

  // Other
  { name_en: 'Other', name_de: 'Sonstige', name_tr: 'Diğer', is_default: true }
];

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Starting income categories seeding...');

  // Clear existing income categories (idempotent - check before clearing)
  const existingCount = await knex('income_categories').count('* as count').first();
  
  if (parseInt(existingCount?.count as string || '0') > 0) {
    await knex('income_categories').del();
  }

  // Insert categories (idempotent - check before insert)
  for (const category of categories) {
    const existing = await knex('income_categories')
      .where('name_en', category.name_en)
      .first();
    
    if (!existing) {
      await knex('income_categories').insert({
        name_en: category.name_en,
        name_de: category.name_de,
        name_tr: category.name_tr,
        is_default: category.is_default
      });
    }
  }

  const count = await knex('income_categories').count('* as count').first();
  console.log(`✅ Successfully seeded ${count?.count || 0} income categories`);
}

