import React, { useState, useEffect } from 'react';
import { Plus, Phone, Clock, Wrench, CheckCircle, ArrowRight } from 'lucide-react';
import { blink } from '../blink/client';
import { RepairTransfer, User } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { formatDate, formatCurrency } from '../utils/status';

interface DashboardStats {
  total: number;
  pending: number;
  inRepair: number;
  completed: number;
  totalCost: number;
}

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    inRepair: 0,
    completed: 0,
    totalCost: 0
  });
  const [recentTransfers, setRecentTransfers] = useState<RepairTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async (currentUser: User) => {
    try {
      // Load transfers based on user role
      let transfers: RepairTransfer[] = [];
      
      if (currentUser.role === 'Admin') {
        // Admin can see all transfers
        transfers = await blink.db.repairTransfers.list({
          orderBy: { created_at: 'desc' },
          limit: 10
        });
      } else if (currentUser.role === 'HQ Staff') {
        // HQ Staff can only see transfers from their branch
        transfers = await blink.db.repairTransfers.list({
          where: { branch_from: currentUser.branch },
          orderBy: { created_at: 'desc' },
          limit: 10
        });
      } else if (currentUser.role === 'Technician') {
        // Technicians can see transfers sent to their branch
        transfers = await blink.db.repairTransfers.list({
          where: { branch_to: currentUser.branch },
          orderBy: { created_at: 'desc' },
          limit: 10
        });
      }

      setRecentTransfers(transfers);

      // Calculate statistics
      const totalTransfers = transfers.length;
      const pendingCount = transfers.filter(t => t.status === 'Pending').length;
      const inRepairCount = transfers.filter(t => ['Received', 'In Repair'].includes(t.status)).length;
      const completedCount = transfers.filter(t => ['Done', 'Returned'].includes(t.status)).length;
      const totalCost = transfers
        .filter(t => t.repair_cost)
        .reduce((sum, t) => sum + (t.repair_cost || 0), 0);

      setStats({
        total: totalTransfers,
        pending: pendingCount,
        inRepair: inRepairCount,
        completed: completedCount,
        totalCost
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      if (state.user) {
        setUser(state.user);
        loadDashboardData(state.user);
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const navigateToNewTransfer = () => {
    window.location.hash = '#/new-transfer';
  };

  const navigateToAllTransfers = () => {
    window.location.hash = '#/transfers';
  };

  const navigateToTransferDetail = (id: string) => {
    window.location.hash = `#/transfer/${id}`;
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
          <p className="text-gray-600">You need to be authenticated to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user.name} ({user.role} - {user.branch})
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transfers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wrench className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Repair</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inRepair}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {user.role === 'HQ Staff' && (
            <Button onClick={navigateToNewTransfer} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          )}
          <Button variant="outline" onClick={navigateToAllTransfers} className="flex items-center">
            <ArrowRight className="h-4 w-4 mr-2" />
            View All Transfers
          </Button>
        </div>
      </div>

      {/* Recent Transfers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transfers</h2>
        </div>
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
              {recentTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No transfers found. {user.role === 'HQ Staff' && 'Create your first transfer to get started.'}
                  </td>
                </tr>
              ) : (
                recentTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transfer.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transfer.phone_model} • {transfer.imei}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transfer.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transfer.repair_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigateToTransferDetail(transfer.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
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