import React, { useState, useEffect } from 'react';
import { blink } from './blink/client';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { NewTransfer } from './pages/NewTransfer';
import { AllTransfers } from './pages/AllTransfers';
import { TransferDetail } from './pages/TransferDetail';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [transferId, setTransferId] = useState<string | null>(null);

  useEffect(() => {
    // Simple hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      
      if (hash === '' || hash === '/dashboard') {
        setCurrentPage('dashboard');
        setTransferId(null);
      } else if (hash === '/new-transfer') {
        setCurrentPage('new-transfer');
        setTransferId(null);
      } else if (hash === '/transfers') {
        setCurrentPage('transfers');
        setTransferId(null);
      } else if (hash.startsWith('/transfer/')) {
        const id = hash.replace('/transfer/', '');
        setCurrentPage('transfer-detail');
        setTransferId(id);
      } else {
        setCurrentPage('dashboard');
        setTransferId(null);
      }
    };

    // Handle initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'new-transfer':
        return <NewTransfer />;
      case 'transfers':
        return <AllTransfers />;
      case 'transfer-detail':
        return transferId ? <TransferDetail transferId={transferId} /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;