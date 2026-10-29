import { common } from "./common.js";
import { auth } from "./auth.js";
import { graph } from "./graph.js";
import { map } from "./map.js";
import { admin } from "./admin.js";
import { rules } from "./rules.js";

export const en = {
  ...common,
  ...auth,
  ...graph,
  ...map,
  ...admin,
  ...rules,
} as const;

export default en;
