import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { ExploreV2Page } from "./ExploreV2.js";

test("renders standalone-inspired Explore V2 labels", () => {
  const html = renderToStaticMarkup(<ExploreV2Page />);

  assert.match(html, /실거래 내역 조회 V2/);
  assert.match(html, /거래 유형/);
  assert.match(html, /조회하기/);
  assert.match(html, /거래 건수/);
});
