import { useState, useCallback } from 'react'

let toastId = 0
const listeners = []
let memoryState = { toasts: [] }

function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TOAST':
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, 5) }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) }
    default:
      return state
  }
}

export function toast({ title, description, variant = 'default', duration = 4000 }) {
  const id = String(++toastId)
  dispatch({ type: 'ADD_TOAST', toast: { id, title, description, variant, open: true } })
  setTimeout(() => dispatch({ type: 'REMOVE_TOAST', toastId: id }), duration)
  return id
}

export function useToast() {
  const [state, setState] = useState(memoryState)
  useState(() => {
    listeners.push(setState)
    return () => {
      const idx = listeners.indexOf(setState)
      if (idx > -1) listeners.splice(idx, 1)
    }
  })
  return { toasts: state.toasts, toast }
}
