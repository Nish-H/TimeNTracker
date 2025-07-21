import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendarAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { Task } from '@/types';
import { tasksApi, timeLogsApi } from '@/services/api';
import toast from 'react-hot-toast';

interface BulkTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
}

const BulkTimeEntryModal: React.FC<BulkTimeEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [defaultHours, setDefaultHours] = useState(8);
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');

  useEffect(() => {
    if (isOpen) {
      loadTasks();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedTaskId('');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setTimeEntries([]);
    setDefaultHours(8);
    setDefaultStartTime('09:00');
  };

  const loadTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const generateDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const entries: TimeEntry[] = [];

    // Generate entries for each day in the range (excluding weekends by default)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        entries.push({
          id: Math.random().toString(36).substr(2, 9),
          date: d.toISOString().split('T')[0],
          hours: defaultHours,
          description: ''
        });
      }
    }

    setTimeEntries(entries);
    toast.success(`Generated ${entries.length} work day entries`);
  };

  const generateAllDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const entries: TimeEntry[] = [];

    // Generate entries for each day in the range (including weekends)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      entries.push({
        id: Math.random().toString(36).substr(2, 9),
        date: d.toISOString().split('T')[0],
        hours: defaultHours,
        description: ''
      });
    }

    setTimeEntries(entries);
    toast.success(`Generated ${entries.length} day entries`);
  };

  const addSingleDay = () => {
    const newEntry: TimeEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      hours: defaultHours,
      description: ''
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const removeEntry = (id: string) => {
    setTimeEntries(timeEntries.filter(entry => entry.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number) => {
    setTimeEntries(timeEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTaskId) {
      toast.error('Please select a task');
      return;
    }

    if (timeEntries.length === 0) {
      toast.error('Please add at least one time entry');
      return;
    }

    // Validate entries
    const invalidEntries = timeEntries.filter(entry => 
      !entry.date || entry.hours <= 0 || entry.hours > 24
    );

    if (invalidEntries.length > 0) {
      toast.error('Please ensure all entries have valid dates and hours (1-24)');
      return;
    }

    try {
      setLoading(true);
      
      // Create time entries for each day
      const promises = timeEntries.map(entry => {
        const startTime = new Date(`${entry.date}T${defaultStartTime}:00`);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + Math.floor(entry.hours));
        endTime.setMinutes(startTime.getMinutes() + ((entry.hours % 1) * 60));

        return timeLogsApi.createManual({
          taskId: parseInt(selectedTaskId),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          description: entry.description || `Bulk entry - ${entry.hours} hours`
        });
      });

      await Promise.all(promises);
      
      toast.success(`Successfully created ${timeEntries.length} time entries`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create bulk time entries:', error);
      
      if (error.response?.data?.error?.includes('overlap')) {
        toast.error('Some entries overlap with existing time logs. Please check and adjust.');
      } else {
        toast.error('Failed to create some time entries. Please check for conflicts.');
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

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FaCalendarAlt />
            Bulk Time Entry
          </h2>
          <button
            onClick={handleClose}
            className="text-black hover:text-gray-800"
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Task Selection */}
            <div>
              <label className="block text-sm font-medium text-black font-bold mb-1">
                Task *
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
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

            {/* Date Range Setup */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-black font-bold mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black font-bold mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black font-bold mb-1">
                  Default Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={defaultHours}
                  onChange={(e) => setDefaultHours(parseFloat(e.target.value))}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black font-bold mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={defaultStartTime}
                  onChange={(e) => setDefaultStartTime(e.target.value)}
                  className="form-input w-full"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={generateDateRange}
                className="btn btn-secondary flex items-center gap-2"
                disabled={!startDate || !endDate}
              >
                <FaCalendarAlt />
                Generate Work Days
              </button>
              <button
                type="button"
                onClick={generateAllDays}
                className="btn btn-secondary flex items-center gap-2"
                disabled={!startDate || !endDate}
              >
                <FaCalendarAlt />
                Generate All Days
              </button>
              <button
                type="button"
                onClick={addSingleDay}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FaPlus />
                Add Single Day
              </button>
            </div>

            {/* Time Entries */}
            {timeEntries.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    Time Entries ({timeEntries.length} days, {totalHours} hours total)
                  </h3>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded">
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={entry.date}
                          onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                          className="form-input w-full text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={entry.hours}
                          onChange={(e) => updateEntry(entry.id, 'hours', parseFloat(e.target.value))}
                          className="form-input w-full text-sm"
                          placeholder="Hours"
                        />
                      </div>
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                          className="form-input w-full text-sm"
                          placeholder="Description (optional)"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="btn btn-sm btn-danger"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
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
              disabled={loading || timeEntries.length === 0}
            >
              {loading ? 'Creating Entries...' : `Create ${timeEntries.length} Entries`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkTimeEntryModal;