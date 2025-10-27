import React, { useCallback } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationData {
  category_name: string;
  total_value: number;
  percentage: number;
}

interface AssetAllocationChartProps {
  allocationData: AllocationData[];
  currency: string;
  onCategoryClick?: (categoryName: string) => void;
  className?: string;
}

const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({
  allocationData,
  currency,
  onCategoryClick,
  className = ''
}) => {
  // Color palette for the chart
  const colors = [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(16, 185, 129, 0.8)',   // green
    'rgba(245, 158, 11, 0.8)',   // yellow
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(139, 92, 246, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
    'rgba(6, 182, 212, 0.8)',    // cyan
    'rgba(34, 197, 94, 0.8)',    // lime
    'rgba(249, 115, 22, 0.8)',   // orange
    'rgba(168, 85, 247, 0.8)'    // violet
  ];

  const data = {
    labels: allocationData.map(item => item.category_name),
    datasets: [
      {
        label: 'Asset Allocation',
        data: allocationData.map(item => item.total_value),
        backgroundColor: colors.slice(0, allocationData.length),
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 2,
        hoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          },
          generateLabels: (chart: any) => {
            const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original(chart);
            
            return labels.map((label: any, index: number) => {
              const dataPoint = allocationData[index];
              if (dataPoint) {
                label.text = `${label.text} (${dataPoint.percentage.toFixed(1)}%)`;
              }
              return label;
            });
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const item = allocationData[context.dataIndex];
            return [
              `${label}`,
              `Value: ${currency} ${value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              `Percentage: ${item?.percentage.toFixed(2)}%`
            ];
          }
        }
      }
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onCategoryClick) {
        const elementIndex = elements[0].index;
        const clickedCategory = allocationData[elementIndex].category_name;
        onCategoryClick(clickedCategory);
      }
    }
  };

  const totalValue = allocationData.reduce((sum, item) => sum + item.total_value, 0);

  return (
    <div className={className}>
      <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Asset Allocation
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {currency} {totalValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        </div>

        {allocationData.length > 0 ? (
          <div className="h-64">
            <Pie data={data} options={options} />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No allocation data available</p>
          </div>
        )}

        {onCategoryClick && allocationData.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Click on a segment to filter by category
          </p>
        )}
      </div>

      {/* Detailed breakdown table */}
      {allocationData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Allocation by Category
          </h4>
          <div className="space-y-2">
            {allocationData.map((item, index) => (
              <div
                key={item.category_name}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                onClick={() => onCategoryClick && onCategoryClick(item.category_name)}
                style={{
                  borderLeft: `4px solid ${colors[index % colors.length]}`
                }}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.category_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.percentage.toFixed(1)}% of total
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currency} {item.total_value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetAllocationChart;

