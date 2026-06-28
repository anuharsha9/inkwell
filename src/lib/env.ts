// Demo mode is compiled in via VITE_DEMO_MODE at build time. The public Vercel
// build sets it; her personal/local build does not. In demo mode the app seeds
// a fictional sample dataset (never her real 50-article plan) into a separate
// IndexedDB, so a visitor can browse, try the local-AI features, and build a
// case study — without ever seeing her real writing.
const flag = import.meta.env.VITE_DEMO_MODE
export const DEMO_MODE = flag === '1' || flag === 'true'
