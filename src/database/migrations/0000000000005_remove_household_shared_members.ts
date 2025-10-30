import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove all "Household (Shared)" legacy members from all households
  // First, update any assets/income that reference these members to null
  // Then delete the members themselves
  
  try {
    // Get all household member IDs with name "Household (Shared)"
    const sharedMembers = await knex('household_members')
      .where('name', 'Household (Shared)')
      .select('id');
    
    const sharedMemberIds = sharedMembers.map(m => m.id);
    
    if (sharedMemberIds.length > 0) {
      console.log(`Found ${sharedMemberIds.length} "Household (Shared)" members to remove`);
      
      // Update assets: set household_member_id to null for assets owned by shared members
      // Also need to update shared_ownership_distribution
      await knex('assets')
        .whereIn('household_member_id', sharedMemberIds)
        .update({ household_member_id: null });
      
      console.log('✓ Updated assets to remove references to shared members');
      
      // Remove from shared_ownership_distribution
      await knex('shared_ownership_distribution')
        .whereIn('household_member_id', sharedMemberIds)
        .delete();
      
      console.log('✓ Removed shared ownership distribution entries');
      
      // Update income: set household_member_id to null for income assigned to shared members
      await knex('income')
        .whereIn('household_member_id', sharedMemberIds)
        .update({ household_member_id: null });
      
      console.log('✓ Updated income to remove references to shared members');
      
      // Delete the household members
      await knex('household_members')
        .whereIn('id', sharedMemberIds)
        .delete();
      
      console.log(`✅ Removed ${sharedMemberIds.length} "Household (Shared)" members`);
    } else {
      console.log('No "Household (Shared)" members found');
    }
  } catch (error) {
    console.error('Error removing household shared members:', error);
    throw error;
  }
}

export async function down(knex: Knex): Promise<void> {
  // This migration cannot be easily reverted as we don't know which households
  // had shared members or which assets/income belonged to them
  console.log('⚠️  Cannot reverse removal of household shared members');
}

