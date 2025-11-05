export type IssueStatus = 'open' | 'in_progress' | 'closed';
export type Priority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  github_id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Comment {
  id: number;
  issue_id: number;
  author_id: number;
  author: User;
  content: string;
  created_at: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  author_id: number;
  author: User;
  created_at: string;
  updated_at: string;
  labels: Label[];
  comments?: Comment[];
}
