import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { lookup } from 'dns/promises';
import { AuthUser } from '../common/auth';
import { CompanyFeedComment, CompanyFeedCommentLike, CompanyFeedLike, CompanyFeedPost, Staff, User } from '../entities/entities';

type Audience = 'company' | 'department' | 'branch';
type LinkPreview = { url: string; title: string; description?: string; imageUrl?: string; hostname?: string };
const validAudience = new Set<Audience>(['company', 'department', 'branch']);
const textIds = (value: unknown) => Array.isArray(value) ? Array.from(new Set(value.map(String).filter(Boolean))) : [];
const FEED_RESOURCE = 'company-feed';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(CompanyFeedPost) private readonly posts: Repository<CompanyFeedPost>,
    @InjectRepository(CompanyFeedComment) private readonly comments: Repository<CompanyFeedComment>,
    @InjectRepository(CompanyFeedLike) private readonly likes: Repository<CompanyFeedLike>,
    @InjectRepository(CompanyFeedCommentLike) private readonly commentLikes: Repository<CompanyFeedCommentLike>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(user: AuthUser, audience?: string) {
    this.assertPermission(user, 'view');
    if (audience && !validAudience.has(audience as Audience)) throw new BadRequestException('Bộ lọc Feed không hợp lệ');
    const profile = await this.viewerProfile(user);
    const posts = (await this.posts.find({ where: { isArchived: false }, order: { createdAt: 'DESC' }, take: 100 }))
      .filter((post) => this.canView(post, profile))
      .filter((post) => !audience || post.audience === audience);
    const ids = posts.map((post) => post.id);
    const [likes, comments] = ids.length ? await Promise.all([this.likes.find({ where: { postId: In(ids) } }), this.comments.find({ where: { postId: In(ids), isArchived: false }, order: { createdAt: 'ASC' } })]) : [[], []];
    const commentLikes = comments.length ? await this.commentLikes.find({ where: { commentId: In(comments.map((comment) => comment.id)) } }) : [];
    const likesByPost = new Map<string, CompanyFeedLike[]>(); likes.forEach((like) => likesByPost.set(like.postId, [...(likesByPost.get(like.postId) || []), like]));
    const commentLikeMap = new Map<string, CompanyFeedCommentLike[]>(); commentLikes.forEach((like) => commentLikeMap.set(like.commentId, [...(commentLikeMap.get(like.commentId) || []), like]));
    return { data: posts.map((post) => ({ ...post, likes: (likesByPost.get(post.id) || []).length, liked: (likesByPost.get(post.id) || []).some((like) => like.userId === user.id), comments: this.commentTree(comments.filter((comment) => comment.postId === post.id), commentLikeMap, user.id) })) };
  }

  async create(input: Record<string, unknown>, user: AuthUser) {
    this.assertPermission(user, 'create');
    const audience = String(input.audience || 'company') as Audience;
    const content = String(input.content || '').trim();
    const imageUrls = textIds(input.imageUrls).filter((url) => url.startsWith('/uploads/feed/') || url.startsWith('http')).slice(0, 30);
    if (!validAudience.has(audience)) throw new BadRequestException('Phạm vi xem không hợp lệ');
    if (!content && !imageUrls.length) throw new BadRequestException('Bài viết cần có nội dung hoặc hình ảnh');
    if (content.length > 5000) throw new BadRequestException('Nội dung bài viết tối đa 5.000 ký tự');
    const departmentIds = textIds(input.departmentIds); const branchIds = textIds(input.branchIds);
    if (audience === 'department' && !departmentIds.length) throw new BadRequestException('Chọn ít nhất một phòng ban');
    if (audience === 'branch' && !branchIds.length) throw new BadRequestException('Chọn ít nhất một chi nhánh');
    const account = await this.users.findOneBy({ id: user.id });
    return { data: await this.posts.save(this.posts.create({ content, audience, departmentIds: audience === 'department' ? departmentIds : [], branchIds: audience === 'branch' ? branchIds : [], imageUrls, linkPreview: this.normalizeLinkPreview(input.linkPreview), authorId: user.id, authorName: user.fullName, authorAvatarUrl: account?.avatarUrl })) };
  }

  async previewLink(value: string, user: AuthUser) {
    this.assertPermission(user, 'view');
    const url = await this.safePreviewUrl(value);
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClinicFeedPreview/1.0)' } });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new BadRequestException('Không thể lấy thông tin liên kết');
    const html = (await response.text()).slice(0, 750_000);
    const title = this.htmlMeta(html, ['og:title', 'twitter:title']) || this.htmlTitle(html) || new URL(url).hostname;
    const description = this.htmlMeta(html, ['og:description', 'twitter:description', 'description']);
    const imageUrl = this.absoluteUrl(this.htmlMeta(html, ['og:image', 'twitter:image']), url);
    return { data: { url, title: title.slice(0, 240), description: description?.slice(0, 360), imageUrl, hostname: new URL(url).hostname } satisfies LinkPreview };
  }

  async uploadImages(files: any[], user: AuthUser) {
    this.assertPermission(user, 'create');
    if (!Array.isArray(files) || !files.length) throw new BadRequestException('Chưa chọn hình ảnh');
    const directory = join(process.cwd(), 'storage', 'uploads', 'feed');
    await fs.mkdir(directory, { recursive: true });
    const urls = await Promise.all(files.map(async (file) => {
      if (!file.mimetype?.startsWith('image/') || !file.buffer) throw new BadRequestException('Chỉ hỗ trợ tệp hình ảnh');
      if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Mỗi ảnh tối đa 10MB');
      const extension = extname(file.originalname || '') || '.jpg'; const name = `${randomUUID()}${extension.toLowerCase()}`;
      await fs.writeFile(join(directory, name), file.buffer); return `/uploads/feed/${name}`;
    }));
    return { data: urls };
  }

  async toggleLike(postId: string, user: AuthUser) {
    this.assertPermission(user, 'create');
    await this.requireVisible(postId, user);
    const existing = await this.likes.findOneBy({ postId, userId: user.id });
    if (existing) { await this.likes.remove(existing); return { data: { liked: false } }; }
    await this.likes.save(this.likes.create({ postId, userId: user.id })); return { data: { liked: true } };
  }

  async listPostLikes(postId: string, user: AuthUser) {
    this.assertPermission(user, 'view');
    await this.requireVisible(postId, user);
    const likes = await this.likes.find({ where: { postId }, order: { createdAt: 'DESC' } });
    if (!likes.length) return { data: [] };
    const users = await this.users.find({ where: { id: In(likes.map((like) => like.userId)) } });
    const usersById = new Map(users.map((account) => [account.id, account]));
    return {
      data: likes.map((like) => {
        const account = usersById.get(like.userId);
        return {
          userId: like.userId,
          fullName: account?.fullName || 'Tài khoản không xác định',
          avatarUrl: account?.avatarUrl,
          createdAt: like.createdAt,
        };
      }),
    };
  }

  async toggleCommentLike(commentId: string, user: AuthUser) {
    this.assertPermission(user, 'create');
    const comment = await this.comments.findOneBy({ id: commentId, isArchived: false }); if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
    await this.requireVisible(comment.postId, user);
    const existing = await this.commentLikes.findOneBy({ commentId, userId: user.id });
    if (existing) { await this.commentLikes.remove(existing); return { data: { liked: false } }; }
    await this.commentLikes.save(this.commentLikes.create({ commentId, userId: user.id })); return { data: { liked: true } };
  }

  async comment(postId: string, input: { content?: string; parentId?: string }, user: AuthUser) {
    this.assertPermission(user, 'create');
    await this.requireVisible(postId, user);
    const content = String(input.content || '').trim(); if (!content) throw new BadRequestException('Nội dung bình luận không được để trống');
    if (content.length > 2000) throw new BadRequestException('Bình luận tối đa 2.000 ký tự');
    let parentId: string | undefined; let replyToName: string | undefined;
    if (input.parentId) { const parent = await this.comments.findOneBy({ id: input.parentId, postId, isArchived: false }); if (!parent) throw new NotFoundException('Không tìm thấy bình luận để phản hồi'); parentId = parent.parentId || parent.id; replyToName = parent.authorName; }
    const account = await this.users.findOneBy({ id: user.id });
    return { data: await this.comments.save(this.comments.create({ postId, parentId, replyToName, content, authorId: user.id, authorName: user.fullName, authorAvatarUrl: account?.avatarUrl })) };
  }

  async removePost(postId: string, user: AuthUser) {
    this.assertPermission(user, 'delete');
    const post = await this.posts.findOneBy({ id: postId, isArchived: false }); if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    if (post.authorId !== user.id) throw new ForbiddenException('Bạn chỉ có thể xóa bài viết của mình');
    post.isArchived = true; await this.posts.save(post); return { data: { id: postId } };
  }

  async removeComment(commentId: string, user: AuthUser) {
    this.assertPermission(user, 'delete');
    const comment = await this.comments.findOneBy({ id: commentId, isArchived: false }); if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
    if (comment.authorId !== user.id) throw new ForbiddenException('Bạn chỉ có thể xóa bình luận của mình');
    comment.isArchived = true; await this.comments.save(comment); return { data: { id: commentId } };
  }

  private async viewerProfile(user: AuthUser) { const staff = user.staffId ? await this.staff.findOneBy({ id: user.staffId }) : await this.staff.findOneBy({ userId: user.id }); return { departmentId: staff?.departmentId, branchId: user.branchId }; }
  private assertPermission(user: AuthUser, action: string) {
    if ((user.disabledModules || []).includes(FEED_RESOURCE)) throw new ForbiddenException('Role hiện tại không được sử dụng Feed nội bộ');
    const allowedActions = user.actionPermissions?.[FEED_RESOURCE];
    if (Array.isArray(allowedActions) && !allowedActions.includes(action)) throw new ForbiddenException('Role hiện tại không được thực hiện thao tác này trên Feed');
  }
  private canView(post: CompanyFeedPost, viewer: { departmentId?: string; branchId?: string }) { return post.audience === 'company' || (post.audience === 'department' && !!viewer.departmentId && (post.departmentIds || []).includes(viewer.departmentId)) || (post.audience === 'branch' && !!viewer.branchId && (post.branchIds || []).includes(viewer.branchId)); }
  private normalizeLinkPreview(value: unknown): LinkPreview | undefined { if (!value || typeof value !== 'object') return undefined; const input = value as Record<string, unknown>; const url = String(input.url || '').trim(); const title = String(input.title || '').trim(); if (!/^https?:\/\//i.test(url) || !title) return undefined; return { url: url.slice(0, 2048), title: title.slice(0, 240), description: String(input.description || '').trim().slice(0, 360) || undefined, imageUrl: /^https?:\/\//i.test(String(input.imageUrl || '')) ? String(input.imageUrl).slice(0, 2048) : undefined, hostname: String(input.hostname || '').trim().slice(0, 255) || undefined }; }
  private async safePreviewUrl(value: string) { let url: URL; try { url = new URL(value); } catch { throw new BadRequestException('Liên kết không hợp lệ'); } if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || this.isPrivateHost(url.hostname)) throw new BadRequestException('Liên kết không được hỗ trợ'); try { const addresses = await lookup(url.hostname, { all: true }); if (!addresses.length || addresses.some((entry) => this.isPrivateHost(entry.address))) throw new Error('private address'); } catch { throw new BadRequestException('Liên kết không được hỗ trợ'); } return url.toString(); }
  private isPrivateHost(hostname: string) { const host = hostname.toLowerCase(); return host === 'localhost' || host.endsWith('.local') || host === '::1' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host); }
  private htmlMeta(html: string, names: string[]) { for (const tag of html.match(/<meta\b[^>]*>/gi) || []) { const key = /(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase(); const content = /content=["']([^"']+)["']/i.exec(tag)?.[1]; if (key && content && names.includes(key)) return this.decodeHtml(content); } return undefined; }
  private htmlTitle(html: string) { const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]; return match ? this.decodeHtml(match.replace(/<[^>]+>/g, '').trim()) : undefined; }
  private decodeHtml(value: string) { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
  private absoluteUrl(value: string | undefined, base: string) { if (!value) return undefined; try { const url = new URL(value, base); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; } }
  private async requireVisible(postId: string, user: AuthUser) { const post = await this.posts.findOneBy({ id: postId, isArchived: false }); if (!post) throw new NotFoundException('Không tìm thấy bài viết'); if (!this.canView(post, await this.viewerProfile(user))) throw new ForbiddenException('Bạn không có quyền xem bài viết này'); return post; }
  private commentTree(rows: CompanyFeedComment[], likes: Map<string, CompanyFeedCommentLike[]>, userId: string) { const decorate = (row: CompanyFeedComment) => ({ ...row, likes: (likes.get(row.id) || []).length, liked: (likes.get(row.id) || []).some((like) => like.userId === userId) }); const replies = new Map<string, CompanyFeedComment[]>(); rows.filter((row) => row.parentId).forEach((row) => replies.set(row.parentId!, [...(replies.get(row.parentId!) || []), row])); return rows.filter((row) => !row.parentId).map((row) => ({ ...decorate(row), replies: (replies.get(row.id) || []).map(decorate) })); }
}
