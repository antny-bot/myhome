import express from "express";
import { insertActivityLog, getActivityLogs, getActivityStats } from "@myhome/shared";
import { adminRequired } from "../authRoutes.js";

export function createLogRouter() {
  const router = express.Router();

  router.post("/logs", async (req, res, next) => {
    try {
      const email = req.user?.email || "anonymous";
      const { activityType, description, payload } = req.body;
      
      if (!activityType || !description) {
        res.status(400).json({ error: "activityType and description are required" });
        return;
      }
      
      insertActivityLog({
        userEmail: email,
        activityType,
        description,
        payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : undefined,
        ipAddress: req.ip || req.headers["x-forwarded-for"] as string || undefined,
        userAgent: req.headers["user-agent"] || undefined
      });
      
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/logs", adminRequired, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string || "20");
      const offset = parseInt(req.query.offset as string || "0");
      const userEmail = req.query.userEmail as string || undefined;
      const activityType = req.query.activityType as string || undefined;
      const date = req.query.date as string || undefined;
      
      const result = getActivityLogs(limit, offset, userEmail, activityType, date);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/logs/stats", adminRequired, async (_req, res, next) => {
    try {
      const stats = getActivityStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
