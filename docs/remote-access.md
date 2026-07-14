# Remote access

Papyrus is designed to run on **one machine** (where your repos and coding
CLIs live) and be reached from any browser — your Windows laptop locally, and
your Mac or iPhone remotely. The server binds to `127.0.0.1` by default and is
**never** meant to face the raw internet. Remote access goes through one of the
two paths below.

The bearer token (printed once when the server first starts, stored at
`~/.papyrus/token`) is the second factor, not the first — the network layer is
what keeps the server unreachable to everyone else.

## Blessed path — Tailscale

[Tailscale](https://tailscale.com) puts every one of your devices on a private
WireGuard network (a "tailnet"). `tailscale serve` then publishes the local
server port to your tailnet over HTTPS, with a real TLS certificate, while the
server itself stays bound to localhost.

On the machine running papyrus-server:

```bash
# 1. Start the server (stays on localhost)
papyrus serve --port 7777

# 2. Publish it to your tailnet over HTTPS (separate terminal)
tailscale serve --bg 7777
```

`tailscale serve status` prints the URL — something like
`https://your-machine.your-tailnet.ts.net/`. Open that on any device signed
into the same tailnet (laptop, Mac, iPhone), enter the token once, and you're
in. On the iPhone, use **Add to Home Screen** in Safari to install the PWA.

Why this is the recommended path:
- TLS certificate provisioning is automatic (no Caddy, no Let's Encrypt setup).
- Only devices you've added to the tailnet can reach the URL at all.
- The server never listens on a public interface — nothing to firewall.
- Works over cellular, not just LAN.

To stop publishing: `tailscale serve --https=443 off`.

## Alternative — LAN + Caddy

If you won't run Tailscale and only need access from the same local network, put
[Caddy](https://caddyserver.com) in front for TLS and bind the server to the LAN
interface. Adapt the repo's `Caddyfile.example`:

```
your-machine.local {
	reverse_proxy 127.0.0.1:7777
}
```

```bash
papyrus serve --port 7777          # still localhost
caddy run --config ./Caddyfile     # terminates TLS, proxies to the server
```

Caddy self-signs (or uses your internal CA) for `.local` names; you'll accept
the certificate once per device. This path exposes the server to everyone on
your LAN — the token is your only gate, so keep it secret and prefer Tailscale
where you can.

## What not to do

- **Do not** bind the server to `0.0.0.0` and port-forward it to the internet.
  The single-token auth is not hardened for a hostile public endpoint (no rate
  limiting beyond the basics, no account lockout). Tailscale or a LAN-only
  reverse proxy keeps the attack surface to devices you control.
- **Do not** commit or paste your token. Rotate it (delete `~/.papyrus/token`
  and restart the server) if it is ever exposed.

## iPhone (PWA)

Once the server is reachable over HTTPS (Tailscale or Caddy), open the URL in
Safari and choose **Share → Add to Home Screen**. Papyrus installs as a
standalone app (its own icon, no browser chrome). It reconnects automatically
when you reopen it; terminal sessions survive because they live in the
server-side daemon, not the browser tab.
