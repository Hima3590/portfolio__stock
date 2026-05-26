import { useState, useEffect } from 'react';
import { searchStocks, getPortfolioStockInfo, getLivePrice } from '../api/stockApi';

export default function StockSearch({ onSelectStock }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stockInfo, setStockInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState(null);

  // Search stocks
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setError(null);
    setStockInfo(null);
    setInfoError(null);

    try {
      const data = await searchStocks(query);
      setResults(data);
      if (!data?.length) {
        setError('No stocks found for that query.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch stocks.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch portfolio info or live price
  const handleSelectStock = async (stock) => {
    onSelectStock(stock);
    setStockInfo(null);
    setInfoError(null);
    setInfoLoading(true);

    try {
      // Try to get portfolio info first (includes profit/loss if in portfolio)
      const data = await getPortfolioStockInfo(stock.symbol);
      setStockInfo(data);
    } catch (err) {
      // If not in portfolio (404), just get live price
      if (err.response?.status === 404) {
        try {
          const priceData = await getLivePrice(stock.symbol);
          setStockInfo({
            symbol: priceData.symbol,
            currentPrice: priceData.price,
            buyPrice: null,
            quantity: null,
            profitLoss: null,
            percentChange: null,
            notInPortfolio: true
          });
        } catch (priceErr) {
          console.error(priceErr);
          setInfoError('Stock not in your portfolio. Add it first to track profit/loss.');
        }
      } else {
        console.error(err.response || err.message);
        setInfoError('Failed to fetch stock info.');
      }
    } finally {
      setInfoLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search stocks..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Search
        </button>
      </form>

      {loading && <p className="text-gray-600 mt-2">Searching...</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-2 border border-gray-700 rounded-md overflow-hidden bg-gray-900">
          {results.map(stock => (
            <li
              key={stock.symbol}
              className="p-2 hover:bg-gray-800 cursor-pointer flex justify-between border-b border-gray-700 last:border-b-0"
              onClick={() => handleSelectStock(stock)}
            >
              <span className="text-white">{stock.symbol} - {stock.name}</span>
              <span className="text-gray-400">{stock.region}</span>
            </li>
          ))}
        </ul>
      )}

      {infoLoading && <p className="mt-2 text-gray-600">Fetching stock info...</p>}
      {infoError && <p className="mt-2 text-red-600">{infoError}</p>}
      {stockInfo && (
        <div className="mt-2 p-4 border border-gray-700 rounded-lg bg-gray-900">
          <p className="text-white"><strong>Live Price:</strong> ${stockInfo.currentPrice.toFixed(2)}</p>
          {stockInfo.notInPortfolio ? (
            <div className="mt-3">
              <p className="text-gray-400 italic mb-3">Add this stock to your portfolio to track profit/loss</p>
              <button
                onClick={() => document.getElementById('add-stock-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ✓ Use {stockInfo.symbol} to Add Stock
              </button>
            </div>
          ) : (
            <>
              <p className="text-white">
                <strong>Profit / Loss:</strong>{' '}
                <span className={parseFloat(stockInfo.profitLoss) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ${stockInfo.profitLoss}
                </span>
              </p>
              <p className="text-white">
                <strong>% Change:</strong>{' '}
                <span className={parseFloat(stockInfo.percentChange) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {stockInfo.percentChange}%
                </span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
