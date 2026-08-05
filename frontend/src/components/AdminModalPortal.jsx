import React from 'react'
import { createPortal } from 'react-dom'

export default function AdminModalPortal({ children }) {
  const modalRoot = document.querySelector('.game-session') || document.body
  return createPortal(children, modalRoot)
}
