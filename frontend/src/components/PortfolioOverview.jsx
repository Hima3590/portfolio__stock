import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function PortfolioOverview({ refreshTrigger = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortfolioData();
  }, [refreshTrigger]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/stocks/portfolio/overview`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setData(response.data);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError(err.response?.data?.error || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-400 text-lg">Loading portfolio overview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-6 mb-8">
        <p className="text-red-200 font-semibold">Error</p>
        <p className="text-red-300">{error}</p>
        <button
          onClick={fetchPortfolioData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-gray-400 text-center p-12">
        No portfolio data available
      </div>
    );
  }

  const isPositive = data.profitLoss >= 0;

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">Portfolio Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Invested Card */}
        <div className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800 hover:border-blue-500 transition">
          <p className="text-gray-400 text-sm font-medium mb-3">Total Invested</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(data.totalInvested)}
          </p>
          <div className="h-1 w-12 bg-blue-500 rounded mt-4"></div>
        </div>

        {/* Current Value Card */}
        <div className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-800 hover:border-green-500 transition">
          <p className="text-gray-400 text-sm font-medium mb-3">Current Value</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(data.currentValue)}
          </p>
          <div className="h-1 w-12 bg-green-500 rounded mt-4"></div>
        </div>

        {/* Profit/Loss Card */}
        <div
          className={`rounded-xl shadow-lg p-6 border transition ${
            isPositive
              ? 'bg-gray-900 border-green-700 hover:border-green-500'
              : 'bg-gray-900 border-red-700 hover:border-red-500'
          }`}
        >
          <p className="text-gray-400 text-sm font-medium mb-3">Profit / Loss</p>
          <p
            className={`text-3xl font-bold ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isPositive ? '▲' : '▼'} {formatCurrency(data.profitLoss)}
          </p>
          <p
            className={`text-sm font-medium mt-2 ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {formatPercent(data.profitLossPercent)}
          </p>
          <div className={`h-1 w-12 rounded mt-4 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>
    </div>
  );
}
