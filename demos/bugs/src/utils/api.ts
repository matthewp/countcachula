// Utility function to make authenticated requests
export function createAuthenticatedRequest(url: string, token: string | null, options: RequestInit = {}): Request {
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return new Request(url, {
    ...options,
    headers,
  });
}