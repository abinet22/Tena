import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
  userPermissions?: string[];
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // 1. Try extracting Bearer token
    const authHeader = req.headers['authorization'];
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key') as any;
        req.tenantId = decoded.tenantId;
        req.userId = decoded.sub;
        req.userRole = decoded.role;
        req.userPermissions = decoded.permissions || [];
      } catch (err) {
        // If expired or invalid token on protected route, will fail in AuthGuard
      }
    }

    // 2. Allow Super Admin or header override in development/super-admin proxy
    if (!req.tenantId && req.headers['x-tenant-id']) {
      req.tenantId = req.headers['x-tenant-id'] as string;
    }

    next();
  }
}
