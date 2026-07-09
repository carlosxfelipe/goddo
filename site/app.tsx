import { Goddo } from '@goddo/core'
import { html } from '@goddo/html'
import { renderHome } from './pages/home.tsx'
import { renderDocs } from './pages/docs.tsx'
import { renderPlugins } from './pages/plugins.tsx'
import { renderExamples } from './pages/examples.tsx'

export const app = new Goddo()
  .use(html())
  .get('/', () => renderHome())
  .get('/docs', () => renderDocs())
  .get('/plugins', () => renderPlugins())
  .get('/examples', () => renderExamples())
