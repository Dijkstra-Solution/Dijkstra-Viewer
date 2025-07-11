import { createRoot } from 'react-dom/client'
import './index.css'
import { ClientTest } from './client/ClientTest.tsx'

createRoot(document.getElementById('root')!).render(
  <>
    <ClientTest />
  </>,
)
