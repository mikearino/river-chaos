const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const tls = require("node:tls");
const { once } = require("node:events");
const { execFileSync } = require("node:child_process");
const mysql = require("mysql2/promise");
const { getConnectionOptions } = require("../db/config");
const host = "database.example.test";

let directory, cert, key;
before(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "river-chaos-tls-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", `/CN=${host}`, "-addext", `subjectAltName=DNS:${host}`,
    "-keyout", path.join(directory, "key.pem"), "-out", path.join(directory, "cert.pem")], { stdio: "ignore" });
  cert = fs.readFileSync(path.join(directory, "cert.pem"));
  key = fs.readFileSync(path.join(directory, "key.pem"));
});
after(() => { if (directory) fs.rmSync(directory, { recursive: true, force: true }); });

test("remote databases always require verified TLS, even without production mode", () => {
  for (const NODE_ENV of [undefined, "development", "production"]) {
    const options = getConnectionOptions({ DB_HOST: host, NODE_ENV });
    assert.equal(options.ssl.rejectUnauthorized, true);
    assert.equal(options.ssl.verifyIdentity, true);
    assert.equal(options.ssl.minVersion, "TLSv1.2");
    assert.match(options.ssl.ca, /-----BEGIN CERTIFICATE-----/);
  }
});

test("only non-production loopback databases retain plaintext compatibility", () => {
  for (const DB_HOST of ["localhost", "127.0.0.1", "::1"]) {
    assert.equal(getConnectionOptions({ DB_HOST }).ssl, undefined);
    assert.equal(getConnectionOptions({ DB_HOST, NODE_ENV: "development" }).ssl, undefined);
  }
  assert.equal(getConnectionOptions({ DB_HOST: "localhost", NODE_ENV: "production" }).ssl.rejectUnauthorized, true);
});

test("missing hosts and TLS IP literals fail closed", () => {
  for (const DB_HOST of [undefined, "", " db.example.test", "mysql://db.example.test", "192.0.2.1", "2001:db8::1", "127.0.0.1"]) {
    assert.throws(() => getConnectionOptions({ DB_HOST, NODE_ENV: "production" }));
  }
});

test("missing or malformed bundled CA fails closed", () => {
  const modulePath = require.resolve("../db/config");
  for (const [body, expected] of [
    ['throw new Error("missing bundle")', /missing bundle/],
    ['return "not a certificate"', /Invalid AWS RDS CA bundle/],
  ]) {
    const output = execFileSync(process.execPath, ["-e", `
      const fs = require('node:fs');
      const original = fs.readFileSync;
      fs.readFileSync = function(filename, ...args) {
        if (String(filename).endsWith('global-bundle.pem')) { ${body}; }
        return original.call(this, filename, ...args);
      };
      const { getConnectionOptions } = require(${JSON.stringify(modulePath)});
      try {
        getConnectionOptions({ DB_HOST: 'database.example.test', NODE_ENV: 'production' });
        process.exit(2);
      } catch (error) { console.log(error.message); }
    `], { encoding: "utf8" });
    assert.match(output, expected);
  }
});

// Minimal MySQL greeting and TLS upgrade: exercises mysql2's actual handshake,
// including identity checks and rejection of plaintext-only servers.
function greeting(supportTLS) {
  const capabilities = 0x00088201 | (supportTLS ? 0x800 : 0);
  const flags = Buffer.alloc(4); flags.writeUInt32LE(capabilities);
  const payload = Buffer.concat([
    Buffer.from([10]), Buffer.from("8.0.0-test\0"), Buffer.from([1, 0, 0, 0]),
    Buffer.from("12345678\0"), flags.subarray(0, 2), Buffer.from([45, 2, 0]),
    flags.subarray(2), Buffer.from([21]), Buffer.alloc(10),
    Buffer.from("abcdefghijkl\0mysql_native_password\0"),
  ]);
  const header = Buffer.alloc(4); header.writeUIntLE(payload.length, 0, 3);
  return Buffer.concat([header, payload]);
}

async function connectToTestServer(t, { hostname = host, trusted = true, supportTLS = true } = {}) {
  const sockets = new Set();
  let credentialsReceived = false;
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on("error", () => {});
    socket.write(greeting(supportTLS));
    let buffered = Buffer.alloc(0);
    const upgrade = (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      if (buffered.length < 36) return;
      socket.removeListener("data", upgrade);
      const request = buffered;
      if (!supportTLS) { credentialsReceived = true; return; }
      // The first packet must be a 32-byte SSLRequest, with no credentials.
      assert.equal(request.readUIntLE(0, 3), 32);
      socket.pause();
      if (request.length > 36) socket.unshift(request.subarray(36));
      const secure = new tls.TLSSocket(socket, { isServer: true, secureContext: tls.createSecureContext({ cert, key }) });
      sockets.add(secure); secure.on("error", () => {});
      secure.once("data", () => {
        credentialsReceived = true;
        secure.write(Buffer.from([7, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0]));
      });
      secure.resume();
    };
    socket.on("data", upgrade);
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  });
  const options = getConnectionOptions({ DB_HOST: hostname, NODE_ENV: "production" });
  // Only the trusted certificate fixture replaces the CA in tests, never in production.
  if (trusted) options.ssl.ca = cert;
  delete options.waitForConnections; delete options.connectionLimit;
  const connection = mysql.createConnection({ ...options, user: "test", password: "test", connectTimeout: 2000,
    stream: () => net.connect(server.address().port, "127.0.0.1") });
  return { connection, receivedCredentials: () => credentialsReceived };
}

test("mysql2 accepts a trusted certificate with the correct hostname", async (t) => {
  const { connection } = await connectToTestServer(t);
  const client = await connection;
  assert.equal(client.connection.stream.authorized, true);
  client.destroy();
});

test("mysql2 rejects a trusted certificate with the wrong hostname", async (t) => {
  const { connection, receivedCredentials } = await connectToTestServer(t, { hostname: "wrong.example.test" });
  await assert.rejects(connection, /Hostname\/IP does not match|altnames/i);
  assert.equal(receivedCredentials(), false);
});

test("mysql2 rejects an untrusted certificate using the bundled RDS trust store", async (t) => {
  const { connection, receivedCredentials } = await connectToTestServer(t, { trusted: false });
  await assert.rejects(connection, /self.signed|certificate/i);
  assert.equal(receivedCredentials(), false);
});

test("mysql2 rejects a server without TLS rather than sending plaintext credentials", async (t) => {
  const { connection, receivedCredentials } = await connectToTestServer(t, { supportTLS: false });
  await assert.rejects(connection, /Server does not support secure connection/);
  assert.equal(receivedCredentials(), false);
});
