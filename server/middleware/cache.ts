import { Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";

// Cache instances for different types of data
const shortCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
const mediumCache = new NodeCache({ stdTTL: 900 }); // 15 minutes
const longCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

// Generate cache key from request
const generateCacheKey = (req: Request): string => {
  const userId = (req as any).user?.id || "anonymous";
  const queryString = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : "";
  return `${req.method}:${req.path}:${userId}:${queryString}`;
};

// Cache middleware factory
export const createCacheMiddleware = (cache: NodeCache, options: CacheOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }

    const keyGenerator = options.keyGenerator || generateCacheKey;
    const cacheKey = keyGenerator(req);
    
    // Try to get cached response
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log(`Cache hit: ${cacheKey}`);
      return res.json(cachedResponse);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        const ttl = options.ttl || cache.options.stdTTL;
        cache.set(cacheKey, data, ttl);
        console.log(`Cache set: ${cacheKey}`);
      }
      
      return originalJson(data);
    };

    next();
  };
};

// Predefined cache middlewares
export const shortCacheMiddleware = createCacheMiddleware(shortCache);
export const mediumCacheMiddleware = createCacheMiddleware(mediumCache);
export const longCacheMiddleware = createCacheMiddleware(longCache);

// Cache for dashboard data (user-specific, short TTL)
export const dashboardCache = createCacheMiddleware(shortCache, {
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return `dashboard:${userId}`;
  },
  condition: (req: Request) => !!(req as any).user?.id,
});

// Cache for merchant products (user-specific, medium TTL)
export const merchantProductsCache = createCacheMiddleware(mediumCache, {
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return `merchant:products:${userId}`;
  },
  condition: (req: Request) => !!(req as any).user?.id,
});

// Cache for public data (longer TTL)
export const publicDataCache = createCacheMiddleware(longCache, {
  keyGenerator: (req: Request) => `public:${req.path}:${JSON.stringify(req.query)}`,
});

// Cache for statistics (medium TTL)
export const statsCache = createCacheMiddleware(mediumCache, {
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    const userType = (req as any).user?.type;
    return `stats:${userType}:${userId}:${JSON.stringify(req.query)}`;
  },
  condition: (req: Request) => !!(req as any).user?.id,
});

// Cache invalidation utilities
export const invalidateUserCache = (userId: number) => {
  const patterns = [
    `dashboard:${userId}`,
    `merchant:products:${userId}`,
    `stats:*:${userId}:*`,
  ];
  
  patterns.forEach(pattern => {
    const keys = shortCache.keys().filter(key => key.includes(`${userId}`));
    keys.forEach(key => shortCache.del(key));
    
    const mediumKeys = mediumCache.keys().filter(key => key.includes(`${userId}`));
    mediumKeys.forEach(key => mediumCache.del(key));
  });
  
  console.log(`Cache invalidated for user ${userId}`);
};

export const invalidateAllCache = () => {
  shortCache.flushAll();
  mediumCache.flushAll();
  longCache.flushAll();
  console.log("All cache cleared");
};

// Cache statistics
export const getCacheStats = () => {
  return {
    short: {
      keys: shortCache.getStats().keys,
      hits: shortCache.getStats().hits,
      misses: shortCache.getStats().misses,
      ksize: shortCache.getStats().ksize,
      vsize: shortCache.getStats().vsize,
    },
    medium: {
      keys: mediumCache.getStats().keys,
      hits: mediumCache.getStats().hits,
      misses: mediumCache.getStats().misses,
      ksize: mediumCache.getStats().ksize,
      vsize: mediumCache.getStats().vsize,
    },
    long: {
      keys: longCache.getStats().keys,
      hits: longCache.getStats().hits,
      misses: longCache.getStats().misses,
      ksize: longCache.getStats().ksize,
      vsize: longCache.getStats().vsize,
    },
  };
};

// Middleware to add cache control headers
export const cacheControlMiddleware = (maxAge: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    next();
  };
};

export default {
  createCacheMiddleware,
  shortCacheMiddleware,
  mediumCacheMiddleware,
  longCacheMiddleware,
  dashboardCache,
  merchantProductsCache,
  publicDataCache,
  statsCache,
  invalidateUserCache,
  invalidateAllCache,
  getCacheStats,
  cacheControlMiddleware,
};