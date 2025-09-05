import { NextRequest } from "next/server";

// 簡易インメモリレート制限（本番環境ではRedis等を使用推奨）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// レート制限設定
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1分
  maxRequests: 10, // 最大10リクエスト
};

// レート制限チェック関数
export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitMap.get(key);

  // レコードが存在しないか、リセット時間が過ぎている場合
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - 1,
      resetTime: now + RATE_LIMIT.windowMs,
    };
  }

  // リクエスト数が上限に達している場合
  if (record.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // リクエスト数を増加
  record.count++;
  rateLimitMap.set(key, record);

  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// IPアドレス取得関数
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || "unknown";
}

// レート制限ミドルウェア
export function withRateLimit(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const ip = getClientIP(request);
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "レート制限に達しました。しばらく時間をおいてから再度お試しください。",
          resetTime: rateLimitResult.resetTime,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    return handler(request, ...args);
  };
}
