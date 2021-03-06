import { NestFactory } from '@nestjs/core';

import { ValidationPipe } from './common/pipes/validation.pipe';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors();

  await app.listen(9532);
}
bootstrap();
