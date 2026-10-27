# Backend deployment and database TLS

Target: Elastic Beanstalk Node.js 24 on Amazon Linux 2023. Run `npm start` from the backend root. No build step or Procfile is required.

## Environment

| Variable | Requirement |
| --- | --- |
| `DB_HOST` | Required. Use the exact RDS DNS endpoint from RDS > Databases > Connectivity & security, without a URL scheme or port. Do not substitute an IP address or custom DNS alias: the hostname must match the database certificate. |
| `DB_USER` | Application MySQL account. |
| `DB_PASSWORD` | Application MySQL password; keep it out of source and bundles. |
| `DB_NAME` | Existing application database containing `runs`. |
| `NODE_ENV` | Set to `production` in Elastic Beanstalk environment properties. Production always requires verified TLS, including for loopback hosts. |
| `PORT` | Supplied by Beanstalk; application falls back to 3000 locally. |

Remote database connections require verified TLS even if `NODE_ENV` is unset. Only non-production connections to exactly `localhost`, `127.0.0.1`, or `::1` may use plaintext for local MySQL. A development connection to RDS still uses verified TLS. No TLS-disable environment switch is provided.

## CA bundle and verification

`certs/global-bundle.pem` is the unmodified public CA bundle downloaded over verified HTTPS from:

https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

AWS documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html

Downloaded October 19, 2026. SHA-256:

`90a6f1a7978a1b1b096dca6c57511ca48d3b8cf052f8e704baf358f34ea2f21b`

It includes the commercial-region `rds-ca-rsa2048-g1` trust roots. This file contains public CA certificates, not credentials or private keys. Review and refresh it from the official HTTPS endpoint when AWS updates its trust roots, updating this checksum after review. Do not fetch certificates dynamically during application startup.

`db/config.js` reads the bundled CA relative to its own location, validates the PEM certificates, and configures mysql2 with `rejectUnauthorized: true`, `verifyIdentity: true`, and a minimum of TLS 1.2. IP literals are rejected for TLS because this driver skips hostname verification for them. A missing/invalid CA prevents pool creation. An untrusted certificate, hostname mismatch, or server without TLS fails the connection without plaintext fallback. Database requests fail with the API's existing generic error response.

The pool connects lazily: `/health` checks the HTTP server, not database readiness. Verify a real database request after any future deployment. To verify negotiated encryption, run `SHOW SESSION STATUS LIKE 'Ssl_cipher';` on an application database connection; the result should be nonempty. The TLS tests separately verify rejection of wrong hostnames and untrusted certificates.

Do not enable RDS `require_secure_transport` until application TLS connectivity has been verified. This change does not alter that parameter or any AWS resource.

## Source bundle

Place `index.js`, `package.json`, and `package-lock.json` directly at the ZIP root, alongside `db/`, `routes/`, `services/`, and now **`certs/global-bundle.pem`**. Include the new `db/config.js`; do not use an old six-file allowlist. Include this guide if desired. Exclude `.env*`, credentials, `node_modules`, test fixtures, Git metadata, frontend files, and OS files.

The previously prepared `/private/tmp/river-chaos-api-node24-2026-10-19.zip` predates this TLS change and must be rebuilt before use. No new deployment ZIP is created by this change.

## Tests

Run `npm test` from `server/`. Tests require OpenSSL and permission to listen on temporary localhost ports. They generate short-lived test keys/certificates in the OS temporary directory and remove them afterward. Tests never connect to RDS or alter AWS.


## CloudFront visitor IPs and rate limiting

Verified topology: CloudFront -> single-instance Beanstalk nginx -> 127.0.0.1:8080 (no load balancer). Express trusts only hop zero at 127.0.0.1 or its IPv4-mapped representation. Keep port 8080 closed to external ingress; trusted local processes can supply forwarding headers.

Include the **entire `.platform/` directory at the ZIP root**, alongside the application files. Both `.platform/hooks/prebuild/10-cloudfront-realip.sh` and `.platform/confighooks/prebuild/10-cloudfront-realip.sh` call the shared Python standard-library generator. These hooks need Python 3, the system HTTPS CA store, and outbound HTTPS access to `https://ip-ranges.amazonaws.com/ip-ranges.json`. No AWS credentials or npm packages are required by the generator; it runs before npm dependency installation.

The generator validates publication metadata and public CIDRs from `CLOUDFRONT_ORIGIN_FACING` entries only (including regional entries, not just GLOBAL), from either address family, and rejects empty/invalid results. It records retrieval/publication metadata and atomically writes `.platform/nginx/conf.d/10-cloudfront-realip.conf` in application staging. Download, timeout, or validation errors abort the deployment instead of using an empty or stale fallback. Beanstalk loads this directory at nginx **http scope** and handles proxy activation. No custom nginx.conf, new location, scheduled updater, or background service is installed.

The generated config sets `real_ip_header X-Forwarded-For` and `real_ip_recursive off`. CloudFront appends the actual viewer last; only trusted CloudFront TCP sources can replace nginx's `$remote_addr`. Keep Beanstalk's existing `X-Forwarded-For $proxy_add_x_forwarded_for` and `X-Real-IP $remote_addr`: nginx appends its resolved address, and Express accepts only that immediate rightmost address. Direct-origin callers are not trusted and cannot replace their socket address using forged forwarding headers. This does not restrict access to a specific CloudFront distribution or prevent direct-origin HTTP requests.

Deployment acceptance: run `sudo nginx -t` and inspect `sudo nginx -T`; confirm the generated directives load at http scope without lower-scope overrides, the upstream remains 127.0.0.1:8080, and the two proxy header directives remain as described. Test independent visitors and forged XFF prefixes through CloudFront and directly at the origin. Deploy the Express change and nginx configuration in the same version; using the Express change alone would group visitors by CloudFront source address.

Refresh ranges on each application/configuration deployment and review AWS range changes weekly while the game remains public. Newly added ranges temporarily group visitors by CloudFront address; removed ranges remain trusted until refresh and could become unsafe if reassigned. Redeploy promptly when the selected ranges change, even without a code release. Rollbacks must retain the generator/hooks and regenerate current ranges; do not reuse old generated lists or assume a pre-fix version has per-visitor limiting. There is no automatic refresh between deployments. Feed publication time is not itself a freshness guarantee or a reason to reject an unchanged official feed.

`proxy-addr` is resolved to a patched compatible version in the lockfile. Application counters remain process-local and reset on restart.

Run `npm test`: it runs Node API/TLS tests and Python generator tests. The actual nginx integration test runs on Linux with nginx installed; other environments explicitly skip it. Its loopback trust range is a test fixture, never a generated production range. For Node.js 24 specifically, run `npm exec --yes --package=node@24 -- node --test` followed by `python3 -m unittest discover -s test -p '*_test.py'`.
