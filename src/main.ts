import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';
import { ResponseInterceptor } from './interceptor/response.interceptor';
import { GlobalExceptionFilter } from './errors/exception.filter';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = process.env.PORT || 3000;

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  app.setBaseViewsDir(join(process.cwd(), 'views'));
  app.setViewEngine('hbs');

  await app.listen(port);

  logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
