import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaEdit } from 'react-icons/fa';
import { Task, TimeLog } from '@/types';
import { tasksApi, timeLogsApi } from '@/services/api';
import toast from 'react-hot-toast';

interface ManualTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTimeLog?: TimeLog | null;
}

const ManualTimeEntryModal: React.FC<ManualTimeEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editTimeLog
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    taskId: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadTasks();
      if (editTimeLog) {
        const startDate = new Date(editTimeLog.startTime);
        const endDate = new Date(editTimeLog.endTime || new Date());
        
        setFormData({
          taskId: editTimeLog.taskId.toString(),
          startDate: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endDate: endDate.toISOString().split('T')[0],
          endTime: endDate.toTimeString().slice(0, 5),
          description: editTimeLog.description || ''
        });
      } else {
        // Default to current date
        const now = new Date();
        setFormData({
          taskId: '',
          startDate: now.toISOString().split('T')[0],
          startTime: '',
          endDate: now.toISOString().split('T')[0],
          endTime: '',
          description: ''
        });
      }
    }
  }, [isOpen, editTimeLog]);

  const loadTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.taskId || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      if (startDateTime >= endDateTime) {
        toast.error('End time must be after start time');
        return;
      }

      const requestData = {
        taskId: parseInt(formData.taskId),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        description: formData.description || undefined
      };

      if (editTimeLog) {
        await timeLogsApi.update(editTimeLog.id, requestData);
        toast.success('Time entry updated successfully');
      } else {
        await timeLogsApi.createManual(requestData);
        toast.success('Time entry created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save time entry:', error);
      
      if (error.response?.data?.error === 'Time entry overlaps with existing entries') {
        toast.error('Time entry overlaps with existing entries');
      } else {
        toast.error('Failed to save time entry');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {editTimeLog ? <FaEdit /> : <FaPlus />}
            {editTimeLog ? 'Edit Time Entry' : 'Add Manual Time Entry'}
          </h2>
          <button
            onClick={handleClose}
            className="text-black hover:text-gray-800"
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="taskId" className="block text-sm font-medium text-black font-bold mb-1">
              Task *
            </label>
            <select
              id="taskId"
              value={formData.taskId}
              onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
              className="form-select w-full"
              required
            >
              <option value="">Select a task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} {task.haloTicketId ? `(${task.haloTicketId})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-black font-bold mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-black font-bold mb-1">
                Start Time *
              </label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-black font-bold mb-1">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-black font-bold mb-1">
                End Time *
              </label>
              <input
                type="time"
                id="endTime"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-black font-bold mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea w-full"
              rows={3}
              placeholder="Optional description of work done..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
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
              {loading ? 'Saving...' : editTimeLog ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualTimeEntryModal;