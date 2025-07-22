import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import { User } from '@/types';
import toast from 'react-hot-toast';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => void;
  user?: User | null;
  mode: 'create' | 'edit' | 'resetPassword';
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  mode
}) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STANDARD',
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      if (user && mode === 'edit') {
        setFormData({
          name: user.name,
          email: user.email,
          password: '',
          role: user.role || 'STANDARD',
          isActive: user.isActive !== false
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'STANDARD',
          isActive: true
        });
      }
    }
  }, [isOpen, user, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create' || mode === 'resetPassword') {
      if (!formData.password || formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }
    }

    if (mode === 'create' || mode === 'edit') {
      if (!formData.name || !formData.email) {
        toast.error('Name and email are required');
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error handling done in parent component
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create New User';
      case 'edit': return 'Edit User';
      case 'resetPassword': return 'Reset Password';
      default: return 'User Management';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
            <FaUser />
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(mode === 'create' || mode === 'edit') && (
            <>
              <div>
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input w-full"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input w-full"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="form-label">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-select w-full"
                  disabled={loading}
                >
                  <option value="STANDARD">Standard User</option>
                  <option value="POWER">Power User</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                  disabled={loading}
                />
                <label htmlFor="isActive" className="form-label mb-0">Active Account</label>
              </div>
            </>
          )}

          {(mode === 'create' || mode === 'resetPassword' || (mode === 'edit' && formData.password)) && (
            <div>
              <label className="form-label">
                {mode === 'resetPassword' ? 'New Password *' : 'Password *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input w-full pr-10"
                  required={mode === 'create' || mode === 'resetPassword'}
                  placeholder={mode === 'edit' ? 'Leave blank to keep current password' : ''}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
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
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : mode === 'create' ? 'Create User' : 
               mode === 'resetPassword' ? 'Reset Password' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagementModal;