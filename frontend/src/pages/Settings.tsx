import React, { useState, useEffect } from 'react';
import { FaUser, FaBuilding, FaTags, FaDatabase, FaCog, FaEdit, FaTrash } from 'react-icons/fa';
import { Client, Category } from '@/types';
import { clientsApi, categoriesApi, backupApi, exportApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import ClientModal from '@/components/ClientModal';
import CategoryModal from '@/components/CategoryModal';
import ProfileModal from '@/components/ProfileModal';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<any>(null);
  
  // Modal states
  const [clientModal, setClientModal] = useState<{
    isOpen: boolean;
    client: Client | null;
  }>({ isOpen: false, client: null });
  
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    category: Category | null;
  }>({ isOpen: false, category: null });

  const [profileModal, setProfileModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [clientsRes, categoriesRes, backupRes] = await Promise.all([
        clientsApi.getAll(),
        categoriesApi.getAll(),
        backupApi.getStatus(),
      ]);
      setClients(clientsRes.data.clients);
      setCategories(categoriesRes.data.categories);
      setBackupStatus(backupRes.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRunBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await backupApi.runBackup();
      if ((response.data as any).success) {
        toast.success('Backup completed successfully!');
        // Refresh backup status
        const statusRes = await backupApi.getStatus();
        setBackupStatus(statusRes.data);
      } else {
        toast.error('Backup failed: ' + ((response.data as any).error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to run backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleViewBackupHistory = async () => {
    try {
      const response = await backupApi.getHistory();
      const backups = (response.data as any).backups;
      
      if (backups.length === 0) {
        toast.success('No backup history available');
        return;
      }
      
      const historyMessage = backups.slice(0, 5).map((backup: any) => 
        `${backup.filename} - ${new Date(backup.createdAt).toLocaleString()}`
      ).join('\n');
      
      alert(`Recent Backups:\n\n${historyMessage}`);
    } catch (error) {
      console.error('Failed to get backup history:', error);
      toast.error('Failed to load backup history');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await exportApi.exportData();
      const data = response.data as any;
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nishen-task-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Export complete! ${data.counts.clients} clients, ${data.counts.categories} categories, ${data.counts.tasks} tasks exported.`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.data) {
          toast.error('Invalid import file format');
          return;
        }
        
        const response = await exportApi.importData(importData.data, { 
          overwrite: false, 
          skipDuplicates: true 
        });
        
        if ((response.data as any).success) {
          const results = (response.data as any).results;
          toast.success(`Import complete! Created: ${results.clients.created} clients, ${results.categories.created} categories`);
          loadSettings(); // Refresh the data
        } else {
          toast.error('Import failed: ' + (response.data as any).message);
        }
      } catch (error) {
        console.error('Import failed:', error);
        toast.error('Failed to import data - invalid file format');
      }
    };
    input.click();
  };

  // Client handlers
  const handleAddClient = () => {
    setClientModal({ isOpen: true, client: null });
  };

  const handleEditClient = (client: Client) => {
    setClientModal({ isOpen: true, client });
  };

  const handleDeleteClient = async (clientId: number) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      await clientsApi.delete(clientId);
      setClients(clients.filter(c => c.id !== clientId));
      toast.success('Client deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete client:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to delete client');
      }
    }
  };

  const handleClientSave = (savedClient: Client) => {
    if (clientModal.client) {
      // Update existing client
      setClients(clients.map(c => c.id === savedClient.id ? savedClient : c));
    } else {
      // Add new client
      setClients([...clients, savedClient]);
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    setCategoryModal({ isOpen: true, category: null });
  };

  const handleEditCategory = (category: Category) => {
    setCategoryModal({ isOpen: true, category });
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await categoriesApi.delete(categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to delete category');
      }
    }
  };

  const handleCategorySave = (savedCategory: Category) => {
    if (categoryModal.category) {
      // Update existing category
      setCategories(categories.map(c => c.id === savedCategory.id ? savedCategory : c));
    } else {
      // Add new category
      setCategories([...categories, savedCategory]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaUser className="text-white" />
              User Profile
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  className="form-input"
                  disabled
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="form-input"
                  disabled
                />
              </div>
              <button
                onClick={() => setProfileModal(true)}
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaCog className="text-white" />
              System Information
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white">Version</span>
                <span className="text-white font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Database</span>
                <span className="text-white font-medium">PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Backup Schedule</span>
                <span className="text-white font-medium">Daily at 5pm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Total Clients</span>
                <span className="text-white font-medium">{clients.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Total Categories</span>
                <span className="text-white font-medium">{categories.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clients */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaBuilding className="text-white" />
                Clients
              </h3>
              <button
                onClick={handleAddClient}
                className="btn btn-primary btn-sm"
              >
                Add Client
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {clients.length === 0 ? (
                <p className="text-white text-center py-8">No clients found. Add your first client!</p>
              ) : (
                clients.map((client) => (
                  <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{client.name}</div>
                      {client.description && (
                        <div className="text-sm text-black font-semibold">{client.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                        title="Edit client"
                      >
                        <FaEdit />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="btn btn-sm btn-danger flex items-center gap-1"
                        title="Delete client"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaTags className="text-white" />
                Categories
              </h3>
              <button
                onClick={handleAddCategory}
                className="btn btn-primary btn-sm"
              >
                Add Category
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-white text-center py-8">No categories found. Add your first category!</p>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                        title="Edit category"
                      >
                        <FaEdit />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="btn btn-sm btn-danger flex items-center gap-1"
                        title="Delete category"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaDatabase className="text-white" />
            Backup & Data Management
          </h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {backupStatus?.totalBackups || 0}
                </div>
                <div className="text-sm text-green-700">Total Backups</div>
                <div className="text-xs text-white mt-1">
                  {backupStatus?.verifiedBackups || 0} verified
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">Daily</div>
                <div className="text-sm text-blue-700">Backup Schedule</div>
                <div className="text-xs text-white mt-1">5:00 PM</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-600">
                  {backupStatus?.lastBackup ? 'Latest' : 'No'}
                </div>
                <div className="text-sm text-purple-700">Last Backup</div>
                <div className="text-xs text-white mt-1">
                  {backupStatus?.lastBackup 
                    ? new Date(backupStatus.lastBackup.createdAt).toLocaleDateString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-white">Database Backup</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleRunBackup}
                    disabled={backupLoading}
                    className="btn btn-primary btn-sm"
                  >
                    {backupLoading ? 'Running...' : 'Run Backup'}
                  </button>
                  <button
                    onClick={handleViewBackupHistory}
                    className="btn btn-secondary btn-sm"
                  >
                    View History
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-white">Data Export/Import</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportData}
                    className="btn btn-success btn-sm"
                  >
                    Export Data
                  </button>
                  <button
                    onClick={handleImportData}
                    className="btn btn-warning btn-sm"
                  >
                    Import Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={clientModal.isOpen}
        onClose={() => setClientModal({ isOpen: false, client: null })}
        client={clientModal.client}
        onSave={handleClientSave}
      />

      <CategoryModal
        isOpen={categoryModal.isOpen}
        onClose={() => setCategoryModal({ isOpen: false, category: null })}
        category={categoryModal.category}
        onSave={handleCategorySave}
      />

      <ProfileModal
        isOpen={profileModal}
        onClose={() => setProfileModal(false)}
        user={user}
      />
    </div>
  );
};

export default Settings;