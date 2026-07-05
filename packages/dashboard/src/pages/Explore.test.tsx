import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExplorePage } from "./Explore.js";

test("renders Explore page labels", () => {
  const html = renderToStaticMarkup(<ExplorePage />);

  assert.match(html, /실거래 탐색/);
  assert.match(html, /거래 유형/);
  assert.match(html, /조회하기/);
  assert.match(html, /거래 건수/);
});
