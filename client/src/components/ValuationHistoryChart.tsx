import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ValuationHistoryEntry {
  valuation_date: string;
  value: number;
  currency: string;
  valuation_method?: string;
  notes?: string;
}

interface ValuationHistoryChartProps {
  history: ValuationHistoryEntry[];
  purchasePrice?: number;
  purchaseDate?: string;
  currentCurrency: string;
  className?: string;
}

const ValuationHistoryChart: React.FC<ValuationHistoryChartProps> = ({
  history,
  purchasePrice,
  purchaseDate,
  currentCurrency,
  className = ''
}) => {
  // Sort history by date
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.valuation_date).getTime() - new Date(b.valuation_date).getTime()
  );

  const dates = sortedHistory.map(h => {
    const date = new Date(h.valuation_date);
    return date.toLocaleDateString();
  });

  const values = sortedHistory.map(h => h.value);

  // Add purchase point if available
  let chartDates = dates;
  let chartValues = values;
  
  if (purchasePrice && purchaseDate) {
    const purchaseDateStr = new Date(purchaseDate).toLocaleDateString();
    chartDates = [purchaseDateStr, ...dates];
    chartValues = [purchasePrice, ...values];
  }

  // Calculate appreciation/depreciation
  let appreciation = null;
  if (chartValues.length > 1) {
    const firstValue = chartValues[0];
    const lastValue = chartValues[chartValues.length - 1];
    appreciation = ((lastValue - firstValue) / firstValue) * 100;
  }

  const data = {
    labels: chartDates,
    datasets: [
      {
        label: 'Valuation History',
        data: chartValues,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'rgb(255, 255, 255)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const index = context.dataIndex;
            const value = context.parsed.y;
            const date = chartDates[index];
            return `${currentCurrency} ${value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} on ${date}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return `${currentCurrency} ${value.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}`;
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className={`${className}`}>
      {appreciation !== null && chartValues.length > 1 && (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {purchaseDate && chartDates[0] ? 'Purchase Price' : 'First Valuation'}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentCurrency} {chartValues[0].toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {appreciation > 0 ? 'Appreciation' : 'Depreciation'}
            </span>
            <span className={`text-sm font-bold ${appreciation > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {appreciation > 0 ? '+' : ''}{appreciation.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
      
      <div style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>

      {history.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No valuation history available</p>
          <p className="text-sm mt-2">Add a valuation to see history over time</p>
        </div>
      )}
    </div>
  );
};

export default ValuationHistoryChart;

