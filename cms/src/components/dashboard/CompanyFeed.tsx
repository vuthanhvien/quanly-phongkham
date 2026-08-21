import {
  BoldOutlined,
  CommentOutlined,
  CodeOutlined,
  EditOutlined,
  EyeOutlined,
  FontSizeOutlined,
  ItalicOutlined,
  LikeFilled,
  LikeOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  SendOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons"
import { Avatar, Button, Card, Image, Input, Popconfirm, Select, Space, Tabs, Tag, Tooltip, Typography, Upload, message } from "antd"
import type { UploadFile } from "antd"
import { useMemo, useState } from "react"
import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { api, resolveFileUrl } from "../../api"

type Audience = "company" | "department" | "branch"
type FeedFilter = "all" | Audience
type Comment = { id: string; authorId: string; authorName: string; authorAvatarUrl?: string; content: string; createdAt: string; replyToName?: string; likes?: number; liked?: boolean; replies?: Comment[] }
type FeedPost = { id: string; authorId: string; authorName: string; authorAvatarUrl?: string; audience: Audience; departmentIds?: string[]; branchIds?: string[]; createdAt: string; content?: string; imageUrls?: string[]; likes: number; liked?: boolean; comments: Comment[] }

const audienceLabels: Record<Audience, string> = { company: "Toàn công ty", department: "Phòng ban", branch: "Chi nhánh" }
const feedFilterItems: Array<{ key: FeedFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "company", label: "Công ty" },
  { key: "department", label: "Phòng ban" },
  { key: "branch", label: "Chi nhánh" },
]

export function CompanyFeed({ currentUser = "Bạn", currentUserId }: { currentUser?: string; currentUserId?: string }) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all")
  const [content, setContent] = useState("")
  const [previewingMarkdown, setPreviewingMarkdown] = useState(false)
  const [editorSelection, setEditorSelection] = useState({ start: 0, end: 0 })
  const [audience, setAudience] = useState<Audience>("company")
  const [files, setFiles] = useState<UploadFile[]>([])
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>([])
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])
  const [branchIds, setBranchIds] = useState<string[]>([])

  const imageUrls = useMemo(() => files.map((file) => file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "")).filter(Boolean), [files])

  function insertMarkdown(before: string, after = "", placeholder = "nội dung") {
    setPreviewingMarkdown(false)
    setContent((current) => {
      const start = Math.min(editorSelection.start, current.length)
      const end = Math.min(editorSelection.end, current.length)
      const selected = current.slice(start, end) || placeholder
      return `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`
    })
  }

  useEffect(() => { void loadFeed(); }, [feedFilter])
  useEffect(() => { void Promise.all([api.get('/records/departments', { params: { pageSize: 500 } }), api.get('/records/branches', { params: { pageSize: 500 } })]).then(([dept, branch]) => { setDepartments((dept.data.data || []).map((item: any) => ({ value: item.id, label: item.name || item.code }))); setBranches((branch.data.data || []).map((item: any) => ({ value: item.id, label: item.name || item.slug }))) }).catch(() => undefined) }, [])

  async function loadFeed() { try { const response = await api.get('/feed', { params: feedFilter === "all" ? undefined : { audience: feedFilter } }); setPosts(response.data.data || []) } catch { message.error('Không thể tải Feed') } }
  async function publish() {
    if (!content.trim() && imageUrls.length === 0) return
    if (audience === 'department' && !departmentIds.length) return message.warning('Chọn ít nhất một phòng ban')
    if (audience === 'branch' && !branchIds.length) return message.warning('Chọn ít nhất một chi nhánh')
    try { const formData = new FormData(); files.forEach((file) => file.originFileObj && formData.append('files', file.originFileObj)); const upload = files.length ? await api.post('/feed/images', formData) : null; await api.post('/feed', { content: content.trim(), audience, departmentIds, branchIds, imageUrls: upload?.data?.data || [] }); setContent(""); setPreviewingMarkdown(false); setFiles([]); setDepartmentIds([]); setBranchIds([]); await loadFeed(); message.success("Bài viết đã được đăng lên Feed") } catch { message.error('Không thể đăng bài') }
  }

  async function toggleLike(id: string) {
    try { await api.post(`/feed/${id}/like`); await loadFeed() } catch { message.error('Không thể cập nhật lượt thích') }
  }

  async function toggleCommentLike(id: string) {
    try { await api.post(`/feed/comments/${id}/like`); await loadFeed() } catch { message.error('Không thể cập nhật lượt thích bình luận') }
  }

  async function addComment(postId: string, parent?: Comment) {
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
      <div className="feed-composer__main"><Avatar className="feed-avatar feed-avatar--self">{currentUser.slice(0, 2).toUpperCase()}</Avatar>{previewingMarkdown ? <div className="feed-markdown feed-markdown-preview">{content.trim() ? <MarkdownContent content={content} /> : <Typography.Text type="secondary">Chưa có nội dung để xem trước.</Typography.Text>}</div> : <div className="feed-editor"><div className="feed-editor__toolbar" role="toolbar" aria-label="Định dạng bài viết"><EditorTool icon={<FontSizeOutlined />} label="Tiêu đề" onClick={() => insertMarkdown("## ", "", "Tiêu đề")} /><EditorTool icon={<BoldOutlined />} label="In đậm" onClick={() => insertMarkdown("**", "**", "chữ đậm")} /><EditorTool icon={<ItalicOutlined />} label="In nghiêng" onClick={() => insertMarkdown("_", "_", "chữ nghiêng")} /><EditorTool icon={<UnorderedListOutlined />} label="Danh sách" onClick={() => insertMarkdown("- ", "", "Nội dung")} /><EditorTool icon={<OrderedListOutlined />} label="Danh sách đánh số" onClick={() => insertMarkdown("1. ", "", "Nội dung")} /><EditorTool icon={<LinkOutlined />} label="Gắn liên kết" onClick={() => insertMarkdown("[", "](https://)", "Tên liên kết")} /><EditorTool icon={<CodeOutlined />} label="Đoạn mã" onClick={() => insertMarkdown("`", "`", "mã")} /><EditorTool icon={<TableOutlined />} label="Chèn bảng" onClick={() => insertMarkdown("\n| Cột 1 | Cột 2 |\n| --- | --- |\n| ", " | Nội dung |\n", "Nội dung")} /></div><div className="feed-editor__workspace"><div className="feed-editor__pane"><Typography.Text className="feed-editor__label" type="secondary">Đang soạn</Typography.Text><Input.TextArea autoSize={{ minRows: 8, maxRows: 14 }} placeholder="Bạn đang muốn chia sẻ điều gì với đồng đội? Dùng thanh công cụ phía trên để định dạng." value={content} onChange={(event) => setContent(event.target.value)} onSelect={(event) => setEditorSelection({ start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })} /></div><div className="feed-editor__pane feed-editor__pane--preview"><Typography.Text className="feed-editor__label" type="secondary">Xem trực tiếp</Typography.Text><div className="feed-markdown">{content.trim() ? <MarkdownContent content={content} /> : <Typography.Text type="secondary">Nội dung sau khi định dạng sẽ hiện ở đây.</Typography.Text>}</div></div></div></div>}</div>
      {files.length ? <FeedGallery className="feed-image-preview" images={imageUrls} /> : null}
      <div className="feed-composer__actions"><Space wrap><Button icon={previewingMarkdown ? <EditOutlined /> : <EyeOutlined />} type="text" onClick={() => setPreviewingMarkdown((current) => !current)}>{previewingMarkdown ? "Tiếp tục soạn" : "Xem trước Markdown"}</Button><Upload accept="image/*" beforeUpload={() => false} fileList={files} maxCount={30} multiple showUploadList={false} onChange={({ fileList }) => setFiles(fileList)}><Button icon={<PictureOutlined />} type="text">Ảnh / album</Button></Upload><Select className="feed-audience" value={audience} options={(Object.keys(audienceLabels) as Audience[]).map((value) => ({ value, label: audienceLabels[value] }))} onChange={(value) => { setAudience(value); setDepartmentIds([]); setBranchIds([]) }} />{audience === 'department' ? <Select className="feed-scope-select" mode="multiple" placeholder="Chọn phòng ban" options={departments} value={departmentIds} onChange={setDepartmentIds} /> : null}{audience === 'branch' ? <Select className="feed-scope-select" mode="multiple" placeholder="Chọn chi nhánh" options={branches} value={branchIds} onChange={setBranchIds} /> : null}</Space><Button disabled={!content.trim() && !files.length} icon={<SendOutlined />} type="primary" onClick={() => void publish()}>Đăng bài</Button></div>
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
        <div className="feed-post__head"><Avatar className="feed-avatar" src={post.authorAvatarUrl ? resolveFileUrl(post.authorAvatarUrl) : undefined}>{post.authorName.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Text strong>{post.authorName}</Typography.Text><Typography.Text className="feed-post__meta">{new Date(post.createdAt).toLocaleString('vi-VN')} · <Tag>{audienceLabels[post.audience]}</Tag></Typography.Text></div>{post.authorId === currentUserId ? <Popconfirm title="Xóa bài viết này?" okText="Xóa" cancelText="Hủy" onConfirm={() => void removePost(post.id)}><Button className="feed-delete" danger size="small" type="text">Xóa</Button></Popconfirm> : null}</div>
        {post.content ? <div className="feed-post__text feed-markdown"><MarkdownContent content={post.content} /></div> : null}
        {post.imageUrls?.length ? <FeedGallery className="feed-album" images={post.imageUrls.map((src) => src.startsWith('/') ? resolveFileUrl(src) : src)} /> : null}
        <div className="feed-post__counts"><span>{post.likes ? `${post.likes} lượt thích` : "Hãy là người đầu tiên thích"}</span><span>{post.comments.length ? `${post.comments.length} bình luận` : ""}</span></div>
        <div className="feed-post__actions"><Button icon={post.liked ? <LikeFilled /> : <LikeOutlined />} type="text" className={post.liked ? "is-liked" : ""} onClick={() => toggleLike(post.id)}>Thích</Button><Button icon={<CommentOutlined />} type="text" onClick={() => openComment(post.id)}>Bình luận</Button></div>
        <div className="feed-comments">{post.comments.map((comment) => <div className="feed-comment" key={comment.id}><Avatar size={30} className="feed-avatar" src={comment.authorAvatarUrl ? resolveFileUrl(comment.authorAvatarUrl) : undefined}>{comment.authorName.slice(0, 2).toUpperCase()}</Avatar><div className="feed-comment__body"><div className="feed-comment__bubble"><Typography.Text strong>{comment.authorName}</Typography.Text><div>{comment.content}</div></div><div className="feed-comment__actions"><span>{new Date(comment.createdAt).toLocaleString('vi-VN')}</span><button className={comment.liked ? 'is-liked' : ''} onClick={() => void toggleCommentLike(comment.id)}>{comment.likes ? `${comment.likes} Thích` : 'Thích'}</button><button onClick={() => openComment(post.id, comment.id)}>Phản hồi</button>{comment.authorId === currentUserId ? <button className="feed-delete-link" onClick={() => void removeComment(comment.id)}>Xóa</button> : null}</div>{comment.replies?.map((reply) => <div className="feed-comment feed-comment--reply" key={reply.id}><Avatar size={26} className="feed-avatar">{reply.authorName.slice(0, 2).toUpperCase()}</Avatar><div className="feed-comment__body"><div className="feed-comment__bubble"><Typography.Text strong>{reply.authorName}</Typography.Text><div>{reply.replyToName ? <span className="feed-reply-to">@{reply.replyToName} </span> : null}{reply.content}</div></div><div className="feed-comment__actions"><span>{new Date(reply.createdAt).toLocaleString('vi-VN')}</span><button className={reply.liked ? 'is-liked' : ''} onClick={() => void toggleCommentLike(reply.id)}>{reply.likes ? `${reply.likes} Thích` : 'Thích'}</button><button onClick={() => openComment(post.id, reply.id)}>Phản hồi</button>{reply.authorId === currentUserId ? <button className="feed-delete-link" onClick={() => void removeComment(reply.id)}>Xóa</button> : null}</div></div></div>)}</div></div>)}</div>
        {replyingTo === post.id || replyingTo?.startsWith(`${post.id}:`) ? <div className="feed-comment-box"><Avatar size={30} className="feed-avatar feed-avatar--self">{currentUser.slice(0, 2).toUpperCase()}</Avatar><Input id={`feed-comment-${post.id}`} placeholder={replyingTo === post.id ? "Viết bình luận..." : `Phản hồi ${findComment(post, replyingTo?.split(':')[1])?.authorName || ''}...`} value={commentText[post.id] || ""} onChange={(event) => setCommentText((items) => ({ ...items, [post.id]: event.target.value }))} onPressEnter={() => void addComment(post.id, replyingTo?.includes(":") ? findComment(post, replyingTo.split(':')[1]) : undefined)} suffix={<SendOutlined onClick={() => void addComment(post.id, replyingTo?.includes(":") ? findComment(post, replyingTo.split(':')[1]) : undefined)} />} /></div> : null}
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

function EditorTool({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <Tooltip title={label}><Button aria-label={label} icon={icon} size="small" type="text" onMouseDown={(event) => event.preventDefault()} onClick={onClick} /></Tooltip>
}

function FeedGallery({ images, className }: { images: string[]; className: string }) {
  const hidden = Math.max(0, images.length - 9)
  return <Image.PreviewGroup><div className={`${className} feed-gallery`}>{images.map((src, index) => <div className={index > 8 ? 'feed-gallery__hidden' : 'feed-gallery__tile'} key={`${src}-${index}`}><Image src={src} preview={{ mask: 'Xem ảnh' }} />{index === 8 && hidden > 0 ? <span className="feed-gallery__more">+{hidden}</span> : null}</div>)}</div></Image.PreviewGroup>
}
