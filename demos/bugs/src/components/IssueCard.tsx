import { Issue } from '../types';
import { StatusBadge } from './StatusBadge';
import { LabelBadge } from './LabelBadge';

interface IssueCardProps {
  issue: Issue;
  onClick: () => void;
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const createdDate = new Date(issue.created_at).toLocaleDateString();

  return (
    <div
      onClick={onClick}
      class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div class="flex items-start justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-900 flex-1">#{issue.id} {issue.title}</h3>
        <StatusBadge status={issue.status} />
      </div>

      {issue.description && (
        <p class="text-sm text-gray-600 mb-3 line-clamp-2">{issue.description}</p>
      )}

      <div class="flex items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          {issue.labels.map((label) => (
            <LabelBadge key={label.id} label={label} />
          ))}
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2">
            {issue.author?.avatar_url && (
              <img
                src={issue.author.avatar_url}
                alt={issue.author.username}
                class="w-5 h-5 rounded-full"
              />
            )}
            <span class="text-xs text-gray-500">@{issue.author?.username}</span>
          </div>
          <span class="text-xs text-gray-400">•</span>
          <span class="text-xs text-gray-500">{createdDate}</span>
        </div>
      </div>
    </div>
  );
}
