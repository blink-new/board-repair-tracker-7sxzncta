import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit, Save, QrCode, Clock, User, Phone, MapPin } from 'lucide-react';
import { blink } from '../blink/client';
import { RepairTransfer, User as UserType, StatusLog, StatusUpdateForm } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { formatDate, formatDateTime, formatCurrency, canUpdateStatus, getNextStatus } from '../utils/status';

interface TransferDetailProps {
  transferId: string;
}

export const TransferDetail: React.FC<TransferDetailProps> = ({ transferId }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [transfer, setTransfer] = useState<RepairTransfer | null>(null);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState<StatusUpdateForm>({
    status: 'Pending',
    remarks: '',
    technician_receive_name: '',
    date_received_by_tech: '',
    date_repair_done: '',
    repair_cost: undefined
  });

  const loadTransferData = useCallback(async (currentUser: UserType) => {
    try {
      // Load transfer details
      const transfers = await blink.db.repairTransfers.list({
        where: { id: transferId }
      });

      if (transfers.length === 0) {
        console.error('Transfer not found');
        return;
      }

      const transferData = transfers[0];
      
      // Check if user has permission to view this transfer
      if (currentUser.role === 'HQ Staff' && transferData.branch_from !== currentUser.branch) {
        console.error('Access denied: HQ Staff can only view transfers from their branch');
        return;
      }
      
      if (currentUser.role === 'Technician' && transferData.branch_to !== currentUser.branch) {
        console.error('Access denied: Technicians can only view transfers to their branch');
        return;
      }

      setTransfer(transferData);

      // Load status logs
      const logs = await blink.db.statusLogs.list({
        where: { transfer_id: transferId },
        orderBy: { updated_at: 'desc' }
      });

      setStatusLogs(logs);

      // Initialize update form with current status
      setUpdateForm(prev => ({
        ...prev,
        status: transferData.status,
        technician_receive_name: transferData.technician_receive_name || '',
        date_received_by_tech: transferData.date_received_by_tech || '',
        date_repair_done: transferData.date_repair_done || '',
        repair_cost: transferData.repair_cost
      }));
    } catch (error) {
      console.error('Error loading transfer data:', error);
    }
  }, [transferId]);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      if (state.user) {
        setUser(state.user);
        loadTransferData(state.user);
      }
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, [loadTransferData]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !transfer) return;

    setUpdating(true);

    try {
      const updateData: Partial<RepairTransfer> = {
        status: updateForm.status,
        remarks: updateForm.remarks || transfer.remarks,
        updated_by: user.name,
        updated_at: new Date().toISOString()
      };

      // Add status-specific fields
      if (updateForm.status === 'Received' && updateForm.technician_receive_name) {
        updateData.technician_receive_name = updateForm.technician_receive_name;
        updateData.date_received_by_tech = updateForm.date_received_by_tech || new Date().toISOString().split('T')[0];
      }

      if (updateForm.status === 'Done' && updateForm.date_repair_done) {
        updateData.date_repair_done = updateForm.date_repair_done;
        if (updateForm.repair_cost !== undefined) {
          updateData.repair_cost = updateForm.repair_cost;
        }
      }

      // Update transfer
      await blink.db.repairTransfers.update(transferId, updateData);

      // Create status log
      await blink.db.statusLogs.create({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transfer_id: transferId,
        old_status: transfer.status,
        new_status: updateForm.status,
        remarks: updateForm.remarks,
        updated_by: user.name,
        user_id: user.id
      });

      // Reload data
      await loadTransferData(user);
      setShowUpdateForm(false);
      setUpdateForm(prev => ({ ...prev, remarks: '' }));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const generateQRCode = () => {
    const qrData = {
      id: transfer?.id,
      customer: transfer?.customer_name,
      model: transfer?.phone_model,
      imei: transfer?.imei,
      status: transfer?.status
    };
    
    // In a real implementation, you would generate a QR code
    // For now, we'll just show the data
    alert(`QR Code Data:\n${JSON.stringify(qrData, null, 2)}`);
  };

  const goBack = () => {
    window.location.hash = '#/transfers';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !transfer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Transfer not found</h2>
          <p className="text-gray-600">The transfer you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={goBack} className="mt-4">
            Back to Transfers
          </Button>
        </div>
      </div>
    );
  }

  const canUpdate = canUpdateStatus(user.role, transfer.status);
  const nextStatus = getNextStatus(transfer.status);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={goBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transfers
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transfer Details</h1>
            <p className="text-gray-600 mt-2">
              Transfer ID: {transfer.id}
            </p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={generateQRCode} className="flex items-center">
              <QrCode className="h-4 w-4 mr-2" />
              Generate QR
            </Button>
            {canUpdate && (
              <Button
                onClick={() => setShowUpdateForm(!showUpdateForm)}
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Status
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Device Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Device Information</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <p className="text-gray-900">{transfer.customer_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Model
                  </label>
                  <p className="text-gray-900">{transfer.phone_model}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IMEI
                  </label>
                  <p className="text-gray-900 font-mono">{transfer.imei}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passcode
                  </label>
                  <p className="text-gray-900">{transfer.passcode || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problem Description
                  </label>
                  <p className="text-gray-900">{transfer.problem_description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Route */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Transfer Route</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Branch
                  </label>
                  <p className="text-gray-900">{transfer.branch_from}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Branch
                  </label>
                  <p className="text-gray-900">{transfer.branch_to}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff Received From Customer
                  </label>
                  <p className="text-gray-900">{transfer.staff_receive_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Received From Customer
                  </label>
                  <p className="text-gray-900">{formatDate(transfer.date_from_branch)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff Sent To Branch
                  </label>
                  <p className="text-gray-900">{transfer.staff_send_name || 'Not sent yet'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Sent To Branch
                  </label>
                  <p className="text-gray-900">{formatDate(transfer.date_sent_to_branch)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Repair Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Repair Details</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technician
                  </label>
                  <p className="text-gray-900">{transfer.technician_receive_name || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Received by Technician
                  </label>
                  <p className="text-gray-900">{formatDate(transfer.date_received_by_tech)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Repair Done
                  </label>
                  <p className="text-gray-900">{formatDate(transfer.date_repair_done)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repair Cost
                  </label>
                  <p className="text-gray-900">{formatCurrency(transfer.repair_cost)}</p>
                </div>
                {transfer.remarks && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <p className="text-gray-900">{transfer.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
            </div>
            <div className="p-6">
              <div className="text-center">
                <StatusBadge status={transfer.status} className="text-lg px-4 py-2" />
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {formatDateTime(transfer.updated_at)}
                </p>
                <p className="text-sm text-gray-500">
                  By: {transfer.updated_by}
                </p>
              </div>
            </div>
          </div>

          {/* Status Update Form */}
          {showUpdateForm && canUpdate && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
              </div>
              <form onSubmit={handleStatusUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, status: e.target.value as RepairTransfer['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                    <option value="In Repair">In Repair</option>
                    <option value="Done">Done</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>

                {updateForm.status === 'Received' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Technician Name
                      </label>
                      <input
                        type="text"
                        value={updateForm.technician_receive_name}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, technician_receive_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter technician name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Received
                      </label>
                      <input
                        type="date"
                        value={updateForm.date_received_by_tech}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, date_received_by_tech: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                {updateForm.status === 'Done' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Repair Done
                      </label>
                      <input
                        type="date"
                        value={updateForm.date_repair_done}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, date_repair_done: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repair Cost (RM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={updateForm.repair_cost || ''}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, repair_cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={updateForm.remarks}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any remarks..."
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={updating}
                    className="flex-1 flex items-center justify-center"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUpdateForm(false)}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Status History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Status History</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {statusLogs.length === 0 ? (
                  <p className="text-gray-500 text-center">No status updates yet</p>
                ) : (
                  statusLogs.map((log) => (
                    <div key={log.id} className="border-l-2 border-blue-200 pl-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <StatusBadge status={log.new_status} />
                        <span className="text-sm text-gray-500">
                          {formatDateTime(log.updated_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Updated by: {log.updated_by}
                      </p>
                      {log.remarks && (
                        <p className="text-sm text-gray-700 mt-1">
                          "{log.remarks}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};