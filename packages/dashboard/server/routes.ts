import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validateBody, validateQuery } from "./validation.js";
import { createConfigRouter } from "./routes/configRoutes.js";
import { createRuleRouter, ruleSchema, ruleUpdateSchema } from "./routes/ruleRoutes.js";
import { createTransactionRouter } from "./routes/transactionRoutes.js";
import { createLogRouter } from "./routes/logRoutes.js";

export { ruleSchema, ruleUpdateSchema };

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요. (Too many requests from this IP, please try again later.)",
  standardHeaders: true,
  legacyHeaders: false,
});

export function createRouter() {
  const router = express.Router();

  // Global validation & rate limiting
  router.use(validateBody(z.object({}).passthrough()));
  router.use(validateQuery(z.object({}).passthrough()));
  router.use(apiLimiter);

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // 서브 도메인별 라우터 등록
  router.use(createConfigRouter());
  router.use(createRuleRouter());
  router.use(createTransactionRouter());
  router.use(createLogRouter());

  return router;
}
