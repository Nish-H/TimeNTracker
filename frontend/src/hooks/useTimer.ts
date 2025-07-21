import { useState, useEffect, useCallback } from 'react';
import { TimerState } from '@/types';
import { timeLogsApi } from '@/services/api';
import toast from 'react-hot-toast';

export const useTimer = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    activeTimeLog: null,
    elapsedTime: 0,
    startTime: null,
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Load active time log on mount
  useEffect(() => {
    loadActiveTimeLog();
  }, []);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      const id = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timerState.startTime!.getTime()) / 1000);
        setTimerState(prev => ({ ...prev, elapsedTime: elapsed }));
      }, 1000);

      setIntervalId(id);
      return () => clearInterval(id);
    } else if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [timerState.isRunning, timerState.startTime]);

  const loadActiveTimeLog = async () => {
    try {
      const response = await timeLogsApi.getActive();
      const activeTimeLog = response.data.activeTimeLog;

      if (activeTimeLog) {
        const startTime = new Date(activeTimeLog.startTime);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);

        setTimerState({
          isRunning: true,
          activeTimeLog,
          elapsedTime: elapsed,
          startTime,
        });
      }
    } catch (error) {
      console.error('Failed to load active time log:', error);
    }
  };

  const startTimer = useCallback(async (taskId: number, description?: string) => {
    if (timerState.isRunning) {
      toast.error('Timer is already running. Please stop it first.');
      return;
    }

    try {
      const response = await timeLogsApi.start(taskId, description);
      const timeLog = response.data.timeLog;
      const startTime = new Date(timeLog.startTime);

      setTimerState({
        isRunning: true,
        activeTimeLog: timeLog,
        elapsedTime: 0,
        startTime,
      });

      toast.success('Timer started successfully!');
    } catch (error: any) {
      console.error('Failed to start timer:', error);
      toast.error(error.response?.data?.error || 'Failed to start timer');
    }
  }, [timerState.isRunning]);

  const stopTimer = useCallback(async (description?: string) => {
    if (!timerState.isRunning || !timerState.activeTimeLog) {
      toast.error('No active timer to stop');
      return;
    }

    try {
      const endTime = new Date().toISOString();
      await timeLogsApi.stop(timerState.activeTimeLog.id, endTime, description);

      setTimerState({
        isRunning: false,
        activeTimeLog: null,
        elapsedTime: 0,
        startTime: null,
      });

      toast.success('Timer stopped successfully!');
    } catch (error: any) {
      console.error('Failed to stop timer:', error);
      toast.error(error.response?.data?.error || 'Failed to stop timer');
    }
  }, [timerState.isRunning, timerState.activeTimeLog]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationHours = (seconds: number): number => {
    return parseFloat((seconds / 3600).toFixed(2));
  };

  return {
    ...timerState,
    startTimer,
    stopTimer,
    formatTime,
    getDurationHours,
    refreshActiveTimeLog: loadActiveTimeLog,
  };
};