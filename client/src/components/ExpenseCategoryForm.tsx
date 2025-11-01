import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseGiftForm from './ExpenseGiftForm';
import ExpenseCreditForm from './ExpenseCreditForm';
import ExpenseBillForm from './ExpenseBillForm';
import ExpenseTaxForm from './ExpenseTaxForm';
import ExpenseBausparvertragForm from './ExpenseBausparvertragForm';
import ExpenseInsuranceForm from './ExpenseInsuranceForm';
import ExpenseSubscriptionForm from './ExpenseSubscriptionForm';
import ExpenseSchoolForm from './ExpenseSchoolForm';

interface ExpenseCategoryFormProps {
  categoryType?: string;
  linkedMemberIds: number[];
  linkedAssetId?: number;
  creditUseType?: 'free_use' | 'renovation' | 'property_purchase' | 'other' | '';
  metadata?: Record<string, any>;
  onLinkedMembersChange: (memberIds: number[]) => void;
  onLinkedAssetChange: (assetId: number | null) => void;
  onCreditUseTypeChange: (useType: 'free_use' | 'renovation' | 'property_purchase' | 'other' | '', assetId?: number) => void;
  onMetadataChange: (metadata: Record<string, any>) => void;
  members?: Array<{id: number; first_name: string; last_name: string}>;
  insuranceSuggestions?: Array<{name: string}>;
  isSubcategory?: boolean; // If true, hide bill type selector since subcategory already selected
  shareWithExternalPersons?: boolean;
  onShareWithExternalPersonsChange?: (share: boolean) => void;
  errors?: {
    linkedMembers?: string;
    linkedAsset?: string;
    creditUseType?: string;
  };
}

const ExpenseCategoryForm: React.FC<ExpenseCategoryFormProps> = ({
  categoryType,
  linkedMemberIds,
  linkedAssetId,
  creditUseType,
  metadata = {},
  onLinkedMembersChange,
  onLinkedAssetChange,
  onCreditUseTypeChange,
  onMetadataChange,
  members = [],
  insuranceSuggestions = [],
  isSubcategory = false,
  shareWithExternalPersons = false,
  onShareWithExternalPersonsChange,
  errors = {}
}) => {
  const { t } = useTranslation();

  // Render appropriate form based on category type
  switch (categoryType) {
    case 'gift':
      return (
        <ExpenseGiftForm
          linkedMemberIds={linkedMemberIds}
          externalPersonIds={metadata.external_person_ids || []}
          onChange={onLinkedMembersChange}
          onExternalPersonsChange={(externalIds) => onMetadataChange({ ...metadata, external_person_ids: externalIds })}
          shareWithExternalPersons={shareWithExternalPersons}
          onShareChange={(share) => {
            if (onShareWithExternalPersonsChange) {
              onShareWithExternalPersonsChange(share);
            }
          }}
          error={errors?.linkedMembers}
        />
      );

    case 'insurance':
      return (
        <ExpenseInsuranceForm
          coverageType={metadata.coverage_type}
          linkedAssetId={linkedAssetId}
          linkedMemberIds={linkedMemberIds}
          insuranceCompany={metadata.insurance_company}
          insuranceNumber={metadata.insurance_number}
          recurringPaymentDate={metadata.recurring_payment_date}
          vehicleAssetId={metadata.vehicle_asset_id}
          onChange={(data) => onMetadataChange({ ...metadata, ...data })}
          onLinkedAssetChange={onLinkedAssetChange}
          onLinkedMembersChange={onLinkedMembersChange}
          members={members}
          insuranceSuggestions={insuranceSuggestions}
          error={errors?.linkedAsset || errors?.linkedMembers}
        />
      );

    case 'subscription':
      return (
        <ExpenseSubscriptionForm
          subscriptionProvider={metadata.subscription_provider}
          subscriptionTier={metadata.subscription_tier}
          onChange={(data) => onMetadataChange({ ...metadata, ...data })}
          error={errors?.linkedAsset}
        />
      );

    case 'school':
      return (
        <ExpenseSchoolForm
          expenseType={metadata.expense_type}
          linkedMemberIds={linkedMemberIds}
          onChange={(data) => {
            if (data.linked_member_ids !== undefined) {
              onLinkedMembersChange(data.linked_member_ids);
            }
            onMetadataChange({ ...metadata, expense_type: data.expense_type });
          }}
          error={errors?.linkedMembers}
        />
      );

    case 'credit':
      return (
        <ExpenseCreditForm
          creditUseType={creditUseType || ''}
          linkedAssetId={linkedAssetId}
          onChange={(useType, assetId) => {
            onCreditUseTypeChange(useType, assetId);
            if (assetId !== undefined) {
              onLinkedAssetChange(assetId);
            }
          }}
          error={errors?.creditUseType || errors?.linkedAsset}
        />
      );

    case 'bill':
      return (
        <ExpenseBillForm
          linkedAssetId={linkedAssetId}
          billType={metadata.bill_type}
          onChange={(assetId, billType) => {
            onLinkedAssetChange(assetId);
            onMetadataChange({ ...metadata, bill_type: billType });
          }}
          error={errors?.linkedAsset}
          hideBillType={isSubcategory} // Hide if subcategory already selected
        />
      );

    case 'tax':
      return (
        <ExpenseTaxForm
          linkedAssetId={linkedAssetId}
          taxType={metadata.tax_type}
          onChange={(assetId, taxType) => {
            onLinkedAssetChange(assetId);
            onMetadataChange({ ...metadata, tax_type: taxType });
          }}
          error={errors?.linkedAsset}
        />
      );

    case 'bausparvertrag':
      return (
        <ExpenseBausparvertragForm
          linkedAssetId={linkedAssetId}
          interestRate={metadata.interest_rate}
          contractNumber={metadata.contract_number}
          onChange={(assetId, interestRate, contractNumber) => {
            onLinkedAssetChange(assetId);
            onMetadataChange({
              ...metadata,
              interest_rate: interestRate,
              contract_number: contractNumber
            });
          }}
          error={errors?.linkedAsset}
        />
      );

    default:
      // Standard form - no custom fields
      return null;
  }
};

export default ExpenseCategoryForm;

