import { useState } from 'preact/hooks';
import { useAuth } from './AuthContext';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await onSubmit(content);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-3">
      <div class="flex items-center gap-3 mb-3">
        {user?.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.username}
            class="w-8 h-8 rounded-full"
          />
        )}
        <div>
          <p class="text-sm font-medium text-gray-900">
            {user?.name || user?.username}
          </p>
          <p class="text-xs text-gray-500">@{user?.username}</p>
        </div>
      </div>
      <div>
        <textarea
          placeholder="Add a comment..."
          value={content}
          onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !content.trim()}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Adding...' : 'Add Comment'}
      </button>
    </form>
  );
}
