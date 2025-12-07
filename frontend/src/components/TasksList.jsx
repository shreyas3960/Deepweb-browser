import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Check, Circle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TasksList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks`, { withCredentials: true });
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      const res = await axios.post(
        `${API}/tasks`,
        newTask,
        { withCredentials: true }
      );
      setTasks([...tasks, res.data]);
      setNewTask({ title: '', description: '' });
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const toggleTask = async (task) => {
    try {
      const res = await axios.put(
        `${API}/tasks/${task.task_id}`,
        { ...task, completed: !task.completed },
        { withCredentials: true }
      );
      setTasks(tasks.map(t => t.task_id === task.task_id ? res.data : t));
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { withCredentials: true });
      setTasks(tasks.filter(t => t.task_id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        Please sign in to access tasks
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalPoints = completedTasks * 10;

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">To-Do & Points</h1>
          </div>
          <div className="text-sm">
            <span className="text-white/60">Points: </span>
            <span className="text-white font-semibold text-lg">{totalPoints}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-2xl font-semibold">{tasks.length}</div>
            <div className="text-xs text-white/50">Total Tasks</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-2xl font-semibold">{completedTasks}</div>
            <div className="text-xs text-white/50">Completed</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-2xl font-semibold">{tasks.length - completedTasks}</div>
            <div className="text-xs text-white/50">Remaining</div>
          </div>
        </div>

        {/* Add Task */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <input
            data-testid="new-task-title"
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="Task title"
            className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm mb-3 focus:outline-none focus:border-white/30 transition-colors"
          />
          <input
            data-testid="new-task-description"
            type="text"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="Description (optional)"
            className="w-full bg-transparent px-2 py-2 text-sm mb-3 focus:outline-none"
          />
          <button
            data-testid="add-task-btn"
            onClick={addTask}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-8 text-white/60">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No tasks yet. Add your first task to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.task_id}
                data-testid={`task-${task.task_id}`}
                className={`p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    data-testid={`toggle-task-${task.task_id}`}
                    onClick={() => toggleTask(task)}
                    className="mt-0.5 text-white/50 hover:text-white transition-colors"
                  >
                    {task.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${
                      task.completed ? 'line-through text-white/50' : ''
                    }`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-white/60 mt-1">{task.description}</p>
                    )}
                    {task.completed && (
                      <div className="text-xs text-green-400 mt-1">+10 points</div>
                    )}
                  </div>
                  <button
                    data-testid={`delete-task-${task.task_id}`}
                    onClick={() => deleteTask(task.task_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/50 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
