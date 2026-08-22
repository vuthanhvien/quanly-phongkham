import {
  CommentOutlined,
  LikeFilled,
  LikeOutlined,
  PictureOutlined,
  SendOutlined,
} from "@ant-design/icons"
import { Avatar, Button, Card, Image, Input, Popconfirm, Select, Space, Tabs, Tag, Typography, Upload, message } from "antd"
import type { UploadFile } from "antd"
import { useMemo, useState } from "react"
import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { api, resolveFileUrl } from "../../api"
import { hasActionAccess } from "../../access"
import { FeedMarkdownEditor } from "../FeedMarkdownEditor"

type Audience = "company" | "department" | "branch"
type FeedFilter = "all" | Audience
type Comment = { id: string; authorId: string; authorName: string; authorAvatarUrl?: string; content: string; createdAt: string; replyToName?: string; likes?: number; liked?: boolean; replies?: Comment[] }
type LinkPreview = { url: string; title: string; description?: string; imageUrl?: string; hostname?: string }
type FeedPost = { id: string; authorId: string; authorName: string; authorAvatarUrl?: string; audience: Audience; departmentIds?: string[]; branchIds?: string[]; createdAt: string; content?: string; imageUrls?: string[]; linkPreview?: LinkPreview; likes: number; liked?: boolean; comments: Comment[] }

const audienceLabels: Record<Audience, string> = { company: "Toàn công ty", department: "Phòng ban", branch: "Chi nhánh" }
const feedFilterItems: Array<{ key: FeedFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "company", label: "Công ty" },
  { key: "department", label: "Phòng ban" },
  { key: "branch", label: "Chi nhánh" },
]

export function CompanyFeed({ currentUser = "Bạn", currentUserId }: { currentUser?: string; currentUserId?: string }) {
  const canCreate = hasActionAccess("company-feed", "create")
  const canDelete = hasActionAccess("company-feed", "delete")
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all")
  const [content, setContent] = useState("")
  const [audience, setAudience] = useState<Audience>("company")
  const [files, setFiles] = useState<UploadFile[]>([])
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>([])
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [linkPreview, setLinkPreview] = useState<LinkPreview | undefined>()

  const imageUrls = useMemo(() => files.map((file) => file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "")).filter(Boolean), [files])

  useEffect(() => {
    let disposed = false
    let retryTimer: number | undefined

    void loadFeed(true).then((loaded) => {
      if (!loaded && !disposed) retryTimer = window.setTimeout(() => void loadFeed(), 1200)
    })

    return () => {
      disposed = true
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [feedFilter])
  useEffect(() => { void Promise.all([api.get('/records/departments', { params: { pageSize: 500 } }), api.get('/records/branches', { params: { pageSize: 500 } })]).then(([dept, branch]) => { setDepartments((dept.data.data || []).map((item: any) => ({ value: item.id, label: item.name || item.code }))); setBranches((branch.data.data || []).map((item: any) => ({ value: item.id, label: item.name || item.slug }))) }).catch(() => undefined) }, [])
  useEffect(() => {
    const url = firstFeedUrl(content)
    if (!url) { setLinkPreview(undefined); return }
    let disposed = false
    const timer = window.setTimeout(() => {
      void api.get('/feed/link-preview', { params: { url } }).then((response) => { if (!disposed) setLinkPreview(response.data.data) }).catch(() => { if (!disposed) setLinkPreview(undefined) })
    }, 500)
    return () => { disposed = true; window.clearTimeout(timer) }
  }, [content])

  async function loadFeed(silent = false) {
    try {
      const response = await api.get('/feed', { params: feedFilter === "all" ? undefined : { audience: feedFilter } })
      setPosts(response.data.data || [])
      return true
    } catch {
      if (!silent) message.error('Không thể tải Feed')
      return false
    }
  }
  async function publish() {
    if (!canCreate) return message.error("Bạn không có quyền đăng bài lên Feed")
    if (!content.trim() && imageUrls.length === 0) return
    if (content.length > 5000) return message.warning("Nội dung bài viết tối đa 5.000 ký tự")
    if (audience === 'department' && !departmentIds.length) return message.warning('Chọn ít nhất một phòng ban')
    if (audience === 'branch' && !branchIds.length) return message.warning('Chọn ít nhất một chi nhánh')
    try { const formData = new FormData(); files.forEach((file) => file.originFileObj && formData.append('files', file.originFileObj)); const upload = files.length ? await api.post('/feed/images', formData) : null; await api.post('/feed', { content: content.trim(), audience, departmentIds, branchIds, imageUrls: upload?.data?.data || [], linkPreview }); setContent(""); setFiles([]); setLinkPreview(undefined); setDepartmentIds([]); setBranchIds([]); await loadFeed(); message.success("Bài viết đã được đăng lên Feed") } catch { message.error('Không thể đăng bài') }
  }

  async function toggleLike(id: string) {
    if (!canCreate) return message.error("Bạn không có quyền tương tác Feed")
    try { await api.post(`/feed/${id}/like`); await loadFeed() } catch { message.error('Không thể cập nhật lượt thích') }
  }

  async function toggleCommentLike(id: string) {
    if (!canCreate) return message.error("Bạn không có quyền tương tác Feed")
    try { await api.post(`/feed/comments/${id}/like`); await loadFeed() } catch { message.error('Không thể cập nhật lượt thích bình luận') }
  }

  async function addComment(postId: string, parent?: Comment) {
    if (!canCreate) return message.error("Bạn không có quyền bình luận Feed")
    const text = commentText[postId]?.trim()
    if (!text) return
    try { await api.post(`/feed/${postId}/comments`, { content: text, parentId: parent?.id }); setCommentText((items) => ({ ...items, [postId]: "" })); setReplyingTo(null); await loadFeed() } catch { message.error('Không thể gửi bình luận') }
  }

  function openComment(postId: string, commentId?: string) {
    setReplyingTo(commentId ? `${postId}:${commentId}` : postId)
    window.requestAnimationFrame(() => document.getElementById(`feed-comment-${postId}`)?.focus())
  }

  async function removePost(id: string) { try { await api.delete(`/feed/${id}`, { headers: { 'X-Delete-Confirmed': 'true' } }); await loadFeed(); message.success('Đã xóa bài viết') } catch { message.error('Không thể xóa bài viết') } }
  async function removeComment(id: string) { try { await api.delete(`/feed/comments/${id}`, { headers: { 'X-Delete-Confirmed': 'true' } }); await loadFeed(); message.success('Đã xóa bình luận') } catch { message.error('Không thể xóa bình luận') } }

  return <section className="company-feed">
    <Card className="feed-composer" bordered={false}>
      <div className="feed-composer__main"><Avatar className="feed-avatar feed-avatar--self">{currentUser.slice(0, 2).toUpperCase()}</Avatar><FeedMarkdownEditor disabled={!canCreate} value={content} onChange={setContent} /></div>
      {linkPreview ? <FeedLinkPreview preview={linkPreview} /> : null}
      {files.length ? <FeedGallery className="feed-image-preview" images={imageUrls} /> : null}
      <div className="feed-composer__actions"><Space wrap><Upload accept="image/*" beforeUpload={() => false} disabled={!canCreate} fileList={files} maxCount={30} multiple showUploadList={false} onChange={({ fileList }) => setFiles(fileList)}><Button disabled={!canCreate} icon={<PictureOutlined />} type="text">Ảnh / album</Button></Upload><Select disabled={!canCreate} className="feed-audience" value={audience} options={(Object.keys(audienceLabels) as Audience[]).map((value) => ({ value, label: audienceLabels[value] }))} onChange={(value) => { setAudience(value); setDepartmentIds([]); setBranchIds([]) }} />{audience === 'department' ? <Select disabled={!canCreate} className="feed-scope-select" mode="multiple" placeholder="Chọn phòng ban" options={departments} value={departmentIds} onChange={setDepartmentIds} /> : null}{audience === 'branch' ? <Select disabled={!canCreate} className="feed-scope-select" mode="multiple" placeholder="Chọn chi nhánh" options={branches} value={branchIds} onChange={setBranchIds} /> : null}</Space><Button disabled={!canCreate || content.length > 5000 || (!content.trim() && !files.length)} icon={<SendOutlined />} type="primary" onClick={() => void publish()}>Đăng bài</Button></div>
    </Card>
    <Tabs
      className="feed-filter-tabs"
      activeKey={feedFilter}
      items={feedFilterItems}
      size="small"
      onChange={(key) => setFeedFilter(key as FeedFilter)}
    />
    <div className="feed-stream">
      {posts.map((post) => <Card className="feed-post" key={post.id} bordered={false}>
        <div className="feed-post__head"><Avatar className="feed-avatar" src={post.authorAvatarUrl ? resolveFileUrl(post.authorAvatarUrl) : undefined}>{post.authorName.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Text strong>{post.authorName}</Typography.Text><Typography.Text className="feed-post__meta">{new Date(post.createdAt).toLocaleString('vi-VN')} · <Tag>{audienceLabels[post.audience]}</Tag></Typography.Text></div>{post.authorId === currentUserId && canDelete ? <Popconfirm title="Xóa bài viết này?" okText="Xóa" cancelText="Hủy" onConfirm={() => void removePost(post.id)}><Button className="feed-delete" danger size="small" type="text">Xóa</Button></Popconfirm> : null}</div>
        {post.content ? <FeedPostContent content={post.content} /> : null}
        {post.linkPreview ? <FeedLinkPreview preview={post.linkPreview} /> : null}
        {post.imageUrls?.length ? <FeedGallery className="feed-album" images={post.imageUrls.map((src) => src.startsWith('/') ? resolveFileUrl(src) : src)} /> : null}
        <div className="feed-post__counts"><span>{post.likes ? `${post.likes} lượt thích` : "Hãy là người đầu tiên thích"}</span><span>{post.comments.length ? `${post.comments.length} bình luận` : ""}</span></div>
        <div className="feed-post__actions"><Button disabled={!canCreate} icon={post.liked ? <LikeFilled /> : <LikeOutlined />} type="text" className={post.liked ? "is-liked" : ""} onClick={() => toggleLike(post.id)}>Thích</Button><Button disabled={!canCreate} icon={<CommentOutlined />} type="text" onClick={() => openComment(post.id)}>Bình luận</Button></div>
        <div className="feed-comments">{post.comments.map((comment) => <div className="feed-comment" key={comment.id}><Avatar size={30} className="feed-avatar" src={comment.authorAvatarUrl ? resolveFileUrl(comment.authorAvatarUrl) : undefined}>{comment.authorName.slice(0, 2).toUpperCase()}</Avatar><div className="feed-comment__body"><div className="feed-comment__bubble"><Typography.Text strong>{comment.authorName}</Typography.Text><div>{comment.content}</div></div><div className="feed-comment__actions"><span>{new Date(comment.createdAt).toLocaleString('vi-VN')}</span><button className={comment.liked ? 'is-liked' : ''} onClick={() => void toggleCommentLike(comment.id)}>{comment.likes ? `${comment.likes} Thích` : 'Thích'}</button><button onClick={() => openComment(post.id, comment.id)}>Phản hồi</button>{comment.authorId === currentUserId ? <button className="feed-delete-link" onClick={() => void removeComment(comment.id)}>Xóa</button> : null}</div>{comment.replies?.map((reply) => <div className="feed-comment feed-comment--reply" key={reply.id}><Avatar size={26} className="feed-avatar">{reply.authorName.slice(0, 2).toUpperCase()}</Avatar><div className="feed-comment__body"><div className="feed-comment__bubble"><Typography.Text strong>{reply.authorName}</Typography.Text><div>{reply.replyToName ? <span className="feed-reply-to">@{reply.replyToName} </span> : null}{reply.content}</div></div><div className="feed-comment__actions"><span>{new Date(reply.createdAt).toLocaleString('vi-VN')}</span><button className={reply.liked ? 'is-liked' : ''} onClick={() => void toggleCommentLike(reply.id)}>{reply.likes ? `${reply.likes} Thích` : 'Thích'}</button><button onClick={() => openComment(post.id, reply.id)}>Phản hồi</button>{reply.authorId === currentUserId ? <button className="feed-delete-link" onClick={() => void removeComment(reply.id)}>Xóa</button> : null}</div></div></div>)}</div></div>)}</div>
        {replyingTo === post.id || replyingTo?.startsWith(`${post.id}:`) ? <div className="feed-comment-box"><Avatar size={30} className="feed-avatar feed-avatar--self">{currentUser.slice(0, 2).toUpperCase()}</Avatar><Input disabled={!canCreate} id={`feed-comment-${post.id}`} placeholder={replyingTo === post.id ? "Viết bình luận..." : `Phản hồi ${findComment(post, replyingTo?.split(':')[1])?.authorName || ''}...`} value={commentText[post.id] || ""} onChange={(event) => setCommentText((items) => ({ ...items, [post.id]: event.target.value }))} onPressEnter={() => void addComment(post.id, replyingTo?.includes(":") ? findComment(post, replyingTo.split(':')[1]) : undefined)} suffix={<SendOutlined onClick={() => void addComment(post.id, replyingTo?.includes(":") ? findComment(post, replyingTo.split(':')[1]) : undefined)} />} /></div> : null}
      </Card>)}
    </div>
  </section>
}

function findComment(post: FeedPost, id?: string) {
  return post.comments.flatMap((comment) => [comment, ...(comment.replies || [])]).find((comment) => comment.id === id)
}

function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
}

function FeedContent({ content }: { content: string }) {
  return <MarkdownContent content={content} />
}

const FEED_PREVIEW_LENGTH = 700

function FeedPostContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const canCollapse = content.length > FEED_PREVIEW_LENGTH

  return <div className="feed-post__text feed-rich-content">
    <div className={canCollapse && !expanded ? "feed-post__content feed-post__content--collapsed" : "feed-post__content"}>
      <FeedContent content={content} />
    </div>
    {canCollapse ? <Button className="feed-post__read-more" type="link" onClick={() => setExpanded((value) => !value)}>{expanded ? "Thu gọn" : "Xem thêm"}</Button> : null}
  </div>
}

function FeedLinkPreview({ preview }: { preview: LinkPreview }) {
  return <a className="feed-link-preview" href={preview.url} target="_blank" rel="noopener noreferrer">
    {preview.imageUrl ? <img alt="" src={preview.imageUrl} /> : null}
    <span className="feed-link-preview__body"><span className="feed-link-preview__host">{preview.hostname || new URL(preview.url).hostname}</span><strong>{preview.title}</strong>{preview.description ? <span>{preview.description}</span> : null}<small>{preview.url}</small></span>
  </a>
}

function firstFeedUrl(value: string) {
  return value.match(/https?:\/\/[^\s<>\])}"']+/i)?.[0]
}

function FeedGallery({ images, className }: { images: string[]; className: string }) {
  const hidden = Math.max(0, images.length - 9)
  return <Image.PreviewGroup><div className={`${className} feed-gallery`}>{images.map((src, index) => <div className={index > 8 ? 'feed-gallery__hidden' : 'feed-gallery__tile'} key={`${src}-${index}`}><Image src={src} preview={{ mask: 'Xem ảnh' }} />{index === 8 && hidden > 0 ? <span className="feed-gallery__more">+{hidden}</span> : null}</div>)}</div></Image.PreviewGroup>
}
