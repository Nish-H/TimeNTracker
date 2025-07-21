import React, { useState, useEffect } from 'react';
import { FaClock, FaEdit, FaTrash, FaCalendarAlt, FaPlus, FaBullseye } from 'react-icons/fa';
import { TimeLog } from '@/types';
import { timeLogsApi } from '@/services/api';
import { useTimer } from '@/hooks/useTimer';
import ManualTimeEntryModal from '@/components/ManualTimeEntryModal';
import BulkTimeEntryModal from '@/components/BulkTimeEntryModal';
import toast from 'react-hot-toast';

const TimeLogPage: React.FC = () => {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingTimeLog, setEditingTimeLog] = useState<TimeLog | null>(null);
  const { formatTime } = useTimer();

  useEffect(() => {
    loadTimeLogs();
  }, [selectedDate]);

  const loadTimeLogs = async () => {
    try {
      setLoading(true);
      const response = await timeLogsApi.getAll({ date: selectedDate });
      setTimeLogs(response.data.timeLogs);
    } catch (error) {
      console.error('Failed to load time logs:', error);
      toast.error('Failed to load time logs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this time log?')) return;

    try {
      await timeLogsApi.delete(id);
      setTimeLogs(timeLogs.filter(log => log.id !== id));
      toast.success('Time log deleted successfully');
    } catch (error) {
      console.error('Failed to delete time log:', error);
      toast.error('Failed to delete time log');
    }
  };

  const getTotalDuration = () => {
    return timeLogs.reduce((total, log) => total + (log.durationMinutes || 0), 0);
  };

  const handleEdit = (timeLog: TimeLog) => {
    setEditingTimeLog(timeLog);
    setShowManualModal(true);
  };

  const handleModalClose = () => {
    setShowManualModal(false);
    setEditingTimeLog(null);
  };

  const handleModalSuccess = () => {
    loadTimeLogs();
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
        <h1 className="page-title">Time Log</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowManualModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <FaPlus />
            Add Manual Entry
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FaBullseye />
            Bulk Time Entry
          </button>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-white" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {timeLogs.length}
              </div>
              <div className="text-sm text-white">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatTime(getTotalDuration() * 60)}
              </div>
              <div className="text-sm text-white">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {(getTotalDuration() / 60).toFixed(1)}h
              </div>
              <div className="text-sm text-white">Hours Worked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Logs */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">
            Time Logs for {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>
        <div className="card-body">
          {timeLogs.length === 0 ? (
            <div className="text-center py-8 text-white">
              <FaClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No time logs for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-white font-bold">{log.task?.title}</h4>
                        {log.task?.haloTicketId && (
                          <span className="status-badge bg-blue-100 text-blue-800">
                            {log.task.haloTicketId}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-white font-semibold mb-2">
                        {new Date(log.startTime).toLocaleTimeString()} - {' '}
                        {log.endTime ? new Date(log.endTime).toLocaleTimeString() : 'Running'}
                      </div>

                      {log.description && (
                        <p className="text-sm text-white font-semibold mb-2">{log.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-white">
                        {log.task?.client && (
                          <span>Client: {log.task.client.name}</span>
                        )}
                        {log.task?.category && (
                          <span>Category: {log.task.category.name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-right mr-4">
                        <div className="font-medium text-white font-bold">
                          {log.durationMinutes ? formatTime(log.durationMinutes * 60) : 'Running'}
                        </div>
                        <div className="text-sm text-white">
                          {log.durationMinutes ? `${(log.durationMinutes / 60).toFixed(2)}h` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(log)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="btn btn-sm btn-danger flex items-center gap-1"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ManualTimeEntryModal
        isOpen={showManualModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editTimeLog={editingTimeLog}
      />

      <BulkTimeEntryModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default TimeLogPage;