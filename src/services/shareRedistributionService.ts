import { query } from '../config/database';
import { CustomError } from '../utils/errors';

interface ShareOwner {
  household_member_id: number;
  ownership_percentage: number;
  member_name: string;
}

/**
 * Redistribute shares from a deleted user to remaining members
 * Only distributes to members who already have at least 1% ownership
 * Preserves total ownership at 100%
 */
export async function redistributeShares(assetId: number, deletedUserId: number): Promise<void> {
  try {
    // Get all current shares for this asset
    const sharesResult = await query(
      `SELECT 
        household_member_id,
        ownership_percentage,
        hm.name as member_name,
        hm.user_id
      FROM shared_ownership_distribution sod
      JOIN household_members hm ON sod.household_member_id = hm.id
      WHERE sod.asset_id = $1`,
      [assetId]
    );

    const shares: ShareOwner[] = sharesResult.rows;

    // Find the share belonging to the deleted user
    const deletedUserShare = shares.find(s => s.user_id === deletedUserId);
    
    if (!deletedUserShare) {
      // User has no share in this asset, nothing to redistribute
      return;
    }

    // Get remaining members with at least 1% ownership
    const remainingShares = shares.filter(s => 
      s.household_member_id !== deletedUserShare.household_member_id &&
      s.ownership_percentage >= 1
    );

    if (remainingShares.length === 0) {
      // No other members to redistribute to
      // Log warning but don't fail
      console.warn(`No members with shares >=1% found for asset ${assetId}, user share will be lost`);
      return;
    }

    // Calculate total percentage of remaining members
    const totalRemaining = remainingShares.reduce((sum, s) => sum + parseFloat(s.ownership_percentage.toString()), 0);
    
    if (totalRemaining === 0) {
      console.warn(`Total remaining shares is 0 for asset ${assetId}`);
      return;
    }

    // Calculate how much each member should receive proportionally
    const shareToDistribute = parseFloat(deletedUserShare.ownership_percentage.toString());
    
    // Update each remaining member's percentage
    for (const member of remainingShares) {
      // Calculate proportional increase
      // Formula: (their_current_share / total_of_others) * deleted_share
      const proportion = parseFloat(member.ownership_percentage.toString()) / totalRemaining;
      const additionalShare = proportion * shareToDistribute;
      const newPercentage = parseFloat(member.ownership_percentage.toString()) + additionalShare;

      // Update the share in database
      await query(
        `UPDATE shared_ownership_distribution 
         SET ownership_percentage = $1 
         WHERE asset_id = $2 AND household_member_id = $3`,
        [newPercentage.toFixed(2), assetId, member.household_member_id]
      );

      console.log(
        `Redistributed ${additionalShare.toFixed(2)}% to ${member.member_name} ` +
        `(old: ${member.ownership_percentage}%, new: ${newPercentage.toFixed(2)}%)`
      );
    }

    // Delete the deleted user's share entry
    await query(
      `DELETE FROM shared_ownership_distribution 
       WHERE asset_id = $1 AND household_member_id = $2`,
      [assetId, deletedUserShare.household_member_id]
    );

    console.log(`Successfully redistributed shares for asset ${assetId}`);
  } catch (error) {
    console.error(`Error redistributing shares for asset ${assetId}:`, error);
    throw error;
  }
}

