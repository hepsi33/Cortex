// hooks/useDocumentStatus.js
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_MESSAGES = {
  UPLOADED: 'Document received...',
  PARSING: 'Reading document pages...',
  TEXT_CLEANING: 'Cleaning extracted text...',
  CHUNKING: 'Splitting into sections...',
  EMBEDDING: 'Generating AI embeddings...',
  INDEXING: 'Saving to database...',
  VERIFYING: 'Verifying retrieval...',
  READY: 'Ready to answer questions!',
  FAILED: 'Processing failed.',
}

export function useDocumentStatus(documentId) {
  const [status, setStatus] = useState('UPLOADED')
  const [message, setMessage] = useState(STATUS_MESSAGES['UPLOADED'])

  useEffect(() => {
    if (!documentId) return

    const channel = supabase
      .channel(`doc-${documentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`
      }, (payload) => {
        const newStatus = payload.new.status
        setStatus(newStatus)
        setMessage(STATUS_MESSAGES[newStatus] || newStatus)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [documentId])

  return { status, message, isReady: status === 'READY', isFailed: status === 'FAILED' }
}
