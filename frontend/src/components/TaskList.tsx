import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaPlay, FaClock, FaExternalLinkAlt } from 'react-icons/fa';
import { Task } from '@/types';
import { useTimer } from '@/hooks/useTimer';

interface TaskListProps {
  tasks: Task[];
  onTaskCreate: () => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: number) => void;
  loading?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskCreate,
  onTaskEdit,
  onTaskDelete,
  loading = false,
}) => {
  const { startTimer, isRunning, activeTimeLog } = useTimer();
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    client: '',
    category: '',
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-badge status-pending';
      case 'IN_PROGRESS':
        return 'status-badge status-in-progress';
      case 'COMPLETED':
        return 'status-badge status-completed';
      case 'CANCELLED':
        return 'status-badge status-cancelled';
      default:
        return 'status-badge';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'status-badge priority-low';
      case 'MEDIUM':
        return 'status-badge priority-medium';
      case 'HIGH':
        return 'status-badge priority-high';
      case 'URGENT':
        return 'status-badge priority-urgent';
      default:
        return 'status-badge';
    }
  };

  const handleStartTimer = async (taskId: number) => {
    if (isRunning) {
      return;
    }
    await startTimer(taskId);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter.status && task.status !== filter.status) return false;
    if (filter.priority && task.priority !== filter.priority) return false;
    if (filter.client && task.client?.name !== filter.client) return false;
    if (filter.category && task.category?.name !== filter.category) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <button
            onClick={onTaskCreate}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <FaPlus />
            Add Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className="form-input"
          >
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            value={filter.client}
            onChange={(e) => setFilter({ ...filter, client: e.target.value })}
            className="form-input"
          >
            <option value="">All Clients</option>
            {Array.from(new Set(tasks.map(t => t.client?.name).filter(Boolean))).map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>

          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="form-input"
          >
            <option value="">All Categories</option>
            {Array.from(new Set(tasks.map(t => t.category?.name).filter(Boolean))).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-body">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-white">
            <p>No tasks found</p>
            <button
              onClick={onTaskCreate}
              className="btn btn-primary mt-4"
            >
              Create Your First Task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  activeTimeLog?.taskId === task.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-black font-bold">{task.title}</h4>
                      {task.haloTicketId && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <FaExternalLinkAlt />
                          {task.haloTicketId}
                        </div>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-black font-semibold mb-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <span className={getStatusBadgeClass(task.status)}>
                        {task.status.toLowerCase().replace('_', ' ')}
                      </span>
                      <span className={getPriorityBadgeClass(task.priority)}>
                        {task.priority.toLowerCase()}
                      </span>
                      {task.client && (
                        <span className="status-badge bg-purple-100 text-purple-800">
                          {task.client.name}
                        </span>
                      )}
                      {task.category && (
                        <span 
                          className="status-badge text-white"
                          style={{ backgroundColor: task.category.color }}
                        >
                          {task.category.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-white">
                      <div className="flex items-center gap-1">
                        <FaClock />
                        {task._count?.timeLogs || 0} time log(s)
                      </div>
                      {task.dueDate && (
                        <div>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleStartTimer(task.id)}
                      disabled={isRunning}
                      className={`btn btn-sm ${
                        isRunning ? 'btn-secondary' : 'btn-success'
                      } flex items-center gap-1`}
                      title={isRunning ? 'Timer already running' : 'Start timer for this task'}
                    >
                      <FaPlay />
                      {activeTimeLog?.taskId === task.id ? 'Active' : 'Start'}
                    </button>
                    <button
                      onClick={() => onTaskEdit(task)}
                      className="btn btn-sm btn-secondary flex items-center gap-1"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => onTaskDelete(task.id)}
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
  );
};

export default TaskList;