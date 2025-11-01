# Bug Tracker Demo

A demo application showcasing Count Cachula's cache-first architecture with real-time updates via Server-Sent Events (SSE).

## Features

- Bug/issue tracking with labels and comments
- Real-time cache invalidation via SSE
- Stale-while-revalidate caching pattern
- SQLite backend with Better-SQLite3

## Development

### Prerequisites

- Node.js 20+
- npm

### Running Locally

```bash
# Install dependencies (from project root)
npm install

# Run the development server
cd demos/bugs
npm run dev
```

The app will be available at:
- Frontend: https://localhost:8201
- API: http://localhost:3001

## Container Deployment

The application is containerized using a multi-stage build with nginx serving the frontend and Node.js running the API backend.

### Architecture

- **nginx** (port 80): Serves static files and proxies `/api/*` requests
- **Node.js**: Runs the Hono-based API server on port 3001
- **supervisord**: Manages both processes

### Building the Container

From the project root:

```bash
podman build -f demos/bugs/Containerfile -t bugs-demo .
```

### Running the Container

```bash
podman run -p 8080:80 -v bugs-data:/app/demos/bugs bugs-demo
```

Access the application at http://localhost:8080

#### Volume Mapping Explained

The `-v bugs-data:/app/demos/bugs` flag creates a named volume for data persistence:

- **`bugs-data`**: Named volume that Podman manages
- **`/app/demos/bugs`**: Mount point inside the container where the SQLite database (`bugs.db`) is stored

**Why this matters:**
- The SQLite database file is created at `/app/demos/bugs/bugs.db` inside the container
- Without a volume mount, all data would be lost when the container stops
- The named volume persists data across container restarts and updates
- You can inspect the volume with `podman volume inspect bugs-data`

**Alternative volume options:**

```bash
# Use a bind mount to a specific directory on your host
podman run -p 8080:80 -v ./data:/app/demos/bugs bugs-demo

# Run without persistence (data will be lost on container stop)
podman run -p 8080:80 bugs-demo
```

### Managing the Container

```bash
# View logs from both nginx and the API
podman logs -f <container-id>

# Stop the container
podman stop <container-id>

# Remove the container
podman rm <container-id>

# Remove the volume (WARNING: deletes all data)
podman volume rm bugs-data

# List volumes
podman volume ls

# Inspect volume location
podman volume inspect bugs-data
```

### Building for Production

The Containerfile is production-ready and includes:
- Multi-stage build to minimize image size
- Aggressive caching for hashed assets (1 year, immutable)
- SSE support with proper nginx configuration
- Automatic process management with supervisord
- Native module compilation for better-sqlite3

## Project Structure

```
demos/bugs/
├── api/                    # Backend API code
│   ├── db.ts              # Database setup and seeding
│   └── index.ts           # Hono API routes
├── src/                   # Frontend React/Preact code
│   ├── App.tsx            # Main application
│   └── components/        # UI components
├── Containerfile          # Container build instructions
├── nginx.conf             # Nginx configuration
├── supervisord.conf       # Process manager config
├── server.ts              # API server entrypoint
└── vite.config.ts         # Vite build configuration
```

## SSE (Server-Sent Events)

The application uses SSE for real-time cache invalidation:
- Client connects to `/api/cache-events`
- Server sends preload hints for commonly accessed resources
- When data changes, server broadcasts invalidation events
- Clients automatically refetch affected resources

## Database Schema

SQLite database with tables:
- **issues**: Bug reports with status, priority, timestamps
- **labels**: Reusable labels with colors
- **issue_labels**: Many-to-many relationship
- **comments**: Comments on issues
