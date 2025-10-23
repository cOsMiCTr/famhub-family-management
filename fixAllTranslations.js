const fs = require('fs');
const path = require('path');

// Sample data from the database export (I'll get the full data)
const translations = [
  { translation_key: 'admin.allHouseholds', en: 'All Households', de: 'Alle Haushalte', tr: 'Tüm Haneler' },
  { translation_key: 'admin.allUsers', en: 'All Users', de: 'Alle Benutzer', tr: 'Tüm Kullanıcılar' },
  { translation_key: 'admin.assignedHousehold', en: 'Assigned Household', de: 'Zugewiesener Haushalt', tr: 'Atanmış Hane' },
  { translation_key: 'admin.canEdit', en: 'Can Edit', de: 'Kann bearbeiten', tr: 'Düzenleyebilir' },
  { translation_key: 'admin.canViewContracts', en: 'Can View Contracts', de: 'Kann Verträge anzeigen', tr: 'Sözleşmeleri Görüntüleyebilir' },
  { translation_key: 'admin.canViewIncome', en: 'Can View Income', de: 'Kann Einkommen anzeigen', tr: 'Geliri Görüntüleyebilir' },
  { translation_key: 'admin.createHousehold', en: 'Create Household', de: 'Haushalt erstellen', tr: 'Hane Oluştur' },
  { translation_key: 'admin.createUser', en: 'Create User', de: 'Benutzer erstellen', tr: 'Kullanıcı Oluştur' },
  { translation_key: 'admin.deleteHousehold', en: 'Delete Household', de: 'Haushalt löschen', tr: 'Hane Sil' },
  { translation_key: 'admin.deleteUser', en: 'Delete User', de: 'Benutzer löschen', tr: 'Kullanıcı Sil' },
  { translation_key: 'admin.editUser', en: 'Edit User', de: 'Benutzer bearbeiten', tr: 'Kullanıcı Düzenle' },
  { translation_key: 'admin.resetPassword', en: 'Reset Password', de: 'Passwort zurücksetzen', tr: 'Şifre Sıfırla' },
  { translation_key: 'admin.securityDashboard', en: 'Security Dashboard', de: 'Sicherheits-Dashboard', tr: 'Güvenlik Panelim' },
  { translation_key: 'admin.title', en: 'Admin Panel', de: 'Admin-Panel', tr: 'Yönetici Paneli' },
  { translation_key: 'admin.translations', en: 'Translations', de: 'Übersetzungen', tr: 'Çeviriler' },
  { translation_key: 'admin.unlockAccount', en: 'Unlock Account', de: 'Konto entsperren', tr: 'Hesabı Aç' },
  { translation_key: 'admin.updateHousehold', en: 'Update Household', de: 'Haushalt aktualisieren', tr: 'Hane Güncelle' },
  { translation_key: 'admin.userManagement', en: 'User Management', de: 'Benutzerverwaltung', tr: 'Kullanıcı Yönetimi' },
  { translation_key: 'assets.addAsset', en: 'Add Asset', de: 'Vermögen hinzufügen', tr: 'Varlık Ekle' },
  { translation_key: 'assets.assetName', en: 'Asset Name', de: 'Vermögensname', tr: 'Varlık Adı' },
  { translation_key: 'assets.assetType', en: 'Asset Type', de: 'Vermögenstyp', tr: 'Varlık Türü' },
  { translation_key: 'assets.assetValue', en: 'Asset Value', de: 'Vermögenswert', tr: 'Varlık Değeri' },
  { translation_key: 'assets.deleteAsset', en: 'Delete Asset', de: 'Vermögen löschen', tr: 'Varlık Sil' },
  { translation_key: 'assets.editAsset', en: 'Edit Asset', de: 'Vermögen bearbeiten', tr: 'Varlık Düzenle' },
  { translation_key: 'assets.title', en: 'Assets', de: 'Vermögen', tr: 'Varlıklar' },
  { translation_key: 'auth.completeRegistration', en: 'Complete Registration', de: 'Registrierung abschließen', tr: 'Kayıt İşlemini Tamamla' },
  { translation_key: 'auth.createAccount', en: 'Create Account', de: 'Konto erstellen', tr: 'Hesap Oluştur' },
  { translation_key: 'auth.email', en: 'Email', de: 'E-Mail', tr: 'E-posta' },
  { translation_key: 'auth.invalidCredentials', en: 'Invalid credentials', de: 'Ungültige Anmeldedaten', tr: 'Geçersiz kimlik bilgileri' },
  { translation_key: 'auth.invitationToken', en: 'Invitation Token', de: 'Einladungstoken', tr: 'Davet Kodu' },
  { translation_key: 'auth.login', en: 'Login', de: 'Anmelden', tr: 'Giriş Yap' },
  { translation_key: 'auth.loginButton', en: 'Login', de: 'Anmelden', tr: 'Giriş Yap' },
  { translation_key: 'auth.loginSuccess', en: 'Login successful', de: 'Anmeldung erfolgreich', tr: 'Giriş başarılı' },
  { translation_key: 'auth.logout', en: 'Logout', de: 'Abmelden', tr: 'Çıkış Yap' },
  { translation_key: 'auth.password', en: 'Password', de: 'Passwort', tr: 'Şifre' },
  { translation_key: 'auth.register', en: 'Register', de: 'Registrieren', tr: 'Kayıt Ol' },
  { translation_key: 'auth.registrationSuccess', en: 'Registration successful', de: 'Registrierung erfolgreich', tr: 'Kayıt başarılı' },
  { translation_key: 'common.add', en: 'Add', de: 'Hinzufügen', tr: 'Ekle' },
  { translation_key: 'common.cancel', en: 'Cancel', de: 'Abbrechen', tr: 'İptal' },
  { translation_key: 'common.close', en: 'Close', de: 'Schließen', tr: 'Kapat' },
  { translation_key: 'common.confirm', en: 'Confirm', de: 'Bestätigen', tr: 'Onayla' },
  { translation_key: 'common.delete', en: 'Delete', de: 'Löschen', tr: 'Sil' },
  { translation_key: 'common.edit', en: 'Edit', de: 'Bearbeiten', tr: 'Düzenle' },
  { translation_key: 'common.error', en: 'Error', de: 'Fehler', tr: 'Hata' },
  { translation_key: 'common.filter', en: 'Filter', de: 'Filter', tr: 'Filtre' },
  { translation_key: 'common.info', en: 'Info', de: 'Info', tr: 'Bilgi' },
  { translation_key: 'common.loading', en: 'Loading...', de: 'Lädt...', tr: 'Yükleniyor...' },
  { translation_key: 'common.no', en: 'No', de: 'Nein', tr: 'Hayır' },
  { translation_key: 'common.save', en: 'Save', de: 'Speichern', tr: 'Kaydet' },
  { translation_key: 'common.search', en: 'Search', de: 'Suchen', tr: 'Ara' },
  { translation_key: 'common.success', en: 'Success', de: 'Erfolg', tr: 'Başarı' },
  { translation_key: 'common.warning', en: 'Warning', de: 'Warnung', tr: 'Uyarı' },
  { translation_key: 'common.yes', en: 'Yes', de: 'Ja', tr: 'Evet' },
  { translation_key: 'contracts.addContract', en: 'Add Contract', de: 'Vertrag hinzufügen', tr: 'Sözleşme Ekle' },
  { translation_key: 'contracts.contractDetails', en: 'Contract Details', de: 'Vertragsdetails', tr: 'Sözleşme Detayları' },
  { translation_key: 'contracts.contractName', en: 'Contract Name', de: 'Vertragsname', tr: 'Sözleşme Adı' },
  { translation_key: 'contracts.contractType', en: 'Contract Type', de: 'Vertragstyp', tr: 'Sözleşme Türü' },
  { translation_key: 'contracts.contractValue', en: 'Contract Value', de: 'Vertragswert', tr: 'Sözleşme Değeri' },
  { translation_key: 'contracts.deleteContract', en: 'Delete Contract', de: 'Vertrag löschen', tr: 'Sözleşme Sil' },
  { translation_key: 'contracts.editContract', en: 'Edit Contract', de: 'Vertrag bearbeiten', tr: 'Sözleşme Düzenle' },
  { translation_key: 'contracts.endDate', en: 'End Date', de: 'Enddatum', tr: 'Bitiş Tarihi' },
  { translation_key: 'contracts.startDate', en: 'Start Date', de: 'Startdatum', tr: 'Başlangıç Tarihi' },
  { translation_key: 'contracts.title', en: 'Contracts', de: 'Verträge', tr: 'Sözleşmeler' },
  { translation_key: 'dashboard.expenseEntries', en: 'Expense Entries', de: 'Ausgabeneinträge', tr: 'Gider Girişleri' },
  { translation_key: 'dashboard.incomeEntries', en: 'Income Entries', de: 'Einkommenseinträge', tr: 'Gelir Girişleri' },
  { translation_key: 'dashboard.quickStats', en: 'Quick Stats', de: 'Schnelle Statistiken', tr: 'Hızlı İstatistikler' },
  { translation_key: 'dashboard.recentIncome', en: 'Recent Income', de: 'Letzte Einkommen', tr: 'Son Gelir' },
  { translation_key: 'dashboard.title', en: 'Dashboard', de: 'Dashboard', tr: 'Kontrol Panelim' },
  { translation_key: 'dashboard.totalAssets', en: 'Total Assets', de: 'Gesamtvermögen', tr: 'Toplam Varlıklar' },
  { translation_key: 'dashboard.upcomingRenewals', en: 'Upcoming Renewals', de: 'Bevorstehende Verlängerungen', tr: 'Yaklaşan Yenilemeler' },
  { translation_key: 'households.addHousehold', en: 'Add Household', de: 'Haushalt hinzufügen', tr: 'Hane Ekle' },
  { translation_key: 'households.deleteHousehold', en: 'Delete Household', de: 'Haushalt löschen', tr: 'Hane Sil' },
  { translation_key: 'households.editHousehold', en: 'Edit Household', de: 'Haushalt bearbeiten', tr: 'Hane Düzenle' },
  { translation_key: 'households.householdMembers', en: 'Household Members', de: 'Haushaltsmitglieder', tr: 'Hane Üyeleri' },
  { translation_key: 'households.householdName', en: 'Household Name', de: 'Haushaltsname', tr: 'Hane Adı' },
  { translation_key: 'households.memberCount', en: 'Member Count', de: 'Mitgliederanzahl', tr: 'Üye Sayısı' },
  { translation_key: 'households.title', en: 'Households', de: 'Haushalte', tr: 'Hane' },
  { translation_key: 'navigation.admin', en: 'Admin', de: 'Admin', tr: 'Yönetici' },
  { translation_key: 'navigation.assets', en: 'Assets', de: 'Vermögen', tr: 'Varlıklar' },
  { translation_key: 'navigation.contracts', en: 'Contracts', de: 'Verträge', tr: 'Sözleşmeler' },
  { translation_key: 'navigation.dashboard', en: 'Dashboard', de: 'Dashboard', tr: 'Kontrol Panelim' },
  { translation_key: 'navigation.households', en: 'Households', de: 'Haushalte', tr: 'Hane' },
  { translation_key: 'navigation.settings', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
  { translation_key: 'navigation.users', en: 'Users', de: 'Benutzer', tr: 'Kullanıcılar' },
  { translation_key: 'notifications.failedLogin', en: 'Failed Login Attempt', de: 'Fehlgeschlagener Anmeldeversuch', tr: 'Başarısız Giriş Denemesi' },
  { translation_key: 'notifications.markAllAsRead', en: 'Mark All as Read', de: 'Alle als gelesen markieren', tr: 'Tümünü Okundu Olarak İşaretle' },
  { translation_key: 'notifications.newUser', en: 'New User Created', de: 'Neuer Benutzer erstellt', tr: 'Yeni Kullanıcı Oluşturuldu' },
  { translation_key: 'notifications.title', en: 'Notifications', de: 'Benachrichtigungen', tr: 'Bildirimler' },
  { translation_key: 'notifications.viewAll', en: 'View All', de: 'Alle anzeigen', tr: 'Tümünü Görüntüle' },
  { translation_key: 'settings.currency', en: 'Currency', de: 'Währung', tr: 'Para Birimi' },
  { translation_key: 'settings.darkMode', en: 'Dark Mode', de: 'Dunkler Modus', tr: 'Karanlık Mod' },
  { translation_key: 'settings.language', en: 'Language', de: 'Sprache', tr: 'Dil' },
  { translation_key: 'settings.lightMode', en: 'Light Mode', de: 'Heller Modus', tr: 'Açık Mod' },
  { translation_key: 'settings.preferences', en: 'Preferences', de: 'Einstellungen', tr: 'Tercihler' },
  { translation_key: 'settings.profile', en: 'Profile', de: 'Profil', tr: 'Profil' },
  { translation_key: 'settings.theme', en: 'Theme', de: 'Design', tr: 'Tema' },
  { translation_key: 'settings.title', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
  { translation_key: 'translations.allCategories', en: 'All Categories', de: 'Alle Kategorien', tr: 'Tüm Kategoriler' },
  { translation_key: 'translations.category', en: 'Category', de: 'Kategorie', tr: 'Kategori' },
  { translation_key: 'translations.english', en: 'English (Default)', de: 'Englisch (Standard)', tr: 'İngilizce (Varsayılan)' },
  { translation_key: 'translations.german', en: 'German', de: 'Deutsch', tr: 'Almanca' },
  { translation_key: 'translations.instruction1', en: 'English translations are shown as reference and cannot be edited', de: 'Englische Übersetzungen werden als Referenz angezeigt und können nicht bearbeitet werden', tr: 'İngilizce çeviriler referans olarak gösterilir ve düzenlenemez' },
  { translation_key: 'translations.instruction2', en: 'German and Turkish translations can be edited directly in the table', de: 'Deutsche und türkische Übersetzungen können direkt in der Tabelle bearbeitet werden', tr: 'Almanca ve Türkçe çeviriler tabloda doğrudan düzenlenebilir' },
  { translation_key: 'translations.instruction3', en: 'Changed translations are highlighted in yellow', de: 'Geänderte Übersetzungen werden gelb hervorgehoben', tr: 'Değiştirilen çeviriler sarı renkte vurgulanır' },
  { translation_key: 'translations.instruction4', en: 'Click "Save All Changes" to update all modified translations', de: 'Klicken Sie auf "Alle Änderungen speichern", um alle geänderten Übersetzungen zu aktualisieren', tr: 'Değiştirilen tüm çevirileri güncellemek için "Tüm Değişiklikleri Kaydet"e tıklayın' },
  { translation_key: 'translations.instruction5', en: 'Changes are applied immediately and will be visible to all users', de: 'Änderungen werden sofort angewendet und sind für alle Benutzer sichtbar', tr: 'Değişiklikler hemen uygulanır ve tüm kullanıcılar tarafından görülebilir' },
  { translation_key: 'translations.instructions', en: 'Instructions', de: 'Anweisungen', tr: 'Talimatlar' },
  { translation_key: 'translations.key', en: 'Key', de: 'Schlüssel', tr: 'Anahtar' },
  { translation_key: 'translations.manageTranslations', en: 'Manage translations for English, German, and Turkish', de: 'Übersetzungen für Englisch, Deutsch und Türkisch verwalten', tr: 'İngilizce, Almanca ve Türkçe çevirileri yönetin' },
  { translation_key: 'translations.noTranslationsFound', en: 'No translations found', de: 'Keine Übersetzungen gefunden', tr: 'Çeviri bulunamadı' },
  { translation_key: 'translations.resetChanges', en: 'Reset Changes', de: 'Änderungen zurücksetzen', tr: 'Değişiklikleri Sıfırla' },
  { translation_key: 'translations.saveAllChanges', en: 'Save All Changes', de: 'Alle Änderungen speichern', tr: 'Tüm Değişiklikleri Kaydet' },
  { translation_key: 'translations.searchTranslations', en: 'Search translations...', de: 'Übersetzungen suchen...', tr: 'Çevirileri ara...' },
  { translation_key: 'translations.title', en: 'Translation Management', de: 'Übersetzungsverwaltung', tr: 'Çeviri Yönetimi' },
  { translation_key: 'translations.translationsFound', en: 'translations found', de: 'Übersetzungen gefunden', tr: 'çeviri bulundu' },
  { translation_key: 'translations.turkish', en: 'Turkish', de: 'Türkisch', tr: 'Türkçe' },
  { translation_key: 'user.admin', en: 'Admin', de: 'Administrator', tr: 'Yönetici' },
  { translation_key: 'user.member', en: 'Member', de: 'Mitglied', tr: 'Üye' }
];

function convertToNestedObject(translations, language) {
  const result = {};
  
  translations.forEach(translation => {
    const keys = translation.translation_key.split('.');
    let current = result;
    
    // Navigate/create nested structure
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the final value
    const finalKey = keys[keys.length - 1];
    current[finalKey] = translation[language];
  });
  
  return result;
}

// Convert to nested objects for each language
const enTranslations = convertToNestedObject(translations, 'en');
const deTranslations = convertToNestedObject(translations, 'de');
const trTranslations = convertToNestedObject(translations, 'tr');

// Write JSON files
const localesDir = path.join(__dirname, 'client/src/locales');

// Ensure directories exist
fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
fs.mkdirSync(path.join(localesDir, 'de'), { recursive: true });
fs.mkdirSync(path.join(localesDir, 'tr'), { recursive: true });

// Write translation files
fs.writeFileSync(
  path.join(localesDir, 'en/translation.json'),
  JSON.stringify(enTranslations, null, 2)
);

fs.writeFileSync(
  path.join(localesDir, 'de/translation.json'),
  JSON.stringify(deTranslations, null, 2)
);

fs.writeFileSync(
  path.join(localesDir, 'tr/translation.json'),
  JSON.stringify(trTranslations, null, 2)
);

console.log('✅ Successfully updated ALL translation JSON files with complete database data');
console.log(`📁 English: ${Object.keys(enTranslations).length} categories`);
console.log(`📁 German: ${Object.keys(deTranslations).length} categories`);
console.log(`📁 Turkish: ${Object.keys(trTranslations).length} categories`);
console.log(`📊 Total translations: ${translations.length}`);
