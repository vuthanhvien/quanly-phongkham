import {
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons"
import { Image, Space, Typography } from "antd"
import { resolveFileUrl } from "../api"
import { displayValue, FileLookupMap, LookupMap } from "../relations"
import { FieldSpec } from "../models"

interface RecordValueViewProps {
  field: string | FieldSpec
  value: unknown
  lookups: LookupMap
  fileLookups: FileLookupMap
  compact?: boolean
}

export function RecordValueView({ field, value, lookups, fileLookups, compact }: RecordValueViewProps) {
  if (value === null || value === undefined || value === "") return <span>-</span>

  if (isImageUrlField(field)) {
    return renderImageUrlValue(value, compact)
  }

  if (isFileField(field)) {
    return renderFileValue(value, lookups, fileLookups, compact)
  }

  return <>{displayValue(field, value, lookups)}</>
}

function renderImageUrlValue(value: unknown, compact?: boolean) {
  const items = normalizeStringArray(value)
  if (items.length === 0) return <span>-</span>
  return (
    <div className={`record-media-stack${compact ? " compact" : ""}`}>
      {items.map((item) => (
        <a key={item} className="record-media-card" href={item} rel="noreferrer" target="_blank">
          {isImageUrl(item) ? (
            <img alt="preview" src={item} />
          ) : (
            <div className="record-file-fallback">{renderFileIcon({ extension: extractExtension(item) }, true)}</div>
          )}
          <div className="record-media-copy">
            <strong>{compact ? "Mở file" : item}</strong>
            <span>{isImageUrl(item) ? "Hình ảnh" : "Tệp đính kèm"}</span>
          </div>
        </a>
      ))}
    </div>
  )
}

function renderFileValue(value: unknown, lookups: LookupMap, fileLookups: FileLookupMap, compact?: boolean) {
  const items = normalizeStringArray(value)
  if (items.length === 0) return <span>-</span>
  const resolved = items.map((item) => fileLookups[item]).filter(Boolean)
  if (resolved.length === 0) return <>{displayValue({ key: "", label: "", type: "file" }, value, lookups)}</>

  return (
    <div className={`record-media-stack${compact ? " compact" : ""}`}>
      {resolved.map((file) => (
        <a key={file.id} className="record-media-card" href={resolveFileUrl(file.publicUrl)} rel="noreferrer" target="_blank">
          {isImageFile(file) ? (
            <img alt={file.title} src={resolveFileUrl(file.publicUrl)} />
          ) : (
            <div className="record-file-fallback">{renderFileIcon(file, true)}</div>
          )}
          <div className="record-media-copy">
            <strong>{file.title}</strong>
            <span>{file.originalName || file.extension || "Tệp đính kèm"}</span>
          </div>
        </a>
      ))}
    </div>
  )
}

function isImageUrlField(field: string | FieldSpec) {
  return typeof field === "string" ? field === "imageUrl" : field.key === "imageUrl"
}

function isFileField(field: string | FieldSpec) {
  return typeof field === "string" ? false : field.type === "file"
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String)
  if (value === null || value === undefined || value === "") return []
  return [String(value)]
}

function isImageUrl(value: string) {
  const lower = value.toLowerCase()
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) => lower.includes(ext))
}

function isImageFile(file: { mimeType?: string; extension?: string }) {
  const mimeType = String(file.mimeType || "").toLowerCase()
  if (mimeType.startsWith("image/")) return true
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(String(file.extension || "").toLowerCase())
}

function extractExtension(value: string) {
  const cleaned = value.split("?")[0]
  const parts = cleaned.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function renderFileIcon(file: { mimeType?: string; extension?: string }, large = false) {
  const mimeType = String(file.mimeType || "").toLowerCase()
  const extension = String(file.extension || "").toLowerCase()
  const iconStyle = { fontSize: large ? 34 : 16 }
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)) {
    return <FileImageOutlined style={iconStyle} />
  }
  if (mimeType.includes("pdf") || extension === "pdf") return <FilePdfOutlined style={iconStyle} />
  if (mimeType.startsWith("text/") || ["doc", "docx", "txt", "rtf", "md", "xls", "xlsx", "csv"].includes(extension)) {
    return <FileTextOutlined style={iconStyle} />
  }
  return <FileOutlined style={iconStyle} />
}