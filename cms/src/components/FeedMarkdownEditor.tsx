import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor"
import "@mdxeditor/editor/style.css"
import { useEffect, useRef } from "react"

const MAX_LENGTH = 5_000

interface FeedMarkdownEditorProps {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function FeedMarkdownEditor({ value, disabled = false, onChange }: FeedMarkdownEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null)

  useEffect(() => {
    if (editorRef.current?.getMarkdown() !== value) editorRef.current?.setMarkdown(value)
  }, [value])

  return (
    <div className="feed-markdown-editor">
      <MDXEditor
        ref={editorRef}
        markdown={value}
        readOnly={disabled}
        placeholder="Bạn đang nghĩ gì?"
        suppressHtmlProcessing
        contentEditableClassName="feed-markdown-editor__content"
        onChange={onChange}
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => <>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <Separator />
              <ListsToggle options={["bullet", "number"]} />
              <Separator />
              <CreateLink />
            </>,
          }),
        ]}
      />
      <div className={`feed-markdown-editor__counter${value.length > MAX_LENGTH ? " is-over-limit" : ""}`}>
        {value.length.toLocaleString("vi-VN")} / {MAX_LENGTH.toLocaleString("vi-VN")}
      </div>
    </div>
  )
}
