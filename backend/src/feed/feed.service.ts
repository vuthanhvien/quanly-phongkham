import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { AuthUser } from '../common/auth';
import { CompanyFeedComment, CompanyFeedCommentLike, CompanyFeedLike, CompanyFeedPost, Staff, User } from '../entities/entities';

type Audience = 'company' | 'department' | 'branch';
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
    return { data: await this.posts.save(this.posts.create({ content, audience, departmentIds: audience === 'department' ? departmentIds : [], branchIds: audience === 'branch' ? branchIds : [], imageUrls, authorId: user.id, authorName: user.fullName, authorAvatarUrl: account?.avatarUrl })) };
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
  private async requireVisible(postId: string, user: AuthUser) { const post = await this.posts.findOneBy({ id: postId, isArchived: false }); if (!post) throw new NotFoundException('Không tìm thấy bài viết'); if (!this.canView(post, await this.viewerProfile(user))) throw new ForbiddenException('Bạn không có quyền xem bài viết này'); return post; }
  private commentTree(rows: CompanyFeedComment[], likes: Map<string, CompanyFeedCommentLike[]>, userId: string) { const decorate = (row: CompanyFeedComment) => ({ ...row, likes: (likes.get(row.id) || []).length, liked: (likes.get(row.id) || []).some((like) => like.userId === userId) }); const replies = new Map<string, CompanyFeedComment[]>(); rows.filter((row) => row.parentId).forEach((row) => replies.set(row.parentId!, [...(replies.get(row.parentId!) || []), row])); return rows.filter((row) => !row.parentId).map((row) => ({ ...decorate(row), replies: (replies.get(row.id) || []).map(decorate) })); }
}
