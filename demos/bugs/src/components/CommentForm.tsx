import { useState } from 'preact/hooks';

interface CommentFormProps {
  onSubmit: (author: string, content: string) => Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;

    setLoading(true);
    try {
      await onSubmit(author, content);
      setAuthor('');
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-3">
      <div>
        <input
          type="text"
          placeholder="Your name"
          value={author}
          onInput={(e) => setAuthor((e.target as HTMLInputElement).value)}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
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
        disabled={loading || !author.trim() || !content.trim()}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Adding...' : 'Add Comment'}
      </button>
    </form>
  );
}
