import { app } from './app.tsx'

const port = Number(Deno.env.get('PORT') ?? 3001)

app.listen(port)

console.log(`Goddo docs site running at http://localhost:${port}`)
