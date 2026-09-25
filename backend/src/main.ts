import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const origenesFrontend = (
    configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000"
  )
    .split(",")
    .map((origen) => origen.trim())
    .filter(Boolean);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errores) => {
        const mensajes = errores.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        );
        return {
          statusCode: 400,
          message: mensajes.length > 0 ? mensajes : "Datos inválidos.",
          error: "Bad Request",
        };
      },
    }),
  );
  app.enableCors({
    origin: (origen, callback) => {
      const esOrigenDesarrollo =
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen ?? "");
      callback(
        null,
        !origen || origenesFrontend.includes(origen) || esOrigenDesarrollo,
      );
    },
    credentials: true,
  });

  // PORT lo asignan plataformas como Render; PUERTO es la variable local del proyecto.
  const puerto = configService.get<number>("PORT") ?? configService.get<number>("PUERTO") ?? 3001;
  await app.listen(puerto);
  console.log(`ServiClean API ejecutándose en el puerto ${puerto}`);
}

bootstrap();
