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
    setSelectedId(null)
    setDraft(emptyPage())
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
          <Button icon={<SaveOutlined />} loading={saving} type="primary" onClick={savePage}>Lưu page</Button>
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
    </Space>
  )
}