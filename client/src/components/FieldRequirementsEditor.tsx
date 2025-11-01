import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

interface FieldRequirement {
  required?: boolean;
  conditional?: {
    field: string;
    value: any;
  };
  multiple_allowed?: boolean;
}

interface FieldRequirements {
  [key: string]: FieldRequirement | FieldRequirements;
}

interface FieldRequirementsEditorProps {
  value: FieldRequirements | null;
  onChange: (value: FieldRequirements | null) => void;
  entityType: 'expense' | 'income' | 'asset';
}

// Standard fields for each entity type
const STANDARD_FIELDS: Record<string, string[]> = {
  expense: ['amount', 'currency', 'description', 'start_date', 'end_date', 'is_recurring', 'frequency', 'linked_asset_id', 'linked_member_ids'],
  income: ['amount', 'currency', 'description', 'start_date', 'end_date', 'is_recurring', 'frequency', 'household_member_id'],
  asset: ['name', 'category_id', 'value', 'currency', 'location', 'purchase_date', 'purchase_price', 'description', 'ownership_type', 'ticker']
};

const FieldRequirementsEditor: React.FC<FieldRequirementsEditorProps> = ({
  value,
  onChange,
  entityType
}) => {
  const { t } = useTranslation();
  const [fieldRequirements, setFieldRequirements] = useState<FieldRequirements>(value || {});
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'standard' | 'metadata'>('standard');

  useEffect(() => {
    if (value) {
      setFieldRequirements(value);
    }
  }, [value]);

  const updateFieldRequirement = (fieldName: string, updates: Partial<FieldRequirement>) => {
    const updated = {
      ...fieldRequirements,
      [fieldName]: {
        ...(fieldRequirements[fieldName] as FieldRequirement || {}),
        ...updates
      }
    };
    setFieldRequirements(updated);
    onChange(updated);
  };

  const removeField = (fieldName: string) => {
    const updated = { ...fieldRequirements };
    delete updated[fieldName];
    setFieldRequirements(updated);
    onChange(Object.keys(updated).length > 0 ? updated : null);
  };

  const addField = () => {
    if (!newFieldName.trim()) return;

    const fieldPath = newFieldType === 'metadata' ? `metadata.${newFieldName}` : newFieldName;
    
    updateFieldRequirement(fieldPath, {
      required: false
    });

    setNewFieldName('');
    setShowAddField(false);
  };

  const getFieldDisplayName = (fieldName: string): string => {
    // Handle metadata fields
    if (fieldName.startsWith('metadata.')) {
      return fieldName.replace('metadata.', '');
    }
    return fieldName;
  };

  const getAvailableFields = (): string[] => {
    return STANDARD_FIELDS[entityType] || [];
  };

  const getFieldsToDisplay = (): Array<{ key: string; isMetadata: boolean }> => {
    const fields: Array<{ key: string; isMetadata: boolean }> = [];
    
    for (const key of Object.keys(fieldRequirements)) {
      if (key === 'metadata' && typeof fieldRequirements[key] === 'object') {
        // Handle nested metadata fields
        const metadata = fieldRequirements[key] as FieldRequirements;
        for (const metaKey of Object.keys(metadata)) {
          fields.push({ key: `metadata.${metaKey}`, isMetadata: true });
        }
      } else {
        fields.push({ key, isMetadata: false });
      }
    }
    
    return fields;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('expenseCategories.fieldRequirements') || 'Field Requirements'}
        </label>
        <button
          type="button"
          onClick={() => setShowAddField(true)}
          className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          {t('expenseCategories.addField') || 'Add Field'}
        </button>
      </div>

      {getFieldsToDisplay().length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('expenseCategories.noFieldRequirements') || 'No field requirements configured. All fields are optional by default.'}
        </div>
      ) : (
        <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-md p-3">
          {getFieldsToDisplay().map(({ key, isMetadata }) => {
            const req = fieldRequirements[key] || 
              (isMetadata && fieldRequirements.metadata ? (fieldRequirements.metadata as FieldRequirements)[key.replace('metadata.', '')] : null) ||
              {} as FieldRequirement;
            
            return (
              <div key={key} className="flex items-start space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getFieldDisplayName(key)}
                      {isMetadata && (
                        <span className="ml-1 text-xs text-gray-500">(metadata)</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(key)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={req.required || false}
                        onChange={(e) => updateFieldRequirement(key, { required: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                        {t('expenseCategories.required') || 'Required'}
                      </span>
                    </label>

                    {/* Conditional requirement */}
                    {(key === 'frequency' || key.includes('frequency')) && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!!req.conditional}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFieldRequirement(key, {
                                conditional: {
                                  field: 'is_recurring',
                                  value: true
                                }
                              });
                            } else {
                              const { conditional, ...rest } = req;
                              updateFieldRequirement(key, rest);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                          {t('expenseCategories.conditional') || 'Conditional (when recurring)'}
                        </span>
                      </label>
                    )}

                    {/* Multiple allowed for member links */}
                    {(key === 'linked_member_ids' || key.includes('member')) && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={req.multiple_allowed !== false}
                          onChange={(e) => updateFieldRequirement(key, { multiple_allowed: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                          {t('expenseCategories.allowMultiple') || 'Allow Multiple'}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white dark:bg-gray-800 p-5 border w-96 shadow-lg rounded-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('expenseCategories.addField') || 'Add Field Requirement'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenseCategories.fieldType') || 'Field Type'}
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as 'standard' | 'metadata')}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="standard">{t('expenseCategories.standardField') || 'Standard Field'}</option>
                  <option value="metadata">{t('expenseCategories.metadataField') || 'Metadata Field'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {newFieldType === 'standard' 
                    ? (t('expenseCategories.selectField') || 'Select Field')
                    : (t('expenseCategories.fieldName') || 'Field Name')
                  }
                </label>
                {newFieldType === 'standard' ? (
                  <select
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t('expenseCategories.selectField') || 'Select field...'}</option>
                    {getAvailableFields()
                      .filter(field => !fieldRequirements[field] && !fieldRequirements[`metadata.${field}`])
                      .map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder={t('expenseCategories.fieldNamePlaceholder') || 'e.g., insurance_company'}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddField(false);
                  setNewFieldName('');
                  setNewFieldType('standard');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={addField}
                disabled={!newFieldName.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {t('common.add') || 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldRequirementsEditor;

