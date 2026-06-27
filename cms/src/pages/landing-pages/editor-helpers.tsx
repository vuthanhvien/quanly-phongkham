import {
  DesktopOutlined,
  FormOutlined,
  InsertRowAboveOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type { LandingBlock, LandingBlockType, LandingFormField, LandingPage, LandingSectionWidth, LandingSlide } from '../../models'

export const blockTypeOptions: Array<{ value: LandingBlockType; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Hinh anh' },
  { value: 'slider', label: 'Slider' },
  { value: 'video', label: 'Video' },
  { value: 'form', label: 'Form custom' },
]

export const blockTypeIcons: Record<LandingBlockType, React.ReactNode> = {
  title: <FormOutlined />,
  text: <FormOutlined />,
  image: <PictureOutlined />,
  slider: <DesktopOutlined />,
  video: <VideoCameraOutlined />,
  form: <InsertRowAboveOutlined />,
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function normalizePath(value: string) {
  if (!value.trim()) return '/'
  const next = value.startsWith('/') ? value : `/${value}`
  return next === '/' ? next : next.replace(/\/+$/g, '')
}

export function createField(): LandingFormField {
  return {
    id: crypto.randomUUID(),
    name: 'full_name',
    label: 'Ho ten',
    type: 'text',
    placeholder: '',
    required: true,
    span: 12,
  }
}

export function createSlide(): LandingSlide {
  return {
    id: crypto.randomUUID(),
    url: '',
    alt: '',
    caption: '',
  }
}

export function normalizeSectionWidth(value?: string): LandingSectionWidth {
  return value === 'full' ? 'full' : 'container'
}

export function createSectionMeta(width: LandingSectionWidth = 'container', order = 1, sectionId?: string) {
  return {
    sectionId: sectionId || crypto.randomUUID(),
    sectionTitle: '',
    sectionWidth: width,
    sectionOrder: Math.max(1, order),
  }
}

export type LandingSectionDraft = {
  id: string
  title: string
  width: LandingSectionWidth
  order: number
  blocks: LandingBlock[]
}

export type BlockComposerState = {
  sectionId: string
  block: LandingBlock
}

export type PageTemplate = {
  key: string
  label: string
  category: string
  description: string
  blockSummary: string[]
  page: Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>
}

export function normalizeBlock(block: LandingBlock, index: number): LandingBlock {
  const section = createSectionMeta(normalizeSectionWidth(block.sectionWidth), Math.max(1, Number(block.sectionOrder || 1)), block.sectionId)
  return {
    ...block,
    row: Math.max(1, Number(block.row || 1)),
    span: Math.max(1, Math.min(12, Number(block.span || 12))),
    order: Math.max(1, Number(block.order || index + 1)),
    sectionId: section.sectionId,
    sectionTitle: block.sectionTitle || '',
    sectionWidth: section.sectionWidth,
    sectionOrder: section.sectionOrder,
    fields: block.fields ? block.fields.map((field) => ({ ...field })) : undefined,
    slides: block.slides ? block.slides.map((slide) => ({ ...slide })) : undefined,
  }
}

export function normalizeBlocks(blocks: LandingBlock[] = []) {
  return blocks.map((block, index) => normalizeBlock(block, index))
}

export function deriveSections(blocks: LandingBlock[]): LandingSectionDraft[] {
  const sectionMap = new Map<string, LandingSectionDraft>()
  normalizeBlocks(blocks)
    .sort((left, right) => {
      if ((left.sectionOrder || 1) !== (right.sectionOrder || 1)) return (left.sectionOrder || 1) - (right.sectionOrder || 1)
      return left.order - right.order
    })
    .forEach((block) => {
      const sectionId = block.sectionId || 'default-section'
      const current = sectionMap.get(sectionId) || {
        id: sectionId,
        title: block.sectionTitle || '',
        width: normalizeSectionWidth(block.sectionWidth),
        order: block.sectionOrder || 1,
        blocks: [],
      }
      current.title = current.title || block.sectionTitle || ''
      current.width = normalizeSectionWidth(block.sectionWidth || current.width)
      current.order = Math.min(current.order, block.sectionOrder || current.order || 1)
      current.blocks.push({ ...block, sectionId, sectionWidth: current.width, sectionOrder: current.order })
      sectionMap.set(sectionId, current)
    })
  return [...sectionMap.values()].sort((left, right) => left.order - right.order)
}

export function createBlock(type: LandingBlockType): LandingBlock {
  const base: LandingBlock = {
    id: crypto.randomUUID(),
    type,
    row: 1,
    span: 12,
    order: 1,
  }

  if (type === 'title') {
    return { ...base, title: 'Tieu de moi', level: 2, align: 'left' }
  }

  if (type === 'text') {
    return { ...base, text: 'Mo ta noi dung block', align: 'left' }
  }

  if (type === 'image') {
    return { ...base, url: '', alt: '', caption: '' }
  }

  if (type === 'slider') {
    return { ...base, title: 'Slider hinh anh', slides: [createSlide(), createSlide()] }
  }

  if (type === 'video') {
    return { ...base, url: '', title: '' }
  }

  return {
    ...base,
    title: 'Form dang ky',
    description: '',
    submitLabel: 'Gui thong tin',
    successMessage: 'Da gui thanh cong',
    fields: [createField()],
  }
}

export function buildBlockForSection(type: LandingBlockType, sectionId: string | undefined, currentBlocks: LandingBlock[]) {
  const sections = deriveSections(currentBlocks)
  const section = sections.find((item) => item.id === sectionId) || sections[sections.length - 1]
  const nextRow = section?.blocks.length ? Math.max(...section.blocks.map((block) => block.row)) + 1 : 1
  const meta = section
    ? {
        sectionId: section.id,
        sectionTitle: section.title,
        sectionWidth: section.width,
        sectionOrder: section.order,
      }
    : createSectionMeta('container', 1)

  return normalizeBlock({ ...createBlock(type), ...meta, row: nextRow, order: currentBlocks.length + 1 }, currentBlocks.length)
}

export function emptyPage(): Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: '',
    path: '/',
    title: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    blocks: [],
    isPublished: false,
  }
}

export function makeId() {
  return crypto.randomUUID()
}
