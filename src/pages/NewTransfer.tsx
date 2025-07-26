import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Phone } from 'lucide-react';
import { blink } from '../blink/client';
import { User, NewTransferForm } from '../types';
import { Button } from '../components/ui/Button';

export const NewTransfer: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<NewTransferForm>({
    customer_name: '',
    phone_model: '',
    imei: '',
    passcode: '',
    problem_description: '',
    staff_receive_name: '',
    date_from_branch: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState<Partial<NewTransferForm>>({});

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setLoading(state.isLoading);
      
      // Pre-fill staff name if user is available
      if (state.user) {
        setFormData(prev => ({
          ...prev,
          staff_receive_name: state.user.name
        }));
      }
    });

    return unsubscribe;
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<NewTransferForm> = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }

    if (!formData.phone_model.trim()) {
      newErrors.phone_model = 'Phone model is required';
    }

    if (!formData.imei.trim()) {
      newErrors.imei = 'IMEI is required';
    } else if (formData.imei.length < 15) {
      newErrors.imei = 'IMEI must be at least 15 characters';
    }

    if (!formData.problem_description.trim()) {
      newErrors.problem_description = 'Problem description is required';
    }

    if (!formData.staff_receive_name.trim()) {
      newErrors.staff_receive_name = 'Staff name is required';
    }

    if (!formData.date_from_branch) {
      newErrors.date_from_branch = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof NewTransferForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Generate unique ID for the transfer
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the transfer record
      await blink.db.repairTransfers.create({
        id: transferId,
        branch_from: user.branch,
        branch_to: 'Kluang', // Default destination for repairs
        customer_name: formData.customer_name,
        phone_model: formData.phone_model,
        imei: formData.imei,
        passcode: formData.passcode || null,
        problem_description: formData.problem_description,
        staff_receive_name: formData.staff_receive_name,
        date_from_branch: formData.date_from_branch,
        staff_send_name: user.name,
        date_sent_to_branch: new Date().toISOString().split('T')[0],
        status: 'Pending',
        updated_by: user.name,
        user_id: user.id
      });

      // Create initial status log
      await blink.db.statusLogs.create({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transfer_id: transferId,
        old_status: null,
        new_status: 'Pending',
        remarks: 'Transfer created',
        updated_by: user.name,
        user_id: user.id
      });

      // Redirect to transfer details
      window.location.hash = `#/transfer/${transferId}`;
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('Failed to create transfer. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  if (!user || user.role !== 'HQ Staff') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only HQ Staff can create new transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={goBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Transfer</h1>
        <p className="text-gray-600 mt-2">
          Create a new phone transfer from {user.branch} to Kluang for repair
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Transfer Details</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.customer_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter customer name"
              />
              {errors.customer_name && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Received from Customer *
              </label>
              <input
                type="date"
                value={formData.date_from_branch}
                onChange={(e) => handleInputChange('date_from_branch', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date_from_branch ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.date_from_branch && (
                <p className="mt-1 text-sm text-red-600">{errors.date_from_branch}</p>
              )}
            </div>
          </div>

          {/* Device Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Model *
              </label>
              <input
                type="text"
                value={formData.phone_model}
                onChange={(e) => handleInputChange('phone_model', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone_model ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., iPhone 14 Pro, Samsung Galaxy S23"
              />
              {errors.phone_model && (
                <p className="mt-1 text-sm text-red-600">{errors.phone_model}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IMEI *
              </label>
              <input
                type="text"
                value={formData.imei}
                onChange={(e) => handleInputChange('imei', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.imei ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="15-digit IMEI number"
                maxLength={15}
              />
              {errors.imei && (
                <p className="mt-1 text-sm text-red-600">{errors.imei}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passcode
            </label>
            <input
              type="text"
              value={formData.passcode}
              onChange={(e) => handleInputChange('passcode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Device passcode (if available)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Problem Description *
            </label>
            <textarea
              value={formData.problem_description}
              onChange={(e) => handleInputChange('problem_description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.problem_description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe the problem with the device..."
            />
            {errors.problem_description && (
              <p className="mt-1 text-sm text-red-600">{errors.problem_description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Received From Customer *
            </label>
            <input
              type="text"
              value={formData.staff_receive_name}
              onChange={(e) => handleInputChange('staff_receive_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.staff_receive_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Name of staff who received from customer"
            />
            {errors.staff_receive_name && (
              <p className="mt-1 text-sm text-red-600">{errors.staff_receive_name}</p>
            )}
          </div>

          {/* Transfer Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Transfer Route</h3>
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{user.branch}</span>
              <ArrowLeft className="h-4 w-4 mx-2 rotate-180" />
              <span className="font-medium">Kluang</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Sent by: {user.name} • Date: {new Date().toLocaleDateString('en-MY')}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex items-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};