import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DocumentAttachment {
  id: string
  document_type: 'quote' | 'invoice'
  document_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
}

export function useDocumentAttachments(documentType: 'quote' | 'invoice', documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-attachments', documentType, documentId],
    queryFn: async (): Promise<DocumentAttachment[]> => {
      const { data, error } = await supabase
        .from('document_attachments')
        .select('*')
        .eq('document_type', documentType)
        .eq('document_id', documentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DocumentAttachment[]
    },
    enabled: !!documentId,
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      documentType,
      documentId,
      file,
    }: {
      documentType: 'quote' | 'invoice'
      documentId: string
      file: File
    }) => {
      // Upload to storage
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${documentType}/${documentId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError

      // Create DB record
      const { data, error } = await supabase
        .from('document_attachments')
        .insert({
          document_type: documentType,
          document_id: documentId,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single()
      if (error) throw error
      return data as DocumentAttachment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-attachments', data.document_type, data.document_id] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (attachment: DocumentAttachment) => {
      // Delete from storage
      await supabase.storage.from('document-attachments').remove([attachment.storage_path])
      // Delete DB record
      const { error } = await supabase
        .from('document_attachments')
        .delete()
        .eq('id', attachment.id)
      if (error) throw error
      return attachment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-attachments', data.document_type, data.document_id] })
    },
  })
}
