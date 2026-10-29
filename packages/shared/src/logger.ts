import { maskUrl } from "./apiClient.js";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getCurrentLogLevel(): number {
  const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
  return LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
}

/**
 * 텍스트 내의 민감한 인증키/비밀번호 등을 별표로 마스킹합니다.
 */
export function maskSensitive(text: string): string {
  if (!text) return text;

  // URL 형태 마스킹 (serviceKey 등)
  let result = maskUrl(text);

  // 일반 토큰, 비밀번호 등 패턴 마스킹
  result = result.replace(/(password|secret|token|api[_-]?key)=([^&\s]+)/gi, "$1=********");
  result = result.replace(/(["']?(?:password|secret|token|apiKey)["']?\s*:\s*["'])([^"']+)(["'])/gi, "$1********$3");

  return result;
}

export class Logger {
  constructor(private prefix?: string) {}

  private formatMessage(args: unknown[]): unknown[] {
    return args.map((arg) => {
      if (typeof arg === "string") {
        return maskSensitive(arg);
      }
      if (arg instanceof Error) {
        return arg;
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          const str = JSON.stringify(arg);
          return JSON.parse(maskSensitive(str));
        } catch {
          return arg;
        }
      }
      return arg;
    });
  }

  private print(level: LogLevel, ...args: unknown[]): void {
    const currentPriority = getCurrentLogLevel();
    const messagePriority = LOG_LEVELS[level];

    if (messagePriority < currentPriority) {
      return;
    }

    const timestamp = new Date().toISOString();
    const tag = this.prefix ? `[${this.prefix}]` : "";
    const formatted = this.formatMessage(args);

    switch (level) {
      case "debug":
        console.debug(`${timestamp} DEBUG ${tag}`, ...formatted);
        break;
      case "info":
        console.info(`${timestamp} INFO ${tag}`, ...formatted);
        break;
      case "warn":
        console.warn(`${timestamp} WARN ${tag}`, ...formatted);
        break;
      case "error":
        console.error(`${timestamp} ERROR ${tag}`, ...formatted);
        break;
    }
  }

  debug(...args: unknown[]): void {
    this.print("debug", ...args);
  }

  info(...args: unknown[]): void {
    this.print("info", ...args);
  }

  warn(...args: unknown[]): void {
    this.print("warn", ...args);
  }

  error(...args: unknown[]): void {
    this.print("error", ...args);
  }

  withPrefix(prefix: string): Logger {
    return new Logger(this.prefix ? `${this.prefix}:${prefix}` : prefix);
  }
}

export const logger = new Logger();

export function createLogger(prefix?: string): Logger {
  return new Logger(prefix);
}
