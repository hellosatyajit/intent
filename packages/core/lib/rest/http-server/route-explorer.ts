import { DiscoveryService, MetadataScanner, ModuleRef } from '@nestjs/core';
import {
  CONTROLLER_KEY,
  GUARD_KEY,
  METHOD_KEY,
  METHOD_PATH,
} from './decorators';
import { join } from 'path';
import { HttpRoute } from './interfaces';
import { Request, Response as HResponse } from 'hyper-express';
import { HttpExecutionContext } from './contexts/http-execution-context';
import { HttpRouteHandler } from './http-handler';
import { Response } from './response';
import { ExecutionContext } from './contexts/execution-context';
import { IntentExceptionFilter } from '../../exceptions';
import { IntentGuard } from '../foundation';
import { Type } from '../../interfaces';
import { ROUTE_ARGS } from './constants';
import { RouteArgType } from './param-decorators';

export class RouteExplorer {
  async exploreFullRoutes(
    discoveryService: DiscoveryService,
    metadataScanner: MetadataScanner,
    moduleRef: ModuleRef,
    errorHandler: IntentExceptionFilter,
  ): Promise<HttpRoute[]> {
    const routes = [];
    const providers = discoveryService.getProviders();
    for (const provider of providers) {
      const { instance } = provider;
      //   if (
      //     !instance ||
      //     typeof instance === 'string' ||
      //     !Object.getPrototypeOf(instance)
      //   ) {
      //     return;
      //   }

      const methodNames = metadataScanner.getAllMethodNames(instance);
      for (const methodName of methodNames) {
        const route = await this.scanFullRoute(
          instance,
          methodName,
          moduleRef,
          errorHandler,
        );
        route && routes.push(route);
      }
    }

    return routes;
  }

  explorePlainRoutes(
    discoveryService: DiscoveryService,
    metadataScanner: MetadataScanner,
  ): HttpRoute[] {
    const routes = [];
    const providers = discoveryService.getProviders();
    for (const provider of providers) {
      const { instance } = provider;
      //   if (
      //     !instance ||
      //     typeof instance === 'string' ||
      //     !Object.getPrototypeOf(instance)
      //   ) {
      //     return;
      //   }

      const methodNames = metadataScanner.getAllMethodNames(instance);
      for (const methodName of methodNames) {
        const route = this.scanPlainRoute(instance, methodName);
        route && routes.push(route);
      }
    }

    return routes;
  }

  scanPlainRoute(instance: any, key: string): Record<string, any> {
    const controllerKey = Reflect.getMetadata(
      CONTROLLER_KEY,
      instance.constructor,
    );

    if (!controllerKey) return;

    const pathMethod = Reflect.getMetadata(METHOD_KEY, instance, key);
    const methodPath = Reflect.getMetadata(METHOD_PATH, instance, key);

    const fullHttpPath = join(controllerKey, methodPath);
    return { method: pathMethod, path: fullHttpPath };
  }

  async scanFullRoute(
    instance: any,
    key: string,
    moduleRef: ModuleRef,
    errorHandler: IntentExceptionFilter,
  ): Promise<HttpRoute> {
    const controllerKey = Reflect.getMetadata(
      CONTROLLER_KEY,
      instance.constructor,
    );
    if (!controllerKey) return;
    const pathMethod = Reflect.getMetadata(METHOD_KEY, instance, key);
    const methodPath = Reflect.getMetadata(METHOD_PATH, instance, key);
    const methodRef = instance[key];
    const controllerGuards = Reflect.getMetadata(
      GUARD_KEY,
      instance.constructor,
    );

    const methodGuards = Reflect.getMetadata(GUARD_KEY, instance, key);

    const composedGuardTypes = [
      ...(controllerGuards || []),
      ...(methodGuards || []),
    ] as Type<IntentGuard>[];

    const composedGuards = [];
    for (const guardType of composedGuardTypes) {
      composedGuards.push(await moduleRef.create(guardType));
    }

    const middlewares = [];

    const routeArgs = Reflect.getMetadata(
      ROUTE_ARGS,
      instance.constructor,
      key,
    ) as RouteArgType[];

    const cb = async (hReq: Request, hRes: HResponse) => {
      const httpContext = new HttpExecutionContext(hReq, new Response());
      const context = new ExecutionContext(httpContext, instance, methodRef);

      const args = [];
      for (const routeArg of routeArgs) {
        if (routeArg.handler) {
          args.push(routeArg.handler(routeArg.data, context));
        } else {
          args.push(httpContext.getInjectableValueFromArgType(routeArg));
        }
      }

      const handler = new HttpRouteHandler(
        middlewares,
        composedGuards,
        instance[key].apply(instance, args),
        errorHandler,
      );

      const [error, res] = await handler.handle(context);
      return res.reply(hRes);
    };

    return {
      method: pathMethod,
      path: join(controllerKey, methodPath),
      httpHandler: cb,
    };
  }
}
