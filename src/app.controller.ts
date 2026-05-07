import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Returns a basic service health message.
   * @returns Greeting text from the application service.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
