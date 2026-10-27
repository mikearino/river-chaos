const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../index");

const playerId = "123e4567-e89b-42d3-a456-426614174000";
const validRun = { playerId, initials: "abc", score: 25, durationMs: 14763.6 };

async function fixture(t, rateLimits) {
  const calls = [];
  const runService = {
    async createRun(run) { calls.push(["create", run]); return "run-id"; },
    async getLeaderboard(limit) { calls.push(["leaderboard", limit]); return [{ initials: "ABC", score: 25 }]; },
    async getPlayerStats(id) { calls.push(["stats", id]); return { total_runs: 1 }; },
  };
  const app = createApp({ runService, rateLimits });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(base + path, options);
  const post = (body, headers = {}) => request("/api/runs", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  return { calls, request, post, app, runService };
}

test("valid runs preserve gameplay and normalize initials/duration", async (t) => {
  const { post, calls } = await fixture(t);
  const response = await post(validRun);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: "run-id" });
  assert.deepEqual(calls, [["create", { ...validRun, initials: "ABC", durationMs: 14764 }]]);
  for (const run of [{ ...validRun, score: 0, durationMs: 0.1 },
    { ...validRun, score: 2147483647, durationMs: 2147483647 }]) {
    assert.equal((await post(run)).status, 201);
  }
  assert.equal(calls[1][1].durationMs, 1);
});

test("invalid run fields return 400 without database calls", async (t) => {
  const { post, calls } = await fixture(t, { submissionLimit: 100 });
  const cases = {
    playerId: [undefined, null, "", "victim-id", {}, [], 123, playerId + "x", playerId + "\n", "0".repeat(36)],
    score: [undefined, null, -1, 1.5, "25", {}, [], 2147483648, Number.MAX_SAFE_INTEGER],
    durationMs: [undefined, null, 0, -1, "1000", {}, [], 2147483648],
    initials: [undefined, null, "", "AB", "ABCD", " A ", "<x>", "ßAA", "ABC\n", 123, {}],
  };
  for (const [field, values] of Object.entries(cases)) {
    for (const value of values) {
      const response = await post({ ...validRun, [field]: value });
      assert.equal(response.status, 400, `${field}: ${JSON.stringify(value)}`);
      assert.equal(typeof (await response.json()).error, "string");
    }
  }
  for (const body of [null, [], "text", 123, {}]) assert.equal((await post(body)).status, 400);
  assert.deepEqual(calls, []);
});

test("overflowing JSON numbers are rejected", async (t) => {
  const { request, calls } = await fixture(t);
  for (const field of ["score", "durationMs"]) {
    const body = JSON.stringify({ ...validRun, [field]: "OVERFLOW" }).replace('"OVERFLOW"', "1e309");
    const response = await request("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    assert.equal(response.status, 400);
  }
  assert.deepEqual(calls, []);
});

test("malformed, oversized, and unsupported bodies return JSON errors", async (t) => {
  const { request, calls } = await fixture(t);
  for (const [body, type, expected] of [
    ["{", "application/json", 400],
    [JSON.stringify({ ...validRun, extra: "x".repeat(2100) }), "application/json", 413],
    [JSON.stringify(validRun), "text/plain", 415],
    ["", "application/json", 400],
    [JSON.stringify(validRun), "application/json; charset=invalid", 415],
  ]) {
    const response = await request("/api/runs", { method: "POST", headers: { "Content-Type": type }, body });
    assert.equal(response.status, expected);
    assert.equal(typeof (await response.json()).error, "string");
  }
  assert.deepEqual(calls, []);
});

test("leaderboard defaults and valid limits preserve results", async (t) => {
  const { request, calls } = await fixture(t);
  for (const query of ["", "?limit=1", "?limit=50"]) {
    const response = await request("/api/leaderboard" + query);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ initials: "ABC", score: 25 }]);
  }
  assert.deepEqual(calls, [["leaderboard", 10], ["leaderboard", 1], ["leaderboard", 50]]);
});

test("invalid and duplicate leaderboard limits return 400 before database access", async (t) => {
  const { request, calls } = await fixture(t);
  for (const query of ["limit=", "limit=0", "limit=-1", "limit=51", "limit=100", "limit=1.5", "limit=1e1",
    "limit=10junk", "limit=%2010", "limit=01", "limit=Infinity", "limit=10%0A", "limit=1&limit=2", "limit[]=1", "limit[x]=1", "other=1"]) {
    const response = await request("/api/leaderboard?" + query);
    assert.equal(response.status, 400, query);
  }
  assert.deepEqual(calls, []);
});

test("stats validate UUIDs and call the existing service correctly", async (t) => {
  const { request, calls } = await fixture(t);
  assert.equal((await request("/api/players/not-a-uuid/stats")).status, 400);
  const response = await request(`/api/players/${playerId}/stats`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { total_runs: 1 });
  assert.deepEqual(calls, [["stats", playerId]]);
});

test("write limits count invalid requests, return 429/Retry-After, and spare reads", async (t) => {
  const { post, request, calls } = await fixture(t, { submissionLimit: 2, readLimit: 3 });
  assert.equal((await post({})).status, 400);
  assert.equal((await post(validRun)).status, 201);
  const blocked = await post(validRun);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.ok(blocked.headers.get("ratelimit"));
  assert.equal(typeof (await blocked.json()).error, "string");
  assert.equal((await request("/api/leaderboard")).status, 200);
  assert.equal(calls.filter(([name]) => name === "create").length, 1);
});

test("leaderboard and stats share the read budget; writes and health remain available", async (t) => {
  const { request, post, calls } = await fixture(t, { readLimit: 2 });
  assert.equal((await request("/api/leaderboard?limit=-1")).status, 400);
  assert.equal((await request(`/api/players/${playerId}/stats`)).status, 200);
  assert.equal((await request("/api/leaderboard")).status, 429);
  assert.equal((await request("/health")).status, 200);
  assert.equal((await post(validRun)).status, 201);
  assert.equal(calls.some(([name]) => name === "leaderboard"), false);
});

test("only the immediate nginx loopback hop is trusted", async (t) => {
  t.mock.method(console, "error", () => {}); // Limiter warns about untrusted forwarding headers.
  const { app, post } = await fixture(t, { submissionLimit: 1 });
  const trust = app.get("trust proxy");
  assert.equal(trust("127.0.0.1", 0), true);
  assert.equal(trust("::ffff:127.0.0.1", 0), true);
  assert.equal(trust("127.0.0.1", 1), false);
  assert.equal(trust("198.51.100.1", 0), false);
  assert.equal((await post(validRun, { "X-Forwarded-For": "forged, 198.51.100.1" })).status, 201);
  assert.equal((await post(validRun, { "X-Forwarded-For": "changed, 198.51.100.1" })).status, 429);
});

test("requests resume after the rate limit window expires", async (t) => {
  const { request } = await fixture(t, { readLimit: 1, windowMs: 100 });
  assert.equal((await request("/api/leaderboard")).status, 200);
  assert.equal((await request("/api/leaderboard")).status, 429);
  await new Promise((resolve) => setTimeout(resolve, 160));
  assert.equal((await request("/api/leaderboard")).status, 200);
});

test("unexpected service errors remain generic 500 responses", async (t) => {
  t.mock.method(console, "error", () => {});
  const { runService, request, post } = await fixture(t);
  for (const name of Object.keys(runService)) runService[name] = async () => { throw new Error("private database detail"); };
  for (const response of [await post(validRun), await request("/api/leaderboard"), await request(`/api/players/${playerId}/stats`)]) {
    assert.equal(response.status, 500);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private database detail/);
  }
});


test("malformed JSON consumes the submission budget before parsing", async (t) => {
  const { request, post, calls } = await fixture(t, { submissionLimit: 1 });
  const response = await request("/api/runs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  });
  assert.equal(response.status, 400);
  assert.equal((await post(validRun)).status, 429);
  assert.deepEqual(calls, []);
});

test("resolved nginx visitor addresses have separate IPv4/IPv6 rate-limit budgets", async (t) => {
  const { post, calls } = await fixture(t, { submissionLimit: 1 });
  for (const visitor of ["198.51.100.10", "198.51.100.11", "2001:db8:1::1", "2001:db8:2::1"]) {
    // nginx appends its resolved $remote_addr after the original header.
    const headers = { "X-Forwarded-For": `127.0.0.1, forged, ${visitor}` };
    assert.equal((await post(validRun, headers)).status, 201);
    assert.equal((await post(validRun, { "X-Forwarded-For": `changed, ${visitor}` })).status, 429);
  }
  assert.equal(calls.length, 4);
});

test("direct-origin identity uses nginx's appended socket address, not forged headers", async (t) => {
  const { post } = await fixture(t, { submissionLimit: 1 });
  // A direct request is not trusted by nginx realip, so its socket address is appended.
  const directIP = "198.51.100.30";
  assert.equal((await post(validRun, { "X-Forwarded-For": `203.0.113.1, ${directIP}`, "X-Real-IP": "203.0.113.2" })).status, 201);
  assert.equal((await post(validRun, { "X-Forwarded-For": `203.0.113.99, ${directIP}`, "X-Real-IP": "203.0.113.100" })).status, 429);
  // No original XFF: nginx still appends the direct peer.
  assert.equal((await post(validRun, { "X-Forwarded-For": "198.51.100.31" })).status, 201);
});

test("non-loopback peers cannot select req.ip with forwarded headers", () => {
  const proxyaddr = require("proxy-addr");
  const { createApp } = require("../index");
  const app = createApp({ runService: {} });
  const request = { socket: { remoteAddress: "198.51.100.50" }, headers: { "x-forwarded-for": "127.0.0.1, 203.0.113.99" } };
  assert.equal(proxyaddr(request, app.get("trust proxy")), "198.51.100.50");
});

test("compressed JSON preserves validation and the decompressed 2 KB limit", async (t) => {
  const { gzipSync } = require("node:zlib");
  const { request, calls } = await fixture(t);
  for (const [body, expected] of [
    [validRun, 201],
    [{ ...validRun, score: -1 }, 400],
    [{ ...validRun, extra: "x".repeat(2100) }, 413],
  ]) {
    const response = await request("/api/runs", {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
      body: gzipSync(JSON.stringify(body)),
    });
    assert.equal(response.status, expected);
  }
  assert.equal(calls.length, 1);
});

test("trailing bytes after compressed JSON do not crash the API", async (t) => {
  const { gzipSync } = require("node:zlib");
  const { request } = await fixture(t);
  const response = await request("/api/runs", {
    method: "POST", headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
    body: Buffer.concat([gzipSync(JSON.stringify(validRun)), Buffer.from("invalid trailing bytes")]),
  });
  assert.equal(response.status, 400);
  await response.arrayBuffer();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await request("/health")).status, 200);
});
