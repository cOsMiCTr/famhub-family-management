import { query } from '../config/database';

const seedTranslations = async () => {
  try {
    console.log('🌱 Starting translation seeding...');

    // Clear existing translations
    await query('DELETE FROM translations');

    // Define translations directly
    const translations = [
      // Common
      { key: 'common.loading', category: 'common', en: 'Loading...', de: 'Lädt...', tr: 'Yükleniyor...' },
      { key: 'common.save', category: 'common', en: 'Save', de: 'Speichern', tr: 'Kaydet' },
      { key: 'common.cancel', category: 'common', en: 'Cancel', de: 'Abbrechen', tr: 'İptal' },
      { key: 'common.delete', category: 'common', en: 'Delete', de: 'Löschen', tr: 'Sil' },
      { key: 'common.edit', category: 'common', en: 'Edit', de: 'Bearbeiten', tr: 'Düzenle' },
      { key: 'common.add', category: 'common', en: 'Add', de: 'Hinzufügen', tr: 'Ekle' },
      { key: 'common.search', category: 'common', en: 'Search', de: 'Suchen', tr: 'Ara' },
      { key: 'common.filter', category: 'common', en: 'Filter', de: 'Filter', tr: 'Filtrele' },
      { key: 'common.close', category: 'common', en: 'Close', de: 'Schließen', tr: 'Kapat' },
      { key: 'common.confirm', category: 'common', en: 'Confirm', de: 'Bestätigen', tr: 'Onayla' },
      { key: 'common.yes', category: 'common', en: 'Yes', de: 'Ja', tr: 'Evet' },
      { key: 'common.no', category: 'common', en: 'No', de: 'Nein', tr: 'Hayır' },
      { key: 'common.error', category: 'common', en: 'Error', de: 'Fehler', tr: 'Hata' },
      { key: 'common.success', category: 'common', en: 'Success', de: 'Erfolg', tr: 'Başarılı' },
      { key: 'common.warning', category: 'common', en: 'Warning', de: 'Warnung', tr: 'Uyarı' },
      { key: 'common.info', category: 'common', en: 'Info', de: 'Info', tr: 'Bilgi' },

      // Auth
      { key: 'auth.login', category: 'auth', en: 'Login', de: 'Anmelden', tr: 'Giriş Yap' },
      { key: 'auth.logout', category: 'auth', en: 'Logout', de: 'Abmelden', tr: 'Çıkış Yap' },
      { key: 'auth.email', category: 'auth', en: 'Email', de: 'E-Mail', tr: 'E-posta' },
      { key: 'auth.password', category: 'auth', en: 'Password', de: 'Passwort', tr: 'Şifre' },
      { key: 'auth.loginButton', category: 'auth', en: 'Sign In', de: 'Anmelden', tr: 'Giriş Yap' },
      { key: 'auth.invalidCredentials', category: 'auth', en: 'Invalid email or password', de: 'Ungültige E-Mail oder Passwort', tr: 'Geçersiz e-posta veya şifre' },
      { key: 'auth.loginSuccess', category: 'auth', en: 'Login successful', de: 'Anmeldung erfolgreich', tr: 'Giriş başarılı' },
      { key: 'auth.register', category: 'auth', en: 'Register', de: 'Registrieren', tr: 'Kayıt Ol' },
      { key: 'auth.completeRegistration', category: 'auth', en: 'Complete Registration', de: 'Registrierung abschließen', tr: 'Kayıt İşlemini Tamamla' },
      { key: 'auth.invitationToken', category: 'auth', en: 'Invitation Token', de: 'Einladungstoken', tr: 'Davet Kodu' },
      { key: 'auth.createAccount', category: 'auth', en: 'Create Account', de: 'Konto erstellen', tr: 'Hesap Oluştur' },
      { key: 'auth.registrationSuccess', category: 'auth', en: 'Registration completed successfully', de: 'Registrierung erfolgreich abgeschlossen', tr: 'Kayıt başarıyla tamamlandı' },

      // Navigation
      { key: 'navigation.dashboard', category: 'navigation', en: 'Dashboard', de: 'Dashboard', tr: 'Kontrol Paneli' },
      { key: 'navigation.assets', category: 'navigation', en: 'Assets', de: 'Vermögen', tr: 'Varlıklar' },
      { key: 'navigation.contracts', category: 'navigation', en: 'Contracts', de: 'Verträge', tr: 'Sözleşmeler' },
      { key: 'navigation.settings', category: 'navigation', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
      { key: 'navigation.admin', category: 'navigation', en: 'Admin', de: 'Admin', tr: 'Yönetici' },
      { key: 'navigation.households', category: 'navigation', en: 'Households', de: 'Haushalte', tr: 'Hane' },
      { key: 'navigation.users', category: 'navigation', en: 'Users', de: 'Benutzer', tr: 'Kullanıcılar' },

      // Dashboard
      { key: 'dashboard.title', category: 'dashboard', en: 'Dashboard', de: 'Dashboard', tr: 'Kontrol Paneli' },
      { key: 'dashboard.totalAssets', category: 'dashboard', en: 'Total Assets', de: 'Gesamtvermögen', tr: 'Toplam Varlık' },
      { key: 'dashboard.recentIncome', category: 'dashboard', en: 'Recent Income', de: 'Letzte Einkommen', tr: 'Son Gelir' },
      { key: 'dashboard.upcomingRenewals', category: 'dashboard', en: 'Upcoming Renewals', de: 'Bevorstehende Verlängerungen', tr: 'Yaklaşan Yenilemeler' },
      { key: 'dashboard.quickStats', category: 'dashboard', en: 'Quick Stats', de: 'Schnelle Statistiken', tr: 'Hızlı İstatistikler' },
      { key: 'dashboard.incomeEntries', category: 'dashboard', en: 'Income Entries', de: 'Einkommenseinträge', tr: 'Gelir Girişleri' },
      { key: 'dashboard.expenseEntries', category: 'dashboard', en: 'Expense Entries', de: 'Ausgabeneinträge', tr: 'Gider Girişleri' },

      // Admin
      { key: 'admin.title', category: 'admin', en: 'Admin Panel', de: 'Admin-Panel', tr: 'Yönetici Paneli' },
      { key: 'admin.userManagement', category: 'admin', en: 'User Management', de: 'Benutzerverwaltung', tr: 'Kullanıcı Yönetimi' },
      { key: 'admin.createUser', category: 'admin', en: 'Create User', de: 'Benutzer erstellen', tr: 'Kullanıcı Oluştur' },
      { key: 'admin.editUser', category: 'admin', en: 'Edit User', de: 'Benutzer bearbeiten', tr: 'Kullanıcı Düzenle' },
      { key: 'admin.deleteUser', category: 'admin', en: 'Delete User', de: 'Benutzer löschen', tr: 'Kullanıcı Sil' },
      { key: 'admin.resetPassword', category: 'admin', en: 'Reset Password', de: 'Passwort zurücksetzen', tr: 'Şifre Sıfırla' },
      { key: 'admin.unlockAccount', category: 'admin', en: 'Unlock Account', de: 'Konto entsperren', tr: 'Hesabı Aç' },
      { key: 'admin.securityDashboard', category: 'admin', en: 'Security Dashboard', de: 'Sicherheits-Dashboard', tr: 'Güvenlik Paneli' },
      { key: 'admin.translations', category: 'admin', en: 'Translations', de: 'Übersetzungen', tr: 'Çeviriler' },
      { key: 'admin.allHouseholds', category: 'admin', en: 'All Households', de: 'Alle Haushalte', tr: 'Tüm Haneler' },
      { key: 'admin.allUsers', category: 'admin', en: 'All Users', de: 'Alle Benutzer', tr: 'Tüm Kullanıcılar' },
      { key: 'admin.assignedHousehold', category: 'admin', en: 'Assigned Household', de: 'Zugewiesener Haushalt', tr: 'Atanmış Hane' },
      { key: 'admin.canEdit', category: 'admin', en: 'Can Edit', de: 'Kann bearbeiten', tr: 'Düzenleyebilir' },
      { key: 'admin.canViewContracts', category: 'admin', en: 'Can View Contracts', de: 'Kann Verträge anzeigen', tr: 'Sözleşmeleri Görüntüleyebilir' },
      { key: 'admin.canViewIncome', category: 'admin', en: 'Can View Income', de: 'Kann Einkommen anzeigen', tr: 'Geliri Görüntüleyebilir' },
      { key: 'admin.createHousehold', category: 'admin', en: 'Create Household', de: 'Haushalt erstellen', tr: 'Hane Oluştur' },
      { key: 'admin.updateHousehold', category: 'admin', en: 'Update Household', de: 'Haushalt aktualisieren', tr: 'Hane Güncelle' },
      { key: 'admin.deleteHousehold', category: 'admin', en: 'Delete Household', de: 'Haushalt löschen', tr: 'Hane Sil' },

      // Settings
      { key: 'settings.title', category: 'settings', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
      { key: 'settings.profile', category: 'settings', en: 'Profile', de: 'Profil', tr: 'Profil' },
      { key: 'settings.preferences', category: 'settings', en: 'Preferences', de: 'Einstellungen', tr: 'Tercihler' },
      { key: 'settings.language', category: 'settings', en: 'Language', de: 'Sprache', tr: 'Dil' },
      { key: 'settings.currency', category: 'settings', en: 'Currency', de: 'Währung', tr: 'Para Birimi' },
      { key: 'settings.theme', category: 'settings', en: 'Theme', de: 'Design', tr: 'Tema' },
      { key: 'settings.darkMode', category: 'settings', en: 'Dark Mode', de: 'Dunkler Modus', tr: 'Karanlık Mod' },
      { key: 'settings.lightMode', category: 'settings', en: 'Light Mode', de: 'Heller Modus', tr: 'Açık Mod' },

      // Assets
      { key: 'assets.title', category: 'assets', en: 'Assets', de: 'Vermögen', tr: 'Varlıklar' },
      { key: 'assets.addAsset', category: 'assets', en: 'Add Asset', de: 'Vermögen hinzufügen', tr: 'Varlık Ekle' },
      { key: 'assets.editAsset', category: 'assets', en: 'Edit Asset', de: 'Vermögen bearbeiten', tr: 'Varlık Düzenle' },
      { key: 'assets.deleteAsset', category: 'assets', en: 'Delete Asset', de: 'Vermögen löschen', tr: 'Varlık Sil' },
      { key: 'assets.assetName', category: 'assets', en: 'Asset Name', de: 'Vermögensname', tr: 'Varlık Adı' },
      { key: 'assets.assetValue', category: 'assets', en: 'Asset Value', de: 'Vermögenswert', tr: 'Varlık Değeri' },
      { key: 'assets.assetType', category: 'assets', en: 'Asset Type', de: 'Vermögenstyp', tr: 'Varlık Türü' },

      // Contracts
      { key: 'contracts.title', category: 'contracts', en: 'Contracts', de: 'Verträge', tr: 'Sözleşmeler' },
      { key: 'contracts.addContract', category: 'contracts', en: 'Add Contract', de: 'Vertrag hinzufügen', tr: 'Sözleşme Ekle' },
      { key: 'contracts.editContract', category: 'contracts', en: 'Edit Contract', de: 'Vertrag bearbeiten', tr: 'Sözleşme Düzenle' },
      { key: 'contracts.deleteContract', category: 'contracts', en: 'Delete Contract', de: 'Vertrag löschen', tr: 'Sözleşme Sil' },
      { key: 'contracts.contractName', category: 'contracts', en: 'Contract Name', de: 'Vertragsname', tr: 'Sözleşme Adı' },
      { key: 'contracts.contractValue', category: 'contracts', en: 'Contract Value', de: 'Vertragswert', tr: 'Sözleşme Değeri' },
      { key: 'contracts.startDate', category: 'contracts', en: 'Start Date', de: 'Startdatum', tr: 'Başlangıç Tarihi' },
      { key: 'contracts.endDate', category: 'contracts', en: 'End Date', de: 'Enddatum', tr: 'Bitiş Tarihi' },

      // Households
      { key: 'households.title', category: 'households', en: 'Households', de: 'Haushalte', tr: 'Hane' },
      { key: 'households.addHousehold', category: 'households', en: 'Add Household', de: 'Haushalt hinzufügen', tr: 'Hane Ekle' },
      { key: 'households.editHousehold', category: 'households', en: 'Edit Household', de: 'Haushalt bearbeiten', tr: 'Hane Düzenle' },
      { key: 'households.deleteHousehold', category: 'households', en: 'Delete Household', de: 'Haushalt löschen', tr: 'Hane Sil' },
      { key: 'households.householdName', category: 'households', en: 'Household Name', de: 'Haushaltsname', tr: 'Hane Adı' },
      { key: 'households.memberCount', category: 'households', en: 'Member Count', de: 'Mitgliederanzahl', tr: 'Üye Sayısı' },

      // Notifications
      { key: 'notifications.title', category: 'notifications', en: 'Notifications', de: 'Benachrichtigungen', tr: 'Bildirimler' },
      { key: 'notifications.markAsRead', category: 'notifications', en: 'Mark as Read', de: 'Als gelesen markieren', tr: 'Okundu Olarak İşaretle' },
      { key: 'notifications.markAllAsRead', category: 'notifications', en: 'Mark All as Read', de: 'Alle als gelesen markieren', tr: 'Tümünü Okundu Olarak İşaretle' },
      { key: 'notifications.noNotifications', category: 'notifications', en: 'No notifications', de: 'Keine Benachrichtigungen', tr: 'Bildirim yok' },
      { key: 'notifications.viewAll', category: 'notifications', en: 'View All', de: 'Alle anzeigen', tr: 'Tümünü Görüntüle' },

      // Translation Management
      { key: 'translations.title', category: 'translations', en: 'Translation Management', de: 'Übersetzungsverwaltung', tr: 'Çeviri Yönetimi' },
      { key: 'translations.manageTranslations', category: 'translations', en: 'Manage translations for English, German, and Turkish', de: 'Übersetzungen für Englisch, Deutsch und Türkisch verwalten', tr: 'İngilizce, Almanca ve Türkçe çevirileri yönetin' },
      { key: 'translations.category', category: 'translations', en: 'Category', de: 'Kategorie', tr: 'Kategori' },
      { key: 'translations.key', category: 'translations', en: 'Key', de: 'Schlüssel', tr: 'Anahtar' },
      { key: 'translations.english', category: 'translations', en: 'English (Default)', de: 'Englisch (Standard)', tr: 'İngilizce (Varsayılan)' },
      { key: 'translations.german', category: 'translations', en: 'German', de: 'Deutsch', tr: 'Almanca' },
      { key: 'translations.turkish', category: 'translations', en: 'Turkish', de: 'Türkisch', tr: 'Türkçe' },
      { key: 'translations.saveAllChanges', category: 'translations', en: 'Save All Changes', de: 'Alle Änderungen speichern', tr: 'Tüm Değişiklikleri Kaydet' },
      { key: 'translations.resetChanges', category: 'translations', en: 'Reset Changes', de: 'Änderungen zurücksetzen', tr: 'Değişiklikleri Sıfırla' },
      { key: 'translations.searchTranslations', category: 'translations', en: 'Search translations...', de: 'Übersetzungen suchen...', tr: 'Çevirileri ara...' },
      { key: 'translations.allCategories', category: 'translations', en: 'All Categories', de: 'Alle Kategorien', tr: 'Tüm Kategoriler' },
      { key: 'translations.translationsFound', category: 'translations', en: 'translations found', de: 'Übersetzungen gefunden', tr: 'çeviri bulundu' },
      { key: 'translations.noTranslationsFound', category: 'translations', en: 'No translations found', de: 'Keine Übersetzungen gefunden', tr: 'Çeviri bulunamadı' },
      { key: 'translations.instructions', category: 'translations', en: 'Instructions', de: 'Anweisungen', tr: 'Talimatlar' },
      { key: 'translations.instruction1', category: 'translations', en: 'English translations are shown as reference and cannot be edited', de: 'Englische Übersetzungen werden als Referenz angezeigt und können nicht bearbeitet werden', tr: 'İngilizce çeviriler referans olarak gösterilir ve düzenlenemez' },
      { key: 'translations.instruction2', category: 'translations', en: 'German and Turkish translations can be edited directly in the table', de: 'Deutsche und türkische Übersetzungen können direkt in der Tabelle bearbeitet werden', tr: 'Almanca ve Türkçe çeviriler tabloda doğrudan düzenlenebilir' },
      { key: 'translations.instruction3', category: 'translations', en: 'Changed translations are highlighted in yellow', de: 'Geänderte Übersetzungen werden gelb hervorgehoben', tr: 'Değiştirilen çeviriler sarı renkte vurgulanır' },
      { key: 'translations.instruction4', category: 'translations', en: 'Click "Save All Changes" to update all modified translations', de: 'Klicken Sie auf "Alle Änderungen speichern", um alle geänderten Übersetzungen zu aktualisieren', tr: 'Değiştirilen tüm çevirileri güncellemek için "Tüm Değişiklikleri Kaydet"e tıklayın' },
      { key: 'translations.instruction5', category: 'translations', en: 'Changes are applied immediately and will be visible to all users', de: 'Änderungen werden sofort angewendet und sind für alle Benutzer sichtbar', tr: 'Değişiklikler hemen uygulanır ve tüm kullanıcılar tarafından görülebilir' }
    ];

    // Insert translations
    for (const translation of translations) {
      await query(
        `INSERT INTO translations (translation_key, category, en, de, tr) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (translation_key) DO UPDATE SET 
         category = EXCLUDED.category, 
         en = EXCLUDED.en, 
         de = EXCLUDED.de, 
         tr = EXCLUDED.tr, 
         updated_at = CURRENT_TIMESTAMP`,
        [translation.key, translation.category, translation.en, translation.de, translation.tr]
      );
    }

    // Get count of inserted translations
    const countResult = await query('SELECT COUNT(*) as count FROM translations');
    const count = countResult.rows[0].count;

    console.log(`✅ Successfully seeded ${count} translations`);
    console.log('📊 Translation categories:');
    
    const categoriesResult = await query('SELECT DISTINCT category FROM translations ORDER BY category');
    categoriesResult.rows.forEach(row => {
      console.log(`   - ${row.category}`);
    });

  } catch (error) {
    console.error('❌ Error seeding translations:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  seedTranslations()
    .then(() => {
      console.log('🎉 Translation seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Translation seeding failed:', error);
      process.exit(1);
    });
}

export default seedTranslations;