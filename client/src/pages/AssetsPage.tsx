import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import AssetList from '../components/AssetList';
import AssetForm from '../components/AssetForm';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const AssetsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [householdView, setHouseholdView] = useState(false);

  const handleAdd = () => {
    setEditingAsset(null);
    setIsFormOpen(true);
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingAsset(null);
  };

  const handleSave = () => {
    // The AssetList will automatically refresh when the form closes
    // This is handled by the useEffect in AssetList
  };

  const toggleView = () => {
    setHouseholdView(!householdView);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('assets.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your family's income and expenses
          </p>
        </div>
        
        {/* View Toggle */}
        {user?.household_id && (
          <button
            onClick={toggleView}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {householdView ? (
              <>
                <EyeSlashIcon className="h-4 w-4 mr-2" />
                Individual View
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4 mr-2" />
                Household View
              </>
            )}
          </button>
        )}
      </div>

      {/* Asset Management */}
      <AssetList
        onEdit={handleEdit}
        onAdd={handleAdd}
        householdView={householdView}
      />

      {/* Asset Form Modal */}
      <AssetForm
        asset={editingAsset}
        isOpen={isFormOpen}
        onClose={handleClose}
        onSave={handleSave}
        householdView={householdView}
      />
    </div>
  );
};

export default AssetsPage;
