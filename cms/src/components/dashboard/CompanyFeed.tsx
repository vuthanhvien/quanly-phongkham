import {
  CommentOutlined,
  LikeFilled,
  LikeOutlined,
  PictureOutlined,
  SendOutlined,
} from "@ant-design/icons"
import { Avatar, Button, Card, Image, Input, Select, Space, Tag, Typography, Upload, message } from "antd"
import type { UploadFile } from "antd"
import { useMemo, useState } from "react"

type Audience = "company" | "department" | "branch"
type Comment = { id: string; author: string; initials: string; text: string; time: string; reply?: Comment }
type FeedPost = { id: string; author: string; initials: string; role: string; audience: Audience; time: string; text: string; images: string[]; likes: number; liked?: boolean; comments: Comment[] }

const audienceLabels: Record<Audience, string> = { company: "Toàn công ty", department: "Phòng ban", branch: "Chi nhánh" }

const initialPosts: FeedPost[] = [
  { id: "welcome", author: "Minh Anh", initials: "MA", role: "Điều phối vận hành", audience: "company", time: "18 phút", text: "Chào cả nhà! Lịch họp giao ban tuần này đã được cập nhật. Mọi người kiểm tra lịch và để lại câu hỏi ngay dưới bài viết nhé.", images: [], likes: 24, liked: true, comments: [{ id: "c1", author: "Tuấn Phạm", initials: "TP", text: "Đã nhận thông tin, cảm ơn Minh Anh.", time: "12 phút", reply: { id: "r1", author: "Minh Anh", initials: "MA", text: "Cảm ơn Tuấn nhé!", time: "10 phút" } }] },
  { id: "team", author: "Ngọc Hà", initials: "NH", role: "Trưởng phòng CSKH", audience: "department", time: "2 giờ", text: "Cảm ơn đội CSKH vì một buổi sáng đầy năng lượng. Cùng giữ nhịp phục vụ thật chỉn chu cho các khách hàng hôm nay nhé!", images: [], likes: 16, comments: [] },
]

export function CompanyFeed({ currentUser = "Bạn" }: { currentUser?: string }) {
  const [posts, setPosts] = useState(initialPosts)
  const [content, setContent] = useState("")
  const [audience, setAudience] = useState<Audience>("company")
  const [files, setFiles] = useState<UploadFile[]>([])
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const imageUrls = useMemo(() => files.map((file) => file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : "")).filter(Boolean), [files])

  function publish() {
    if (!content.trim() && imageUrls.length === 0) return
    setPosts((items) => [{ id: String(Date.now()), author: currentUser, initials: currentUser.slice(0, 2).toUpperCase(), role: "Thành viên", audience, time: "Vừa xong", text: content.trim(), images: imageUrls, likes: 0, comments: [] }, ...items])
    setContent("")
    setFiles([])
    message.success("Bài viết đã được đăng lên Feed")
  }

  function toggleLike(id: string) {
    setPosts((items) => items.map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post))
  }

  function addComment(postId: string, parent?: Comment) {
    const text = commentText[postId]?.trim()
    if (!text) return
    const item: Comment = { id: String(Date.now()), author: currentUser, initials: currentUser.slice(0, 2).toUpperCase(), text, time: "Vừa xong" }
    setPosts((items) => items.map((post) => {
      if (post.id !== postId) return post
      return { ...post, comments: parent ? post.comments.map((comment) => comment.id === parent.id ? { ...comment, reply: item } : comment) : [...post.comments, item] }
    }))
    setCommentText((items) => ({ ...items, [postId]: "" }))
    setReplyingTo(null)
  }

  return <section className="company-feed">
    <div className="feed-titlebar">
      <div><Typography.Text className="eyebrow">KẾT NỐI NỘI BỘ</Typography.Text><Typography.Title level={3}>Feed</Typography.Title></div>
      <Typography.Text type="secondary">Cập nhật từ mọi người trong công ty</Typography.Text>
    </div>
    <Card className="feed-composer" bordered={false}>
      <div className="feed-composer__main"><Avatar className="feed-avatar feed-avatar--self">{currentUser.slice(0, 2).toUpperCase()}</Avatar><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Bạn đang muốn chia sẻ điều gì với đồng đội?" value={content} onChange={(event) => setContent(event.target.value)} /></div>
      {files.length ? <div className={`feed-image-preview feed-image-preview--${Math.min(files.length, 4)}`}>{imageUrls.map((url, index) => <Image key={url + index} src={url} preview={{ mask: "Xem ảnh" }} />)}</div> : null}
      <div className="feed-composer__actions"><Space wrap><Upload accept="image/*" beforeUpload={() => false} fileList={files} maxCount={8} multiple showUploadList={false} onChange={({ fileList }) => setFiles(fileList)}><Button icon={<PictureOutlined />} type="text">Ảnh / album</Button></Upload><Select className="feed-audience" value={audience} options={(Object.keys(audienceLabels) as Audience[]).map((value) => ({ value, label: audienceLabels[value] }))} onChange={setAudience} /></Space><Button disabled={!content.trim() && !files.length} icon={<SendOutlined />} type="primary" onClick={publish}>Đăng bài</Button></div>
    </Card>
    <div className="feed-stream">
      {posts.map((post) => <Card className="feed-post" key={post.id} bordered={false}>
        <div className="feed-post__head"><Avatar className="feed-avatar">{post.initials}</Avatar><div><Typography.Text strong>{post.author}</Typography.Text><Typography.Text className="feed-post__meta">{post.role} · {post.time} · <Tag>{audienceLabels[post.audience]}</Tag></Typography.Text></div></div>
        {post.text ? <Typography.Paragraph className="feed-post__text">{post.text}</Typography.Paragraph> : null}
        {post.images.length ? <div className={`feed-album feed-album--${Math.min(post.images.length, 4)}`}>{post.images.map((src, index) => <Image key={src + index} src={src} preview={{ mask: "Xem ảnh" }} />)}</div> : null}
        <div className="feed-post__counts"><span>{post.likes ? `${post.likes} lượt thích` : "Hãy là người đầu tiên thích"}</span><span>{post.comments.length ? `${post.comments.length} bình luận` : ""}</span></div>
        <div className="feed-post__actions"><Button icon={post.liked ? <LikeFilled /> : <LikeOutlined />} type="text" className={post.liked ? "is-liked" : ""} onClick={() => toggleLike(post.id)}>Thích</Button><Button icon={<CommentOutlined />} type="text" onClick={() => setReplyingTo(post.id)}>Bình luận</Button></div>
        <div className="feed-comments">{post.comments.map((comment) => <div className="feed-comment" key={comment.id}><Avatar size={30} className="feed-avatar">{comment.initials}</Avatar><div className="feed-comment__body"><div className="feed-comment__bubble"><Typography.Text strong>{comment.author}</Typography.Text><div>{comment.text}</div></div><div className="feed-comment__actions"><span>{comment.time}</span><button onClick={() => setReplyingTo(`${post.id}:${comment.id}`)}>Phản hồi</button></div>{comment.reply ? <div className="feed-comment feed-comment--reply"><Avatar size={26} className="feed-avatar">{comment.reply.initials}</Avatar><div className="feed-comment__body"><div className="feed-comment__bubble"><Typography.Text strong>{comment.reply.author}</Typography.Text><div>{comment.reply.text}</div></div><div className="feed-comment__actions"><span>{comment.reply.time}</span></div></div></div> : null}</div></div>)}</div>
        {replyingTo === post.id || replyingTo?.startsWith(`${post.id}:`) ? <div className="feed-comment-box"><Avatar size={30} className="feed-avatar feed-avatar--self">{currentUser.slice(0, 2).toUpperCase()}</Avatar><Input placeholder={replyingTo === post.id ? "Viết bình luận..." : "Viết phản hồi..."} value={commentText[post.id] || ""} onChange={(event) => setCommentText((items) => ({ ...items, [post.id]: event.target.value }))} onPressEnter={() => addComment(post.id, replyingTo?.includes(":") ? post.comments.find((comment) => replyingTo.endsWith(comment.id)) : undefined)} suffix={<SendOutlined onClick={() => addComment(post.id, replyingTo?.includes(":") ? post.comments.find((comment) => replyingTo.endsWith(comment.id)) : undefined)} />} /></div> : null}
      </Card>)}
    </div>
  </section>
}
