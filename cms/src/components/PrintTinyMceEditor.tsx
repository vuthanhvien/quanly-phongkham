import { Editor } from "@tinymce/tinymce-react"
import type { Editor as TinyMceEditor } from "tinymce"
import type { TemplateVariableOption } from "../pages/SettingsPage"

interface PrintTinyMceEditorProps {
  value?: string
  onChange?: (value: string) => void
  variables: TemplateVariableOption[]
  repeatCollections?: Array<{ key: string; label: string }>
}

function repeatTableBlock(collection: string) {
  const columns = collection === "items"
    ? { text: "Tên hàng / dịch vụ", textKey: "itemName", amount: "Thành tiền", amountKey: "lineTotal_fm" }
    : collection === "lines"
      ? { text: "Diễn giải", textKey: "lineDescription", amount: "Phát sinh Nợ", amountKey: "debitAmount_fm" }
      : collection === "variants"
        ? { text: "Biến thể", textKey: "name", amount: "Giá bán", amountKey: "sellingPrice_fm" }
        : { text: "Nội dung", textKey: "name", amount: "Giá trị", amountKey: "amount_fm" }

  return `<table style="border-collapse:collapse;width:100%;margin:0 0 18px;">
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

export function PrintTinyMceEditor({ value, onChange, variables, repeatCollections = [] }: PrintTinyMceEditorProps) {
  return (
    <div className="print-tinymce-editor">
      <Editor
        licenseKey="gpl"
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        value={value || ""}
        onEditorChange={(nextValue) => onChange?.(nextValue)}
        init={{
          height: 900,
          menubar: "file edit view insert format tools table help",
          plugins: "advlist anchor autolink charmap code fullscreen help image insertdatetime link lists media nonbreaking pagebreak preview searchreplace table visualblocks visualchars wordcount",
          toolbar: "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | table tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow tableinsertcolbefore tableinsertcolafter tabledeletecol | printvariable printrepeat cssclass | pagebreak charmap | removeformat code preview fullscreen",
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
          content_style: "body { box-sizing:border-box; color:#111827; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.55; margin:0 auto; max-width:794px; padding:56px; } table { border-collapse:collapse; width:100%; } td,th { border:1px solid #d1d5db; min-width:1em; padding:8px; vertical-align:top; } th { background:#f3f4f6; } .text-center { text-align:center; } .text-right { text-align:right; } .no-border td,.no-border th { border:0; } .signature { margin-top:48px; text-align:center; }",
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
          },
        }}
      />
    </div>
  )
}
