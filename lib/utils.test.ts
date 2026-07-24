import assert from "node:assert/strict";
import test from "node:test";

import { startOfShanghaiDay } from "./utils";

test("startOfShanghaiDay returns midnight in Asia/Shanghai", () => {
  assert.equal(
    startOfShanghaiDay(new Date("2026-07-23T13:30:00.000Z")).toISOString(),
    "2026-07-22T16:00:00.000Z",
  );
  assert.equal(
    startOfShanghaiDay(new Date("2026-07-22T15:59:59.999Z")).toISOString(),
    "2026-07-21T16:00:00.000Z",
  );
  assert.equal(
    startOfShanghaiDay(new Date("2026-07-22T16:00:00.000Z")).toISOString(),
    "2026-07-22T16:00:00.000Z",
  );
});
