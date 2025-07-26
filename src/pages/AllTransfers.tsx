import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Eye } from 'lucide-react';
import { blink } from '../blink/client';
import { RepairTransfer, User } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { formatDate, formatCurrency } from '../utils/status';

interface FilterState {
  search: string;
  status: string;
  branch: string;
  dateFrom: string;
  dateTo: string;
}

export const AllTransfers: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transfers, setTransfers] = useState<RepairTransfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<RepairTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    branch: '',
    dateFrom: '',
    dateTo: ''
  });

  const loadTransfers = async (currentUser: User) => {
    try {
      let transferList: RepairTransfer[] = [];
      
      if (currentUser.role === 'Admin') {
        // Admin can see all transfers
        transferList = await blink.db.repairTransfers.list({
          orderBy: { created_at: 'desc' }
        });
      } else if (currentUser.role === 'HQ Staff') {
        // HQ Staff can only see transfers from their branch
        transferList = await blink.db.repairTransfers.list({
          where: { branch_from: currentUser.branch },
          orderBy: { created_at: 'desc' }
        });
      } else if (currentUser.role === 'Technician') {
        // Technicians can see transfers sent to their branch
        transferList = await blink.db.repairTransfers.list({
          where: { branch_to: currentUser.branch },
          orderBy: { created_at: 'desc' }
        });
      }

      setTransfers(transferList);
    } catch (error) {
      console.error('Error loading transfers:', error);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...transfers];

    // Search filter (customer name, phone model, IMEI)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(transfer =>
        transfer.customer_name.toLowerCase().includes(searchLower) ||
        transfer.phone_model.toLowerCase().includes(searchLower) ||
        transfer.imei.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(transfer => transfer.status === filters.status);
    }

    // Branch filter
    if (filters.branch) {
      filtered = filtered.filter(transfer => 
        transfer.branch_from === filters.branch || transfer.branch_to === filters.branch
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(transfer => 
        new Date(transfer.created_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(transfer => 
        new Date(transfer.created_at) <= new Date(filters.dateTo + 'T23:59:59')
      );
    }

    setFilteredTransfers(filtered);
  }, [transfers, filters]);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      if (state.user) {
        setUser(state.user);
        loadTransfers(state.user);
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      branch: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const navigateToTransferDetail = (id: string) => {
    window.location.hash = `#/transfer/${id}`;
  };

  const navigateToNewTransfer = () => {
    window.location.hash = '#/new-transfer';
  };

  const goBack = () => {
    window.location.hash = '#/dashboard';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be authenticated to view transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Transfers</h1>
            <p className="text-gray-600 mt-2">
              {filteredTransfers.length} of {transfers.length} transfers
            </p>
          </div>
          <div className="flex space-x-4">
            {user.role === 'HQ Staff' && (
              <Button onClick={navigateToNewTransfer} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                New Transfer
              </Button>
            )}
            <Button variant="outline" onClick={goBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone model, or IMEI..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                    <option value="In Repair">In Repair</option>
                    <option value="Done">Done</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={filters.branch}
                    onChange={(e) => handleFilterChange('branch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Branches</option>
                    <option value="HQ">HQ</option>
                    <option value="Kluang">Kluang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Problem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {transfers.length === 0 
                      ? 'No transfers found. Create your first transfer to get started.'
                      : 'No transfers match your current filters.'
                    }
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transfer.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transfer.phone_model}
                        </div>
                        <div className="text-xs text-gray-400">
                          IMEI: {transfer.imei}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transfer.branch_from} → {transfer.branch_to}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={transfer.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {transfer.problem_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transfer.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transfer.repair_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigateToTransferDetail(transfer.id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};