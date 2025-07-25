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
  startTime: string;
  endTime: string;
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
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedTaskId('');
    setTimeEntries([]);
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

  const addTimeEntry = () => {
    const newEntry: TimeEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      description: ''
    };
    setTimeEntries([...timeEntries, newEntry]);
  };

  const removeEntry = (id: string) => {
    setTimeEntries(timeEntries.filter(entry => entry.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string) => {
    setTimeEntries(timeEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) return 0;
    
    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  };

  const checkForInternalOverlaps = (entries: TimeEntry[]): string[] => {
    const overlaps: string[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];
        
        // Skip if different dates
        if (entry1.date !== entry2.date) continue;
        
        const start1 = new Date(`${entry1.date}T${entry1.startTime}:00`);
        const end1 = new Date(`${entry1.date}T${entry1.endTime}:00`);
        const start2 = new Date(`${entry2.date}T${entry2.startTime}:00`);
        const end2 = new Date(`${entry2.date}T${entry2.endTime}:00`);
        
        // Check for overlap: start1 < end2 && start2 < end1
        if (start1 < end2 && start2 < end1) {
          overlaps.push(`Entries ${i + 1} and ${j + 1} overlap on ${entry1.date} (${entry1.startTime}-${entry1.endTime} vs ${entry2.startTime}-${entry2.endTime})`);
        }
      }
    }
    
    return overlaps;
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
      !entry.date || !entry.startTime || !entry.endTime || 
      calculateHours(entry.startTime, entry.endTime) <= 0
    );

    if (invalidEntries.length > 0) {
      toast.error('Please ensure all entries have valid dates and times');
      return;
    }

    // Check for overlaps between entries in this batch
    const internalOverlaps = checkForInternalOverlaps(timeEntries);
    if (internalOverlaps.length > 0) {
      toast.error(`Found overlaps between entries:\n${internalOverlaps.slice(0, 2).join('\n')}${internalOverlaps.length > 2 ? `\n...and ${internalOverlaps.length - 2} more` : ''}`, {
        duration: 8000
      });
      return;
    }

    try {
      setLoading(true);
      
      // Create time entries sequentially to prevent race conditions and overlaps
      const results = [];
      const errors = [];
      
      for (let i = 0; i < timeEntries.length; i++) {
        const entry = timeEntries[i];
        try {
          const startDateTime = new Date(`${entry.date}T${entry.startTime}:00`);
          const endDateTime = new Date(`${entry.date}T${entry.endTime}:00`);
          const hours = calculateHours(entry.startTime, entry.endTime);

          const result = await timeLogsApi.createManual({
            taskId: parseInt(selectedTaskId),
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            description: entry.description || `Bulk entry - ${hours} hours`
          });
          
          results.push(result);
        } catch (error: any) {
          console.error(`Failed to create entry ${i + 1}:`, error);
          errors.push({
            index: i + 1,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            error: error.response?.data?.error || error.message
          });
        }
      }
      
      // Handle results and errors
      if (errors.length === 0) {
        toast.success(`Successfully created ${results.length} time entries`);
        onSuccess();
        onClose();
      } else if (results.length > 0 && errors.length > 0) {
        // Partial success
        toast.success(`Created ${results.length} entries successfully`);
        
        // Show detailed error information
        const errorMessages = errors.map(e => 
          `Entry ${e.index} (${e.date} ${e.startTime}-${e.endTime}): ${e.error}`
        );
        
        toast.error(`${errors.length} entries failed:\n${errorMessages.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`, {
          duration: 8000
        });
        
        // Keep modal open so user can fix the failed entries
      } else {
        // All failed
        const errorMessages = errors.map(e => 
          `Entry ${e.index}: ${e.error}`
        );
        toast.error(`All entries failed:\n${errorMessages.slice(0, 2).join('\n')}${errors.length > 2 ? `\n...and ${errors.length - 2} more` : ''}`, {
          duration: 8000
        });
      }
    } catch (error: any) {
      console.error('Unexpected error in bulk time entry:', error);
      toast.error('Unexpected error occurred. Please try again.');
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

  const totalHours = timeEntries.reduce((sum, entry) => 
    sum + calculateHours(entry.startTime, entry.endTime), 0
  );

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
            className="text-white hover:text-gray-800"
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Task Selection */}
            <div>
              <label className="block text-sm font-medium text-white font-bold mb-1">
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

            {/* Add Entry Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Time Entries {timeEntries.length > 0 && `(${timeEntries.length} entries, ${totalHours.toFixed(2)} hours total)`}
              </h3>
              <button
                type="button"
                onClick={addTimeEntry}
                className="btn btn-primary flex items-center gap-2"
              >
                <FaPlus />
                Add Time Entry
              </button>
            </div>

            {/* Time Entries */}
            <div className="space-y-3">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    {/* Date */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-white mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                        className="form-input w-full"
                        required
                      />
                    </div>

                    {/* Start Time */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-white mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => updateEntry(entry.id, 'startTime', e.target.value)}
                        className="form-input w-full"
                        required
                      />
                    </div>

                    {/* End Time */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-white mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => updateEntry(entry.id, 'endTime', e.target.value)}
                        className="form-input w-full"
                        required
                      />
                    </div>

                    {/* Hours Worked (Calculated) */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-white mb-1">
                        Hours
                      </label>
                      <div className="p-2 bg-gray-100 rounded text-center font-medium">
                        {calculateHours(entry.startTime, entry.endTime).toFixed(2)}h
                      </div>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-white mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                        className="form-input w-full"
                        placeholder="Optional"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="btn btn-sm btn-danger flex items-center gap-1"
                        title="Remove entry"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {timeEntries.length === 0 && (
                <div className="text-center py-8 text-gray-300">
                  <FaCalendarAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No time entries added yet</p>
                  <p className="text-sm">Click "Add Time Entry" to get started</p>
                </div>
              )}
            </div>
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