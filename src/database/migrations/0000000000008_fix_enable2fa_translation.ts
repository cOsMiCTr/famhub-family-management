import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Fix the settings.enable2FA translation to have short button text
  await knex('translations')
    .where('translation_key', 'settings.enable2FA')
    .update({
      en: 'Enable 2FA',
      de: '2FA aktivieren',
      tr: '2FA\'yı Etkinleştir',
      updated_at: knex.fn.now()
    });
  
  console.log('✅ Fixed settings.enable2FA translation');
}

export async function down(knex: Knex): Promise<void> {
  // Revert to long text (if needed)
  await knex('translations')
    .where('translation_key', 'settings.enable2FA')
    .update({
      en: 'Enable two-factor authentication to secure your account with a second verification step.',
      de: 'Aktivieren Sie die Zwei-Faktor-Authentifizierung, um Ihr Konto mit einem zweiten Verifizierungsschritt zu sichern.',
      tr: 'Hesabınızı ikinci bir doğrulama adımıyla güvence altına almak için iki faktörlü kimlik doğrulamayı etkinleştirin.',
      updated_at: knex.fn.now()
    });
}

