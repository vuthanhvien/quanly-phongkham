import {
  UserOutlined,
  InboxOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LinkOutlined,
} from "@ant-design/icons"
import { Avatar, Button, Image, Tooltip } from "antd"
import { resolveFileUrl } from "../api"
import { displayValue, FileLookupMap, getRelationMeta, getRelationSpec, LookupMap, RelationLookupRecord } from "../relations"
import { FieldSpec } from "../models"

interface RecordValueViewProps {
  field: string | FieldSpec
  value: unknown
  lookups: LookupMap
  fileLookups: FileLookupMap
  compact?: boolean
  onRelationClick?: (resource: string, id: string) => void
}

export function RecordValueView({ field, value, lookups, fileLookups, compact, onRelationClick }: RecordValueViewProps) {
  if (value === null || value === undefined || value === "") return <span>-</span>

  if (typeof field !== "string" && field.type === "table") {
    return renderInlineTableValue(field, value, compact)
  }

  if (isAvatarField(field)) {
    const avatarValue = normalizeStringArray(value)[0]
    const file = avatarValue ? fileLookups[avatarValue] : undefined
    return (
      <Avatar
        className={`record-avatar${compact ? " record-avatar--table" : ""}`}
        size={compact ? 36 : 64}
        src={resolveFileUrl(file?.publicUrl || avatarValue || "")}
      />
    )
  }

  if (isImageUrlField(field, value)) {
    return renderImageUrlValue(value, compact)
  }

  if (isFileField(field)) {
    return renderFileValue(value, lookups, fileLookups, compact)
  }

  const relationSpec = getRelationSpec(field)
  if (relationSpec?.resource === "staff" && Array.isArray(value)) {
    return renderStaffMemberList(field, value, lookups, compact, onRelationClick)
  }
  const relationMeta = getRelationObjectValue(value) || getRelationMeta(lookups, field, value)
  if (relationSpec && isCompactRelationCard(relationSpec.resource) && relationMeta) {
    return renderRelationCardValue(field, value, lookups, compact, relationSpec.resource, relationMeta, onRelationClick)
  }
  if (relationSpec && relationSpec.resource !== "files" && onRelationClick) {
    return renderRelationValue(field, value, lookups, compact, relationSpec.resource, onRelationClick)
  }

  return <>{displayValue(field, value, lookups)}</>
}

function renderInlineTableValue(field: FieldSpec, value: unknown, compact?: boolean) {
  const rows = Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : []
  const columns = field.tableColumns || []
  if (!rows.length) return <span>-</span>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: compact ? 180 : 260 }}>
      {rows.map((row, index) => {
        const summary = columns
          .map((column) => {
            const raw = row[column.key]
            if (raw === undefined || raw === null || raw === "") return ""
            const text = column.dataType === "money" ? `${new Intl.NumberFormat("vi-VN").format(Number(raw) || 0)} đ` : String(raw)
            return compact ? text : `${column.label}: ${text}`
          })
          .filter(Boolean)
          .join(" · ")
        return <span key={index} style={{ whiteSpace: "normal" }}>{summary || "-"}</span>
      })}
    </div>
  )
}

function renderStaffMemberList(
  field: string | FieldSpec,
  values: unknown[],
  lookups: LookupMap,
  compact?: boolean,
  onRelationClick?: (resource: string, id: string) => void,
) {
  return (
    <div className={`staff-member-list${compact ? " compact" : ""}`}>
      {values.map((value, index) => {
        const id = String(value)
        const member = getRelationMeta(lookups, field, value)
        const name = String(member?.fullName || member?.name || member?.display_title || displayValue(field, value, lookups))
        const code = String(member?.code || "")
        const content = (
          <span className="staff-member-chip">
            <Avatar icon={<UserOutlined />} size={compact ? 24 : 32} src={member?.avatarUrl ? resolveFileUrl(String(member.avatarUrl)) : undefined} />
            <span className="staff-member-chip__copy">
              <strong>{name}</strong>
              {code ? <small>{code}</small> : null}
            </span>
          </span>
        )
        return onRelationClick ? (
          <Button
            key={`${id}-${index}`}
            size="small"
            type="link"
            onClick={() => onRelationClick("staff", id)}
          >
            {content}
          </Button>
        ) : <span key={`${id}-${index}`}>{content}</span>
      })}
    </div>
  )
}

function renderRelationCardValue(
  field: string | FieldSpec,
  value: unknown,
  lookups: LookupMap,
  compact: boolean | undefined,
  resource: string,
  relationMeta: RelationLookupRecord,
  onRelationClick?: (resource: string, id: string) => void,
) {
  const itemId = String(relationMeta.id || (Array.isArray(value) ? value[0] || "" : value))
  const primaryText = String(relationMeta.fullName || relationMeta.name || relationMeta.display_title || displayValue(field, value, lookups) || "")
  const secondaryText = String(relationMeta.code || relationMeta.phone || relationMeta.email || relationMeta.label || "")
  const content = (
    <span className={`relation-entity-card${compact ? " compact" : ""}`}>
      <span className="relation-entity-card__avatar-wrap">
        <Avatar
          className="relation-entity-card__avatar"
          icon={<UserOutlined />}
          size={24}
          src={relationMeta.avatarUrl ? resolveFileUrl(String(relationMeta.avatarUrl)) : undefined}
        />
        {relationMeta.isArchived ? <span className="archived-record-avatar-badge" title="Đã lưu trữ"><InboxOutlined /></span> : null}
      </span>
      <span className="relation-entity-card__copy">
        <strong>{primaryText}</strong>
        <span>{secondaryText}</span>
      </span>
    </span>
  )

  if (!onRelationClick) return content

  return (
    <Button
      size={compact ? "small" : "middle"}
      style={{ paddingInline: 0 }}
      type="link"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onRelationClick(resource, itemId)
      }}
    >
      {content}
    </Button>
  )
}

function getRelationObjectValue(value: unknown): RelationLookupRecord | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  if (!record.id) return undefined
  return {
    ...record,
    id: String(record.id),
    label: String(record.fullName || record.name || record.code || record.email || record.id),
  } as RelationLookupRecord
}

function renderRelationValue(
  field: string | FieldSpec,
  value: unknown,
  lookups: LookupMap,
  compact: boolean | undefined,
  resource: string,
  onRelationClick: (resource: string, id: string) => void,
) {
  const values = Array.isArray(value) ? value : [value]
  return (
    <>
      {values.map((item, index) => {
        const itemId = typeof item === "object" && item && "id" in item ? String((item as Record<string, unknown>).id) : String(item)
        const label = displayValue(field, item, lookups)
        return (
          <span key={`${itemId}-${index}`}>
            <Button
              size={compact ? "small" : "middle"}
              style={{ paddingInline: 0 }}
              type="link"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onRelationClick(resource, itemId)
              }}
            >
              {label}
            </Button>
            {index < values.length - 1 ? ", " : null}
          </span>
        )
      })}
    </>
  )
}

function renderImageUrlValue(value: unknown, compact?: boolean) {
  const items = normalizeStringArray(value)
  if (items.length === 0) return <span>-</span>
  return (
    <Image.PreviewGroup>
      <div className={`record-image-url-list${compact ? " compact" : ""}`}>
        {items.map((item, index) => {
          const href = resolveFileUrl(item)
          const label = extractFileName(item) || `Ảnh ${index + 1}`
          return (
            <div
              key={`${item}-${index}`}
              className={`record-image-thumb${compact ? " compact" : ""}`}
              title={label}
            >
              <Image alt={label} preview={{ mask: "Xem" }} src={href} />
              {!compact ? (
                <span className="record-image-thumb-caption">
                  <span>{label}</span>
                  <LinkOutlined />
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </Image.PreviewGroup>
  )
}

function renderFileValue(value: unknown, lookups: LookupMap, fileLookups: FileLookupMap, compact?: boolean) {
  const items = normalizeStringArray(value)
  if (items.length === 0) return <span>-</span>
  const resolved = items.map((item) => fileLookups[item] || buildFallbackFileLookup(item))
  if (resolved.length === 0) return <>{displayValue({ key: "", label: "", type: "file" }, value, lookups)}</>

  if (compact) {
    return (
      <div className="record-media-stack compact">
        {resolved.map((file) => {
          const tooltip = file.originalName && file.originalName !== file.title
            ? `${file.title}\n${file.originalName}`
            : file.title
          return (
            <Tooltip key={file.id} title={tooltip}>
              <a
                aria-label={`Mở ${file.title}`}
                className="record-media-card record-media-card--icon"
                href={resolveFileUrl(file.publicUrl)}
                rel="noreferrer"
                target="_blank"
              >
                {renderFileIcon(file)}
              </a>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  return (
    <Image.PreviewGroup>
      <div className={`record-media-stack${compact ? " compact" : ""}`}>
        {resolved.map((file) => (
          <div
            key={file.id}
            className="record-media-card"
            title={file.title}
          >
            {isImageFile(file) ? (
              <div
                className="record-media-preview"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                <Image
                  alt={file.title}
                  preview={{ mask: "Xem" }}
                  src={resolveFileUrl(file.publicUrl)}
                />
              </div>
            ) : (
              <div className="record-file-fallback">{renderFileIcon(file, true)}</div>
            )}
            <div className="record-media-copy">
              <strong>{file.title}</strong>
              <span>{file.originalName || formatFileKind(file.extension) || "Tệp đính kèm"}</span>
            </div>
            <a
              className="record-media-open"
              href={resolveFileUrl(file.publicUrl)}
              rel="noreferrer"
              target="_blank"
              title={`Mở ${file.title}`}
            >
              <LinkOutlined />
            </a>
          </div>
        ))}
      </div>
    </Image.PreviewGroup>
  )
}

function isImageUrlField(field: string | FieldSpec, value: unknown) {
  const fieldKey = typeof field === "string" ? field : field.key
  if (typeof field !== "string" && (field.type === "image" || field.type === "images")) return true
  if (["imageUrl", "avatarUrl", "appIconUrl", "logoUrl", "thumbnailUrl"].includes(fieldKey)) return true
  const fieldLabel = typeof field === "string" ? "" : String(field.label || "").toLowerCase()
  const values = normalizeStringArray(value)
  if (fieldLabel.includes("ảnh") || fieldLabel.includes("image") || fieldLabel.includes("avatar")) {
    return values.every((item) => isImageUrl(item))
  }
  return values.length > 0 && values.every((item) => isImageUrl(item)) && fieldKey.toLowerCase().includes("image")
}

function isAvatarField(field: string | FieldSpec) {
  if (typeof field === "string") return field === "avatarUrl"
  const label = String(field.label || "").trim().toLowerCase()
  return field.key === "avatarUrl" || label === "hình đại diện" || label === "avatar"
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

function extractFileName(value: string) {
  const cleaned = value.split("?")[0]
  const parts = cleaned.split("/")
  return parts[parts.length - 1] || value
}

function formatFileKind(extension?: string) {
  const normalized = String(extension || "").toLowerCase()
  if (!normalized) return "Tệp đính kèm"
  return normalized.toUpperCase()
}

function buildFallbackFileLookup(value: string) {
  const href = resolveFileUrl(value)
  return {
    id: value,
    title: extractFileName(value) || "Tệp đính kèm",
    originalName: extractFileName(value) || undefined,
    publicUrl: href,
    extension: extractExtension(value) || undefined,
  }
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

function isCompactRelationCard(resource: string) {
  return ["customers", "leads", "staff"].includes(resource)
}
