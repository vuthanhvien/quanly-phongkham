import { Body, Controller, Delete, Get, Param, Post, Query, Request, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../common/auth';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get() list(@Query('audience') audience: string | undefined, @Request() request: { user: AuthUser }) { return this.feed.list(request.user, audience); }
  @Post('images') @UseInterceptors(FilesInterceptor('files', 30))
  uploadImages(@UploadedFiles() files: any[], @Request() request: { user: AuthUser }) { return this.feed.uploadImages(files, request.user); }
  @Post() create(@Body() payload: Record<string, unknown>, @Request() request: { user: AuthUser }) { return this.feed.create(payload, request.user); }
  @Post(':postId/like') toggleLike(@Param('postId') postId: string, @Request() request: { user: AuthUser }) { return this.feed.toggleLike(postId, request.user); }
  @Post('comments/:commentId/like') toggleCommentLike(@Param('commentId') commentId: string, @Request() request: { user: AuthUser }) { return this.feed.toggleCommentLike(commentId, request.user); }
  @Post(':postId/comments') comment(@Param('postId') postId: string, @Body() payload: { content?: string; parentId?: string }, @Request() request: { user: AuthUser }) { return this.feed.comment(postId, payload, request.user); }
  @Delete(':postId') removePost(@Param('postId') postId: string, @Request() request: { user: AuthUser }) { return this.feed.removePost(postId, request.user); }
  @Delete('comments/:commentId') removeComment(@Param('commentId') commentId: string, @Request() request: { user: AuthUser }) { return this.feed.removeComment(commentId, request.user); }
}
