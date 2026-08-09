import { Editor } from "@tinymce/tinymce-react"
import type { Editor as TinyMceEditor } from "tinymce"
import type { TemplateVariableOption } from "../pages/SettingsPage"

interface PrintTinyMceEditorProps {
  value?: string
  onChange?: (value: string) => void
  variables: TemplateVariableOption[]
  repeatCollections?: Array<{ key: string; label: string }>
  pageWidth?: "A4" | "88mm" | "58mm"
}

function repeatTableCaption(collection: string) {
  return `<caption class="print-repeat-marker" contenteditable="false">↻ Bảng lặp: ${collection}</caption>`
}

function layoutGrid(columnWidths: number[]) {
  const columns = columnWidths.length
  const cells = Array.from({ length: columns }, (_, index) => (
    `<td style="border:0;overflow-wrap:anywhere;padding:0 ${index === columns - 1 ? "0" : "10px"} 0 0;vertical-align:top;width:${columnWidths[index]}%;">Nội dung cột ${index + 1}</td>`
  )).join("")
  return `<table class="print-layout-grid" role="presentation" style="border-collapse:collapse;border:0;table-layout:fixed;margin:0 0 14px;width:100%;"><tbody><tr>${cells}</tr></tbody></table>`
}

function repeatTableBlock(collection: string) {
  const columns = collection === "items"
    ? { text: "Tên hàng / dịch vụ", textKey: "itemName", amount: "Thành tiền", amountKey: "lineTotal_fm" }
    : collection === "lines"
      ? { text: "Diễn giải", textKey: "lineDescription", amount: "Phát sinh Nợ", amountKey: "debitAmount_fm" }
      : collection === "variants"
        ? { text: "Biến thể", textKey: "name", amount: "Giá bán", amountKey: "sellingPrice_fm" }
        : collection === "checkinMonth"
          ? { text: "Ngày chấm công", textKey: "item.date_fm", amount: "Giờ vào", amountKey: "item.checkIn" }
        : { text: "Tên / nội dung", textKey: "item.name", amount: "Mã / trạng thái", amountKey: "item.code" }

  if (collection === "checkinMonth") {
    return `<table style="border-collapse:collapse;width:100%;margin:0 0 18px;">
  ${repeatTableCaption(collection)}
  <thead><tr>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;width:48px;">STT</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;">Ngày</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;">Giờ vào</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;">Giờ ra</th>
    <th style="border:1px solid #ddd;padding:8px;text-align:left;">Trạng thái</th>
  </tr></thead>
  <tbody><tr data-print-each="${collection}">
    <td style="border:1px solid #ddd;padding:8px;">{{@index}}</td>
    <td style="border:1px solid #ddd;padding:8px;">{{item.date_fm}}</td>
    <td style="border:1px solid #ddd;padding:8px;">{{item.checkIn}}</td>
    <td style="border:1px solid #ddd;padding:8px;">{{item.checkOut}}</td>
    <td style="border:1px solid #ddd;padding:8px;">{{item.status}}</td>
  </tr></tbody>
</table>`
  }

  return `<table style="border-collapse:collapse;width:100%;margin:0 0 18px;">
  ${repeatTableCaption(collection)}
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
</table>`
}

function imageAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Không đọc được ảnh"))
    reader.onerror = () => reject(new Error("Không đọc được ảnh"))
    reader.readAsDataURL(file)
  })
}

function registerClassNameButton(editor: TinyMceEditor) {
  editor.ui.registry.addButton("cssclass", {
    icon: "code-sample",
    tooltip: "Gán lớp CSS",
    onAction: () => {
      const selectedNode = editor.selection.getNode()
      editor.windowManager.open({
        title: "Gán lớp CSS",
        body: {
          type: "panel",
          items: [{ type: "input", name: "className", label: "Tên class" }],
        },
        initialData: { className: selectedNode.getAttribute("class") || "" },
        buttons: [
          { type: "cancel", text: "Hủy" },
          { type: "submit", text: "Áp dụng", primary: true },
        ],
        onSubmit: (dialog) => {
          const className = String(dialog.getData().className || "").trim()
          if (className) editor.dom.setAttrib(selectedNode, "class", className)
          else editor.dom.setAttrib(selectedNode, "class", null)
          dialog.close()
          editor.undoManager.add()
          editor.nodeChanged()
        },
      })
    },
  })
}

export function PrintTinyMceEditor({ value, onChange, variables, repeatCollections = [], pageWidth = "A4" }: PrintTinyMceEditorProps) {
  const pageWidthValue = pageWidth === "58mm" ? "58mm" : pageWidth === "88mm" ? "88mm" : "210mm"
  return (
    <div className="print-tinymce-editor">
      <Editor
        key={`print-editor-${pageWidth}`}
        licenseKey="gpl"
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        value={value || ""}
        onEditorChange={(nextValue) => onChange?.(nextValue)}
        init={{
          height: 900,
          menubar: "file edit view insert format tools table help",
          plugins: "advlist anchor autolink charmap code fullscreen help image insertdatetime link lists media nonbreaking pagebreak preview searchreplace table visualblocks visualchars wordcount",
          toolbar: "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | table printlayout tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol | printvariable printrepeat cssclass | pagebreak charmap | removeformat code preview fullscreen",
          toolbar_mode: "wrap",
          branding: false,
          promotion: false,
          resize: true,
          statusbar: true,
          image_title: true,
          automatic_uploads: true,
          images_upload_handler: async (blobInfo) => imageAsDataUrl(blobInfo.blob()),
          table_advtab: true,
          table_sizing_mode: "responsive",
          table_default_attributes: { border: "1" },
          table_default_styles: { "border-collapse": "collapse", width: "100%" },
          content_style: `body { --print-page-width:${pageWidthValue}; background:#e9edf1; box-sizing:border-box; color:#111827; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.55; margin:0; min-height:calc(100vh - 64px); padding:32px 0; position:relative; } body::before { background:#fff; box-shadow:0 3px 16px rgba(15,23,42,.14); content:""; inset:32px auto 32px 50%; min-height:297mm; position:absolute; transform:translateX(-50%); width:var(--print-page-width); z-index:0; } body > * { box-sizing:border-box; margin-left:auto; margin-right:auto; max-width:var(--print-page-width); padding-left:${pageWidth === "A4" ? "14mm" : "3mm"}; padding-right:${pageWidth === "A4" ? "14mm" : "3mm"}; position:relative; z-index:1; } body > table { margin-left:auto !important; margin-right:auto !important; } table { border-collapse:collapse; width:100%; } td,th { border:1px solid #d1d5db; min-width:1em; padding:8px; vertical-align:top; } th { background:#f3f4f6; } .print-layout-grid td { border:1px dashed #cbd5e1 !important; } .print-repeat-marker { caption-side:top; background:#eef7ef; border:1px solid #b9ddbe; border-bottom:0; border-radius:5px 5px 0 0; color:#296233; font-size:11px; font-weight:600; letter-spacing:.01em; padding:4px 8px; text-align:left; } .text-center { text-align:center; } .text-right { text-align:right; } .no-border td,.no-border th { border:0; } .signature { margin-top:48px; text-align:center; }`,
          setup: (editor) => {
            registerClassNameButton(editor)
            editor.ui.registry.addMenuButton("printvariable", {
              text: "Chèn biến",
              fetch: (callback) => callback(variables.map((variable) => ({
                type: "menuitem",
                text: `${variable.key} — ${variable.label}`,
                onAction: () => editor.insertContent(`{{${variable.key}}}`),
              }))),
            })
            editor.ui.registry.addMenuButton("printrepeat", {
              text: "Bảng lặp",
              fetch: (callback) => callback(repeatCollections.map((collection) => ({
                type: "menuitem",
                text: collection.label,
                onAction: () => editor.insertContent(repeatTableBlock(collection.key)),
              }))),
            })
            editor.ui.registry.addMenuButton("printlayout", {
              text: "Bố cục",
              fetch: (callback) => callback([
                { text: "2 cột · 50 / 50", widths: [50, 50] },
                { text: "2 cột · 75 / 25", widths: [75, 25] },
                { text: "2 cột · 25 / 75", widths: [25, 75] },
                { text: "3 cột", widths: [33.33, 33.33, 33.34] },
                { text: "3 cột · 25 / 50 / 25", widths: [25, 50, 25] },
                { text: "4 cột", widths: [25, 25, 25, 25] },
              ].map((layout) => ({
                type: "menuitem",
                text: layout.text,
                onAction: () => editor.insertContent(layoutGrid(layout.widths)),
              }))),
            })
          },
        }}
      />
    </div>
  )
}
