import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'

interface MiniRichEditorProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MiniRichEditor({ value, onChange, disabled, placeholder, className }: MiniRichEditorProps) {
  // On tracke la derniere HTML EMISE par l'editeur. Si le parent re-render
  // avec la meme valeur, on ne touche PAS au contenu Tiptap (sinon on
  // ecrase la saisie en cours et on perd des caracteres — notamment les
  // espaces quand plusieurs re-renders s'enchainent avec l'autocomplete
  // catalogue). Le pattern isInternalChange boolean etait fragile : dans
  // certaines sequences de setState, le flag se retrouvait a false alors
  // que la value venait bien de nous, ce qui declenchait un setContent
  // parasite qui repositionnait le curseur au mauvais endroit.
  const lastEmittedRef = useRef<string>(value)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TiptapUnderline,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      lastEmittedRef.current = html
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[36px] px-3 py-2 text-sm focus:outline-none [&_p]:my-0 [&_p]:leading-normal',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    // Si le parent nous renvoie exactement ce qu'on vient d'emettre : no-op.
    if (value === lastEmittedRef.current) return
    // Sinon, la valeur a change de l'exterieur (reset, catalogue, undo
    // externe...) : on synchronise le contenu. emitUpdate:false pour
    // eviter un onUpdate re-entrant qui ferait boucler onChange.
    lastEmittedRef.current = value
    editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1 transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {icon}
    </button>
  )

  return (
    <div className={`overflow-hidden rounded-md border border-input focus-within:ring-1 focus-within:ring-ring ${className ?? ''}`}>
      {!disabled && (
        <div className="flex gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1">
          {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="size-3.5" />, 'Gras')}
          {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="size-3.5" />, 'Italique')}
          {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="size-3.5" />, 'Souligné')}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
