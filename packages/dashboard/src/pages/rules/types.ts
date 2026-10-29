import type { RuleInput } from "../../types.js";

export const ALERT_TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  const timeStr = `${hour}:00`;
  const period = i < 12 ? "오전" : "오후";
  const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return {
    value: timeStr,
    label: `${period} ${displayHour}시 (${timeStr})`,
    labelEn: `${i < 12 ? "AM" : "PM"} ${displayHour === 0 ? 12 : displayHour}:00 (${timeStr})`,
  };
});

export const initialForm: RuleInput = {
  name: "",
  regionName: "",
  regionCode: undefined,
  apartmentKeywords: [],
  minPriceEok: undefined,
  maxPriceEok: 15,
  minArea: undefined,
  maxArea: undefined,
  comparisonCriteria: "none",
  intervalMinutes: 1440,
  alertTime: "09:00",
  channels: ["telegram"],
  enabled: true,
};
