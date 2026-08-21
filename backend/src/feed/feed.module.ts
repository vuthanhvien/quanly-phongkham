import { Module } from '@nestjs/common';
import { TenantOrmModule } from '../tenant/tenant-orm.module';
import { CompanyFeedComment, CompanyFeedCommentLike, CompanyFeedLike, CompanyFeedPost, Staff, User } from '../entities/entities';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [TenantOrmModule.forFeature([CompanyFeedPost, CompanyFeedComment, CompanyFeedLike, CompanyFeedCommentLike, Staff, User])],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
