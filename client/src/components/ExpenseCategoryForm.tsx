import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseGiftForm from './ExpenseGiftForm';
import ExpenseCreditForm from './ExpenseCreditForm';
import ExpenseBillForm from './ExpenseBillForm';
import ExpenseTaxForm from './ExpenseTaxForm';
import ExpenseBausparvertragForm from './ExpenseBausparvertragForm';

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
  errors
}) => {
  const { t } = useTranslation();

  // Render appropriate form based on category type
  switch (categoryType) {
    case 'gift':
      return (
        <ExpenseGiftForm
          linkedMemberIds={linkedMemberIds}
          onChange={onLinkedMembersChange}
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

