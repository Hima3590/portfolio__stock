import { useState, useContext } from 'react';
import AddStock from './components/AddStock';
import StockList from './components/StockList';
import StockSummary from './components/StockSummary';
import PortfolioOverview from './components/PortfolioOverview';
import PortfolioCharts from './components/PortfolioCharts';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthContext } from './context/AuthContext';
import StockSearch from './components/StockSearch';

import './index.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');

  const { token, logout } = useContext(AuthContext); // 🔹 reactive token

  const handleStockAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedSymbol(''); // Clear selected symbol after adding
  };

  const handleSelectStock = (stock) => {
    setSelectedSymbol(stock.symbol);
  };

  // 🔐 NOT LOGGED IN
  if (!token) {
    return (
      <div className="min-h-screen">
        {showRegister ? (
          <Register onSwitch={() => setShowRegister(false)} />
        ) : (
          <Login onSwitch={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  // ✅ LOGGED IN
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-black border-b border-gray-800 p-8 flex justify-between items-center shadow-lg">
        <h1 className="text-4xl font-bold m-0 text-white">📈 Portfolio Tracker</h1>
        <button
          onClick={logout}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
        >
          Logout
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <StockSearch onSelectStock={handleSelectStock} />
        <StockSummary refreshTrigger={refreshTrigger} />
        <PortfolioOverview refreshTrigger={refreshTrigger} />
        <PortfolioCharts refreshTrigger={refreshTrigger} />
        <AddStock onStockAdded={handleStockAdded} prefilledSymbol={selectedSymbol} />
        <StockList refreshTrigger={refreshTrigger} onStockUpdated={handleStockAdded} />
      </main>
    </div>
  );
}

export default App;
