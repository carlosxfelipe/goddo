import { HtmlString } from '@goddo/html'

export type Todo = { id: number; title: string; completed: boolean }

export function renderPage(todos: Todo[]) {
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
}
