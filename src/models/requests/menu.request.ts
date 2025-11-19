import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMenuDto {
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    query?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}
