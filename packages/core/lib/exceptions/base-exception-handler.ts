import { ConfigService } from '../config/service';
import { Log } from '../logger';
import { Package } from '../utils';
import { Type } from '../interfaces';
import { HttpException } from './http-exception';
import { ValidationFailed } from './validation-failed';
import { ExecutionContext } from '../rest/http-server';
import { HttpStatus } from '../rest/http-server/status-codes';

export abstract class IntentExceptionFilter {
  doNotReport(): Array<Type<HttpException>> {
    return [];
  }

  report(): Array<Type<HttpException>> | string {
    return '*';
  }

  catch(context: ExecutionContext, exception: any) {
    const ctx = context.switchToHttp();

    this.reportToSentry(exception);

    Log().error('', exception);

    return this.handleHttp(context, exception);
  }

  handleHttp(context: ExecutionContext, exception: any) {
    const res = context.switchToHttp().getResponse();

    const debugMode = ConfigService.get('app.debug');

    if (exception instanceof ValidationFailed) {
      return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        message: 'validation failed',
        errors: exception.getErrors(),
      });
    }

    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json({
        message: exception.message,
        status: exception.getStatus(),
        stack: debugMode && exception.stack,
      });
    }

    return res.status(this.getStatus(exception)).json(exception);
  }

  reportToSentry(exception: any): void {
    const sentryConfig = ConfigService.get('app.sentry');
    if (!sentryConfig?.dsn) return;

    const exceptionConstructor = exception?.constructor;
    const sentry = Package.load('@sentry/node');
    if (
      exceptionConstructor &&
      !this.doNotReport().includes(exceptionConstructor)
    ) {
      sentry.captureException(exception);
    }
  }

  getStatus(exception: any): HttpStatus {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
