'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface QuickNote {
  id: string;
  content: string;
  category: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  agent: {
    id: string;
    name: string | null;
    email: string;
  };
  author: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface QuickNotesListProps {
  agentId?: string;
  showCreateButton?: boolean;
}

export function QuickNotesList({ agentId, showCreateButton = true }: QuickNotesListProps) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(agentId || '');
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  // Form state for new note
  const [newNote, setNewNote] = useState({
    content: '',
    category: 'GENERAL',
    isPrivate: false,
  });

  // Fetch agents for team leaders and managers
  useEffect(() => {
    if (session?.user?.role !== 'AGENT' && !agentId) {
      fetchAgents();
    }
  }, [session, agentId]);

  const fetchAgents = async () => {
    try {
      const endpoint = session?.user?.role === 'TEAM_LEADER' 
        ? '/api/agents?supervised=true' 
        : '/api/agents';
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  // Fetch quick notes
  useEffect(() => {
    fetchNotes();
  }, [searchTerm, categoryFilter, page, agentId, selectedAgent]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if ((agentId || selectedAgent) && selectedAgent !== 'all') params.append('agentId', agentId || selectedAgent);

      const response = await fetch(`/api/quick-notes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.quickNotes);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to fetch quick notes');
      }
    } catch (error) {
      console.error('Error fetching quick notes:', error);
      toast.error('Error fetching quick notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('Please enter note content');
      return;
    }

    if (!agentId && !selectedAgent) {
      toast.error('Please select an agent');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/quick-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNote,
          agentId: agentId || selectedAgent,
        }),
      });

      if (response.ok) {
        toast.success('Quick note created successfully');
        setShowCreateDialog(false);
        setNewNote({ content: '', category: 'GENERAL', isPrivate: false });
        fetchNotes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create quick note');
      }
    } catch (error) {
      console.error('Error creating quick note:', error);
      toast.error('Error creating quick note');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/quick-notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Quick note deleted successfully');
        fetchNotes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete quick note');
      }
    } catch (error) {
      console.error('Error deleting quick note:', error);
      toast.error('Error deleting quick note');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PERFORMANCE':
        return 'bg-blue-500';
      case 'BEHAVIOR':
        return 'bg-purple-500';
      case 'TRAINING':
        return 'bg-green-500';
      case 'OTHER':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-red-500';
      case 'TEAM_LEADER':
        return 'bg-orange-500';
      case 'AGENT':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quick Notes</CardTitle>
          {showCreateButton && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Quick Note</DialogTitle>
                  <DialogDescription>
                    Add a quick note about an agent&apos;s performance or behavior.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!agentId && session?.user?.role !== 'AGENT' && (
                    <div>
                      <Label htmlFor="agent">Agent</Label>
                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name || agent.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newNote.category}
                      onValueChange={(value) => setNewNote({ ...newNote, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERFORMANCE">Performance</SelectItem>
                        <SelectItem value="BEHAVIOR">Behavior</SelectItem>
                        <SelectItem value="TRAINING">Training</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="content">Note Content</Label>
                    <Textarea
                      id="content"
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="Enter your note here..."
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={newNote.isPrivate}
                      onChange={(e) => setNewNote({ ...newNote, isPrivate: e.target.checked })}
                      className="rounded border-gray-300"
                      aria-label="Make this note private"
                    />
                    <Label htmlFor="isPrivate">Make this note private</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateNote} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="PERFORMANCE">Performance</SelectItem>
              <SelectItem value="BEHAVIOR">Behavior</SelectItem>
              <SelectItem value="TRAINING">Training</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {!agentId && session?.user?.role !== 'AGENT' && (
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No quick notes found
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(note.category)}>
                        {note.category}
                      </Badge>
                      {note.isPrivate && (
                        <Badge variant="outline">Private</Badge>
                      )}
                      <Badge className={getRoleBadgeColor(note.author.role)} variant="outline">
                        {note.author.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{note.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Agent: {note.agent.name || note.agent.email}</span>
                      <span>By: {note.author.name || note.author.email}</span>
                      <span>{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  {(note.author.id === session?.user?.id || session?.user?.role === 'MANAGER') && (
                    <div className="flex items-center gap-2 ml-4">
                      {note.author.id === session?.user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {/* TODO: Implement edit */}}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}