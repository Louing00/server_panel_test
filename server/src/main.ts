import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3200;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
