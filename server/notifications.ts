import { nanoid } from "nanoid";
import { appendNotification } from "./storage.js";
import type { AlertChannel, NotificationRecord, TransactionMatch, WatchRule } from "./types.js";

type SendResult = {
  channel: AlertChannel;
  status: NotificationRecord["status"];
  message: string;
};

function formatAlert(rule: WatchRule, matches: TransactionMatch[]) {
  const lines = [
    `[아파트 알림] ${rule.name}`,
    `지역: ${rule.regionName}${rule.apartmentKeywords?.length ? ` / 단지: ${rule.apartmentKeywords.join(", ")}` : ""}`,
    `조건: ${rule.minPriceEok ?? "-"}억 ~ ${rule.maxPriceEok ?? "-"}억, ${rule.dealMonth ?? rule.startMonth ?? "-"}`,
    "",
    ...matches.slice(0, 5).map((match, index) => {
      const area = match.areaM2 ? ` / ${match.areaM2}㎡` : "";
      const floor = match.floor ? ` / ${match.floor}층` : "";
      return `${index + 1}. ${match.apartmentName} ${match.priceEok.toFixed(2)}억 (${match.dealDate}${area}${floor})`;
    }),
    "",
    "기준: PlayMCP 실거래가/단지정보. 현재 매물 또는 호가 알림 아님."
  ];
  return lines.join("\n");
}

async function sendTelegram(rule: WatchRule, matches: TransactionMatch[]): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { channel: "telegram", status: "skipped", message: "Telegram env vars are not configured." };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatAlert(rule, matches),
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    return { channel: "telegram", status: "failed", message: `Telegram failed: ${response.status} ${body}` };
  }
  return { channel: "telegram", status: "sent", message: "Telegram alert sent." };
}

async function sendKakao(): Promise<SendResult> {
  return { channel: "kakao", status: "skipped", message: "Kakao send-to-me is reserved for phase 2." };
}

export async function sendNotifications(rule: WatchRule, matches: TransactionMatch[]) {
  if (matches.length === 0) return [];

  const results: NotificationRecord[] = [];
  for (const channel of rule.channels) {
    const result = channel === "telegram" ? await sendTelegram(rule, matches) : await sendKakao();
    const record: NotificationRecord = {
      id: nanoid(),
      ruleId: rule.id,
      channel: result.channel,
      status: result.status,
      message: result.message,
      dedupeKeys: matches.map((match) => match.dedupeKey),
      createdAt: new Date().toISOString()
    };
    await appendNotification(record);
    results.push(record);
  }
  return results;
}

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}
