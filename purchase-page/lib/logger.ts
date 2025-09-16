import pino from "pino";

// ログレベル設定
const logLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

// ロガー設定
export const logger = pino({
  level: logLevel,
  transport: process.env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    },
  } : undefined,
});

// 個人情報マスキング関数
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  
  const maskedLocal = localPart.length > 2 
    ? `${localPart.substring(0, 2)}***` 
    : "***";
  
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  return `${phone.substring(0, 3)}***${phone.substring(phone.length - 2)}`;
}

// ログ用のユーティリティ関数
export function logOrderCreation(orderId: string, email: string, amount: number) {
  logger.info({
    orderId,
    email: maskEmail(email),
    amount,
    action: "order_created",
  }, "注文が作成されました");
}

export function logPaymentSuccess(orderId: string, email: string, amount: number) {
  logger.info({
    orderId,
    email: maskEmail(email),
    amount,
    action: "payment_success",
  }, "決済が完了しました");
}

export function logAccountCreated(orderId: string, email: string) {
  logger.info({
    orderId,
    email: maskEmail(email),
    action: "account_created",
  }, "ログインアカウントが作成されました");
}

export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    error: error.message,
    stack: error.stack,
    ...context,
  }, "エラーが発生しました");
}
