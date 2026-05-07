import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Provides the default root endpoint response.
   * @returns A static greeting string.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
