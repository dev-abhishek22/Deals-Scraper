import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : process.env.NODE_ENV !== 'production'
          ? exception instanceof Error
            ? { message: exception.message, stack: exception.stack }
            : String(exception)
          : 'Internal server error';

    this.logger.error(
      'Unhandled Exception',
      JSON.stringify(errorResponse),
      'GlobalFilter',
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message:
        typeof errorResponse === 'string'
          ? errorResponse
          : (errorResponse as any).message || errorResponse,
      timestamp: new Date().toISOString(),
    });
  }
}
