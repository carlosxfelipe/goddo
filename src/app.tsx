import { Goddo, t } from '@goddo/core'
import { html } from '@goddo/html'
import { openapi } from '@goddo/openapi'
import { llmstxt } from '@goddo/llms-txt'
import { renderPage, type Todo } from './page.tsx'
import { TodoItem } from './components/TodoItem.tsx'

// Seed data — single source of truth for the initial store state
const SEED: [number, Todo][] = [
  [1, { id: 1, title: 'Buy groceries', completed: true }],
  [2, { id: 2, title: 'Walk the dog', completed: false }],
]

// In-memory store (Map = O(1) lookup/delete, analogous to a DB primary-key index)
const todos = new Map<number, Todo>(SEED)
let idCounter = SEED.length + 1

const todosArray = () => [...todos.values()]

/** Resets the store to its initial seed state. Used by benchmarks to avoid cross-benchmark pollution. */
export function resetStore() {
  todos.clear()
  for (const [k, v] of SEED) todos.set(k, { ...v })
  idCounter = SEED.length + 1
}

export const app = new Goddo()
  .use(
    openapi({
      documentation: {
        info: { title: 'Todo API', version: '1.0.0', description: 'A simple Todo CRUD API.' },
      },
    }),
  )
  .use(llmstxt({
    title: 'My Todos API',
    description: 'An API to manage your tasks',
  }))
  .use(html())
  .get('/', ({ redirect }) => redirect('/page'))
  .get('/page', () => renderPage(todosArray()))
  .group('/todos', (app) =>
    app
      .get('/', () => todosArray(), {
        detail: { summary: 'List all todos', tags: ['Todos'] },
      })
      .get('/:id', ({ params: { id }, set }) => {
        const todo = todos.get(id)
        if (!todo) {
          set.status = 404
          return { error: 'Todo not found' }
        }
        return todo
      }, {
        params: t.Object({ id: t.Numeric() }),
        detail: { summary: 'Get a todo by ID', tags: ['Todos'] },
      })
      .post('/', ({ body, headers }) => {
        const todo: Todo = { id: idCounter++, title: body.title, completed: false }
        todos.set(todo.id, todo)
        if (headers['hx-request']) return TodoItem(todo)
        return todo
      }, {
        body: t.Object({ title: t.String() }),
        detail: { summary: 'Create a new todo', tags: ['Todos'] },
      })
      .patch('/:id', ({ params: { id }, body, headers, set }) => {
        const todo = todos.get(id)
        if (!todo) {
          set.status = 404
          return { error: 'Todo not found' }
        }
        if (body.title !== undefined) todo.title = body.title
        if (body.completed !== undefined) todo.completed = body.completed
        if (headers['hx-request']) return TodoItem(todo)
        return todo
      }, {
        params: t.Object({ id: t.Numeric() }),
        body: t.Object({
          title: t.Optional(t.String()),
          completed: t.Optional(t.Boolean()),
        }),
        detail: { summary: 'Partially update a todo', tags: ['Todos'] },
      })
      .delete('/:id', ({ params: { id }, headers, set }) => {
        if (!todos.has(id)) {
          set.status = 404
          return { error: 'Todo not found' }
        }
        todos.delete(id)
        if (headers['hx-request']) return ''
        return { success: true }
      }, {
        params: t.Object({ id: t.Numeric() }),
        detail: { summary: 'Delete a todo', tags: ['Todos'] },
      }))
