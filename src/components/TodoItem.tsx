import type { Todo } from '../page.tsx'

export function TodoItem(todo: Todo & { key?: string | number }) {
  // We use hx-swap="outerHTML" to replace the entire <tr> element with the new one
  // hx-ext="json-enc" is used to keep sending JSON to match the strict type schemas
  return (
    <tr id={`todo-${todo.id}`}>
      <td width='100%'>
        <label>
          <input
            type='checkbox'
            checked={todo.completed}
            hx-patch={`/todos/${todo.id}`}
            hx-ext='json-enc'
            hx-vals={JSON.stringify({ completed: !todo.completed })}
            hx-target={`#todo-${todo.id}`}
            hx-swap='outerHTML'
          />
          {todo.completed ? <s>{todo.title}</s> : todo.title}
        </label>
      </td>
      <td align='right' style='vertical-align: middle;'>
        <div style='display: flex; gap: 0.5rem; justify-content: flex-end;'>
          <button
            type='button'
            x-data={`{ currentTitle: '${todo.title.replace(/'/g, "\\'")}' }`}
            hx-patch={`/todos/${todo.id}`}
            hx-ext='json-enc'
            hx-target={`#todo-${todo.id}`}
            hx-swap='outerHTML'
            {...{
              'x-on:htmx:config-request':
                "let newTitle = prompt('Edit todo:', currentTitle); if (newTitle !== null && newTitle.trim() !== '') { $event.detail.parameters.title = newTitle.trim(); } else { $event.preventDefault(); }",
            }}
            style='margin-bottom: 0; min-width: 90px; display: flex; align-items: center; justify-content: center; gap: 0.25rem; background-color: var(--pico-secondary-background); border-color: var(--pico-secondary-border);'
          >
            <i class='ph ph-pencil-simple'></i> Edit
          </button>
          <button
            type='button'
            hx-delete={`/todos/${todo.id}`}
            hx-target={`#todo-${todo.id}`}
            hx-swap='outerHTML'
            style='margin-bottom: 0; min-width: 90px; display: flex; align-items: center; justify-content: center; gap: 0.25rem;'
          >
            <i class='ph ph-trash'></i> Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
