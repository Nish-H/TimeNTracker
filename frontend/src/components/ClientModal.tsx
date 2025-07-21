import React, { useState, useEffect } from 'react';
import { FaTimes, FaBuilding, FaSave } from 'react-icons/fa';
import { Client } from '@/types';
import { clientsApi } from '@/services/api';
import toast from 'react-hot-toast';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onSave: (client: Client) => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, client, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        description: client.description || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
      });
    }
    setErrors({});
  }, [client, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Client name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Client name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let savedClient: Client;
      
      // Prepare sanitized data
      const sanitizedData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null
      };
      
      if (client) {
        // Edit existing client
        const response = await clientsApi.update(client.id, sanitizedData);
        if (response.data?.client) {
          savedClient = response.data.client;
          toast.success('Client updated successfully');
        } else {
          throw new Error('Invalid response from server');
        }
      } else {
        // Create new client
        const response = await clientsApi.create(sanitizedData);
        if (response.data?.client) {
          savedClient = response.data.client;
          toast.success('Client created successfully');
        } else {
          throw new Error('Invalid response from server');
        }
      }

      onSave(savedClient);
      onClose();
    } catch (error: any) {
      console.error('Failed to save client:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to save client';
      
      if (error.response?.status === 409) {
        errorMessage = 'A client with this name already exists';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid client data';
      } else if (error.response?.status === 401) {
        errorMessage = 'You are not authorized to perform this action';
        // Redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaBuilding className="text-primary-600" />
            <h2 className="text-xl font-semibold text-black font-bold">
              {client ? 'Edit Client' : 'Add New Client'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client Name */}
          <div>
            <label htmlFor="name" className="form-label">
              Client Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter client name"
              disabled={loading}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`form-input ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Enter client description (optional)"
              rows={3}
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-black font-semibold">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FaSave />
                  {client ? 'Update Client' : 'Create Client'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;