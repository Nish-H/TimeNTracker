import React, { useState, useEffect } from 'react';
import { FaTasks, FaClock, FaChartLine, FaCalendarAlt } from 'react-icons/fa';
import Timer from '@/components/Timer';
import TaskList from '@/components/TaskList';
import { Task, TimeLog, DailyReport } from '@/types';
import { tasksApi, reportsApi } from '@/services/api';
import { useTimer } from '@/hooks/useTimer';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayLogs, setTodayLogs] = useState<TimeLog[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatTime } = useTimer();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [tasksRes, reportRes] = await Promise.all([
        tasksApi.getAll({ status: 'IN_PROGRESS,PENDING' }),
        reportsApi.getDaily(),
      ]);

      setTasks(tasksRes.data.tasks);
      setDailyReport(reportRes.data.summary);
      setTodayLogs(reportRes.data.timeLogs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreate = () => {
    // Navigate to tasks page or open modal
    window.location.href = '/tasks';
  };

  const handleTaskEdit = () => {
    // Navigate to tasks page or open modal
    window.location.href = '/tasks';
  };

  const handleTaskDelete = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await tasksApi.delete(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const stats = [
    {
      name: 'Active Tasks',
      value: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      icon: FaTasks,
      color: 'bg-gradient-primary',
      shadow: 'shadow-glow',
    },
    {
      name: 'Today\'s Hours',
      value: dailyReport ? `${dailyReport.totalHours}h` : '0h',
      icon: FaClock,
      color: 'bg-gradient-success',
      shadow: 'shadow-success-glow',
    },
    {
      name: 'Time Entries',
      value: todayLogs.length,
      icon: FaChartLine,
      color: 'bg-gradient-electric',
      shadow: 'shadow-electric',
    },
    {
      name: 'Pending Tasks',
      value: tasks.filter(t => t.status === 'PENDING').length,
      icon: FaCalendarAlt,
      color: 'bg-gradient-warning',
      shadow: 'shadow-lg',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-12 bg-glass rounded-2xl w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-glass rounded-2xl neon-glow"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-glass rounded-2xl neon-glow"></div>
            <div className="lg:col-span-2 h-96 bg-glass rounded-2xl neon-glow"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="hero-title text-shadow-lg">⚡ Dashboard</h1>
        <div className="text-sm text-accent-400 font-medium">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="stats-card floating">
              <div className="flex items-center">
                <div className={`rounded-2xl p-4 ${stat.color} ${stat.shadow} neon-glow`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-semibold text-secondary-300 uppercase tracking-wider">{stat.name}</p>
                  <p className="text-3xl font-bold text-gradient-primary">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-1">
          <Timer tasks={tasks} />
        </div>

        {/* Tasks */}
        <div className="lg:col-span-2">
          <TaskList
            tasks={tasks}
            onTaskCreate={handleTaskCreate}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
          />
        </div>
      </div>

      {/* Today's Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-shadow">⏰ Today's Activity</h3>
        </div>
        <div className="card-body">
          {todayLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 text-gradient-primary">⏰</div>
              <p className="text-secondary-400 text-lg">No time logs for today</p>
              <p className="text-secondary-500 text-sm mt-2">Start tracking your time to see activity here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayLogs.map((log) => (
                <div key={log.id} className="task-item">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white text-lg">{log.task?.title}</div>
                      <div className="text-sm text-accent-400">
                        {new Date(log.startTime).toLocaleTimeString()} - {' '}
                        {log.endTime ? new Date(log.endTime).toLocaleTimeString() : (
                          <span className="text-success-400 animate-pulse-slow font-bold">Running</span>
                        )}
                      </div>
                      {log.description && (
                        <div className="text-sm text-secondary-300 mt-1 italic">{log.description}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gradient-primary text-xl">
                        {log.durationMinutes ? formatTime(log.durationMinutes * 60) : (
                          <span className="text-success-400 animate-pulse-slow">Running</span>
                        )}
                      </div>
                      <div className="text-sm text-electric-400">
                        {log.task?.client?.name || 'No Client'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;