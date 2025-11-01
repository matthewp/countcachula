import { useState, useEffect } from 'preact/hooks';
import { Issue, IssueStatus, Label, Priority } from './types';
import { IssueList } from './components/IssueList';
import { IssueDetail } from './components/IssueDetail';
import { CreateIssueModal } from './components/CreateIssueModal';
import * as CountCachula from '@countcachula/core';

type View = 'list' | 'detail';

export function App() {
  const [view, setView] = useState<View>('list');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Connect to cache events (SSE) for invalidation and preloading
  useEffect(() => {
    let connection: CountCachula.Connection | null = null;

    CountCachula.connect('/api/cache-events', {
      preload: {
        onInvalidate: false,
        onHint: true,
        maxConcurrent: 3,
      },
    }).then((conn) => {
      connection = conn;
    });

    return () => {
      connection?.close();
    };
  }, []);

  // Load issues and labels
  useEffect(() => {
    loadIssues();
    loadLabels();
  }, [statusFilter]);

  const loadIssues = async () => {
    setLoading(true);
    const url = statusFilter === 'all'
      ? '/api/issues'
      : `/api/issues?status=${statusFilter}`;

    const request = new Request(url);
    const observable = CountCachula.fetch(request);

    observable.observe(async (response) => {
      const data = await response.json();
      setIssues(data);
      setLoading(false);
    });
  };

  const loadLabels = async () => {
    const request = new Request('/api/labels');
    const observable = CountCachula.fetch(request);

    observable.observe(async (response) => {
      const data = await response.json();
      setLabels(data);
    });
  };

  const loadIssueDetail = async (issueId: number) => {
    const request = new Request(`/api/issues/${issueId}`);
    const observable = CountCachula.fetch(request);

    observable.observe(async (response) => {
      const data = await response.json();
      setSelectedIssue(data);
    });
  };

  const handleIssueClick = async (issue: Issue) => {
    await loadIssueDetail(issue.id);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedIssue(null);
    loadIssues();
  };

  const handleCreateIssue = async (title: string, description: string, priority: Priority) => {
    // Optimistic update: add temporary issue to list
    const optimisticIssue: Issue = {
      id: Date.now(), // Temporary ID
      title,
      description,
      status: 'open',
      priority,
      labels: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setIssues((prev) => [optimisticIssue, ...prev]);

    // Mutation with regular fetch
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority }),
    });

    // SSE invalidation will refetch and sync with server truth
  };

  const handleStatusChange = async (status: IssueStatus) => {
    if (!selectedIssue) return;

    // Optimistic update: update issue status immediately
    setSelectedIssue({ ...selectedIssue, status });

    // Mutation with regular fetch
    await fetch(`/api/issues/${selectedIssue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    // SSE invalidation will refetch and sync with server truth
  };

  const handleAddComment = async (author: string, content: string) => {
    if (!selectedIssue) return;

    // Optimistic update: add comment to issue immediately
    const optimisticComment = {
      id: Date.now(), // Temporary ID
      issue_id: selectedIssue.id,
      author,
      content,
      created_at: new Date().toISOString(),
    };
    setSelectedIssue({
      ...selectedIssue,
      comments: [...(selectedIssue.comments || []), optimisticComment],
    });

    // Mutation with regular fetch
    await fetch(`/api/issues/${selectedIssue.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content }),
    });

    // SSE invalidation will refetch and sync with server truth
  };

  const handleAddLabel = async (labelId: number) => {
    if (!selectedIssue) return;

    // Optimistic update: add label to issue immediately
    const labelToAdd = labels.find((l) => l.id === labelId);
    if (labelToAdd) {
      setSelectedIssue({
        ...selectedIssue,
        labels: [...selectedIssue.labels, labelToAdd],
      });
    }

    // Mutation with regular fetch
    await fetch(`/api/issues/${selectedIssue.id}/labels/${labelId}`, {
      method: 'POST',
    });

    // SSE invalidation will refetch and sync with server truth
  };

  const handleRemoveLabel = async (labelId: number) => {
    if (!selectedIssue) return;

    // Optimistic update: remove label from issue immediately
    setSelectedIssue({
      ...selectedIssue,
      labels: selectedIssue.labels.filter((l) => l.id !== labelId),
    });

    // Mutation with regular fetch
    await fetch(`/api/issues/${selectedIssue.id}/labels/${labelId}`, {
      method: 'DELETE',
    });

    // SSE invalidation will refetch and sync with server truth
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Bug Tracker</h1>

        {loading && view === 'list' ? (
          <div class="text-center py-12">
            <p class="text-gray-500">Loading...</p>
          </div>
        ) : view === 'list' ? (
          <IssueList
            issues={issues}
            onIssueClick={handleIssueClick}
            onCreateClick={() => setShowCreateModal(true)}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        ) : selectedIssue ? (
          <IssueDetail
            issue={selectedIssue}
            allLabels={labels}
            onBack={handleBack}
            onStatusChange={handleStatusChange}
            onAddComment={handleAddComment}
            onAddLabel={handleAddLabel}
            onRemoveLabel={handleRemoveLabel}
          />
        ) : null}

        {showCreateModal && (
          <CreateIssueModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateIssue}
          />
        )}
      </div>
    </div>
  );
}
