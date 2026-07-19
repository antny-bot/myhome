export const PYEONG_M2 = 3.30578;

export function getDefaultMonth(): string {
  return new Date().toISOString().slice(0, 7).replace("-", "");
}
