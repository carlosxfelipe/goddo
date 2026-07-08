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
        <script src='https://unpkg.com/@phosphor-icons/web'></script>
        <script defer src='https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js'></script>
        <style>
          {`html { font-size: 14px; }`}
        </style>
      </head>
      <body>
        <main>
          <article style='margin-top: 3rem;'>
            <h1 style='display: flex; align-items: center; gap: 0.5rem;'>
              <i class='ph ph-list-checks' style='color: var(--pico-primary);'></i> My Todos
            </h1>

            <form
              x-data="{ title: '' }"
              {...{
                '@submit.prevent':
                  "fetch('/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }).then(() => location.reload())",
              }}
            >
              <fieldset role='group'>
                <input type='text' x-model='title' placeholder='What needs to be done?' required />
                <button
                  type='submit'
                  style='display: flex; align-items: center; justify-content: center; gap: 0.25rem;'
                >
                  <i class='ph ph-plus-circle'></i> Add
                </button>
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
                          x-on:change={`fetch('/todos/${todo.id}', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !${todo.completed} }) }).then(() => location.reload())`}
                        />
                        {todo.completed ? <s>{todo.title}</s> : todo.title}
                      </label>
                    </td>
                    <td align='right' style='vertical-align: middle;'>
                      <div style='display: flex; gap: 0.5rem; justify-content: flex-end;'>
                        <button
                          type='button'
                          x-data={`{ currentTitle: '${todo.title.replace(/'/g, "\\'")}' }`}
                          x-on:click={`let newTitle = prompt('Edit todo:', currentTitle); if (newTitle !== null && newTitle.trim() !== '') { fetch('/todos/${todo.id}', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle.trim() }) }).then(() => location.reload()) }`}
                          style='margin-bottom: 0; min-width: 90px; display: flex; align-items: center; justify-content: center; gap: 0.25rem; background-color: var(--pico-secondary-background); border-color: var(--pico-secondary-border);'
                        >
                          <i class='ph ph-pencil-simple'></i> Edit
                        </button>
                        <button
                          type='button'
                          x-on:click={`fetch('/todos/${todo.id}', { method: 'DELETE' }).then(() => location.reload())`}
                          style='margin-bottom: 0; min-width: 90px; display: flex; align-items: center; justify-content: center; gap: 0.25rem;'
                        >
                          <i class='ph ph-trash'></i> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article style='margin-top: 1rem; background-color: var(--pico-form-element-background); text-align: center; padding: 2rem;'>
            <h3 style='margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;'>
              <i class='ph ph-book-open-text' style='color: var(--pico-primary);'></i>{' '}
              API Documentation
            </h3>
            <p style='margin-bottom: 1.5rem; color: var(--pico-muted-color);'>
              Want to see the API that powers this app? Check out the auto-generated interactive
              documentation.
            </p>
            <a
              href='/docs'
              role='button'
              class='secondary'
              style='display: inline-flex; align-items: center; gap: 0.5rem;'
            >
              View API Docs <i class='ph ph-arrow-right'></i>
            </a>
          </article>
        </main>
      </body>
    </html>
  )
  return new HtmlString('<!DOCTYPE html>\n' + page)
}
