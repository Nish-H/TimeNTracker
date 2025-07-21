import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { Task, Client, Category } from '@/types';
import { clientsApi, categoriesApi } from '@/services/api';
import toast from 'react-hot-toast';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<Task>) => void;
  task?: Task;
  mode: 'create' | 'edit';
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    haloTicketId: '',
    clientId: '',
    categoryId: '',
    priority: 'MEDIUM',
    dueDate: '',
    status: 'PENDING'
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClientsAndCategories();
      if (task && mode === 'edit') {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          haloTicketId: task.haloTicketId || '',
          clientId: task.clientId?.toString() || '',
          categoryId: task.categoryId?.toString() || '',
          priority: task.priority || 'MEDIUM',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          status: task.status || 'PENDING'
        });
      } else {
        setFormData({
          title: '',
          description: '',
          haloTicketId: '',
          clientId: '',
          categoryId: '',
          priority: 'MEDIUM',
          dueDate: '',
          status: 'PENDING'
        });
      }
    }
  }, [isOpen, task, mode]);

  const loadClientsAndCategories = async () => {
    try {
      const [clientsRes, categoriesRes] = await Promise.all([
        clientsApi.getAll(),
        categoriesApi.getAll()
      ]);
      setClients(clientsRes.data.clients);
      setCategories(categoriesRes.data.categories);
    } catch (error) {
      console.error('Failed to load clients and categories:', error);
      toast.error('Failed to load form data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: Partial<Task> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        haloTicketId: formData.haloTicketId.trim() || undefined,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
        priority: formData.priority as any,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      };

      if (mode === 'edit') {
        submitData.status = formData.status as any;
      }

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Create New Task' : 'Edit Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-800"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-white mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input w-full"
              required
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input w-full"
              rows={3}
              placeholder="Enter task description"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-1">
              Halo Ticket ID
            </label>
            <input
              type="text"
              value={formData.haloTicketId}
              onChange={(e) => setFormData({ ...formData, haloTicketId: e.target.value })}
              className="form-input w-full"
              placeholder="e.g., HALO-12345"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-white mb-1">
                Client
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="form-input w-full"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-1">
                Category
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="form-input w-full"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-white mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="form-input w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-bold text-white mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="form-input w-full"
            />
          </div>

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
              disabled={loading || !formData.title.trim()}
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Update Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;