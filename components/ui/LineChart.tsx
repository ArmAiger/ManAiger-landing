'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: ChartData<'line'>;
  height?: number;
  options?: Partial<ChartOptions<'line'>>;
}

export default function LineChart({ data, height = 400, options = {} }: LineChartProps) {
  // Early return if data is not properly structured
  if (!data || !data.labels || !data.datasets) {
    console.error('Invalid chart data structure:', data);
    return (
      <div 
        style={{ height: `${height}px` }}
        className="flex items-center justify-center bg-gray-50 rounded-lg"
      >
        <div className="text-center text-gray-500">
          <p>Invalid chart data</p>
          <p className="text-sm mt-1">Labels or datasets are missing</p>
        </div>
      </div>
    );
  }
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            
            // Format numbers with commas
            const value = context.parsed.y;
            if (label.includes('Rate') || label.includes('%')) {
              label += value.toFixed(2) + '%';
            } else {
              label += value.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            // Format large numbers
            if (typeof value === 'number') {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              } else {
                return value.toLocaleString();
              }
            }
            return value;
          }
        }
      },
      percentage: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value) {
            return typeof value === 'number' ? value.toFixed(1) + '%' : value;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
        borderWidth: 2
      },
      line: {
        borderWidth: 2,
        tension: 0.4
      }
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales
    }
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
}
