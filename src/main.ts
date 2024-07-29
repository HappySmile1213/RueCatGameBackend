import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  // app.enableCors({
  //   origin: 'https://ruecat-game.vercel.app/', // Allow requests from this origin
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
  //   credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  // });

   app.enableCors();

  await app.listen(8100);
}
bootstrap();
