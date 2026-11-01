import React from "react";
import { classNames } from "../../lib/format";

/**
 * Bento Grid 공통 레이아웃.
 * - 모바일(<md): 1열 스택
 * - 태블릿(md): 6열
 * - 데스크톱(lg): 12열
 * Tailwind JIT 가 동적 클래스를 감지할 수 없으므로 span 값은 정적 매핑 테이블로 제공한다.
 */
export type BentoSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type BentoRowSpan = 1 | 2 | 3;

const MD_COL: Record<number, string> = {
  1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3",
  4: "md:col-span-4", 5: "md:col-span-5", 6: "md:col-span-6",
};
const LG_COL: Record<number, string> = {
  1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4",
  5: "lg:col-span-5", 6: "lg:col-span-6", 7: "lg:col-span-7", 8: "lg:col-span-8",
  9: "lg:col-span-9", 10: "lg:col-span-10", 11: "lg:col-span-11", 12: "lg:col-span-12",
};
const LG_ROW: Record<number, string> = {
  1: "lg:row-span-1", 2: "lg:row-span-2", 3: "lg:row-span-3",
};

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4", className)}>
      {children}
    </div>
  );
}

export function BentoItem({
  children,
  md = 6,
  lg = 12,
  rows = 1,
  className,
}: {
  children: React.ReactNode;
  /** md(6열) 기준 열 span */
  md?: 1 | 2 | 3 | 4 | 5 | 6;
  /** lg(12열) 기준 열 span */
  lg?: BentoSpan;
  /** lg 기준 행 span */
  rows?: BentoRowSpan;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "min-w-0 [&>*]:h-full",
        MD_COL[md],
        LG_COL[lg],
        LG_ROW[rows],
        className
      )}
    >
      {children}
    </div>
  );
}
