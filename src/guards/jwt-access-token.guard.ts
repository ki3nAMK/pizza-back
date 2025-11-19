import { Observable } from 'rxjs';

import { IS_PUBLIC_ROUTE_KEY } from '@/decorators';
import {
  ADMIN_VERIFICATION_KEY,
} from '@/decorators/admin-verification.decorator';
import {
  SHIPPER_VERIFICATION_KEY,
} from '@/decorators/shipper-verification.decorator';
import {
  SKIP_VERIFICATION_KEY,
} from '@/decorators/skip-verification.decorator';
import { AppRequest } from '@/interfaces/app-request.interface';
import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;

    const skipVerification =
      this.reflector.getAllAndOverride<boolean>(SKIP_VERIFICATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;

    const request = context.switchToHttp().getRequest<AppRequest>();
    request.skipVerification = skipVerification;

    const isShipper =
      this.reflector.getAllAndOverride<boolean>(SHIPPER_VERIFICATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;
    request.isShipper = isShipper;

    const isAdmin =
      this.reflector.getAllAndOverride<boolean>(ADMIN_VERIFICATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || false;
    request.isAdmin = isAdmin;

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
