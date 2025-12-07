import { useState, useEffect } from 'react';
import { FolderOpen, Plus, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WorkspaceView({ onChangeView }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const res = await axios.get(`${API}/workspaces`, { withCredentials: true });
      setWorkspaces(res.data || []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspace.name.trim()) {
      alert('Please enter a workspace name');
      return;
    }
    try {
      const res = await axios.post(`${API}/workspaces`, newWorkspace, { withCredentials: true });
      setWorkspaces([...workspaces, res.data]);
      setNewWorkspace({ name: '', description: '' });
      setShowCreate(false);
      await loadWorkspaces(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace. Please try again.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Workspace
        </button>
      </div>
      {showCreate && (
        <div className="p-6 border-b border-white/10 bg-white/5">
          <form onSubmit={createWorkspace} className="space-y-3">
            <input
              type="text"
              value={newWorkspace.name}
              onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
              placeholder="Workspace name"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
              required
            />
            <textarea
              value={newWorkspace.description}
              onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <p className="text-white/60 mb-4">No workspaces yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Create Workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <div
                key={workspace.workspace_id}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FolderOpen className="w-8 h-8 mb-3 text-white/60" />
                <h3 className="font-semibold mb-1">{workspace.name}</h3>
                {workspace.description && (
                  <p className="text-white/60 text-sm mb-3">{workspace.description}</p>
                )}
                <p className="text-white/40 text-xs">
                  Created {new Date(workspace.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

