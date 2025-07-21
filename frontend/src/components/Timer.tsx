import React, { useState } from 'react';
import { FaPlay, FaStop, FaClock } from 'react-icons/fa';
import { useTimer } from '@/hooks/useTimer';
import { Task } from '@/types';

interface TimerProps {
  tasks: Task[];
  onTaskSelect?: (taskId: number) => void;
}

const Timer: React.FC<TimerProps> = ({ tasks, onTaskSelect }) => {
  const { 
    isRunning, 
    activeTimeLog, 
    elapsedTime, 
    startTimer, 
    stopTimer, 
    formatTime,
    getDurationHours
  } = useTimer();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [stopDescription, setStopDescription] = useState('');

  const handleStart = async () => {
    if (!selectedTaskId) {
      return;
    }

    await startTimer(selectedTaskId, description);
    setDescription('');
  };

  const handleStop = async () => {
    await stopTimer(stopDescription);
    setStopDescription('');
  };

  const handleTaskSelect = (taskId: number) => {
    setSelectedTaskId(taskId);
    if (onTaskSelect) {
      onTaskSelect(taskId);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaClock className="text-white" />
          Time Tracker
        </h3>
      </div>
      <div className="card-body">
        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className="timer-display text-4xl mb-2">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-sm text-white">
            {isRunning ? 'Timer Running' : 'Timer Stopped'} 
            {isRunning && activeTimeLog && (
              <span className="ml-2">
                ({getDurationHours(elapsedTime)}h)
              </span>
            )}
          </div>
        </div>

        {/* Active Task Display */}
        {isRunning && activeTimeLog && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="font-bold text-blue-900">
              Currently tracking: {activeTimeLog.task?.title}
            </div>
            {activeTimeLog.task?.haloTicketId && (
              <div className="text-sm text-blue-800 font-semibold">
                Halo Ticket: {activeTimeLog.task.haloTicketId}
              </div>
            )}
            {activeTimeLog.task?.client && (
              <div className="text-sm text-blue-800 font-semibold">
                Client: {activeTimeLog.task.client.name}
              </div>
            )}
            {activeTimeLog.task?.category && (
              <div className="text-sm text-blue-800 font-semibold">
                Category: {activeTimeLog.task.category.name}
              </div>
            )}
          </div>
        )}

        {/* Task Selection (when not running) */}
        {!isRunning && (
          <div className="mb-4">
            <label className="form-label">Select Task to Track</label>
            <select
              value={selectedTaskId || ''}
              onChange={(e) => handleTaskSelect(parseInt(e.target.value))}
              className="form-input"
            >
              <option value="">Choose a task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                  {task.haloTicketId && ` (${task.haloTicketId})`}
                  {task.client && ` - ${task.client.name}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description Input */}
        <div className="mb-4">
          <label className="form-label">
            {isRunning ? 'Stop Description (optional)' : 'Start Description (optional)'}
          </label>
          <textarea
            value={isRunning ? stopDescription : description}
            onChange={(e) => isRunning ? setStopDescription(e.target.value) : setDescription(e.target.value)}
            placeholder={isRunning ? 'Describe what you accomplished...' : 'Describe what you\'re about to work on...'}
            className="form-input"
            rows={3}
          />
        </div>

        {/* Start/Stop Buttons */}
        <div className="flex gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!selectedTaskId}
              className="btn btn-success flex items-center gap-2 flex-1"
            >
              <FaPlay />
              Start Timer
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="btn btn-danger flex items-center gap-2 flex-1"
            >
              <FaStop />
              Stop Timer
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-white mb-2">Quick Actions:</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-secondary">
              View Today's Logs
            </button>
            <button className="btn btn-sm btn-secondary">
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;