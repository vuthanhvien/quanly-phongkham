import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  FileTextOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  TableOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons"
import { Button, Select, Space } from "antd"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { useEffect } from "react"
import type { TemplateVariableOption } from "../pages/SettingsPage"

interface PrintTiptapEditorProps {
  value?: string
  onChange?: (value: string) => void
  variables: TemplateVariableOption[]
  repeatCollections?: Array<{ key: string; label: string }>
}

const PrintTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      printEach: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-print-each"),
        renderHTML: (attributes) => attributes.printEach ? { "data-print-each": attributes.printEach } : {},
      },
    }
  },
})

const HEADER_BLOCK = `
<section class="print-block print-block-header" style="border-bottom:2px solid #111;padding:0 0 14px;margin:0 0 18px;">
  <h1 style="font-size:24px;margin:0 0 6px;text-transform:uppercase;">Tiêu đề giấy tờ</h1>
  <p style="margin:0;color:#555;">Mã hồ sơ: {{code}}</p>
</section>
`

const CONTENT_BLOCK = `
<section class="print-block print-block-content" style="margin:0 0 18px;">
  <table style="border-collapse:collapse;width:100%;">
    <tbody>
      <tr>
        <td style="border:1px solid #ddd;padding:8px;width:30%;"><strong>Khách hàng</strong></td>
        <td style="border:1px solid #ddd;padding:8px;">{{customer.name}}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ddd;padding:8px;"><strong>Số điện thoại</strong></td>
        <td style="border:1px solid #ddd;padding:8px;">{{phone}}</td>
      </tr>
    </tbody>
  </table>
</section>
`

const TABLE_BLOCK = `
<section class="print-block print-block-table" style="margin:0 0 18px;">
  <table style="border-collapse:collapse;width:100%;">
    <thead>
      <tr>
        <th style="border:1px solid #ddd;padding:8px;text-align:left;">Mã</th>
        <th style="border:1px solid #ddd;padding:8px;text-align:left;">Nội dung</th>
        <th style="border:1px solid #ddd;padding:8px;text-align:right;">Giá trị</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">{{code}}</td>
        <td style="border:1px solid #ddd;padding:8px;">{{name}}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;">{{amount_fm}}</td>
      </tr>
    </tbody>
  </table>
</section>
`

const FOOTER_BLOCK = `
<section class="print-block print-block-footer" style="margin-top:28px;">
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;text-align:center;">
    <div>
      <strong>Khách hàng</strong>
      <p style="margin-top:54px;">(Ký và ghi rõ họ tên)</p>
    </div>
    <div>
      <strong>Người lập phiếu</strong>
      <p style="margin-top:54px;">(Ký và ghi rõ họ tên)</p>
    </div>
  </div>
</section>
`

function repeatTableBlock(collection: string) {
  const columns = collection === 'items'
    ? { text: 'Tên hàng / dịch vụ', textKey: 'itemName', amount: 'Thành tiền', amountKey: 'lineTotal_fm' }
    : collection === 'lines'
      ? { text: 'Diễn giải', textKey: 'lineDescription', amount: 'Phát sinh Nợ', amountKey: 'debitAmount_fm' }
      : collection === 'variants'
        ? { text: 'Biến thể', textKey: 'name', amount: 'Giá bán', amountKey: 'sellingPrice_fm' }
        : { text: 'Nội dung', textKey: 'name', amount: 'Giá trị', amountKey: 'amount_fm' }
  return `
<table style="border-collapse:collapse;width:100%;margin:0 0 18px;">
  <thead><tr>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;width:48px;">STT</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;">${columns.text}</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:right;width:96px;">Số lượng</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:right;width:128px;">${columns.amount}</th>
  </tr></thead>
  <tbody><tr data-print-each="${collection}">
    <td style="border:1px solid #ddd;padding:8px;">{{@index}}</td>
    <td style="border:1px solid #ddd;padding:8px;">{{${columns.textKey}}}</td>
    <td style="border:1px solid #ddd;padding:8px;text-align:right;">{{quantity_fm}}</td>
    <td style="border:1px solid #ddd;padding:8px;text-align:right;">{{${columns.amountKey}}}</td>
  </tr></tbody>
</table>
`
}

export function PrintTiptapEditor({ value, onChange, variables, repeatCollections = [] }: PrintTiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      PrintTableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const nextValue = value || ""
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  function insertHtml(html: string) {
    editor?.chain().focus().insertContent(html).run()
  }

  function insertColumnLayout(columns: number) {
    editor?.chain().focus().insertTable({ rows: 1, cols: columns, withHeaderRow: false }).run()
  }

  return (
    <div className="print-tiptap-editor">
      <div className="print-tiptap-editor__toolbar">
        <Space wrap size={6}>
          <Button
            icon={<BoldOutlined />}
            size="small"
            type={editor.isActive("bold") ? "primary" : "default"}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <Button
            icon={<ItalicOutlined />}
            size="small"
            type={editor.isActive("italic") ? "primary" : "default"}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <Button
            icon={<UnderlineOutlined />}
            size="small"
            type={editor.isActive("underline") ? "primary" : "default"}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <Select
            size="small"
            className="print-tiptap-editor__block-select"
            placeholder="Định dạng"
            options={[
              { value: "paragraph", label: "Đoạn văn" },
              { value: "heading-1", label: "Tiêu đề 1" },
              { value: "heading-2", label: "Tiêu đề 2" },
              { value: "heading-3", label: "Tiêu đề 3" },
            ]}
            onSelect={(selected) => {
              if (selected === "paragraph") editor.chain().focus().setParagraph().run()
              if (selected === "heading-1") editor.chain().focus().toggleHeading({ level: 1 }).run()
              if (selected === "heading-2") editor.chain().focus().toggleHeading({ level: 2 }).run()
              if (selected === "heading-3") editor.chain().focus().toggleHeading({ level: 3 }).run()
            }}
          />
          <Button icon={<UnorderedListOutlined />} size="small" onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <Button icon={<OrderedListOutlined />} size="small" onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <Button icon={<AlignLeftOutlined />} size="small" onClick={() => editor.chain().focus().setTextAlign("left").run()} />
          <Button icon={<AlignCenterOutlined />} size="small" onClick={() => editor.chain().focus().setTextAlign("center").run()} />
          <Button icon={<AlignRightOutlined />} size="small" onClick={() => editor.chain().focus().setTextAlign("right").run()} />
          <Button size="small" icon={<FileTextOutlined />} onClick={() => insertHtml(HEADER_BLOCK)}>Đầu trang</Button>
          <Button size="small" onClick={() => insertHtml(CONTENT_BLOCK)}>Nội dung</Button>
          <Button size="small" icon={<TableOutlined />} onClick={() => insertHtml(TABLE_BLOCK)}>Bảng</Button>
          <Select
            className="print-tiptap-editor__block-select"
            options={[
              { value: 2, label: "Chia 2 cột" },
              { value: 3, label: "Chia 3 cột" },
              { value: 4, label: "Chia 4 cột" },
            ]}
            placeholder="Chia cột"
            size="small"
            onSelect={(columns) => insertColumnLayout(Number(columns))}
          />
          {repeatCollections.length > 0 && (
            <Select
              className="print-tiptap-editor__variable-select"
              options={repeatCollections.map((collection) => ({ value: collection.key, label: `${collection.key} - ${collection.label}` }))}
              placeholder="Chèn table lặp"
              size="small"
              onSelect={(collection) => insertHtml(repeatTableBlock(String(collection)))}
            />
          )}
          <Button size="small" onClick={() => insertHtml(FOOTER_BLOCK)}>Chân trang</Button>
          <Select
            allowClear
            showSearch
            size="small"
            className="print-tiptap-editor__variable-select"
            optionFilterProp="search"
            placeholder="Chèn biến"
            options={variables.map((variable) => ({
              value: variable.key,
              label: `${variable.key} - ${variable.label}`,
              search: `${variable.key} ${variable.label}`,
            }))}
            onSelect={(key) => editor.chain().focus().insertContent(`{{${key}}}`).run()}
          />
        </Space>
      </div>
      <div className="print-tiptap-editor__canvas">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
