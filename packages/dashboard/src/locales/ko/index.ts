import { common } from "./common.js";
import { auth } from "./auth.js";
import { graph } from "./graph.js";
import { map } from "./map.js";
import { admin } from "./admin.js";
import { rules } from "./rules.js";
import { legal } from "./legal.js";
import { mcp } from "./mcp.js";
import { auction } from "./auction.js";

export const ko = {
  ...common,
  ...auth,
  ...graph,
  ...map,
  ...admin,
  ...rules,
  ...legal,
  ...mcp,
  ...auction,
} as const;


export default ko;
