import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ErrorLogExceptionFilter } from './common/error-log.exception-filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsRoot = join(process.cwd(), 'storage', 'uploads');
  mkdirSync(uploadsRoot, { recursive: true });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
  app.useGlobalFilters(new ErrorLogExceptionFilter());
  app.use('/uploads', express.static(uploadsRoot));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GIS Clinic API')
    .setDescription('API documentation for the GIS Clinic application.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, { useGlobalPrefix: true });

  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
