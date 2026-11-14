import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dev previews: any `src/**/Preview.tsx` is reachable at /?preview=<folder>, e.g. /?preview=worlds
const previews = import.meta.glob<{ default: ComponentType }>('./**/Preview.tsx', { eager: true })
const wanted = new URLSearchParams(location.search).get('preview')
const match = wanted && Object.entries(previews).find(([path]) => path.split('/').slice(-2, -1)[0] === wanted)
const Root = match ? match[1].default : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
