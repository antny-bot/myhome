import express from "express";
import { Config } from "../config.js";
import { validateBody, systemConfigUpdateSchema, userConfigUpdateSchema } from "../validation.js";
import { isTelegramConfigured } from "../notifications.js";
import { getSourceLimitNotice } from "../ruleEngine.js";
import { getSystemConfig, saveSystemConfig } from "../storage.js";
import { isKakaoConfigured } from "../addressSearch.js";
import type { SystemConfig } from "../types.js";
import { getUserSettings, saveUserSettings } from "@myhome/shared";
import { adminRequired } from "../authRoutes.js";
import { getAuthenticatedEmail } from "../utils/authUtils.js";
import { maskSecret, getUpdatedSecret } from "../utils/maskUtils.js";

export function createConfigRouter() {
  const router = express.Router();

  router.get("/config", async (req, res, next) => {
    try {
      const config = await getSystemConfig();
      let userGeminiConfigured = false;
      const userEmail = req.user?.email;
      if (userEmail) {
        const userSettings = getUserSettings(userEmail);
        userGeminiConfigured = Boolean(userSettings?.geminiApiKey);
      }
      res.json({
        telegramConfigured: isTelegramConfigured(),
        kakaoStatus: "phase-2",
        kakaoSearchConfigured: isKakaoConfigured(),
        kakaoConfigured: Boolean(Config.KAKAO_REST_API_KEY),
        jusoConfigured: Boolean(Config.JUSO_CONFM_KEY),
        dataGoKrConfigured: Boolean(Config.DATA_GO_KR_API_KEY),
        kakaoJavascriptConfigured: Boolean(Config.KAKAO_JAVASCRIPT_KEY),
        kakaoJavascriptKey: Config.KAKAO_JAVASCRIPT_KEY || "",
        kakaoNativeAppConfigured: Boolean(Config.KAKAO_NATIVE_APP_KEY),
        dataSourceNotice: getSourceLimitNotice(),
        geminiConfigured: Boolean(config.geminiApiKey || Config.GEMINI_API_KEY || userGeminiConfigured)
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/system-config", adminRequired, async (_req, res, next) => {
    try {
      const config = await getSystemConfig();
      res.json({
        telegramBotToken: maskSecret(config.telegramBotToken || Config.TELEGRAM_BOT_TOKEN),
        telegramChatId: maskSecret(config.telegramChatId || Config.TELEGRAM_CHAT_ID),
        kakaoRestApiKey: maskSecret(config.kakaoRestApiKey || Config.KAKAO_REST_API_KEY),
        jusoConfmKey: maskSecret(config.jusoConfmKey || Config.JUSO_CONFM_KEY),
        dataGoKrApiKey: maskSecret(config.dataGoKrApiKey || Config.DATA_GO_KR_API_KEY),
        kakaoJavascriptKey: maskSecret(config.kakaoJavascriptKey || Config.KAKAO_JAVASCRIPT_KEY),
        kakaoNativeAppKey: maskSecret(config.kakaoNativeAppKey || Config.KAKAO_NATIVE_APP_KEY),
        googleClientId: config.googleClientId || Config.GOOGLE_CLIENT_ID || "",
        googleClientSecret: maskSecret(config.googleClientSecret || Config.GOOGLE_CLIENT_SECRET),
        googleRedirectUri: config.googleRedirectUri || Config.GOOGLE_REDIRECT_URI || "",
        allowedEmails: config.allowedEmails || Config.ALLOWED_EMAILS || "",
        adminEmails: config.adminEmails || Config.ADMIN_EMAILS || "",
        geminiApiKey: maskSecret(config.geminiApiKey || Config.GEMINI_API_KEY)
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/system-config", adminRequired, validateBody(systemConfigUpdateSchema), async (req, res, next) => {
    try {
      const body = req.body;
      const update: SystemConfig = {};

      const telegramBotToken = getUpdatedSecret(body.telegramBotToken);
      if (telegramBotToken !== undefined) update.telegramBotToken = telegramBotToken;

      const telegramChatId = getUpdatedSecret(body.telegramChatId);
      if (telegramChatId !== undefined) update.telegramChatId = telegramChatId;

      const kakaoRestApiKey = getUpdatedSecret(body.kakaoRestApiKey);
      if (kakaoRestApiKey !== undefined) update.kakaoRestApiKey = kakaoRestApiKey;

      const jusoConfmKey = getUpdatedSecret(body.jusoConfmKey);
      if (jusoConfmKey !== undefined) update.jusoConfmKey = jusoConfmKey;

      const dataGoKrApiKey = getUpdatedSecret(body.dataGoKrApiKey);
      if (dataGoKrApiKey !== undefined) update.dataGoKrApiKey = dataGoKrApiKey;

      const kakaoJavascriptKey = getUpdatedSecret(body.kakaoJavascriptKey);
      if (kakaoJavascriptKey !== undefined) update.kakaoJavascriptKey = kakaoJavascriptKey;

      const kakaoNativeAppKey = getUpdatedSecret(body.kakaoNativeAppKey);
      if (kakaoNativeAppKey !== undefined) update.kakaoNativeAppKey = kakaoNativeAppKey;

      if (body.googleClientId !== undefined) {
        update.googleClientId = body.googleClientId;
      }

      const googleClientSecret = getUpdatedSecret(body.googleClientSecret);
      if (googleClientSecret !== undefined) update.googleClientSecret = googleClientSecret;

      if (body.googleRedirectUri !== undefined) {
        update.googleRedirectUri = body.googleRedirectUri;
      }
      if (body.allowedEmails !== undefined) {
        update.allowedEmails = body.allowedEmails;
      }
      if (body.adminEmails !== undefined) {
        update.adminEmails = body.adminEmails;
      }

      const geminiApiKey = getUpdatedSecret(body.geminiApiKey);
      if (geminiApiKey !== undefined) update.geminiApiKey = geminiApiKey;

      await saveSystemConfig(update);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.get("/user-config", async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const settings = getUserSettings(email);
      res.json({
        telegramBotToken: maskSecret(settings?.telegramBotToken),
        telegramChatId: maskSecret(settings?.telegramChatId),
        kakaoRestApiKey: maskSecret(settings?.kakaoRestApiKey),
        geminiApiKey: maskSecret(settings?.geminiApiKey),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/user-config", validateBody(userConfigUpdateSchema), async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const body = req.body;
      const update: { telegramBotToken?: string | null; telegramChatId?: string | null; kakaoRestApiKey?: string | null; geminiApiKey?: string | null } = {};

      const telegramBotToken = getUpdatedSecret(body.telegramBotToken);
      if (telegramBotToken !== undefined) update.telegramBotToken = telegramBotToken;

      const telegramChatId = getUpdatedSecret(body.telegramChatId);
      if (telegramChatId !== undefined) update.telegramChatId = telegramChatId;

      const kakaoRestApiKey = getUpdatedSecret(body.kakaoRestApiKey);
      if (kakaoRestApiKey !== undefined) update.kakaoRestApiKey = kakaoRestApiKey;

      const geminiApiKey = getUpdatedSecret(body.geminiApiKey);
      if (geminiApiKey !== undefined) update.geminiApiKey = geminiApiKey;

      saveUserSettings(email, update);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
