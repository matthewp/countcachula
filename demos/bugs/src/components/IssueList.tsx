import { Issue, IssueStatus } from '../types';
import { IssueCard } from './IssueCard';

interface IssueListProps {
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onCreateClick: () => void;
  statusFilter: IssueStatus | 'all';
  onStatusFilterChange: (status: IssueStatus | 'all') => void;
  canCreateIssues: boolean;
}

export function IssueList({
  issues,
  onIssueClick,
  onCreateClick,
  statusFilter,
  onStatusFilterChange,
  canCreateIssues,
}: IssueListProps) {
  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <div class="flex gap-2">
          <button
            onClick={() => onStatusFilterChange('all')}
            class={`px-3 py-1 rounded-md text-sm font-medium ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onStatusFilterChange('open')}
            class={`px-3 py-1 rounded-md text-sm font-medium ${
              statusFilter === 'open'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => onStatusFilterChange('in_progress')}
            class={`px-3 py-1 rounded-md text-sm font-medium ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => onStatusFilterChange('closed')}
            class={`px-3 py-1 rounded-md text-sm font-medium ${
              statusFilter === 'closed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Closed
          </button>
        </div>
        {canCreateIssues ? (
          <button
            onClick={onCreateClick}
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            + New Issue
          </button>
        ) : (
          <div class="text-sm text-gray-500">
            Login to create issues
          </div>
        )}
      </div>

      {issues.length === 0 ? (
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500">No issues found</p>
        </div>
      ) : (
        <div class="space-y-3">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={() => onIssueClick(issue)} />
          ))}
        </div>
      )}
    </div>
  );
}
