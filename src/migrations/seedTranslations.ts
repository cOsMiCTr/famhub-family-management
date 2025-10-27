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
      { key: 'common.name', category: 'common', en: 'Name', de: 'Name', tr: 'Ad' },
      { key: 'common.save', category: 'common', en: 'Save', de: 'Speichern', tr: 'Kaydet' },
      { key: 'common.cancel', category: 'common', en: 'Cancel', de: 'Abbrechen', tr: 'İptal' },
      { key: 'common.delete', category: 'common', en: 'Delete', de: 'Löschen', tr: 'Sil' },
      { key: 'common.edit', category: 'common', en: 'Edit', de: 'Bearbeiten', tr: 'Düzenle' },
      { key: 'common.add', category: 'common', en: 'Add', de: 'Hinzufügen', tr: 'Ekle' },
      { key: 'common.search', category: 'common', en: 'Search', de: 'Suchen', tr: 'Ara' },
      { key: 'common.searchByEmail', category: 'common', en: 'Search by email...', de: 'Nach E-Mail suchen...', tr: 'E-posta ile ara...' },
      { key: 'common.enterEmail', category: 'common', en: 'Enter your email', de: 'E-Mail eingeben', tr: 'E-postanızı girin' },
      { key: 'common.enterPassword', category: 'common', en: 'Enter your password', de: 'Passwort eingeben', tr: 'Şifrenizi girin' },
      { key: 'common.confirmPassword', category: 'common', en: 'Confirm your password', de: 'Passwort bestätigen', tr: 'Şifrenizi onaylayın' },
      { key: 'common.enterCurrentPassword', category: 'common', en: 'Enter current password', de: 'Aktuelles Passwort eingeben', tr: 'Mevcut şifreyi girin' },
      { key: 'common.enterNewPassword', category: 'common', en: 'Enter new password', de: 'Neues Passwort eingeben', tr: 'Yeni şifre girin' },
      { key: 'common.confirmNewPassword', category: 'common', en: 'Confirm new password', de: 'Neues Passwort bestätigen', tr: 'Yeni şifreyi onaylayın' },
      { key: 'common.emailPlaceholder', category: 'common', en: 'user@example.com', de: 'benutzer@beispiel.com', tr: 'kullanici@ornek.com' },
      { key: 'common.filter', category: 'common', en: 'Filter', de: 'Filter', tr: 'Filtrele' },
      { key: 'common.close', category: 'common', en: 'Close', de: 'Schließen', tr: 'Kapat' },
      { key: 'common.confirm', category: 'common', en: 'Confirm', de: 'Bestätigen', tr: 'Onayla' },
      { key: 'common.yes', category: 'common', en: 'Yes', de: 'Ja', tr: 'Evet' },
      { key: 'common.no', category: 'common', en: 'No', de: 'Nein', tr: 'Hayır' },
      { key: 'common.error', category: 'common', en: 'Error', de: 'Fehler', tr: 'Hata' },
      { key: 'common.success', category: 'common', en: 'Success', de: 'Erfolg', tr: 'Başarılı' },
      { key: 'common.warning', category: 'common', en: 'Warning', de: 'Warnung', tr: 'Uyarı' },
      { key: 'common.info', category: 'common', en: 'Info', de: 'Info', tr: 'Bilgi' },
      { key: 'common.actions', category: 'common', en: 'Actions', de: 'Aktionen', tr: 'İşlemler' },
      { key: 'common.nameRequired', category: 'common', en: 'Name is required', de: 'Name ist erforderlich', tr: 'Ad zorunludur' },
      { key: 'common.amountRequired', category: 'common', en: 'Amount is required', de: 'Betrag ist erforderlich', tr: 'Tutar zorunludur' },
      { key: 'common.currencyRequired', category: 'common', en: 'Currency is required', de: 'Währung ist erforderlich', tr: 'Para birimi zorunludur' },
      { key: 'common.categoryRequired', category: 'common', en: 'Category is required', de: 'Kategorie ist erforderlich', tr: 'Kategori zorunludur' },

      // Status
      { key: 'status.active', category: 'status', en: 'Active', de: 'Aktiv', tr: 'Aktif' },
      { key: 'status.locked', category: 'status', en: 'Locked', de: 'Gesperrt', tr: 'Kilitli' },
      { key: 'status.pendingPasswordChange', category: 'status', en: 'Pending Password Change', de: 'Passwortänderung ausstehend', tr: 'Şifre Değişikliği Bekliyor' },

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
      { key: 'navigation.income', category: 'navigation', en: 'Income', de: 'Einkommen', tr: 'Gelir' },
      { key: 'navigation.familyMembers', category: 'navigation', en: 'Family Members', de: 'Familienmitglieder', tr: 'Aile Üyeleri' },
      { key: 'navigation.settings', category: 'navigation', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
      { key: 'navigation.admin', category: 'navigation', en: 'Admin', de: 'Admin', tr: 'Yönetici' },
      { key: 'navigation.households', category: 'navigation', en: 'Households', de: 'Haushalte', tr: 'Hane' },
      { key: 'navigation.users', category: 'navigation', en: 'Users', de: 'Benutzer', tr: 'Kullanıcılar' },

      // Dashboard
      { key: 'dashboard.title', category: 'dashboard', en: 'Dashboard', de: 'Dashboard', tr: 'Kontrol Paneli' },
      { key: 'dashboard.totalAssets', category: 'dashboard', en: 'Total Assets', de: 'Gesamtvermögen', tr: 'Toplam Varlık' },
      { key: 'dashboard.totalIncome', category: 'dashboard', en: 'Total Income', de: 'Gesamteinkommen', tr: 'Toplam Gelir' },
      { key: 'dashboard.netIncome', category: 'dashboard', en: 'Net Income', de: 'Nettoeinkommen', tr: 'Net Gelir' },
      { key: 'dashboard.monthlyIncome', category: 'dashboard', en: 'Monthly Income', de: 'Monatliches Einkommen', tr: 'Aylık Gelir' },
      { key: 'dashboard.recentIncome', category: 'dashboard', en: 'Recent Income', de: 'Letzte Einkommen', tr: 'Son Gelir' },
      { key: 'dashboard.upcomingRenewals', category: 'dashboard', en: 'Upcoming Renewals', de: 'Bevorstehende Verlängerungen', tr: 'Yaklaşan Yenilemeler' },
      { key: 'dashboard.quickStats', category: 'dashboard', en: 'Quick Stats', de: 'Schnelle Statistiken', tr: 'Hızlı İstatistikler' },
      { key: 'dashboard.incomeEntries', category: 'dashboard', en: 'Income Entries', de: 'Einkommenseinträge', tr: 'Gelir Girişleri' },
      { key: 'dashboard.expenseEntries', category: 'dashboard', en: 'Expense Entries', de: 'Ausgabeneinträge', tr: 'Gider Girişleri' },
      { key: 'dashboard.activeContracts', category: 'dashboard', en: 'Active Contracts', de: 'Aktive Verträge', tr: 'Aktif Sözleşmeler' },
      { key: 'dashboard.exchangeRates', category: 'dashboard', en: 'Exchange Rates', de: 'Wechselkurse', tr: 'Döviz Kurları' },
      { key: 'dashboard.basedOn', category: 'dashboard', en: 'Based on', de: 'Basierend auf', tr: 'Baz alarak' },
      { key: 'dashboard.perUnit', category: 'dashboard', en: 'per', de: 'pro', tr: 'başına' },
      { key: 'dashboard.noExchangeRates', category: 'dashboard', en: 'No exchange rates available', de: 'Keine Wechselkurse verfügbar', tr: 'Döviz kuru mevcut değil' },
      { key: 'dashboard.sync', category: 'dashboard', en: 'Sync', de: 'Synchronisieren', tr: 'Senkronize Et' },
      { key: 'dashboard.syncing', category: 'dashboard', en: 'Syncing...', de: 'Synchronisiere...', tr: 'Senkronize Ediliyor...' },
      { key: 'dashboard.lastUpdated', category: 'dashboard', en: 'Last updated', de: 'Zuletzt aktualisiert', tr: 'Son güncelleme' },
      { key: 'dashboard.showConversions', category: 'dashboard', en: 'Show Conversions', de: 'Umrechnungen anzeigen', tr: 'Dönüşümleri Göster' },
      { key: 'dashboard.hideConversions', category: 'dashboard', en: 'Hide Conversions', de: 'Umrechnungen ausblenden', tr: 'Dönüşümleri Gizle' },
      { key: 'dashboard.configureRates', category: 'dashboard', en: 'Configure Exchange Rates', de: 'Wechselkurse konfigurieren', tr: 'Döviz Kurlarını Yapılandır' },
      { key: 'dashboard.selectCurrencies', category: 'dashboard', en: 'Select currencies to display', de: 'Anzuzeigende Währungen auswählen', tr: 'Görüntülenecek para birimlerini seçin' },
      { key: 'dashboard.convertTo', category: 'dashboard', en: 'Convert to', de: 'Konvertieren zu', tr: 'Dönüştür' },
      { key: 'dashboard.converted', category: 'dashboard', en: 'Converted', de: 'Konvertiert', tr: 'Dönüştürüldü' },
      { key: 'dashboard.inYourCurrency', category: 'dashboard', en: 'in your currency', de: 'in Ihrer Währung', tr: 'para biriminizde' },
      { key: 'dashboard.viewIn', category: 'dashboard', en: 'View in', de: 'Anzeigen in', tr: 'Görüntüle' },
      { key: 'dashboard.convertAllTo', category: 'dashboard', en: 'Convert all to', de: 'Alle konvertieren zu', tr: 'Hepsini dönüştür' },
      { key: 'dashboard.showInCurrency', category: 'dashboard', en: 'Show in currency', de: 'In Währung anzeigen', tr: 'Para biriminde göster' },
      { key: 'dashboard.toggleConversions', category: 'dashboard', en: 'Toggle Conversions', de: 'Umrechnungen umschalten', tr: 'Dönüşümleri Değiştir' },
      { key: 'dashboard.familyMembers', category: 'dashboard', en: 'Family Members', de: 'Familienmitglieder', tr: 'Aile Üyeleri' },

      // Admin
      { key: 'admin.title', category: 'admin', en: 'Admin Panel', de: 'Admin-Panel', tr: 'Yönetici Paneli' },
      { key: 'admin.adminDashboard', category: 'admin', en: 'Admin Dashboard', de: 'Admin-Dashboard', tr: 'Yönetici Paneli' },
      { key: 'admin.systemStatistics', category: 'admin', en: 'System Statistics', de: 'Systemstatistiken', tr: 'Sistem İstatistikleri' },
      { key: 'admin.usersHouseholds', category: 'admin', en: 'Users & Households', de: 'Benutzer & Haushalte', tr: 'Kullanıcılar ve Haneler' },
      { key: 'admin.monitorSecurity', category: 'admin', en: 'Monitor Security', de: 'Sicherheit überwachen', tr: 'Güvenliği İzle' },
      { key: 'admin.manageTranslations', category: 'admin', en: 'Manage Translations', de: 'Übersetzungen verwalten', tr: 'Çevirileri Yönet' },
      { key: 'admin.permanentlyDeleteUser', category: 'admin', en: 'Permanently Delete User', de: 'Benutzer dauerhaft löschen', tr: 'Kullanıcıyı Kalıcı Olarak Sil' },
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
      { key: 'admin.currencyManagement', category: 'admin', en: 'Currency Management', de: 'Währungsverwaltung', tr: 'Para Birimi Yönetimi' },

      // Currency Management
      { key: 'currencies.title', category: 'currencies', en: 'Currencies', de: 'Währungen', tr: 'Para Birimleri' },
      { key: 'currencies.addCurrency', category: 'currencies', en: 'Add Currency', de: 'Währung hinzufügen', tr: 'Para Birimi Ekle' },
      { key: 'currencies.editCurrency', category: 'currencies', en: 'Edit Currency', de: 'Währung bearbeiten', tr: 'Para Birimini Düzenle' },
      { key: 'currencies.deleteCurrency', category: 'currencies', en: 'Delete Currency', de: 'Währung löschen', tr: 'Para Birimi Sil' },
      { key: 'currencies.currencyCode', category: 'currencies', en: 'Currency Code', de: 'Währungscode', tr: 'Para Birimi Kodu' },
      { key: 'currencies.currencyName', category: 'currencies', en: 'Currency Name', de: 'Währungsname', tr: 'Para Birimi Adı' },
      { key: 'currencies.nameEn', category: 'currencies', en: 'Name (English)', de: 'Name (Englisch)', tr: 'Adı (İngilizce)' },
      { key: 'currencies.nameDe', category: 'currencies', en: 'Name (German)', de: 'Name (Deutsch)', tr: 'Adı (Almanca)' },
      { key: 'currencies.nameTr', category: 'currencies', en: 'Name (Turkish)', de: 'Name (Türkisch)', tr: 'Adı (Türkçe)' },
      { key: 'currencies.symbol', category: 'currencies', en: 'Symbol', de: 'Symbol', tr: 'Sembol' },
      { key: 'currencies.type', category: 'currencies', en: 'Type', de: 'Typ', tr: 'Tür' },
      { key: 'currencies.fiat', category: 'currencies', en: 'Fiat Currency', de: 'Fiat-Währung', tr: 'Fiat Para' },
      { key: 'currencies.cryptocurrency', category: 'currencies', en: 'Cryptocurrency', de: 'Kryptowährung', tr: 'Kripto Para' },
      { key: 'currencies.preciousMetal', category: 'currencies', en: 'Precious Metal', de: 'Edelmetall', tr: 'Değerli Maden' },
      { key: 'currencies.status', category: 'currencies', en: 'Status', de: 'Status', tr: 'Durum' },
      { key: 'currencies.active', category: 'currencies', en: 'Active', de: 'Aktiv', tr: 'Aktif' },
      { key: 'currencies.inactive', category: 'currencies', en: 'Inactive', de: 'Inaktiv', tr: 'Pasif' },
      { key: 'currencies.displayOrder', category: 'currencies', en: 'Display Order', de: 'Anzeigereihenfolge', tr: 'Görüntüleme Sırası' },
      { key: 'currencies.usageCount', category: 'currencies', en: 'Usage', de: 'Verwendung', tr: 'Kullanım' },
      { key: 'currencies.deleteConfirm', category: 'currencies', en: 'Are you sure you want to delete this currency?', de: 'Möchten Sie diese Währung wirklich löschen?', tr: 'Bu para birimini silmek istediğinizden emin misiniz?' },
      { key: 'currencies.cannotDelete', category: 'currencies', en: 'Cannot delete currency because it is in use', de: 'Währung kann nicht gelöscht werden, da sie verwendet wird', tr: 'Kullanıldığı için para birimi silinemez' },
      { key: 'currencies.toggleConfirm', category: 'currencies', en: 'Toggle currency active status?', de: 'Währungsstatus umschalten?', tr: 'Para birimi durumunu değiştir?' },
      { key: 'currencies.codeRequired', category: 'currencies', en: 'Currency code is required', de: 'Währungscode ist erforderlich', tr: 'Para birimi kodu gereklidir' },
      { key: 'currencies.nameRequired', category: 'currencies', en: 'Currency name is required', de: 'Währungsname ist erforderlich', tr: 'Para birimi adı gereklidir' },
      { key: 'currencies.symbolRequired', category: 'currencies', en: 'Symbol is required', de: 'Symbol ist erforderlich', tr: 'Sembol gereklidir' },
      { key: 'currencies.codeDuplicate', category: 'currencies', en: 'This currency code already exists', de: 'Dieser Währungscode existiert bereits', tr: 'Bu para birimi kodu zaten mevcut' },
      { key: 'currencies.codeInvalid', category: 'currencies', en: 'Invalid currency code format', de: 'Ungültiges Währungscode-Format', tr: 'Geçersiz para birimi kodu formatı' },
      { key: 'currencies.filterByType', category: 'currencies', en: 'Filter by Type', de: 'Nach Typ filtern', tr: 'Türe Göre Filtrele' },
      { key: 'currencies.filterByStatus', category: 'currencies', en: 'Filter by Status', de: 'Nach Status filtern', tr: 'Duruma Göre Filtrele' },
      { key: 'currencies.searchPlaceholder', category: 'currencies', en: 'Search by code or name', de: 'Nach Code oder Name suchen', tr: 'Kod veya isme göre ara' },
      { key: 'currencies.searchLabel', category: 'currencies', en: 'Search', de: 'Suchen', tr: 'Ara' },
      { key: 'currencies.noCurrencies', category: 'currencies', en: 'No currencies found', de: 'Keine Währungen gefunden', tr: 'Para birimi bulunamadı' },
      { key: 'currencies.allTypes', category: 'currencies', en: 'All Types', de: 'Alle Typen', tr: 'Tüm Türler' },
      { key: 'currencies.allStatus', category: 'currencies', en: 'All Status', de: 'Alle Status', tr: 'Tüm Durumlar' },

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
      { key: 'assets.name', category: 'assets', en: 'Asset Name', de: 'Vermögensname', tr: 'Varlık Adı' },
      { key: 'assets.value', category: 'assets', en: 'Current Value', de: 'Aktueller Wert', tr: 'Güncel Değer' },
      { key: 'assets.category', category: 'assets', en: 'Category', de: 'Kategorie', tr: 'Kategori' },
      { key: 'assets.owner', category: 'assets', en: 'Owner', de: 'Eigentümer', tr: 'Sahip' },
      { key: 'assets.status', category: 'assets', en: 'Status', de: 'Status', tr: 'Durum' },
      { key: 'assets.purchaseDate', category: 'assets', en: 'Purchase Date', de: 'Kaufdatum', tr: 'Satın Alma Tarihi' },
      { key: 'assets.purchasePrice', category: 'assets', en: 'Purchase Price', de: 'Kaufpreis', tr: 'Satın Alma Fiyatı' },
      { key: 'assets.purchaseCurrency', category: 'assets', en: 'Purchase Currency', de: 'Kaufwährung', tr: 'Satın Alma Para Birimi' },
      { key: 'assets.currentValue', category: 'assets', en: 'Current Value', de: 'Aktueller Wert', tr: 'Güncel Değer' },
      { key: 'assets.lastValuated', category: 'assets', en: 'Last Valuated', de: 'Zuletzt bewertet', tr: 'Son Değerlendirme' },
      { key: 'assets.valuationMethod', category: 'assets', en: 'Valuation Method', de: 'Bewertungsmethode', tr: 'Değerlendirme Yöntemi' },
      { key: 'assets.ownershipType', category: 'assets', en: 'Ownership Type', de: 'Eigentumsart', tr: 'Mülkiyet Türü' },
      { key: 'assets.ownershipPercentage', category: 'assets', en: 'Ownership %', de: 'Eigentumsanteil %', tr: 'Mülkiyet %' },
      { key: 'assets.location', category: 'assets', en: 'Location', de: 'Standort', tr: 'Konum' },
      { key: 'assets.notes', category: 'assets', en: 'Notes', de: 'Notizen', tr: 'Notlar' },
      { key: 'assets.photo', category: 'assets', en: 'Photo', de: 'Foto', tr: 'Fotoğraf' },
      { key: 'assets.uploadPhoto', category: 'assets', en: 'Upload Photo', de: 'Foto hochladen', tr: 'Fotoğraf Yükle' },
      { key: 'assets.valuationHistory', category: 'assets', en: 'Valuation History', de: 'Bewertungsverlauf', tr: 'Değerlendirme Geçmişi' },
      { key: 'assets.addValuation', category: 'assets', en: 'Add Valuation', de: 'Bewertung hinzufügen', tr: 'Değerlendirme Ekle' },
      { key: 'assets.valueChanges', category: 'assets', en: 'Value Changes', de: 'Wertänderungen', tr: 'Değer Değişiklikleri' },
      { key: 'assets.totalValue', category: 'assets', en: 'Total Value', de: 'Gesamtwert', tr: 'Toplam Değer' },
      { key: 'assets.byCategory', category: 'assets', en: 'By Category', de: 'Nach Kategorie', tr: 'Kategoriye Göre' },
      { key: 'assets.topAssets', category: 'assets', en: 'Top Assets', de: 'Top Vermögenswerte', tr: 'En Değerli Varlıklar' },
      { key: 'assets.allocation', category: 'assets', en: 'Asset Allocation', de: 'Vermögensverteilung', tr: 'Varlık Dağılımı' },
      { key: 'assets.filterByStatus', category: 'assets', en: 'Filter by Status', de: 'Nach Status filtern', tr: 'Duruma Göre Filtrele' },
      { key: 'assets.filterByCategory', category: 'assets', en: 'Filter by Category', de: 'Nach Kategorie filtern', tr: 'Kategoriye Göre Filtrele' },
      { key: 'assets.filterByMember', category: 'assets', en: 'Filter by Member', de: 'Nach Mitglied filtern', tr: 'Üyeye Göre Filtrele' },
      { key: 'assets.valueRange', category: 'assets', en: 'Value Range', de: 'Wertbereich', tr: 'Değer Aralığı' },
      { key: 'assets.roi', category: 'assets', en: 'ROI', de: 'ROI', tr: 'ROI' },
      { key: 'assets.annualizedReturn', category: 'assets', en: 'Annualized Return', de: 'Annualisierte Rendite', tr: 'Yıllık Getiri' },
      { key: 'assets.appreciation', category: 'assets', en: 'Appreciation', de: 'Wertsteigerung', tr: 'Değer Artışı' },
      { key: 'assets.depreciation', category: 'assets', en: 'Depreciation', de: 'Wertminderung', tr: 'Değer Kaybı' },
      { key: 'assets.noAssetsFound', category: 'assets', en: 'No assets found', de: 'Keine Vermögenswerte gefunden', tr: 'Varlık bulunamadı' },
      { key: 'assets.cannotDelete', category: 'assets', en: 'Cannot delete asset', de: 'Vermögenswert kann nicht gelöscht werden', tr: 'Varlık silinemez' },
      { key: 'assets.hasDependencies', category: 'assets', en: 'Cannot delete asset with dependencies', de: 'Vermögenswert mit Abhängigkeiten kann nicht gelöscht werden', tr: 'Bağımlılıkları olan varlık silinemez' },

      // Asset Categories
      { key: 'assetCategories.title', category: 'assetCategories', en: 'Asset Categories', de: 'Vermögenskategorien', tr: 'Varlık Kategorileri' },
      { key: 'assetCategories.addCategory', category: 'assetCategories', en: 'Add Category', de: 'Kategorie hinzufügen', tr: 'Kategori Ekle' },
      { key: 'assetCategories.editCategory', category: 'assetCategories', en: 'Edit Category', de: 'Kategorie bearbeiten', tr: 'Kategori Düzenle' },
      { key: 'assetCategories.deleteCategory', category: 'assetCategories', en: 'Delete Category', de: 'Kategorie löschen', tr: 'Kategori Sil' },
      { key: 'assetCategories.categoryType', category: 'assetCategories', en: 'Category Type', de: 'Kategorietyp', tr: 'Kategori Türü' },
      { key: 'assetCategories.icon', category: 'assetCategories', en: 'Icon', de: 'Symbol', tr: 'İkon' },
      { key: 'assetCategories.noCategoriesFound', category: 'assetCategories', en: 'No asset categories found', de: 'Keine Vermögenskategorien gefunden', tr: 'Varlık kategorisi bulunamadı' },
      { key: 'assetCategories.cannotDelete', category: 'assetCategories', en: 'Cannot delete default category', de: 'Standardkategorie kann nicht gelöscht werden', tr: 'Varsayılan kategori silinemez' },
      { key: 'assetCategories.hasDependencies', category: 'assetCategories', en: 'Cannot delete category with assigned assets', de: 'Kategorie mit zugewiesenen Vermögenswerten kann nicht gelöscht werden', tr: 'Atanmış varlığı olan kategori silinemez' },

      // Category Types
      { key: 'assetCategories.realEstate', category: 'assetCategories', en: 'Real Estate', de: 'Immobilien', tr: 'Gayrimenkul' },
      { key: 'assetCategories.stocks', category: 'assetCategories', en: 'Stocks', de: 'Aktien', tr: 'Hisse Senedi' },
      { key: 'assetCategories.etf', category: 'assetCategories', en: 'ETFs & Mutual Funds', de: 'ETFs & Investmentfonds', tr: 'ETF ve Yatırım Fonları' },
      { key: 'assetCategories.bonds', category: 'assetCategories', en: 'Bonds', de: 'Anleihen', tr: 'Tahvil' },
      { key: 'assetCategories.crypto', category: 'assetCategories', en: 'Cryptocurrency', de: 'Kryptowährung', tr: 'Kripto Para' },
      { key: 'assetCategories.gold', category: 'assetCategories', en: 'Gold & Precious Metals', de: 'Gold & Edelmetalle', tr: 'Altın ve Değerli Metaller' },
      { key: 'assetCategories.vehicles', category: 'assetCategories', en: 'Vehicles', de: 'Fahrzeuge', tr: 'Araçlar' },
      { key: 'assetCategories.collectibles', category: 'assetCategories', en: 'Collectibles & Art', de: 'Sammlerstücke & Kunst', tr: 'Koleksiyon ve Sanat' },
      { key: 'assetCategories.cash', category: 'assetCategories', en: 'Bank Accounts', de: 'Bankkonten', tr: 'Banka Hesapları' },
      { key: 'assetCategories.other', category: 'assetCategories', en: 'Other Assets', de: 'Sonstige Vermögenswerte', tr: 'Diğer Varlıklar' },

      // Ownership Types
      { key: 'assets.single', category: 'assets', en: 'Single Owner', de: 'Einzeleigentum', tr: 'Tek Sahip' },
      { key: 'assets.shared', category: 'assets', en: 'Shared Ownership', de: 'Miteigentum', tr: 'Ortak Mülkiyet' },
      { key: 'assets.household', category: 'assets', en: 'Household Shared', de: 'Haushaltsgemeinschaft', tr: 'Hane Paylaşımlı' },

      // Status Types
      { key: 'assets.active', category: 'assets', en: 'Active', de: 'Aktiv', tr: 'Aktif' },
      { key: 'assets.sold', category: 'assets', en: 'Sold', de: 'Verkauft', tr: 'Satıldı' },
      { key: 'assets.transferred', category: 'assets', en: 'Transferred', de: 'Übertragen', tr: 'Devredildi' },
      { key: 'assets.inactive', category: 'assets', en: 'Inactive', de: 'Inaktiv', tr: 'Pasif' },

      // Valuation Methods
      { key: 'assets.market', category: 'assets', en: 'Market Value', de: 'Marktwert', tr: 'Piyasa Değeri' },
      { key: 'assets.appraisal', category: 'assets', en: 'Appraisal', de: 'Schätzung', tr: 'Değerleme' },
      { key: 'assets.estimate', category: 'assets', en: 'Estimate', de: 'Schätzung', tr: 'Tahmin' },
      { key: 'assets.manual', category: 'assets', en: 'Manual', de: 'Manuell', tr: 'Manuel' },

      // Asset Form Labels
      { key: 'assets.basicInformation', category: 'assets', en: 'Basic Information', de: 'Grundinformationen', tr: 'Temel Bilgiler' },
      { key: 'assets.purchaseInformation', category: 'assets', en: 'Purchase Information', de: 'Kaufinformationen', tr: 'Satın Alma Bilgileri' },
      { key: 'assets.selectCategory', category: 'assets', en: 'Select Category', de: 'Kategorie auswählen', tr: 'Kategori Seç' },
      { key: 'assets.selectMember', category: 'assets', en: 'Select Member', de: 'Mitglied auswählen', tr: 'Üye Seç' },
      { key: 'assets.singleOwner', category: 'assets', en: 'Single Owner', de: 'Einzeleigentum', tr: 'Tek Sahip' },
      { key: 'assets.sharedOwnership', category: 'assets', en: 'Shared Ownership', de: 'Miteigentum', tr: 'Ortak Mülkiyet' },
      { key: 'assets.householdShared', category: 'assets', en: 'Household Shared', de: 'Haushaltsgemeinschaft', tr: 'Hane Paylaşımlı' },
      { key: 'assets.updateAsset', category: 'assets', en: 'Update Asset', de: 'Vermögen aktualisieren', tr: 'Varlık Güncelle' },
      { key: 'assets.saving', category: 'assets', en: 'Saving...', de: 'Speichern...', tr: 'Kaydediliyor...' },
      { key: 'assets.cancel', category: 'assets', en: 'Cancel', de: 'Abbrechen', tr: 'İptal' },

      // Asset Form Validation Messages
      { key: 'assets.nameRequired', category: 'assets', en: 'Asset name is required', de: 'Vermögensname ist erforderlich', tr: 'Varlık adı gereklidir' },
      { key: 'assets.amountRequired', category: 'assets', en: 'Valid amount is required', de: 'Gültiger Betrag ist erforderlich', tr: 'Geçerli miktar gereklidir' },
      { key: 'assets.currencyRequired', category: 'assets', en: 'Currency is required', de: 'Währung ist erforderlich', tr: 'Para birimi gereklidir' },
      { key: 'assets.categoryRequired', category: 'assets', en: 'Category is required', de: 'Kategorie ist erforderlich', tr: 'Kategori gereklidir' },
      { key: 'assets.dateRequired', category: 'assets', en: 'Date is required', de: 'Datum ist erforderlich', tr: 'Tarih gereklidir' },
      { key: 'assets.purchasePriceInvalid', category: 'assets', en: 'Purchase price must be greater than 0', de: 'Kaufpreis muss größer als 0 sein', tr: 'Satın alma fiyatı 0\'dan büyük olmalıdır' },
      { key: 'assets.currentValueInvalid', category: 'assets', en: 'Current value must be greater than 0', de: 'Aktueller Wert muss größer als 0 sein', tr: 'Güncel değer 0\'dan büyük olmalıdır' },
      { key: 'assets.ownershipPercentageInvalid', category: 'assets', en: 'Ownership percentage must be between 0 and 100', de: 'Eigentumsanteil muss zwischen 0 und 100 liegen', tr: 'Mülkiyet yüzdesi 0 ile 100 arasında olmalıdır' },

      // Asset Form Placeholders
      { key: 'assets.datePlaceholder', category: 'assets', en: 'dd.mm.yyyy', de: 'tt.mm.jjjj', tr: 'gg.aa.yyyy' },
      { key: 'assets.purchaseDatePlaceholder', category: 'assets', en: 'dd.mm.yyyy', de: 'tt.mm.jjjj', tr: 'gg.aa.yyyy' },

      // Asset Actions
      { key: 'assets.addValuation', category: 'assets', en: 'Add Valuation', de: 'Bewertung hinzufügen', tr: 'Değerlendirme Ekle' },
      { key: 'assets.editAsset', category: 'assets', en: 'Edit Asset', de: 'Vermögen bearbeiten', tr: 'Varlık Düzenle' },
      { key: 'assets.deleteAsset', category: 'assets', en: 'Delete Asset', de: 'Vermögen löschen', tr: 'Varlık Sil' },
      { key: 'assets.confirmDelete', category: 'assets', en: 'Are you sure you want to delete this asset?', de: 'Sind Sie sicher, dass Sie dieses Vermögen löschen möchten?', tr: 'Bu varlığı silmek istediğinizden emin misiniz?' },

      // Asset Summary Labels
      { key: 'assets.totalAssets', category: 'assets', en: 'Total Assets', de: 'Gesamtvermögen', tr: 'Toplam Varlıklar' },
      { key: 'assets.totalValue', category: 'assets', en: 'Total Value', de: 'Gesamtwert', tr: 'Toplam Değer' },
      { key: 'assets.averageROI', category: 'assets', en: 'Average ROI', de: 'Durchschnittlicher ROI', tr: 'Ortalama ROI' },
      { key: 'assets.withROIData', category: 'assets', en: 'With ROI Data', de: 'Mit ROI-Daten', tr: 'ROI Verisi Olan' },

      // Asset Filters
      { key: 'assets.filters', category: 'assets', en: 'Filters', de: 'Filter', tr: 'Filtreler' },
      { key: 'assets.allCategories', category: 'assets', en: 'All Categories', de: 'Alle Kategorien', tr: 'Tüm Kategoriler' },
      { key: 'assets.allStatus', category: 'assets', en: 'All Status', de: 'Alle Status', tr: 'Tüm Durumlar' },
      { key: 'assets.allMembers', category: 'assets', en: 'All Members', de: 'Alle Mitglieder', tr: 'Tüm Üyeler' },
      { key: 'assets.allCurrencies', category: 'assets', en: 'All Currencies', de: 'Alle Währungen', tr: 'Tüm Para Birimleri' },
      { key: 'assets.searchPlaceholder', category: 'assets', en: 'Search assets...', de: 'Vermögen suchen...', tr: 'Varlık ara...' },

      // Export and View Options
      { key: 'assets.exportCSV', category: 'assets', en: 'Export to CSV', de: 'Als CSV exportieren', tr: 'CSV Olarak Dışa Aktar' },
      { key: 'assets.exportPDF', category: 'assets', en: 'Export to PDF', de: 'Als PDF exportieren', tr: 'PDF Olarak Dışa Aktar' },
      { key: 'assets.viewPhoto', category: 'assets', en: 'View Photo', de: 'Foto ansehen', tr: 'Fotoğrafı Görüntüle' },
      { key: 'assets.fullSize', category: 'assets', en: 'Full Size', de: 'Vollständige Größe', tr: 'Tam Boyut' },
      { key: 'assets.clickToClose', category: 'assets', en: 'Click outside to close', de: 'Zum Schließen außerhalb klicken', tr: 'Kapatmak için dışına tıklayın' },
      { key: 'assets.allocationByCategory', category: 'assets', en: 'Allocation by Category', de: 'Verteilung nach Kategorie', tr: 'Kategoriye Göre Dağılım' },
      { key: 'assets.totalPercentage', category: 'assets', en: 'Total', de: 'Gesamt', tr: 'Toplam' },
      { key: 'assets.ownershipDistribution', category: 'assets', en: 'Ownership Distribution', de: 'Eigentumsverteilung', tr: 'Mülkiyet Dağılımı' },
      { key: 'assets.noHistory', category: 'assets', en: 'No valuation history available', de: 'Kein Bewertungsverlauf verfügbar', tr: 'Değerlendirme geçmişi bulunamadı' },
      { key: 'assets.addFirstValuation', category: 'assets', en: 'Add a valuation to see history over time', de: 'Fügen Sie eine Bewertung hinzu, um die Historie im Zeitverlauf zu sehen', tr: 'Zaman içindeki geçmişi görmek için bir değerlendirme ekleyin' },
      { key: 'assets.valueOverTime', category: 'assets', en: 'Value Over Time', de: 'Wert im Zeitverlauf', tr: 'Zaman İçinde Değer' },

      // Asset View Toggle
      { key: 'assets.householdView', category: 'assets', en: 'Household View', de: 'Haushaltsansicht', tr: 'Hane Görünümü' },
      { key: 'assets.personalView', category: 'assets', en: 'Personal View', de: 'Persönliche Ansicht', tr: 'Kişisel Görünüm' },

      // Asset Empty States
      { key: 'assets.noAssetsFound', category: 'assets', en: 'No assets found', de: 'Keine Vermögenswerte gefunden', tr: 'Varlık bulunamadı' },
      { key: 'assets.getStarted', category: 'assets', en: 'Get started by adding your first asset.', de: 'Beginnen Sie mit dem Hinzufügen Ihres ersten Vermögenswerts.', tr: 'İlk varlığınızı ekleyerek başlayın.' },

      // Asset Pagination
      { key: 'assets.previous', category: 'assets', en: 'Previous', de: 'Vorherige', tr: 'Önceki' },
      { key: 'assets.next', category: 'assets', en: 'Next', de: 'Nächste', tr: 'Sonraki' },
      { key: 'assets.showing', category: 'assets', en: 'Showing', de: 'Zeige', tr: 'Gösteriliyor' },
      { key: 'assets.to', category: 'assets', en: 'to', de: 'bis', tr: 'ile' },
      { key: 'assets.of', category: 'assets', en: 'of', de: 'von', tr: 'toplam' },
      { key: 'assets.results', category: 'assets', en: 'results', de: 'Ergebnisse', tr: 'sonuç' },

      // Asset Error Messages
      { key: 'assets.failedToFetch', category: 'assets', en: 'Failed to fetch assets', de: 'Vermögenswerte konnten nicht abgerufen werden', tr: 'Varlıklar getirilemedi' },
      { key: 'assets.failedToFetchCategories', category: 'assets', en: 'Failed to fetch categories', de: 'Kategorien konnten nicht abgerufen werden', tr: 'Kategoriler getirilemedi' },
      { key: 'assets.failedToFetchMembers', category: 'assets', en: 'Failed to fetch members', de: 'Mitglieder konnten nicht abgerufen werden', tr: 'Üyeler getirilemedi' },
      { key: 'assets.failedToFetchSummary', category: 'assets', en: 'Failed to fetch summary', de: 'Zusammenfassung konnte nicht abgerufen werden', tr: 'Özet getirilemedi' },
      { key: 'assets.failedToUpdate', category: 'assets', en: 'Failed to update asset', de: 'Vermögenswert konnte nicht aktualisiert werden', tr: 'Varlık güncellenemedi' },
      { key: 'assets.failedToCreate', category: 'assets', en: 'Failed to create asset', de: 'Vermögenswert konnte nicht erstellt werden', tr: 'Varlık oluşturulamadı' },
      { key: 'assets.failedToDelete', category: 'assets', en: 'Failed to delete asset', de: 'Vermögenswert konnte nicht gelöscht werden', tr: 'Varlık silinemedi' },
      { key: 'assets.failedToAddValuation', category: 'assets', en: 'Failed to add valuation', de: 'Bewertung konnte nicht hinzugefügt werden', tr: 'Değerlendirme eklenemedi' },
      { key: 'assets.failedToSave', category: 'assets', en: 'Failed to save asset', de: 'Vermögenswert konnte nicht gespeichert werden', tr: 'Varlık kaydedilemedi' },
      { key: 'assets.unknownCategory', category: 'assets', en: 'Unknown Category', de: 'Unbekannte Kategorie', tr: 'Bilinmeyen Kategori' },

      // Asset Categories Error Messages
      { key: 'assetCategories.failedToFetch', category: 'assetCategories', en: 'Failed to fetch categories', de: 'Kategorien konnten nicht abgerufen werden', tr: 'Kategoriler getirilemedi' },
      { key: 'assetCategories.failedToAdd', category: 'assetCategories', en: 'Failed to add category', de: 'Kategorie konnte nicht hinzugefügt werden', tr: 'Kategori eklenemedi' },
      { key: 'assetCategories.failedToUpdate', category: 'assetCategories', en: 'Failed to update category', de: 'Kategorie konnte nicht aktualisiert werden', tr: 'Kategori güncellenemedi' },
      { key: 'assetCategories.failedToDelete', category: 'assetCategories', en: 'Failed to delete category', de: 'Kategorie konnte nicht gelöscht werden', tr: 'Kategori silinemedi' },
      { key: 'assetCategories.cannotDeleteDefault', category: 'assetCategories', en: 'Cannot delete default category', de: 'Standardkategorie kann nicht gelöscht werden', tr: 'Varsayılan kategori silinemez' },
      { key: 'assetCategories.cannotDeleteWithAssets', category: 'assetCategories', en: 'Cannot delete category with assigned assets', de: 'Kategorie mit zugewiesenen Vermögenswerten kann nicht gelöscht werden', tr: 'Atanmış varlığı olan kategori silinemez' },
      { key: 'assetCategories.confirmDelete', category: 'assetCategories', en: 'Are you sure you want to delete', de: 'Sind Sie sicher, dass Sie löschen möchten', tr: 'Silmek istediğinizden emin misiniz' },

      // Asset Categories UI Labels
      { key: 'assetCategories.manageSettings', category: 'assetCategories', en: 'Manage asset categories and their settings', de: 'Vermögenskategorien und ihre Einstellungen verwalten', tr: 'Varlık kategorilerini ve ayarlarını yönetin' },
      { key: 'assetCategories.assetCategoriesCount', category: 'assetCategories', en: 'Asset Categories', de: 'Vermögenskategorien', tr: 'Varlık Kategorileri' },
      { key: 'assetCategories.noCategoriesFound', category: 'assetCategories', en: 'No categories found', de: 'Keine Kategorien gefunden', tr: 'Kategori bulunamadı' },
      { key: 'assetCategories.getStarted', category: 'assetCategories', en: 'Get started by adding your first category.', de: 'Beginnen Sie mit dem Hinzufügen Ihrer ersten Kategorie.', tr: 'İlk kategorinizi ekleyerek başlayın.' },
      { key: 'assetCategories.category', category: 'assetCategories', en: 'Category', de: 'Kategorie', tr: 'Kategori' },
      { key: 'assetCategories.type', category: 'assetCategories', en: 'Type', de: 'Typ', tr: 'Tür' },
      { key: 'assetCategories.icon', category: 'assetCategories', en: 'Icon', de: 'Symbol', tr: 'İkon' },
      { key: 'assetCategories.settings', category: 'assetCategories', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
      { key: 'assetCategories.assets', category: 'assetCategories', en: 'Assets', de: 'Vermögenswerte', tr: 'Varlıklar' },
      { key: 'assetCategories.actions', category: 'assetCategories', en: 'Actions', de: 'Aktionen', tr: 'İşlemler' },
      { key: 'assetCategories.default', category: 'assetCategories', en: 'Default', de: 'Standard', tr: 'Varsayılan' },
      { key: 'assetCategories.requiresTicker', category: 'assetCategories', en: 'Requires Ticker', de: 'Ticker erforderlich', tr: 'Ticker Gerekli' },
      { key: 'assetCategories.depreciationEnabled', category: 'assetCategories', en: 'Depreciation Enabled', de: 'Abschreibung aktiviert', tr: 'Amortisman Etkin' },
      { key: 'assetCategories.editCategory', category: 'assetCategories', en: 'Edit Category', de: 'Kategorie bearbeiten', tr: 'Kategori Düzenle' },
      { key: 'assetCategories.deleteCategory', category: 'assetCategories', en: 'Delete Category', de: 'Kategorie löschen', tr: 'Kategori Sil' },
      { key: 'assetCategories.cannotDeleteDefaultTooltip', category: 'assetCategories', en: 'Cannot delete default category', de: 'Standardkategorie kann nicht gelöscht werden', tr: 'Varsayılan kategori silinemez' },
      { key: 'assetCategories.cannotDeleteWithAssetsTooltip', category: 'assetCategories', en: 'Cannot delete category with assets', de: 'Kategorie mit Vermögenswerten kann nicht gelöscht werden', tr: 'Varlığı olan kategori silinemez' },

      // Asset Categories Form Labels
      { key: 'assetCategories.typeLabel', category: 'assetCategories', en: 'Type', de: 'Typ', tr: 'Tür' },
      { key: 'assetCategories.settingsLabel', category: 'assetCategories', en: 'Settings', de: 'Einstellungen', tr: 'Ayarlar' },
      { key: 'assetCategories.income', category: 'assetCategories', en: 'Income', de: 'Einkommen', tr: 'Gelir' },
      { key: 'assetCategories.expense', category: 'assetCategories', en: 'Expense', de: 'Ausgabe', tr: 'Gider' },
      { key: 'assetCategories.requiresTickerSymbol', category: 'assetCategories', en: 'Requires Ticker Symbol', de: 'Ticker-Symbol erforderlich', tr: 'Ticker Sembolü Gerekli' },
      { key: 'assetCategories.depreciationEnabledLabel', category: 'assetCategories', en: 'Depreciation Enabled', de: 'Abschreibung aktiviert', tr: 'Amortisman Etkin' },
      { key: 'assetCategories.defaultCategory', category: 'assetCategories', en: 'Default Category', de: 'Standardkategorie', tr: 'Varsayılan Kategori' },

      // Asset Tooltips
      { key: 'assets.addValuationTooltip', category: 'assets', en: 'Add Valuation', de: 'Bewertung hinzufügen', tr: 'Değerlendirme Ekle' },
      { key: 'assets.uploadPhotoTooltip', category: 'assets', en: 'Upload Photo', de: 'Foto hochladen', tr: 'Fotoğraf Yükle' },
      { key: 'assets.editAssetTooltip', category: 'assets', en: 'Edit Asset', de: 'Vermögen bearbeiten', tr: 'Varlık Düzenle' },
      { key: 'assets.deleteAssetTooltip', category: 'assets', en: 'Delete Asset', de: 'Vermögen löschen', tr: 'Varlık Sil' },

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
      { key: 'households.enterHouseholdName', category: 'households', en: 'Enter household name...', de: 'Haushaltsname eingeben...', tr: 'Hane adı girin...' },
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
      { key: 'translations.searchPlaceholder', category: 'translations', en: 'Search English translations...', de: 'Englische Übersetzungen suchen...', tr: 'İngilizce çevirileri ara...' },
      { key: 'translations.germanPlaceholder', category: 'translations', en: 'German translation...', de: 'Deutsche Übersetzung...', tr: 'Almanca çeviri...' },
      { key: 'translations.turkishPlaceholder', category: 'translations', en: 'Turkish translation...', de: 'Türkische Übersetzung...', tr: 'Türkçe çeviri...' },
      { key: 'translations.allCategories', category: 'translations', en: 'All Categories', de: 'Alle Kategorien', tr: 'Tüm Kategoriler' },
      { key: 'translations.translationsFound', category: 'translations', en: 'translations found', de: 'Übersetzungen gefunden', tr: 'çeviri bulundu' },
      { key: 'translations.noTranslationsFound', category: 'translations', en: 'No translations found', de: 'Keine Übersetzungen gefunden', tr: 'Çeviri bulunamadı' },
      { key: 'translations.instructions', category: 'translations', en: 'Instructions', de: 'Anweisungen', tr: 'Talimatlar' },
      { key: 'translations.instruction1', category: 'translations', en: 'All translations can be edited directly in the table', de: 'Alle Übersetzungen können direkt in der Tabelle bearbeitet werden', tr: 'Tüm çeviriler tabloda doğrudan düzenlenebilir' },
      { key: 'translations.instruction2', category: 'translations', en: 'Use the "+ Add Key" button to create new translation entries', de: 'Verwenden Sie die Schaltfläche "+ Schlüssel hinzufügen", um neue Übersetzungseinträge zu erstellen', tr: 'Yeni çeviri girişleri oluşturmak için "+ Anahtar Ekle" düğmesini kullanın' },
      { key: 'translations.instruction3', category: 'translations', en: 'Changed translations are highlighted in yellow', de: 'Geänderte Übersetzungen werden gelb hervorgehoben', tr: 'Değiştirilen çeviriler sarı renkte vurgulanır' },
      { key: 'translations.instruction4', category: 'translations', en: 'Click "Save All Changes" to update all modified translations', de: 'Klicken Sie auf "Alle Änderungen speichern", um alle geänderten Übersetzungen zu aktualisieren', tr: 'Değiştirilen tüm çevirileri güncellemek için "Tüm Değişiklikleri Kaydet"e tıklayın' },
      { key: 'translations.instruction5', category: 'translations', en: 'Changes are applied immediately and will be visible to all users', de: 'Änderungen werden sofort angewendet und sind für alle Benutzer sichtbar', tr: 'Değişiklikler hemen uygulanır ve tüm kullanıcılar tarafından görülebilir' },
      { key: 'translations.addKey', category: 'translations', en: 'Add Key', de: 'Schlüssel hinzufügen', tr: 'Anahtar Ekle' },

      // Income
      { key: 'income.title', category: 'income', en: 'Income Management', de: 'Einkommensverwaltung', tr: 'Gelir Yönetimi' },
      { key: 'income.addIncome', category: 'income', en: 'Add Income', de: 'Einkommen hinzufügen', tr: 'Gelir Ekle' },
      { key: 'income.editIncome', category: 'income', en: 'Edit Income', de: 'Einkommen bearbeiten', tr: 'Gelir Düzenle' },
      { key: 'income.deleteIncome', category: 'income', en: 'Delete Income', de: 'Einkommen löschen', tr: 'Gelir Sil' },
      { key: 'income.amount', category: 'income', en: 'Amount', de: 'Betrag', tr: 'Miktar' },
      { key: 'income.currency', category: 'income', en: 'Currency', de: 'Währung', tr: 'Para Birimi' },
      { key: 'income.sourceCurrency', category: 'income', en: 'Source Currency', de: 'Quellwährung', tr: 'Kaynak Para Birimi' },
      { key: 'income.description', category: 'income', en: 'Description', de: 'Beschreibung', tr: 'Açıklama' },
      { key: 'income.startDate', category: 'income', en: 'Start Date', de: 'Startdatum', tr: 'Başlangıç Tarihi' },
      { key: 'income.endDate', category: 'income', en: 'End Date', de: 'Enddatum', tr: 'Bitiş Tarihi' },
      { key: 'income.isRecurring', category: 'income', en: 'Recurring', de: 'Wiederkehrend', tr: 'Tekrarlayan' },
      { key: 'income.frequency', category: 'income', en: 'Frequency', de: 'Häufigkeit', tr: 'Sıklık' },
      { key: 'income.monthly', category: 'income', en: 'Monthly', de: 'Monatlich', tr: 'Aylık' },
      { key: 'income.weekly', category: 'income', en: 'Weekly', de: 'Wöchentlich', tr: 'Haftalık' },
      { key: 'income.yearly', category: 'income', en: 'Yearly', de: 'Jährlich', tr: 'Yıllık' },
      { key: 'income.oneTime', category: 'income', en: 'One-time', de: 'Einmalig', tr: 'Tek Seferlik' },
      { key: 'income.ongoing', category: 'income', en: 'Ongoing', de: 'Laufend', tr: 'Devam Ediyor' },
      { key: 'income.allMembers', category: 'income', en: 'All Members', de: 'Alle Mitglieder', tr: 'Tüm Üyeler' },
      { key: 'income.all', category: 'income', en: 'All', de: 'Alle', tr: 'Tümü' },
      { key: 'income.category', category: 'income', en: 'Category', de: 'Kategorie', tr: 'Kategori' },
      { key: 'income.member', category: 'income', en: 'Member', de: 'Mitglied', tr: 'Üye' },
      { key: 'income.totalIncome', category: 'income', en: 'Total Income', de: 'Gesamteinkommen', tr: 'Toplam Gelir' },
      { key: 'income.summary', category: 'income', en: 'Summary', de: 'Zusammenfassung', tr: 'Özet' },
      { key: 'income.history', category: 'income', en: 'History', de: 'Verlauf', tr: 'Geçmiş' },
      { key: 'income.noIncomeFound', category: 'income', en: 'No income entries found', de: 'Keine Einkommenseinträge gefunden', tr: 'Gelir girişi bulunamadı' },
      { key: 'income.filterByDate', category: 'income', en: 'Filter by Date', de: 'Nach Datum filtern', tr: 'Tarihe Göre Filtrele' },
      { key: 'income.filterByMember', category: 'income', en: 'Filter by Member', de: 'Nach Mitglied filtern', tr: 'Üyeye Göre Filtrele' },
      { key: 'income.filterByCategory', category: 'income', en: 'Filter by Category', de: 'Nach Kategorie filtern', tr: 'Kategoriye Göre Filtrele' },
      { key: 'income.showRecurringOnly', category: 'income', en: 'Show Recurring Only', de: 'Nur Wiederkehrende anzeigen', tr: 'Sadece Tekrarlayanları Göster' },
      { key: 'income.present', category: 'income', en: 'Present', de: 'Aktuell', tr: 'Şu An' },
      { key: 'income.leaveEmptyForOngoing', category: 'income', en: 'Leave empty for ongoing income', de: 'Für laufendes Einkommen leer lassen', tr: 'Devam eden gelir için boş bırakın' },
      { key: 'income.currentPosition', category: 'income', en: 'Current Position', de: 'Aktuelle Position', tr: 'Mevcut Pozisyon' },
      { key: 'income.manageHouseholdIncome', category: 'income', en: 'Manage your household income entries', de: 'Verwalten Sie Ihre Haushaltseinkommen', tr: 'Hane gelir girişlerinizi yönetin' },
      { key: 'income.recurringOnly', category: 'income', en: 'Recurring Only', de: 'Nur Wiederkehrende', tr: 'Sadece Tekrarlayan' },
      { key: 'income.oneTimeOnly', category: 'income', en: 'One-time Only', de: 'Nur Einmalige', tr: 'Sadece Tek Seferlik' },
      { key: 'income.period', category: 'income', en: 'Period', de: 'Zeitraum', tr: 'Dönem' },
      { key: 'income.actions', category: 'income', en: 'Actions', de: 'Aktionen', tr: 'İşlemler' },
      { key: 'income.getStartedDescription', category: 'income', en: 'Get started by adding a new income entry.', de: 'Beginnen Sie mit dem Hinzufügen eines neuen Einkommenseintrags.', tr: 'Yeni bir gelir girişi ekleyerek başlayın.' },
      { key: 'income.to', category: 'income', en: 'to', de: 'bis', tr: 'ile' },
      { key: 'income.deleteConfirmation', category: 'income', en: 'Are you sure you want to delete this income entry? This action cannot be undone.', de: 'Sind Sie sicher, dass Sie diesen Einkommenseintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.', tr: 'Bu gelir girişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.' },
      { key: 'income.breakdown', category: 'income', en: 'Breakdown', de: 'Aufschlüsselung', tr: 'Dağılım' },
      { key: 'income.entries', category: 'income', en: 'entries', de: 'Einträge', tr: 'giriş' },
      { key: 'income.leaveEmptyForOngoing', category: 'income', en: 'Leave empty for ongoing income', de: 'Für laufendes Einkommen leer lassen', tr: 'Devam eden gelir için boş bırakın' },
      { key: 'income.selectCategory', category: 'income', en: 'Select Category', de: 'Kategorie auswählen', tr: 'Kategori Seçin' },
      { key: 'income.searchCategories', category: 'income', en: 'Search categories...', de: 'Kategorien suchen...', tr: 'Kategorileri ara...' },
      { key: 'income.default', category: 'income', en: 'Default', de: 'Standard', tr: 'Varsayılan' },
      { key: 'income.noCategoriesFound', category: 'income', en: 'No categories found', de: 'Keine Kategorien gefunden', tr: 'Kategori bulunamadı' },
      { key: 'income.categoryNotFoundHint', category: 'income', en: 'Category not found? Contact admin to add new categories.', de: 'Kategorie nicht gefunden? Kontaktieren Sie den Administrator, um neue Kategorien hinzuzufügen.', tr: 'Kategori bulunamadı mı? Yeni kategoriler eklemek için yöneticiyle iletişime geçin.' },
      { key: 'income.selectMember', category: 'income', en: 'Select Member', de: 'Mitglied auswählen', tr: 'Üye Seçin' },
      { key: 'income.totalAmount', category: 'income', en: 'Total Amount', de: 'Gesamtbetrag', tr: 'Toplam Tutar' },
      { key: 'income.averageAmount', category: 'income', en: 'Average Amount', de: 'Durchschnittsbetrag', tr: 'Ortalama Tutar' },
      { key: 'income.recurringIncome', category: 'income', en: 'Recurring Income', de: 'Wiederkehrendes Einkommen', tr: 'Tekrarlanan Gelir' },
      { key: 'income.oneTimeIncome', category: 'income', en: 'One-time Income', de: 'Einmaliges Einkommen', tr: 'Tek Seferlik Gelir' },
      { key: 'income.monthlyIncome', category: 'income', en: 'Monthly Income', de: 'Monatliches Einkommen', tr: 'Aylık Gelir' },
      { key: 'income.monthlyEquivalent', category: 'income', en: 'Monthly Equivalent', de: 'Monatliches Äquivalent', tr: 'Aylık Eşdeğer' },
      { key: 'income.amountRequired', category: 'income', en: 'Amount is required', de: 'Betrag ist erforderlich', tr: 'Tutar gereklidir' },
      { key: 'income.startDateRequired', category: 'income', en: 'Start date is required', de: 'Startdatum ist erforderlich', tr: 'Başlangıç tarihi gereklidir' },
      { key: 'income.endDateAfterStart', category: 'income', en: 'End date must be after start date', de: 'Enddatum muss nach dem Startdatum liegen', tr: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' },

      // Family Members
      { key: 'familyMembers.title', category: 'familyMembers', en: 'Family Members', de: 'Familienmitglieder', tr: 'Aile Üyeleri' },
      { key: 'familyMembers.addMember', category: 'familyMembers', en: 'Add Member', de: 'Mitglied hinzufügen', tr: 'Üye Ekle' },
      { key: 'familyMembers.editMember', category: 'familyMembers', en: 'Edit Member', de: 'Mitglied bearbeiten', tr: 'Üye Düzenle' },
      { key: 'familyMembers.deleteMember', category: 'familyMembers', en: 'Delete Member', de: 'Mitglied löschen', tr: 'Üye Sil' },
      { key: 'familyMembers.name', category: 'familyMembers', en: 'Name', de: 'Name', tr: 'İsim' },
      { key: 'familyMembers.relationship', category: 'familyMembers', en: 'Relationship', de: 'Beziehung', tr: 'İlişki' },
      { key: 'familyMembers.dateOfBirth', category: 'familyMembers', en: 'Date of Birth', de: 'Geburtsdatum', tr: 'Doğum Tarihi' },
      { key: 'familyMembers.notes', category: 'familyMembers', en: 'Notes', de: 'Notizen', tr: 'Notlar' },
      { key: 'familyMembers.shared', category: 'familyMembers', en: 'Shared', de: 'Geteilt', tr: 'Paylaşılan' },
      { key: 'familyMembers.householdShared', category: 'familyMembers', en: 'Household (Shared)', de: 'Haushalt (Geteilt)', tr: 'Hane (Paylaşılan)' },
      { key: 'familyMembers.assignments', category: 'familyMembers', en: 'Assignments', de: 'Zuweisungen', tr: 'Atamalar' },
      { key: 'familyMembers.incomeAssignments', category: 'familyMembers', en: 'Income Assignments', de: 'Einkommenszuweisungen', tr: 'Gelir Atamaları' },
      { key: 'familyMembers.assetAssignments', category: 'familyMembers', en: 'Asset Assignments', de: 'Vermögenszuweisungen', tr: 'Varlık Atamaları' },
      { key: 'familyMembers.contractAssignments', category: 'familyMembers', en: 'Contract Assignments', de: 'Vertragszuweisungen', tr: 'Sözleşme Atamaları' },
      { key: 'familyMembers.noMembersFound', category: 'familyMembers', en: 'No family members found', de: 'Keine Familienmitglieder gefunden', tr: 'Aile üyesi bulunamadı' },
    { key: 'familyMembers.membersCount', category: 'familyMembers', en: '{{count}} family members', de: '{{count}} Familienmitglieder', tr: '{{count}} aile üyesi' },
      { key: 'familyMembers.cannotDeleteShared', category: 'familyMembers', en: 'Cannot delete shared household member', de: 'Geteiltes Haushaltsmitglied kann nicht gelöscht werden', tr: 'Paylaşılan hane üyesi silinemez' },
      { key: 'familyMembers.cannotEditShared', category: 'familyMembers', en: 'Cannot edit shared household member', de: 'Geteiltes Haushaltsmitglied kann nicht bearbeitet werden', tr: 'Paylaşılan hane üyesi düzenlenemez' },
      { key: 'familyMembers.hasDependencies', category: 'familyMembers', en: 'Cannot delete member with assigned income or assets', de: 'Mitglied mit zugewiesenem Einkommen oder Vermögen kann nicht gelöscht werden', tr: 'Atanmış gelir veya varlığı olan üye silinemez' },

      // Income Categories
      { key: 'incomeCategories.title', category: 'incomeCategories', en: 'Income Categories', de: 'Einkommenskategorien', tr: 'Gelir Kategorileri' },
      { key: 'incomeCategories.addCategory', category: 'incomeCategories', en: 'Add Category', de: 'Kategorie hinzufügen', tr: 'Kategori Ekle' },
      { key: 'incomeCategories.editCategory', category: 'incomeCategories', en: 'Edit Category', de: 'Kategorie bearbeiten', tr: 'Kategori Düzenle' },
      { key: 'incomeCategories.deleteCategory', category: 'incomeCategories', en: 'Delete Category', de: 'Kategorie löschen', tr: 'Kategoriyi Sil' },
      { key: 'incomeCategories.manageCategories', category: 'incomeCategories', en: 'Manage income categories for your household', de: 'Einkommenskategorien für Ihren Haushalt verwalten', tr: 'Hane gelir kategorilerini yönetin' },
      { key: 'incomeCategories.noCategories', category: 'incomeCategories', en: 'No categories found', de: 'Keine Kategorien gefunden', tr: 'Kategori bulunamadı' },
      { key: 'incomeCategories.getStarted', category: 'incomeCategories', en: 'Get started by creating your first category', de: 'Beginnen Sie mit der Erstellung Ihrer ersten Kategorie', tr: 'İlk kategorinizi oluşturarak başlayın' },
      { key: 'incomeCategories.name', category: 'incomeCategories', en: 'Name', de: 'Name', tr: 'Ad' },
      { key: 'incomeCategories.type', category: 'incomeCategories', en: 'Type', de: 'Typ', tr: 'Tür' },
      { key: 'incomeCategories.default', category: 'incomeCategories', en: 'Default', de: 'Standard', tr: 'Varsayılan' },
      { key: 'incomeCategories.custom', category: 'incomeCategories', en: 'Custom', de: 'Benutzerdefiniert', tr: 'Özel' },
      { key: 'incomeCategories.editCategory', category: 'incomeCategories', en: 'Edit Category', de: 'Kategorie bearbeiten', tr: 'Kategoriyi Düzenle' },
      { key: 'incomeCategories.deleteConfirmation', category: 'incomeCategories', en: 'Are you sure you want to delete this category? This action cannot be undone.', de: 'Sind Sie sicher, dass Sie diese Kategorie löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.', tr: 'Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.' },
      { key: 'incomeCategories.allCategories', category: 'incomeCategories', en: 'All Categories', de: 'Alle Kategorien', tr: 'Tüm Kategoriler' },
      { key: 'incomeCategories.salary', category: 'incomeCategories', en: 'Salary', de: 'Gehalt', tr: 'Maaş' },
      { key: 'incomeCategories.freelance', category: 'incomeCategories', en: 'Freelance', de: 'Freiberuflich', tr: 'Serbest Meslek' },
      { key: 'incomeCategories.rentalIncome', category: 'incomeCategories', en: 'Rental Income', de: 'Mieteinnahmen', tr: 'Kira Geliri' },
      { key: 'incomeCategories.investments', category: 'incomeCategories', en: 'Investments', de: 'Investitionen', tr: 'Yatırımlar' },
      { key: 'incomeCategories.dividends', category: 'incomeCategories', en: 'Dividends', de: 'Dividenden', tr: 'Temettüler' },
      { key: 'incomeCategories.gifts', category: 'incomeCategories', en: 'Gifts', de: 'Geschenke', tr: 'Hediyeler' },
      { key: 'incomeCategories.bonus', category: 'incomeCategories', en: 'Bonus', de: 'Bonus', tr: 'Bonus' },
      { key: 'incomeCategories.pension', category: 'incomeCategories', en: 'Pension', de: 'Rente', tr: 'Emekli Maaşı' },
      { key: 'incomeCategories.socialBenefits', category: 'incomeCategories', en: 'Social Benefits', de: 'Sozialleistungen', tr: 'Sosyal Yardımlar' },
      { key: 'incomeCategories.other', category: 'incomeCategories', en: 'Other', de: 'Sonstiges', tr: 'Diğer' },
      { key: 'incomeCategories.manageCategories', category: 'incomeCategories', en: 'Manage income categories for your household', de: 'Einkommenskategorien für Ihren Haushalt verwalten', tr: 'Hane gelir kategorilerini yönetin' },
      { key: 'incomeCategories.name', category: 'incomeCategories', en: 'Name', de: 'Name', tr: 'Ad' },
      { key: 'incomeCategories.incomeCount', category: 'incomeCategories', en: 'Income Items', de: 'Einkommenseinträge', tr: 'Gelir Öğeleri' },
      { key: 'incomeCategories.nameEn', category: 'incomeCategories', en: 'Name (English)', de: 'Name (Englisch)', tr: 'İsim (İngilizce)' },
      { key: 'incomeCategories.nameDe', category: 'incomeCategories', en: 'Name (German)', de: 'Name (Deutsch)', tr: 'İsim (Almanca)' },
      { key: 'incomeCategories.nameTr', category: 'incomeCategories', en: 'Name (Turkish)', de: 'Name (Türkisch)', tr: 'İsim (Türkçe)' },
      { key: 'incomeCategories.isDefault', category: 'incomeCategories', en: 'Default Category', de: 'Standardkategorie', tr: 'Varsayılan Kategori' },
      { key: 'incomeCategories.noCategoriesFound', category: 'incomeCategories', en: 'No income categories found', de: 'Keine Einkommenskategorien gefunden', tr: 'Gelir kategorisi bulunamadı' },
      { key: 'incomeCategories.cannotDeleteDefault', category: 'incomeCategories', en: 'Cannot delete default category', de: 'Standardkategorie kann nicht gelöscht werden', tr: 'Varsayılan kategori silinemez' },
      { key: 'incomeCategories.hasDependencies', category: 'incomeCategories', en: 'Cannot delete category with assigned income entries', de: 'Kategorie mit zugewiesenen Einkommenseinträgen kann nicht gelöscht werden', tr: 'Atanmış gelir girişi olan kategori silinemez' },

      // Additional Income Keys (missing from Income page)
      { key: 'common.saving', category: 'common', en: 'Saving...', de: 'Speichern...', tr: 'Kaydediliyor...' },
      { key: 'common.update', category: 'common', en: 'Update', de: 'Aktualisieren', tr: 'Güncelle' }
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