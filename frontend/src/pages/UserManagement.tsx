import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaUserCheck, FaUserTimes, FaUnlock, FaKey, FaBan, FaCheckCircle } from 'react-icons/fa';
import { User } from '@/types';
import { usersApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import UserManagementModal from '@/components/UserManagementModal';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'resetPassword'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleResetPassword = (user: User) => {
    setModalMode('resetPassword');
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot change your own account status');
      return;
    }

    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await usersApi.toggleStatus(user.id);
      loadUsers();
      toast.success(`User ${action}d successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(error.response?.data?.error || `Failed to ${action} user`);
    }
  };

  const handleUnlockUser = async (user: User) => {
    if (!confirm('Are you sure you want to unlock this user account?')) return;

    try {
      await usersApi.unlock(user.id);
      loadUsers();
      toast.success('User account unlocked successfully');
    } catch (error: any) {
      console.error('Failed to unlock user:', error);
      toast.error(error.response?.data?.error || 'Failed to unlock user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersApi.delete(userId);
      loadUsers();
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleModalSubmit = async (userData: any) => {
    try {
      if (modalMode === 'create') {
        await usersApi.create(userData);
        toast.success('User created successfully');
      } else if (modalMode === 'edit') {
        await usersApi.update(selectedUser!.id, userData);
        toast.success('User updated successfully');
      } else if (modalMode === 'resetPassword') {
        await usersApi.resetPassword(selectedUser!.id, userData.password);
        toast.success('Password reset successfully');
      }
      loadUsers();
      handleModalClose();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      toast.error(error.response?.data?.error || 'Failed to save user');
      throw error;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const isAccountLocked = (user: User) => {
    return user.lockedUntil && new Date(user.lockedUntil) > new Date();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'POWER':
        return 'bg-blue-100 text-blue-800';
      case 'STANDARD':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">User Management</h1>
        <button
          onClick={handleCreateUser}
          className="btn btn-primary flex items-center gap-2"
        >
          <FaPlus />
          Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-blue-600">
              {users.length}
            </div>
            <div className="text-sm text-gray-700">Total Users</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-green-600">
              {users.filter(user => user.isActive).length}
            </div>
            <div className="text-sm text-gray-700">Active Users</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-red-600">
              {users.filter(user => user.role === 'ADMIN').length}
            </div>
            <div className="text-sm text-gray-700">Admin Users</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-orange-600">
              {users.filter(user => isAccountLocked(user)).length}
            </div>
            <div className="text-sm text-gray-700">Locked Users</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaUsers />
            System Users
          </h3>
        </div>
        <div className="card-body">
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-700">
              <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      User Info
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Role/Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Password Changed
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 ${isAccountLocked(user) ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          <div className="font-medium text-gray-900">
                            {user.name} {user.id === currentUser?.id && '(You)'}
                          </div>
                          <div className="text-gray-700 opacity-75">{user.email}</div>
                          <div className="text-gray-600 opacity-75">ID: {user.id}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          <span className={`inline-block px-2 py-1 rounded text-xs ${getRoleBadgeColor(user.role || 'STANDARD')}`}>
                            {user.role || 'STANDARD'}
                          </span>
                          <div className="flex items-center mt-1">
                            {user.isActive ? (
                              <><FaUserCheck className="text-green-500 mr-1" /><span className="text-green-600">Active</span></>
                            ) : (
                              <><FaUserTimes className="text-red-500 mr-1" /><span className="text-red-600">Inactive</span></>
                            )}
                            {isAccountLocked(user) && <span className="ml-2 text-red-600 font-bold">LOCKED</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700">
                        <div>{formatDate(user.lastLogin)}</div>
                        {user.loginAttempts && user.loginAttempts > 0 && (
                          <div className="text-red-600 font-bold">Failed attempts: {user.loginAttempts}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700">
                        {formatDate(user.passwordChangedAt)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700">
                        <div>{user._count?.tasks || 0} tasks</div>
                        <div>{user._count?.timeLogs || 0} time logs</div>
                        <div>Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="btn btn-xs btn-secondary flex items-center gap-1"
                            title="Edit User"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="btn btn-xs btn-warning flex items-center gap-1"
                            title="Reset Password"
                            disabled={user.id === currentUser?.id}
                          >
                            <FaKey />
                          </button>
                          {isAccountLocked(user) && (
                            <button
                              onClick={() => handleUnlockUser(user)}
                              className="btn btn-xs btn-info flex items-center gap-1"
                              title="Unlock Account"
                            >
                              <FaUnlock />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`btn btn-xs ${user.isActive ? 'btn-warning' : 'btn-success'} flex items-center gap-1`}
                            title={user.isActive ? 'Deactivate User' : 'Activate User'}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.isActive ? <FaBan /> : <FaCheckCircle />}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="btn btn-xs btn-danger flex items-center gap-1"
                            title="Delete User"
                            disabled={user.id === currentUser?.id}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        user={selectedUser}
        mode={modalMode}
      />
    </div>
  );
};


export default UserManagement;