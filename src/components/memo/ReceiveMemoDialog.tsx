'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ReceiveMemoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (receivedByName: string) => void | Promise<void>
  /** Prefills the name field when the dialog opens (e.g. logged-in username). */
  defaultName?: string
  title?: string
  description?: string
}

export function ReceiveMemoDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultName = '',
  title = 'Received by',
  description = 'Enter the name of the person who received this memo (e.g. focal or receiving staff).',
}: ReceiveMemoDialogProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setSubmitting(false)
    }
  }, [open, defaultName])

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onConfirm(trimmed)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name…"
          disabled={submitting}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit()
          }}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !name.trim()}>
            {submitting ? 'Saving…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
