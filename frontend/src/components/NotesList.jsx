import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NotesList() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNotes();
  }, [user]);

  const loadNotes = async () => {
    try {
      const res = await axios.get(`${API}/notes`, { withCredentials: true });
      setNotes(res.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.content.trim()) return;

    try {
      const res = await axios.post(
        `${API}/notes`,
        newNote,
        { withCredentials: true }
      );
      setNotes([res.data, ...notes]);
      setNewNote({ title: '', content: '' });
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const updateNote = async (noteId, updates) => {
    try {
      const res = await axios.put(
        `${API}/notes/${noteId}`,
        updates,
        { withCredentials: true }
      );
      setNotes(notes.map(n => n.note_id === noteId ? res.data : n));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/notes/${noteId}`, { withCredentials: true });
      setNotes(notes.filter(n => n.note_id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        Please sign in to access notes
      </div>
    );
  }

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Notes</h1>
        </div>

        {/* Add Note */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <input
            data-testid="new-note-title"
            type="text"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            placeholder="Note title (optional)"
            className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm mb-3 focus:outline-none focus:border-white/30 transition-colors"
          />
          <textarea
            data-testid="new-note-content"
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            placeholder="Write your note..."
            className="w-full bg-transparent px-2 py-2 text-sm h-24 resize-none focus:outline-none"
          />
          <button
            data-testid="add-note-btn"
            onClick={addNote}
            className="mt-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="text-center py-8 text-white/60">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No notes yet. Start taking notes!
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div
                key={note.note_id}
                data-testid={`note-${note.note_id}`}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
              >
                {editingId === note.note_id ? (
                  <div>
                    <input
                      type="text"
                      defaultValue={note.title}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateNote(note.note_id, { title: e.target.value, content: note.content });
                        }
                      }}
                      className="w-full bg-white/5 px-2 py-1 rounded text-sm mb-2"
                    />
                    <textarea
                      defaultValue={note.content}
                      className="w-full bg-white/5 px-2 py-2 rounded text-sm h-32"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          updateNote(note.note_id, { title: note.title, content: e.target.value });
                        }
                      }}
                    />
                    <button
                      onClick={() => setEditingId(null)}
                      className="mt-2 px-3 py-1.5 bg-white text-black rounded text-xs"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {note.title && (
                          <h3 className="text-sm font-semibold mb-2">{note.title}</h3>
                        )}
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{note.content}</p>
                        <div className="text-xs text-white/40 mt-2">
                          {new Date(note.updated_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          data-testid={`edit-note-${note.note_id}`}
                          onClick={() => setEditingId(note.note_id)}
                          className="p-2 text-white/50 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          data-testid={`delete-note-${note.note_id}`}
                          onClick={() => deleteNote(note.note_id)}
                          className="p-2 text-white/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
