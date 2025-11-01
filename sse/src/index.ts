interface SSEStream {
  writeSSE: (message: { data: string; event: string }) => Promise<void>;
}

export class CacheHub {
  private connections = new Set<SSEStream>();

  addConnection(stream: SSEStream): void {
    this.connections.add(stream);
  }

  removeConnection(stream: SSEStream): void {
    this.connections.delete(stream);
  }

  async invalidate(tags: string[]): Promise<void> {
    await this.broadcast('invalidate', tags.join(','));
  }

  async preloadHint(routes: string[]): Promise<void> {
    await this.broadcast('preload-hint', routes.join(','));
  }

  private async broadcast(event: string, data: string): Promise<void> {
    const deadConnections = new Set<SSEStream>();

    for (const connection of this.connections) {
      try {
        await connection.writeSSE({ event, data });
      } catch (error) {
        deadConnections.add(connection);
      }
    }

    // Clean up dead connections
    deadConnections.forEach((connection) => this.connections.delete(connection));
  }
}
