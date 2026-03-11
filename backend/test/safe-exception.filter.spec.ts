import { HttpException, HttpStatus } from '@nestjs/common';
import { SecurityExceptionFilter } from '../src/common/http/safe-exception.filter';

describe('SecurityExceptionFilter', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  function createHost() {
    const request = { requestId: 'req-1', url: '/api/v1/example' };
    const response: Record<string, unknown> = {};
    const statusCode = undefined as number | undefined;
    const jsonPayload = undefined as Record<string, unknown> | undefined;

    response.statusCode = statusCode;
    response.jsonPayload = jsonPayload;
    response.status = jest.fn((code: number) => {
      response.statusCode = code;
      return response;
    });
    response.json = jest.fn((payload: Record<string, unknown>) => {
      response.jsonPayload = payload;
    });

    return {
      request,
      response,
      host: {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      },
    };
  }

  it('passes through validation errors with details', () => {
    process.env.NODE_ENV = 'development';
    const filter = new SecurityExceptionFilter();
    const { host, response } = createHost();

    filter.catch(
      new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: ['itemId is required', 'itemId must be a number'],
        },
        HttpStatus.BAD_REQUEST,
      ),
      host as any,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.jsonPayload).toEqual(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid request',
        details: ['itemId is required', 'itemId must be a number'],
        requestId: 'req-1',
      }),
    );
  });

  it('sanitizes unexpected server errors in production', () => {
    process.env.NODE_ENV = 'production';
    const filter = new SecurityExceptionFilter();
    const { host, response } = createHost();

    filter.catch(new Error('db connection timed out'), host as any);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.jsonPayload).toEqual(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An internal error occurred.',
        requestId: 'req-1',
      }),
    );
    expect(response.jsonPayload).not.toHaveProperty('details');
  });
});
