import { useState } from 'preact/hooks';
import { Issue, IssueStatus, Label } from '../types';
import { StatusBadge } from './StatusBadge';
import { LabelBadge } from './LabelBadge';
import { CommentForm } from './CommentForm';

interface IssueDetailProps {
  issue: Issue;
  allLabels: Label[];
  onBack: () => void;
  onStatusChange: (status: IssueStatus) => void;
  onAddComment: (content: string) => Promise<void>;
  onAddLabel: (labelId: number) => void;
  onRemoveLabel: (labelId: number) => void;
}

export function IssueDetail({
  issue,
  allLabels,
  onBack,
  onStatusChange,
  onAddComment,
  onAddLabel,
  onRemoveLabel,
}: IssueDetailProps) {
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const createdDate = new Date(issue.created_at).toLocaleDateString();
  const updatedDate = new Date(issue.updated_at).toLocaleDateString();

  const availableLabels = allLabels.filter(
    (label) => !issue.labels.some((issueLabel) => issueLabel.id === label.id)
  );

  return (
    <div class="space-y-6">
      <div class="flex items-center gap-3">
        <button
          onClick={onBack}
          class="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to list
        </button>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              #{issue.id} {issue.title}
            </h1>
            <div class="flex items-center gap-3 mb-2">
              {issue.author?.avatar_url && (
                <img
                  src={issue.author.avatar_url}
                  alt={issue.author.username}
                  class="w-6 h-6 rounded-full"
                />
              )}
              <span class="text-sm font-medium text-gray-700">
                {issue.author?.name || issue.author?.username}
              </span>
              <span class="text-sm text-gray-500">@{issue.author?.username}</span>
            </div>
            <div class="flex gap-2 text-sm text-gray-500">
              <span>Created {createdDate}</span>
              <span>•</span>
              <span>Updated {updatedDate}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <select
              value={issue.status}
              onChange={(e) => onStatusChange((e.target as HTMLSelectElement).value as IssueStatus)}
              class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
            <StatusBadge status={issue.status} />
          </div>
        </div>

        {issue.description && (
          <div class="mb-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p class="text-gray-600 whitespace-pre-wrap">{issue.description}</p>
          </div>
        )}

        <div class="mb-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Labels</h3>
          <div class="flex gap-2 flex-wrap items-center">
            {issue.labels.map((label) => (
              <LabelBadge
                key={label.id}
                label={label}
                onRemove={() => onRemoveLabel(label.id)}
              />
            ))}
            {availableLabels.length > 0 && (
              <div class="relative">
                <button
                  onClick={() => setShowLabelPicker(!showLabelPicker)}
                  class="px-3 py-1 text-xs border-2 border-dashed border-gray-300 rounded-full hover:border-gray-400 text-gray-600"
                >
                  + Add label
                </button>
                {showLabelPicker && (
                  <div class="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                    {availableLabels.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => {
                          onAddLabel(label.id);
                          setShowLabelPicker(false);
                        }}
                        class="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                      >
                        <LabelBadge label={label} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Comments ({issue.comments?.length || 0})
        </h2>

        {issue.comments && issue.comments.length > 0 && (
          <div class="space-y-4 mb-6">
            {issue.comments.map((comment) => (
              <div key={comment.id} class="border-l-4 border-blue-500 pl-4 py-2">
                <div class="flex items-center gap-2 mb-2">
                  {comment.author?.avatar_url && (
                    <img
                      src={comment.author.avatar_url}
                      alt={comment.author.username}
                      class="w-5 h-5 rounded-full"
                    />
                  )}
                  <span class="font-medium text-gray-900">
                    {comment.author?.name || comment.author?.username}
                  </span>
                  <span class="text-xs text-gray-500">@{comment.author?.username}</span>
                  <span class="text-xs text-gray-400">•</span>
                  <span class="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <p class="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        <CommentForm onSubmit={onAddComment} />
      </div>
    </div>
  );
}
