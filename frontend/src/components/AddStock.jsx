import { useState, useEffect } from 'react';
import { addStock } from '../api/stockApi';

export default function AddStock({ onStockAdded, prefilledSymbol = '' }) {
  const [symbol, setSymbol] = useState(prefilledSymbol);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // Update symbol when prefilledSymbol prop changes
  useEffect(() => {
    setSymbol(prefilledSymbol);
  }, [prefilledSymbol]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Extract only the ticker symbol (part before ' - ')
      const tickerSymbol = symbol.split(' - ')[0].toUpperCase().trim();
      
      await addStock({
        symbol: tickerSymbol,
        quantity: parseFloat(quantity),
        buyPrice: parseFloat(buyPrice)
      });
      
      // Reset form
      setSymbol('');
      setQuantity('');
      setBuyPrice('');
      
      // Notify parent to refresh stock list
      if (onStockAdded) {
        onStockAdded();
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      alert(error.response?.data?.error || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-12" id="add-stock-form">
      <h2 className="text-2xl font-bold mb-6 text-white">Add Stock</h2>
      <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
        <input
          type="text"
          placeholder="Symbol (e.g., AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          required
          className="px-4 py-2.5 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          min="0"
          step="0.01"
          className="px-4 py-2.5 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <input
          type="number"
          placeholder="Buy Price"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          required
          min="0"
          step="0.01"
          className="px-4 py-2.5 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'Adding...' : '+ Add Stock'}
        </button>
      </form>
    </div>
  );
}
