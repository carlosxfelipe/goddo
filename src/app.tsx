import { Goddo, t } from 'goddo'
import { html, HtmlString } from '@goddo/html'
import { openapi } from '@goddo/openapi'
import { llmstxt } from '@goddo/llms-txt'

type Todo = { id: number; title: string; completed: boolean }

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
  .get('/page', () => {
    const page = (
      <html lang='en'>
        <head>
          <meta charset='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <title>My Todos</title>
          <link
            rel='stylesheet'
            href='https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css'
          />
          <style>
            {`html { font-size: 14px; }`}
          </style>
        </head>
        <body>
          <main>
            <article style='margin-top: 3rem;'>
              <h1>My Todos 📝</h1>

              <form id='add-form'>
                <fieldset role='group'>
                  <input type='text' id='new-todo' placeholder='What needs to be done?' required />
                  <button type='submit'>Add</button>
                </fieldset>
              </form>

              <table>
                <tbody>
                  {todos.map((todo) => (
                    <tr>
                      <td width='100%'>
                        <label>
                          <input
                            type='checkbox'
                            checked={todo.completed}
                            onclick={`toggleTodo(${todo.id}, ${todo.completed})`}
                          />
                          {todo.completed ? <s>{todo.title}</s> : todo.title}
                        </label>
                      </td>
                      <td align='right'>
                        <button
                          type='button'
                          onclick={`deleteTodo(${todo.id})`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </main>

          <script>
            {new HtmlString(`
          async function toggleTodo(id, completed) {
            await fetch('/todos/' + id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ completed: !completed })
            })
            location.reload()
          }

          async function deleteTodo(id) {
            await fetch('/todos/' + id, { method: 'DELETE' })
            location.reload()
          }

          document.getElementById('add-form').addEventListener('submit', async (e) => {
            e.preventDefault()
            const title = document.getElementById('new-todo').value
            await fetch('/todos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title })
            })
            location.reload()
          })
        `)}
          </script>
        </body>
      </html>
    )
    return new HtmlString('<!DOCTYPE html>\n' + page)
  })
  .group('/todos', (app) =>
    app
      .get('/', () => todos, {
        detail: { summary: 'List all todos', tags: ['Todos'] },
      })
      .get('/:id', ({ params: { id }, error }) => {
        const todo = todos.find((t) => t.id === id)
        if (!todo) throw error(404, 'Todo not found')
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
      .put('/:id', ({ params: { id }, body, error }) => {
        const todo = todos.find((t) => t.id === id)
        if (!todo) throw error(404, 'Todo not found')
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
      .delete('/:id', ({ params: { id }, error }) => {
        const index = todos.findIndex((t) => t.id === id)
        if (index === -1) throw error(404, 'Todo not found')
        todos.splice(index, 1)
        return { success: true }
      }, {
        params: t.Object({ id: t.Numeric() }),
        detail: { summary: 'Delete a todo', tags: ['Todos'] },
      }))
