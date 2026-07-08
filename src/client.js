globalThis.toggleTodo = async function (id, completed) {
  await fetch('/todos/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !completed }),
  })
  location.reload()
}

globalThis.deleteTodo = async function (id) {
  await fetch('/todos/' + id, { method: 'DELETE' })
  location.reload()
}

globalThis.editTodo = async function (id, currentTitle) {
  const newTitle = prompt('Edit todo:', currentTitle)
  if (newTitle !== null && newTitle.trim() !== '') {
    await fetch('/todos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    })
    location.reload()
  }
}

document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const title = document.getElementById('new-todo').value
  await fetch('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  location.reload()
})
