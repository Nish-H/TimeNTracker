import React, { useState, useEffect } from 'react';
import TaskList from '@/components/TaskList';
import TaskModal from '@/components/TaskModal';
import { Task } from '@/types';
import { tasksApi } from '@/services/api';
import toast from 'react-hot-toast';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.getAll();
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreate = () => {
    setModalMode('create');
    setEditingTask(undefined);
    setModalOpen(true);
  };

  const handleTaskEdit = (task: Task) => {
    setModalMode('edit');
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleModalSubmit = async (taskData: Partial<Task>) => {
    try {
      if (modalMode === 'create') {
        const response = await tasksApi.create(taskData);
        setTasks([...tasks, response.data.task]);
        toast.success('Task created successfully');
      } else {
        const response = await tasksApi.update(editingTask!.id, taskData);
        setTasks(tasks.map(t => t.id === editingTask!.id ? response.data.task : t));
        toast.success('Task updated successfully');
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
      throw error;
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Tasks</h1>
      </div>

      <TaskList
        tasks={tasks}
        onTaskCreate={handleTaskCreate}
        onTaskEdit={handleTaskEdit}
        onTaskDelete={handleTaskDelete}
        loading={loading}
      />

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        task={editingTask}
        mode={modalMode}
      />
    </div>
  );
};

export default Tasks;