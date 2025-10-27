import type { Asset } from './assetUtils';

/**
 * Export assets to CSV format
 */
export const exportToCSV = (assets: Asset[], filename: string = 'assets-export'): void => {
  if (assets.length === 0) {
    alert('No assets to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Name',
    'Category',
    'Current Value',
    'Currency',
    'Purchase Price',
    'Purchase Currency',
    'Purchase Date',
    'Owner',
    'Ownership Type',
    'Ownership %',
    'Status',
    'Location',
    'Last Valuation',
    'Notes'
  ];

  // Convert assets to CSV rows
  const rows = assets.map(asset => [
    asset.name || '',
    asset.category_name_en || '',
    (asset.current_value || asset.amount || 0).toString(),
    asset.currency || '',
    (asset.purchase_price || 0).toString(),
    asset.purchase_currency || asset.currency || '',
    asset.purchase_date || '',
    asset.member_name || '',
    asset.ownership_type || '',
    (asset.ownership_percentage || 0).toString(),
    asset.status || '',
    asset.location || '',
    asset.last_valuation_date || '',
    (asset.notes || '').replace(/\r?\n/g, ' ')
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export assets to PDF (using window.print with formatted HTML)
 * This is a simple implementation that opens print dialog
 */
export const exportToPDF = (assets: Asset[], summary?: any, filename: string = 'assets-report'): void => {
  if (assets.length === 0) {
    alert('No assets to export');
    return;
  }

  // Create printable HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export to PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Assets Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #666;
        }
        .summary-card p {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        @media print {
          @page {
            margin: 1cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Assets Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>

      ${summary ? `
        <div class="summary">
          <div class="summary-card">
            <h3>Total Assets</h3>
            <p>${summary.total_assets}</p>
          </div>
          <div class="summary-card">
            <h3>Total Value</h3>
            <p>${summary.main_currency} ${summary.total_value_main_currency.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          ${summary.average_roi ? `
            <div class="summary-card">
              <h3>Average ROI</h3>
              <p>${summary.average_roi.toFixed(1)}%</p>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Value</th>
            <th>Status</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          ${assets.map(asset => `
            <tr>
              <td>${asset.name}</td>
              <td>${asset.category_name_en}</td>
              <td>${(asset.current_value || asset.amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })} ${asset.currency}</td>
              <td>${asset.status}</td>
              <td>${asset.member_name || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report was generated automatically by FamHub</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Trigger print after content is loaded
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Export to JSON format (useful for data backup)
 */
export const exportToJSON = (assets: Asset[], filename: string = 'assets-export'): void => {
  if (assets.length === 0) {
    alert('No assets to export');
    return;
  }

  const jsonContent = JSON.stringify(assets, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

