import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title?: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export default function Modal({ title, onClose, children, className }: ModalProps) {
  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${className ?? ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
