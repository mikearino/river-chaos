#!/usr/bin/env python3
"""Generate nginx trust configuration from the official AWS origin-facing feed."""
import datetime
import ipaddress
import json
from pathlib import Path
import tempfile
import urllib.request

URL = "https://ip-ranges.amazonaws.com/ip-ranges.json"
MAX_BYTES = 10 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("AWS IP feed redirects are not accepted")


def download():
    # urllib uses the system CA store and verifies HTTPS certificates/hostnames.
    with urllib.request.build_opener(NoRedirect).open(URL, timeout=10) as response:
        if response.status != 200:
            raise ValueError("AWS IP feed did not return HTTP 200")
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("AWS IP feed exceeds size limit")
        return data


def render(data):
    feed = json.loads(data)
    token = feed["syncToken"]
    if not isinstance(token, str) or not token.isascii() or not token.isdigit():
        raise ValueError("Invalid AWS syncToken")
    published = datetime.datetime.strptime(feed["createDate"], "%Y-%m-%d-%H-%M-%S")
    networks = set()
    for section, field, version in [("prefixes", "ip_prefix", 4), ("ipv6_prefixes", "ipv6_prefix", 6)]:
        entries = feed[section]
        if not isinstance(entries, list):
            raise ValueError("Invalid AWS prefix list")
        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError("Invalid AWS prefix entry")
            if entry.get("service") != "CLOUDFRONT_ORIGIN_FACING":
                continue
            # Origin-facing ranges include regional entries, not just GLOBAL.
            if not isinstance(entry.get("region"), str) or not entry["region"]:
                raise ValueError("Invalid origin-facing region")
            value = entry[field]
            if not isinstance(value, str) or "/" not in value:
                raise ValueError("Expected an explicit CIDR string")
            network = ipaddress.ip_network(value, strict=True)
            if (network.version != version or network.prefixlen == 0 or
                    not network.is_global or network.is_multicast):
                raise ValueError("Unsafe origin-facing CIDR")
            networks.add(network)
    if not networks:
        raise ValueError("No CloudFront origin-facing ranges found")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    lines = ["# Generated from " + URL, "# AWS syncToken: " + token,
             "# Published UTC: " + published.isoformat(), "# Retrieved UTC: " + now,
             "real_ip_header X-Forwarded-For;", "real_ip_recursive off;"]
    lines += ["set_real_ip_from " + str(n) + ";" for n in sorted(networks, key=lambda n: (n.version, int(n.network_address), n.prefixlen))]
    return "\n".join(lines) + "\n"


def generate(destination, fetch=download):
    config = render(fetch())  # Never replace a file until all input is validated.
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=destination.parent, delete=False) as output:
            temporary = Path(output.name)
            output.write(config)
        temporary.chmod(0o644)
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    generate(Path(__file__).resolve().parent / "nginx/conf.d/10-cloudfront-realip.conf")
