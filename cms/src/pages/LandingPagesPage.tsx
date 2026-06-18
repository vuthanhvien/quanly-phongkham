import {
  DeleteOutlined,
  EyeOutlined,
  FormOutlined,
  InsertRowAboveOutlined,
  PictureOutlined,
  PlusOutlined,
  SaveOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { LandingBlock, LandingBlockType, LandingFormField, LandingPage } from '../models'

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'http://localhost:3001'

const blockTypeOptions: Array<{ value: LandingBlockType; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'video', label: 'Video' },
  { value: 'form', label: 'Form custom' },
]

const blockTypeIcons: Record<LandingBlockType, React.ReactNode> = {
  title: <FormOutlined />,
  text: <FormOutlined />,
  image: <PictureOutlined />,
  video: <VideoCameraOutlined />,
  form: <InsertRowAboveOutlined />,
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizePath(value: string) {
  if (!value.trim()) return '/'
  const next = value.startsWith('/') ? value : `/${value}`
  return next === '/' ? next : next.replace(/\/+$/g, '')
}

function createField(): LandingFormField {
  return {
    id: crypto.randomUUID(),
    name: 'full_name',
    label: 'Họ tên',
    type: 'text',
    placeholder: '',
    required: true,
    span: 12,
  }
}

function createBlock(type: LandingBlockType): LandingBlock {
  const base: LandingBlock = {
    id: crypto.randomUUID(),
    type,
    row: 1,
    span: 12,
    order: 1,
  }

  if (type === 'title') {
    return { ...base, title: 'Tiêu đề mới', level: 2, align: 'left' }
  }

  if (type === 'text') {
    return { ...base, text: 'Mô tả nội dung block', align: 'left' }
  }

  if (type === 'image') {
    return { ...base, url: '', alt: '', caption: '' }
  }

  if (type === 'video') {
    return { ...base, url: '', title: '' }
  }

  return {
    ...base,
    title: 'Form đăng ký',
    description: '',
    submitLabel: 'Gửi thông tin',
    successMessage: 'Đã gửi thành công',
    fields: [createField()],
  }
}

function emptyPage(): Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'> {
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

type PageTemplate = {
  key: string
  label: string
  description: string
  page: Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>
}

function makeId() {
  return crypto.randomUUID()
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    key: 'blank',
    label: 'Trang trống',
    description: 'Bắt đầu từ đầu, không có block nào.',
    page: emptyPage(),
  },
  {
    key: 'home',
    label: 'Trang chủ (Home)',
    description: 'Template trang chủ đầy đủ: hero, giới thiệu, dịch vụ nổi bật, và form liên hệ.',
    page: {
      slug: 'trang-chu',
      path: '/',
      title: 'Thiện Chánh Clinic – Thẩm mỹ chuyên nghiệp',
      description: 'Thiện Chánh Clinic – Nơi hội tụ đội ngũ bác sĩ chuyên sâu, công nghệ hiện đại và không gian sang trọng.',
      seoTitle: 'Thiện Chánh Clinic – Phòng khám thẩm mỹ uy tín',
      seoDescription: 'Thiện Chánh Clinic cung cấp các dịch vụ thẩm mỹ cao cấp: nâng mũi, độn cằm, căng da mặt... Bác sĩ giàu kinh nghiệm, an toàn, tự nhiên.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Vẻ đẹp tự nhiên – Sự tự tin vượt trội', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Thiện Chánh Clinic – Phòng khám thẩm mỹ uy tín hàng đầu tại TP.HCM. Đội ngũ bác sĩ 10+ năm kinh nghiệm, công nghệ châu Âu, không gian 5 sao. Chúng tôi đồng hành cùng bạn trên hành trình tìm lại vẻ đẹp tự nhiên nhất.', align: 'center' },
        { id: makeId(), type: 'image', row: 3, span: 12, order: 3, url: '', alt: 'Thiện Chánh Clinic', caption: 'Cơ sở Thiện Chánh Clinic – Quận 1, TP.HCM' },
        { id: makeId(), type: 'title', row: 4, span: 12, order: 4, title: 'Dịch vụ nổi bật', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 5, text: '👃 Nâng mũi cấu trúc\nSụn tự thân, dáng mũi tự nhiên – bền vững theo thời gian. Không lo co rút, không lo biến chứng.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 6, text: '✨ Căng da mặt\nCông nghệ HIFU và chỉ treo Collagen V-Line – trẻ hóa làn da không cần phẫu thuật, không thời gian hồi phục.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 7, text: '💎 Độn cằm V-Line\nTạo đường cằm thanh tú, khuôn mặt cân đối hài hòa. Phẫu thuật nhanh – nghỉ dưỡng 3 ngày.', align: 'left' },
        { id: makeId(), type: 'title', row: 6, span: 12, order: 8, title: 'Vì sao hơn 10.000 khách hàng tin tưởng?', level: 2, align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 9, text: '🏥 10+ năm\nHoạt động trong ngành thẩm mỹ y tế', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 10, text: '👨‍⚕️ 15 bác sĩ\nChuyên môn cao, được đào tạo tại Hàn Quốc & Mỹ', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 11, text: '⭐ 4.9/5\nĐánh giá trung bình từ khách hàng thực tế', align: 'center' },
        { id: makeId(), type: 'text', row: 7, span: 3, order: 12, text: '🛡️ Bảo hành\nCam kết theo dõi và hỗ trợ trọn đời sau dịch vụ', align: 'center' },
        {
          id: makeId(), type: 'form', row: 8, span: 12, order: 13,
          title: 'Nhận tư vấn miễn phí ngay hôm nay',
          description: 'Để lại thông tin, chuyên viên sẽ liên hệ tư vấn trong 30 phút (miễn phí, không ràng buộc).',
          submitLabel: 'Nhận tư vấn miễn phí',
          successMessage: 'Cảm ơn bạn! Chuyên viên sẽ gọi lại trong 30 phút.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Thị A', required: true, span: 6 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '0901 234 567', required: true, span: 6 },
            { id: makeId(), name: 'service', label: 'Dịch vụ quan tâm', type: 'text', placeholder: 'Ví dụ: nâng mũi, căng da mặt...', required: false, span: 12 },
          ],
        },
      ],
    },
  },
  {
    key: 'khuyen-mai',
    label: 'Khuyến mãi dịch vụ',
    description: 'Template trang ưu đãi: tiêu đề, ảnh, mô tả và form đăng ký.',
    page: {
      slug: 'uu-dai-dich-vu',
      path: '/uu-dai-dich-vu',
      title: 'Ưu đãi dịch vụ tháng này',
      description: 'Chương trình ưu đãi đặc biệt dành cho khách hàng mới và khách hàng thân thiết.',
      seoTitle: 'Ưu đãi dịch vụ thẩm mỹ – Thiện Chánh Clinic',
      seoDescription: 'Khám phá các ưu đãi hấp dẫn tại Thiện Chánh Clinic. Đặt lịch ngay hôm nay!',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Ưu đãi đặc biệt tháng 6', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 7, order: 2, text: 'Thiện Chánh Clinic mang đến chương trình ưu đãi lên đến 30% cho các dịch vụ thẩm mỹ cao cấp. Đội ngũ bác sĩ giàu kinh nghiệm, công nghệ hiện đại, không gian sang trọng – tất cả chỉ trong một nơi.', align: 'left' },
        { id: makeId(), type: 'image', row: 2, span: 5, order: 3, url: '', alt: 'Ưu đãi dịch vụ thẩm mỹ', caption: 'Dịch vụ chuyên nghiệp tại Thiện Chánh Clinic' },
        {
          id: makeId(), type: 'form', row: 3, span: 12, order: 4,
          title: 'Đăng ký nhận ưu đãi ngay',
          description: 'Điền thông tin để nhận tư vấn miễn phí và ưu đãi độc quyền.',
          submitLabel: 'Đăng ký ngay',
          successMessage: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ trong 24 giờ.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A', required: true, span: 6 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '0901 234 567', required: true, span: 6 },
            { id: makeId(), name: 'service', label: 'Dịch vụ quan tâm', type: 'text', placeholder: 'Ví dụ: nâng mũi, độn cằm...', required: false, span: 12 },
          ],
        },
      ],
    },
  },
  {
    key: 'dich-vu',
    label: 'Giới thiệu dịch vụ',
    description: 'Template giới thiệu một dịch vụ cụ thể: tiêu đề, video, lợi ích và form.',
    page: {
      slug: 'dich-vu-nang-mui',
      path: '/dich-vu-nang-mui',
      title: 'Dịch vụ nâng mũi cấu trúc',
      description: 'Nâng mũi cấu trúc sụn tự thân – giải pháp tự nhiên, bền vững cho dáng mũi hoàn hảo.',
      seoTitle: 'Nâng mũi cấu trúc – Thiện Chánh Clinic',
      seoDescription: 'Nâng mũi sụn tự thân an toàn, tự nhiên tại Thiện Chánh Clinic. Kết quả bền vững, không lo biến chứng.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Nâng mũi cấu trúc sụn tự thân', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 12, order: 2, text: 'Kỹ thuật nâng mũi cấu trúc sụn tự thân là giải pháp tối ưu cho dáng mũi tự nhiên, bền lâu. Bác sĩ sử dụng sụn tai hoặc sụn sườn của chính bệnh nhân để tạo hình mũi, không lo thải trừ hay biến chứng.', align: 'left' },
        { id: makeId(), type: 'video', row: 3, span: 12, order: 3, url: '', title: 'Quy trình nâng mũi cấu trúc tại Thiện Chánh Clinic' },
        { id: makeId(), type: 'title', row: 4, span: 12, order: 4, title: 'Tại sao chọn Thiện Chánh?', level: 2, align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 5, text: '✅ Bác sĩ 10+ năm kinh nghiệm\nChuyên sâu về phẫu thuật thẩm mỹ mũi, đã thực hiện hàng nghìn ca.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 6, text: '✅ Công nghệ 3D Imaging\nMô phỏng kết quả trước phẫu thuật, giúp bạn hình dung rõ dáng mũi sau.', align: 'left' },
        { id: makeId(), type: 'text', row: 5, span: 4, order: 7, text: '✅ Bảo hành trọn đời\nCam kết theo dõi và hỗ trợ sau phẫu thuật không giới hạn thời gian.', align: 'left' },
        {
          id: makeId(), type: 'form', row: 6, span: 12, order: 8,
          title: 'Tư vấn miễn phí ngay hôm nay',
          description: 'Để lại thông tin, bác sĩ sẽ gọi lại tư vấn trực tiếp trong 30 phút.',
          submitLabel: 'Nhận tư vấn miễn phí',
          successMessage: 'Đã nhận thông tin! Bác sĩ sẽ liên hệ bạn sớm nhất.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Thị B', required: true, span: 6 },
            { id: makeId(), name: 'phone', label: 'Điện thoại', type: 'tel', placeholder: '0901 234 567', required: true, span: 6 },
            { id: makeId(), name: 'note', label: 'Ghi chú thêm', type: 'textarea', placeholder: 'Bạn muốn hỏi gì về dịch vụ...', required: false, span: 12 },
          ],
        },
      ],
    },
  },
  {
    key: 'dat-lich',
    label: 'Đặt lịch khám',
    description: 'Template đặt lịch khám: thông tin phòng khám và form đặt lịch.',
    page: {
      slug: 'dat-lich-kham',
      path: '/dat-lich-kham',
      title: 'Đặt lịch khám tại Thiện Chánh Clinic',
      description: 'Đặt lịch khám và tư vấn thẩm mỹ trực tiếp với bác sĩ.',
      seoTitle: 'Đặt lịch khám – Thiện Chánh Clinic',
      seoDescription: 'Đặt lịch khám tư vấn thẩm mỹ miễn phí tại Thiện Chánh Clinic. Bác sĩ giàu kinh nghiệm, tận tâm.',
      isPublished: false,
      blocks: [
        { id: makeId(), type: 'title', row: 1, span: 12, order: 1, title: 'Đặt lịch khám & tư vấn miễn phí', level: 1, align: 'center' },
        { id: makeId(), type: 'text', row: 2, span: 6, order: 2, text: '📍 Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM\n⏰ Giờ làm việc: Thứ 2 – Thứ 7, 8:00 – 20:00\n📞 Hotline: 1800 1234 (miễn phí)\n\nĐội ngũ bác sĩ và chuyên viên tư vấn luôn sẵn sàng hỗ trợ bạn tìm ra giải pháp phù hợp nhất.', align: 'left' },
        {
          id: makeId(), type: 'form', row: 2, span: 6, order: 3,
          title: 'Chọn thời gian phù hợp',
          description: 'Chúng tôi sẽ xác nhận lịch hẹn qua điện thoại trong vòng 1 giờ.',
          submitLabel: 'Đặt lịch ngay',
          successMessage: 'Đặt lịch thành công! Chúng tôi sẽ gọi xác nhận sớm.',
          fields: [
            { id: makeId(), name: 'full_name', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn C', required: true, span: 12 },
            { id: makeId(), name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '0901 234 567', required: true, span: 12 },
            { id: makeId(), name: 'service', label: 'Dịch vụ muốn khám', type: 'text', placeholder: 'Ví dụ: tư vấn nâng mũi', required: false, span: 12 },
            { id: makeId(), name: 'preferred_time', label: 'Thời gian mong muốn', type: 'text', placeholder: 'Ví dụ: sáng thứ 3 tuần này', required: false, span: 12 },
          ],
        },
      ],
    },
  },
]

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

function toEmbedUrl(url: string) {
  if (!isYoutubeUrl(url)) return url
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  const longMatch = url.match(/[?&]v=([^&]+)/)
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`
  return url
}

function titleLevel(level?: number): 1 | 2 | 3 | 4 | 5 {
  const next = Math.max(1, Math.min(5, level || 2))
  return next as 1 | 2 | 3 | 4 | 5
}

export function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<LandingPage, 'id' | 'createdAt' | 'updatedAt'>>(emptyPage())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateModal, setTemplateModal] = useState(false)

  const selectedPage = useMemo(
    () => pages.find((item) => item.id === selectedId) || null,
    [pages, selectedId],
  )
  const previewUrl = useMemo(() => {
    const base = LANDING_URL
    const path = draft.path === '/' ? '' : draft.path
    return `${base.replace(/\/$/, '')}${path || '/'}`
  }, [draft.path])

  useEffect(() => {
    void loadPages()
  }, [])

  useEffect(() => {
    if (!selectedPage) return
    setDraft({
      slug: selectedPage.slug,
      path: selectedPage.path,
      title: selectedPage.title,
      description: selectedPage.description || '',
      seoTitle: selectedPage.seoTitle || '',
      seoDescription: selectedPage.seoDescription || '',
      blocks: (selectedPage.blocks || []).map((block) => ({
        ...block,
        fields: block.fields ? block.fields.map((field) => ({ ...field })) : undefined,
      })),
      isPublished: selectedPage.isPublished,
    })
  }, [selectedPage])

  async function loadPages(nextSelectedId?: string | null) {
    setLoading(true)
    try {
      const response = await api.get('/settings/landing-pages')
      const nextPages = response.data.data as LandingPage[]
      setPages(nextPages)

      if (typeof nextSelectedId !== 'undefined') {
        setSelectedId(nextSelectedId)
        return
      }

      if (!nextPages.length) {
        setSelectedId(null)
        setDraft(emptyPage())
        return
      }

      setSelectedId((current) => (current && nextPages.some((item) => item.id === current) ? current : nextPages[0].id))
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(patch: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function startCreatePage() {
    setTemplateModal(true)
  }

  function applyTemplate(template: PageTemplate) {
    setSelectedId(null)
    setDraft({
      ...template.page,
      blocks: template.page.blocks.map((block) => ({ ...block, id: makeId() })),
    })
    setTemplateModal(false)
  }

  function syncSlugFromTitle(title: string) {
    const nextSlug = slugify(title)
    setDraft((current) => ({
      ...current,
      title,
      slug: current.slug ? current.slug : nextSlug,
      path: current.path && current.path !== '/' ? current.path : normalizePath(nextSlug),
    }))
  }

  function updateBlock(blockId: string, patch: Partial<LandingBlock>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block, index) =>
        block.id === blockId ? { ...block, ...patch, order: index + 1 } : block,
      ),
    }))
  }

  function addBlock(type: LandingBlockType) {
    setDraft((current) => {
      const nextRow = current.blocks.length ? Math.max(...current.blocks.map((block) => block.row)) + 1 : 1
      const block = { ...createBlock(type), row: nextRow, order: current.blocks.length + 1 }
      return {
        ...current,
        blocks: [...current.blocks, block],
      }
    })
  }

  function removeBlock(blockId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks
        .filter((block) => block.id !== blockId)
        .map((block, index) => ({ ...block, order: index + 1 })),
    }))
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.blocks.length) return current
      const next = [...current.blocks]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return {
        ...current,
        blocks: next.map((block, orderIndex) => ({ ...block, order: orderIndex + 1 })),
      }
    })
  }

  function addFormField(blockId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId
          ? { ...block, fields: [...(block.fields || []), createField()] }
          : block,
      ),
    }))
  }

  function updateFormField(blockId: string, fieldId: string, patch: Partial<LandingFormField>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== blockId) return block
        return {
          ...block,
          fields: (block.fields || []).map((field) =>
            field.id === fieldId ? { ...field, ...patch } : field,
          ),
        }
      }),
    }))
  }

  function removeFormField(blockId: string, fieldId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== blockId) return block
        return {
          ...block,
          fields: (block.fields || []).filter((field) => field.id !== fieldId),
        }
      }),
    }))
  }

  async function savePage() {
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      path: normalizePath(draft.path || draft.slug || draft.title),
      blocks: draft.blocks.map((block, index) => ({ ...block, order: index + 1 })),
    }

    if (!payload.title.trim()) {
      message.error('Cần nhập tên page')
      return
    }

    setSaving(true)
    try {
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        message.success('Đã cập nhật landing page')
        await loadPages(response.data.data.id)
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        message.success('Đã tạo landing page')
        await loadPages(response.data.data.id)
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveAndOpen() {
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.title),
      path: normalizePath(draft.path || draft.slug || draft.title),
      blocks: draft.blocks.map((block, index) => ({ ...block, order: index + 1 })),
    }
    if (!payload.title.trim()) {
      message.error('Cần nhập tên page')
      return
    }
    setSaving(true)
    try {
      let savedPath = payload.path
      if (selectedId) {
        const response = await api.patch(`/settings/landing-pages/${selectedId}`, payload)
        savedPath = response.data.data.path
        message.success('Đã cập nhật')
        await loadPages(response.data.data.id)
      } else {
        const response = await api.post('/settings/landing-pages', payload)
        savedPath = response.data.data.path
        message.success('Đã tạo landing page')
        await loadPages(response.data.data.id)
      }
      const base = LANDING_URL.replace(/\/$/, '')
      const path = savedPath === '/' ? '' : savedPath
      window.open(`${base}${path || '/'}`, '_blank', 'noreferrer')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage() {
    if (!selectedId) return
    await api.delete(`/settings/landing-pages/${selectedId}`)
    message.success('Đã xóa landing page')
    await loadPages(null)
  }

  const rows = useMemo(() => {
    return [...draft.blocks]
      .sort((left, right) => left.order - right.order)
      .reduce<Record<number, LandingBlock[]>>((accumulator, block) => {
        accumulator[block.row] = [...(accumulator[block.row] || []), block]
        return accumulator
      }, {})
  }, [draft.blocks])

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Next.js landing builder</Typography.Text>
          <Typography.Title level={2}>Landing pages</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Tạo page mới, sắp xếp block theo row 12 cột, và xuất bản cho app landing Next.js.
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={startCreatePage}>Page mới</Button>
          <Button icon={<SaveOutlined />} loading={saving} onClick={savePage}>Lưu</Button>
          <Button icon={<EyeOutlined />} loading={saving} type="primary" onClick={() => void saveAndOpen()}>Lưu & Mở</Button>
        </Space>
      </div>

      <Row gutter={[20, 20]} align="top">
        <Col xs={24} xl={7}>
          <Card className="glass-card" loading={loading} title="Danh sách pages" extra={<Tag>{pages.length} page</Tag>}>
            <List
              dataSource={pages}
              locale={{ emptyText: 'Chưa có landing page nào' }}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer', paddingInline: 0 }}
                  onClick={() => setSelectedId(item.id)}
                  actions={[item.isPublished ? <Tag color="green">Published</Tag> : <Tag>Draft</Tag>]}
                >
                  <List.Item.Meta
                    title={<Typography.Text strong={item.id === selectedId}>{item.title}</Typography.Text>}
                    description={
                      <Space direction="vertical" size={2}>
                        <Typography.Text type="secondary">{item.path}</Typography.Text>
                        <Typography.Text type="secondary">/{item.slug}</Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} xl={17}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card className="glass-card" title="Thông tin page">
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Tên page">
                      <Input value={draft.title} onChange={(event) => syncSlugFromTitle(event.target.value)} placeholder="Ví dụ: Ưu đãi nâng mũi tháng 6" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Slug">
                      <Input value={draft.slug} onChange={(event) => updateDraft({ slug: slugify(event.target.value) })} placeholder="uu-dai-nang-mui" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Path public">
                      <Input value={draft.path} onChange={(event) => updateDraft({ path: normalizePath(event.target.value) })} placeholder="/uu-dai-nang-mui" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Xuất bản">
                      <Flex align="center" gap={12}>
                        <Switch checked={draft.isPublished} onChange={(checked) => updateDraft({ isPublished: checked })} />
                        <Typography.Text type="secondary">{draft.isPublished ? 'Đang public' : 'Đang ở draft'}</Typography.Text>
                      </Flex>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="Mô tả ngắn">
                      <Input.TextArea rows={3} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="SEO title">
                      <Input value={draft.seoTitle} onChange={(event) => updateDraft({ seoTitle: event.target.value })} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="SEO description">
                      <Input value={draft.seoDescription} onChange={(event) => updateDraft({ seoDescription: event.target.value })} />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              <Space wrap>
                <Typography.Text type="secondary">Public URL: {previewUrl}</Typography.Text>
                {draft.isPublished ? (
                  <Button href={previewUrl} icon={<EyeOutlined />} rel="noreferrer" target="_blank">
                    Mở landing
                  </Button>
                ) : null}
                {selectedId ? (
                  <Popconfirm title="Xóa landing page này?" onConfirm={() => void deletePage()}>
                    <Button danger icon={<DeleteOutlined />}>Xóa page</Button>
                  </Popconfirm>
                ) : null}
              </Space>
            </Card>

            <Card
              className="glass-card"
              title="Blocks"
              extra={
                <Space wrap>
                  {blockTypeOptions.map((option) => (
                    <Button key={option.value} icon={<PlusOutlined />} onClick={() => addBlock(option.value)}>
                      {option.label}
                    </Button>
                  ))}
                </Space>
              }
            >
              {draft.blocks.length === 0 ? (
                <Empty description="Chưa có block nào" />
              ) : (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  {draft.blocks.map((block, index) => (
                    <Card
                      key={block.id}
                      size="small"
                      title={
                        <Space>
                          {blockTypeIcons[block.type]}
                          <Typography.Text strong>
                            {blockTypeOptions.find((option) => option.value === block.type)?.label} #{index + 1}
                          </Typography.Text>
                        </Space>
                      }
                      extra={
                        <Space>
                          <Button size="small" onClick={() => moveBlock(block.id, -1)} disabled={index === 0}>Lên</Button>
                          <Button size="small" onClick={() => moveBlock(block.id, 1)} disabled={index === draft.blocks.length - 1}>Xuống</Button>
                          <Button danger size="small" onClick={() => removeBlock(block.id)}>Xóa</Button>
                        </Space>
                      }
                    >
                      <Row gutter={16}>
                        <Col xs={24} md={8}>
                          <Form.Item label="Row" style={{ marginBottom: 12 }}>
                            <InputNumber min={1} value={block.row} onChange={(value) => updateBlock(block.id, { row: Number(value || 1) })} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item label="Span / 12" style={{ marginBottom: 12 }}>
                            <InputNumber min={1} max={12} value={block.span} onChange={(value) => updateBlock(block.id, { span: Number(value || 12) })} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item label="Canh lề" style={{ marginBottom: 12 }}>
                            <Select
                              value={block.align || 'left'}
                              onChange={(value) => updateBlock(block.id, { align: value })}
                              options={[
                                { value: 'left', label: 'Trái' },
                                { value: 'center', label: 'Giữa' },
                                { value: 'right', label: 'Phải' },
                              ]}
                              disabled={!['title', 'text'].includes(block.type)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      {block.type === 'title' ? (
                        <Row gutter={16}>
                          <Col xs={24} md={16}>
                            <Form.Item label="Nội dung title" style={{ marginBottom: 12 }}>
                              <Input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={8}>
                            <Form.Item label="Heading level" style={{ marginBottom: 12 }}>
                              <InputNumber min={1} max={6} value={block.level || 2} onChange={(value) => updateBlock(block.id, { level: Number(value || 2) })} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      ) : null}

                      {block.type === 'text' ? (
                        <Form.Item label="Nội dung text" style={{ marginBottom: 12 }}>
                          <Input.TextArea rows={5} value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value })} />
                        </Form.Item>
                      ) : null}

                      {block.type === 'image' ? (
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item label="URL hình ảnh" style={{ marginBottom: 12 }}>
                              <Input value={block.url} onChange={(event) => updateBlock(block.id, { url: event.target.value })} placeholder="https://..." />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item label="Alt text" style={{ marginBottom: 12 }}>
                              <Input value={block.alt} onChange={(event) => updateBlock(block.id, { alt: event.target.value })} />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item label="Caption" style={{ marginBottom: 12 }}>
                              <Input value={block.caption} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} />
                            </Form.Item>
                          </Col>
                        </Row>
                      ) : null}

                      {block.type === 'video' ? (
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item label="URL video / Youtube" style={{ marginBottom: 12 }}>
                              <Input value={block.url} onChange={(event) => updateBlock(block.id, { url: event.target.value })} placeholder="https://youtu.be/..." />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item label="Tiêu đề video" style={{ marginBottom: 12 }}>
                              <Input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                            </Form.Item>
                          </Col>
                        </Row>
                      ) : null}

                      {block.type === 'form' ? (
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item label="Tên form" style={{ marginBottom: 12 }}>
                                <Input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item label="Nhãn nút submit" style={{ marginBottom: 12 }}>
                                <Input value={block.submitLabel} onChange={(event) => updateBlock(block.id, { submitLabel: event.target.value })} />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item label="Mô tả form" style={{ marginBottom: 12 }}>
                                <Input.TextArea rows={3} value={block.description} onChange={(event) => updateBlock(block.id, { description: event.target.value })} />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item label="Thông báo thành công" style={{ marginBottom: 12 }}>
                                <Input value={block.successMessage} onChange={(event) => updateBlock(block.id, { successMessage: event.target.value })} />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Flex justify="space-between" align="center">
                            <Typography.Text strong>Fields của form</Typography.Text>
                            <Button icon={<PlusOutlined />} onClick={() => addFormField(block.id)}>Thêm field</Button>
                          </Flex>

                          {(block.fields || []).map((field) => (
                            <Card key={field.id} size="small">
                              <Row gutter={12}>
                                <Col xs={24} md={6}>
                                  <Form.Item label="Label" style={{ marginBottom: 12 }}>
                                    <Input value={field.label} onChange={(event) => updateFormField(block.id, field.id, { label: event.target.value })} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                  <Form.Item label="Name" style={{ marginBottom: 12 }}>
                                    <Input value={field.name} onChange={(event) => updateFormField(block.id, field.id, { name: slugify(event.target.value).replace(/-/g, '_') })} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={4}>
                                  <Form.Item label="Type" style={{ marginBottom: 12 }}>
                                    <Select
                                      value={field.type}
                                      onChange={(value) => updateFormField(block.id, field.id, { type: value })}
                                      options={[
                                        { value: 'text', label: 'Text' },
                                        { value: 'textarea', label: 'Textarea' },
                                        { value: 'email', label: 'Email' },
                                        { value: 'tel', label: 'Điện thoại' },
                                        { value: 'number', label: 'Số' },
                                      ]}
                                    />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={4}>
                                  <Form.Item label="Span / 12" style={{ marginBottom: 12 }}>
                                    <InputNumber min={1} max={12} value={field.span} onChange={(value) => updateFormField(block.id, field.id, { span: Number(value || 12) })} style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={4}>
                                  <Form.Item label="Bắt buộc" style={{ marginBottom: 12 }}>
                                    <Flex align="center" style={{ minHeight: 32 }}>
                                      <Switch checked={field.required} onChange={(checked) => updateFormField(block.id, field.id, { required: checked })} />
                                    </Flex>
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={20}>
                                  <Form.Item label="Placeholder" style={{ marginBottom: 0 }}>
                                    <Input value={field.placeholder} onChange={(event) => updateFormField(block.id, field.id, { placeholder: event.target.value })} />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={4}>
                                  <Form.Item label=" " style={{ marginBottom: 0 }}>
                                    <Button danger block onClick={() => removeFormField(block.id, field.id)}>Xóa field</Button>
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Card>
                          ))}
                        </Space>
                      ) : null}
                    </Card>
                  ))}
                </Space>
              )}
            </Card>

            <Card className="glass-card" title="Preview layout">
              {draft.blocks.length === 0 ? (
                <Empty description="Thêm block để xem preview" />
              ) : (
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  {Object.entries(rows)
                    .sort(([left], [right]) => Number(left) - Number(right))
                    .map(([rowKey, blocks]) => (
                      <div key={rowKey}>
                        <Typography.Text type="secondary">Row {rowKey}</Typography.Text>
                        <div
                          style={{
                            display: 'grid',
                            gap: 16,
                            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                            marginTop: 8,
                          }}
                        >
                          {blocks.map((block) => (
                            <Card key={block.id} size="small" style={{ gridColumn: `span ${block.span}` }}>
                              {block.type === 'title' ? (
                                <Typography.Title level={titleLevel(block.level)} style={{ marginBottom: 0, textAlign: block.align }}>
                                  {block.title || 'Title'}
                                </Typography.Title>
                              ) : null}
                              {block.type === 'text' ? (
                                <Typography.Paragraph style={{ marginBottom: 0, textAlign: block.align, whiteSpace: 'pre-wrap' }}>
                                  {block.text || 'Text block'}
                                </Typography.Paragraph>
                              ) : null}
                              {block.type === 'image' ? (
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                  {block.url ? <img alt={block.alt || block.title || 'Landing image'} src={block.url} style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }} /> : <Tag>Chưa có ảnh</Tag>}
                                  {block.caption ? <Typography.Text type="secondary">{block.caption}</Typography.Text> : null}
                                </Space>
                              ) : null}
                              {block.type === 'video' ? (
                                block.url ? (
                                  <iframe allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" src={toEmbedUrl(block.url)} style={{ width: '100%', minHeight: 220, border: 0, borderRadius: 12 }} title={block.title || 'Video preview'} />
                                ) : <Tag>Chưa có video</Tag>
                              ) : null}
                              {block.type === 'form' ? (
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                  <Typography.Title level={4} style={{ marginBottom: 0 }}>{block.title || 'Form custom'}</Typography.Title>
                                  {block.description ? <Typography.Paragraph type="secondary">{block.description}</Typography.Paragraph> : null}
                                  <Row gutter={[12, 12]}>
                                    {(block.fields || []).map((field) => (
                                      <Col key={field.id} span={Math.max(1, Math.min(24, field.span * 2))}>
                                        <Input placeholder={field.placeholder || field.label} />
                                      </Col>
                                    ))}
                                  </Row>
                                  <Button type="primary">{block.submitLabel || 'Gửi thông tin'}</Button>
                                </Space>
                              ) : null}
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                </Space>
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      <Modal
        footer={null}
        onCancel={() => setTemplateModal(false)}
        open={templateModal}
        title="Chọn template cho page mới"
        width={640}
      >
        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 8 }}>
          {PAGE_TEMPLATES.map((template) => (
            <Card
              hoverable
              key={template.key}
              onClick={() => applyTemplate(template)}
              size="small"
              style={{ cursor: 'pointer' }}
            >
              <Flex justify="space-between" align="center">
                <div>
                  <Typography.Text strong>{template.label}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">{template.description}</Typography.Text>
                </div>
                <Space>
                  <Tag>{template.page.blocks.length} block</Tag>
                  <Button size="small" type="primary">Chọn</Button>
                </Space>
              </Flex>
            </Card>
          ))}
        </Space>
      </Modal>
    </Space>
  )
}