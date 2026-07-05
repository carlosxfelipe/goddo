async function initProject() {
  console.log('⚠️  WARNING: This command will reset the project for a new application.')
  console.log('It will perform the following destructive actions:')
  console.log('  - Delete the "tests", "bruno", and "benchmarks" directories')
  console.log('  - Clear this init task from "deno.json"')
  console.log('  - Reset "src/app.tsx" to a basic code snippet')
  console.log('  - Delete "LICENSE"')
  console.log('  - Delete "README.md"')
  console.log('  - Delete the "scripts" directory (self-destruct)')
  console.log('')

  const force = Deno.args.includes('-y') || Deno.args.includes('--yes')

  if (!force) {
    const answer = prompt('Are you sure you want to proceed? (yes/no):')

    if (answer?.toLowerCase() !== 'yes' && answer?.toLowerCase() !== 'y') {
      console.log('\\n❌ Aborted. No changes were made.')
      Deno.exit(0)
    }
  }

  console.log('\\n🚀 Proceeding with project cleanup...\\n')
  const dirsToRemove = ['tests', 'bruno', 'benchmarks']

  for (const dir of dirsToRemove) {
    try {
      await Deno.remove(dir, { recursive: true })
      console.log(`✅ Removed directory: ${dir}/`)
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) {
        console.error(`❌ Failed to remove ${dir}/:`, e)
      }
    }
  }

  try {
    await Deno.remove('LICENSE')
    console.log(`✅ Removed LICENSE`)
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.error(`❌ Failed to remove LICENSE:`, e)
    }
  }

  try {
    await Deno.remove('README.md')
    console.log(`✅ Removed README.md`)
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.error(`❌ Failed to remove README.md:`, e)
    }
  }

  try {
    const denoJsonText = await Deno.readTextFile('deno.json')
    const denoJson = JSON.parse(denoJsonText)

    if (denoJson.tasks) {
      delete denoJson.tasks['bench']
      delete denoJson.tasks['init'] // Remove itself
    }

    await Deno.writeTextFile('deno.json', JSON.stringify(denoJson, null, 2) + '\n')
    console.log(`✅ Updated deno.json`)
  } catch (e) {
    console.error('❌ Failed to update deno.json:', e)
  }

  const basicApp = `import { Goddo } from 'goddo'
import { openapi } from '@goddo/openapi'

export const app = new Goddo()
  .use(
    openapi({
      documentation: {
        info: {
          title: 'My Goddo API',
          version: '1.0.0',
          description: 'API documentation powered by Scalar.',
        },
      },
    }),
  )
  .get('/', ({ redirect }) => redirect('/docs'))
  .get('/hello', () => 'Hello, Goddo!')
`
  try {
    await Deno.writeTextFile('src/app.tsx', basicApp)
    console.log(`✅ Reset src/app.tsx to a basic snippet with OpenAPI`)
  } catch (e) {
    console.error('❌ Failed to reset src/app.tsx:', e)
  }

  try {
    const indexContent = await Deno.readTextFile('src/index.ts')
    await Deno.writeTextFile('src/index.ts', indexContent.replace(/\.\/app\.ts(?!x)/g, './app.tsx'))
  } catch (_e) {
    // Ignore if index.ts doesn't exist
  }

  try {
    await Deno.remove('scripts', { recursive: true })
    console.log(`✅ Removed scripts/ directory`)
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.error(`❌ Failed to remove scripts/:`, e)
    }
  }

  console.log('\\n🎉 Project is clean and ready for development!')
}

if (import.meta.main) {
  initProject()
}
