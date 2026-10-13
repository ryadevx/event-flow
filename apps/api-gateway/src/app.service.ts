import {
  BadGatewayException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  async forward(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    query?: Record<string, unknown>,
  ) {
    try {
      const forwardedHeaders = { ...(headers ?? {}) };

      delete forwardedHeaders['content-length'];
      delete forwardedHeaders['host'];
      delete forwardedHeaders['connection'];

      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: body,
          headers: forwardedHeaders,
          params: query,
        }),
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          error.response.data,
          error.response.status,
        );
      }

      throw new BadGatewayException(
        'Service unavailable',
      );
    }
  }
}
