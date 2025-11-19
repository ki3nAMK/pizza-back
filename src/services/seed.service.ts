// seed.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CustomizationType } from '@/enums/customization.enum';
import { CategoriesRepository } from '@/models/repos/category.repo';
import { CustomizationRepository } from '@/models/repos/customization.repo';
import { MenuRepository } from '@/models/repos/menu.repo';
import dummyData from '@/seed/data.seed';

@Injectable()
export class SeedService implements OnModuleInit {
    constructor(
        private readonly categoryRepo: CategoriesRepository,
        private readonly customizationRepo: CustomizationRepository,
        private readonly menuRepo: MenuRepository,
    ) { }

    async onModuleInit() {
        await this.seedCategories();
        await this.seedCustomizations();
        await this.seedMenus();
        console.log('Database seeding finished!');
    }

    private async seedCategories() {
        for (const cat of dummyData.categories) {
            const exists = await this.categoryRepo.findOneByCondition({ name: cat.name });
            if (!exists) {
                await this.categoryRepo.create(cat);
            }
        }
    }

    private async seedCustomizations() {
        for (const cust of dummyData.customizations) {
            const exists = await this.customizationRepo.findOneByCondition({ name: cust.name });
            if (!exists) {
                await this.customizationRepo.create({
                    ...cust,
                    type: cust.type.toUpperCase() as CustomizationType,
                    menus: [],
                });
            }
        }
    }

    private async seedMenus() {
        for (const menu of dummyData.menu) {
            const exists = await this.menuRepo.findOneByCondition({ name: menu.name });
            if (exists) continue;

            // Tìm category
            const category = await this.categoryRepo.findOneByCondition({ name: menu.category_name });
            if (!category) continue;

            // Tìm các customization
            const customizations = [];
            for (const custName of menu.customizations) {
                const cust = await this.customizationRepo.findOneByCondition({ name: custName });
                if (cust) customizations.push(cust);
            }

            // Tạo menu mới
            const createdMenu = await this.menuRepo.create({
                name: menu.name,
                description: menu.description,
                image_url: menu.image_url,
                price: menu.price,
                rating: menu.rating,
                calories: menu.calories,
                protein: menu.protein,
                category: category._id as any,
                customizations: customizations.map(c => c._id),
            });

            for (const cust of customizations) {
                cust.menus = cust.menus || [];
                cust.menus.push(createdMenu._id);
                await this.customizationRepo.update(cust._id, { menus: cust.menus });
            }
        }
    }
}
