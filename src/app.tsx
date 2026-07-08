import { Goddo, t } from '@goddo/core'
import { html } from '@goddo/html'
import { openapi } from '@goddo/openapi'
import { llmstxt } from '@goddo/llms-txt'
import { renderPage, type Todo } from './page.tsx'

// In-memory store for demonstration
const todos: Todo[] = [
  { id: 1, title: 'Buy groceries', completed: true },
  { id: 2, title: 'Walk the dog', completed: false },
]
let idCounter = 3

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
  .get('/', ({ redirect }) => redirect('/docs'))
  .get('/page', () => renderPage(todos))
  .group('/todos', (app) =>
    app
      .get('/', () => todos, {
        detail: { summary: 'List all todos', tags: ['Todos'] },
      })
      .get('/:id', ({ params: { id } }) => {
        const todo = todos.find((t) => t.id === id)
        if (!todo) return new Response('Todo not found', { status: 404 })
        return todo
      }, {
        params: t.Object({ id: t.Numeric() }),
        detail: { summary: 'Get a todo by ID', tags: ['Todos'] },
      })
      .post('/', ({ body }) => {
        const todo: Todo = { id: idCounter++, title: body.title, completed: false }
        todos.push(todo)
        return todo
      }, {
        body: t.Object({ title: t.String() }),
        detail: { summary: 'Create a new todo', tags: ['Todos'] },
      })
      .put('/:id', ({ params: { id }, body }) => {
        const todo = todos.find((t) => t.id === id)
        if (!todo) return new Response('Todo not found', { status: 404 })
        if (body.title !== undefined) todo.title = body.title
        if (body.completed !== undefined) todo.completed = body.completed
        return todo
      }, {
        params: t.Object({ id: t.Numeric() }),
        body: t.Object({
          title: t.Optional(t.String()),
          completed: t.Optional(t.Boolean()),
        }),
        detail: { summary: 'Update a todo', tags: ['Todos'] },
      })
      .delete('/:id', ({ params: { id } }) => {
        const index = todos.findIndex((t) => t.id === id)
        if (index === -1) return new Response('Todo not found', { status: 404 })
        todos.splice(index, 1)
        return { success: true }
      }, {
        params: t.Object({ id: t.Numeric() }),
        detail: { summary: 'Delete a todo', tags: ['Todos'] },
      }))
