import { Layout } from './components/Layout.tsx'
import { TodoItem } from './components/TodoItem.tsx'

export type Todo = { id: number; title: string; completed: boolean }

export function renderPage(todos: Todo[]) {
  return (
    <Layout>
      <main x-data>
        <article style='margin-top: 3rem;'>
          <h1 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-list-checks' style='color: var(--pico-primary);'></i> My Todos
          </h1>

          <form
            x-data="{ title: '' }"
            hx-post='/todos'
            hx-ext='json-enc'
            hx-target='#todo-list'
            hx-swap='beforeend'
            {...{
              'x-on:htmx:after-request': 'if($event.detail.successful) title = ""',
            }}
          >
            <fieldset role='group'>
              <input
                type='text'
                name='title'
                x-model='title'
                placeholder='What needs to be done?'
                required
              />
              <button
                type='submit'
                style='display: flex; align-items: center; justify-content: center; gap: 0.25rem;'
              >
                <i class='ph ph-plus-circle'></i> Add
              </button>
            </fieldset>
          </form>

          <table>
            <tbody id='todo-list'>
              {todos.map((todo) => <TodoItem key={todo.id} {...todo} />)}
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
    </Layout>
  )
}
