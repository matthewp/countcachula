import { Suspense } from 'react'
import { useFetch } from '@countcachula/react'
import './App.css'

function DataComponent() {
  const data = useFetch<{ userId: number; id: number; title: string; completed: boolean }[]>(
    'https://jsonplaceholder.typicode.com/todos?_limit=5'
  );

  return (
    <div>
      <h2>Todos from JSONPlaceholder</h2>
      <ul>
        {data.map(todo => (
          <li key={todo.id}>
            <strong>{todo.title}</strong> - {todo.completed ? '✅' : '❌'}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <h1>useFetch Demo</h1>
      <Suspense fallback={<div>Loading todos...</div>}>
        <DataComponent />
      </Suspense>
    </div>
  )
}

export default App
