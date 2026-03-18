import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Undo, Redo } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none',
      },
    },
  })

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {icon}
    </button>
  )

  return (
    <div className="overflow-hidden rounded-md border border-input">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="size-4" />, 'Titre')}
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="size-4" />, 'Gras')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="size-4" />, 'Italique')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="size-4" />, 'Souligné')}
        <div className="mx-1 w-px bg-border" />
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="size-4" />, 'Liste')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="size-4" />, 'Liste numérotée')}
        <div className="mx-1 w-px bg-border" />
        {btn(false, () => editor.chain().focus().undo().run(), <Undo className="size-4" />, 'Annuler')}
        {btn(false, () => editor.chain().focus().redo().run(), <Redo className="size-4" />, 'Rétablir')}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Placeholder when empty */}
      {editor.isEmpty && placeholder && (
        <p className="pointer-events-none absolute top-[calc(2.5rem+12px)] left-4 text-sm text-muted-foreground">
          {placeholder}
        </p>
      )}
    </div>
  )
}
