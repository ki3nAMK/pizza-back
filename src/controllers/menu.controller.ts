import { GetMenuDto } from '@/models/requests/menu.request';
import { DeliveryService } from '@/services/delivery.service';
import { MenuService } from '@/services/menu.service';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('foods')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly deliveryService: DeliveryService,
  ) {}

  @Get('categories')
  async getCategories() {
    return this.menuService.getCategories();
  }

  @Get('menu')
  async getMenu(@Query() query: GetMenuDto) {
    return this.menuService.getMenu(query);
  }
}
