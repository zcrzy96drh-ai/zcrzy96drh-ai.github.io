---
title: "qq-bridge: an AI companion living in QQ, with a persistent persona"
date: "2026-10-29"
draft: false
summary: "A deep rework of the open-source AI Companion Kit: bridges QQ (via SnowLuma OneBot v11) to a local DeepSeek harness so an AI plays a group member with a persistent persona — joining conversations, going quiet, sending stickers and voice notes, behind budget caps and a full safety gate."
---

## What it is

I wanted an AI in my QQ group that feels alive: a fixed persona, memory of what was discussed, and a sense of when to speak and when to stay quiet — not a command-answering bot. qq-bridge connects QQ messages to a long-running local DeepSeek Harness (DSH) session and sends the AI's replies back to QQ: bidirectional, always-on, low-latency.

## The original project and my changes

The original project is the open-source [AI Companion Kit](https://github.com/pinganbbOvO/ai-companion-kit) (MIT): a "give your AI a body" kit — from a 15-minute quick start to a full build-your-own-whale tutorial, plus companion components (own-life, phone-mcp, qzone, and more) and a runnable bridge baseline (a single ~600KB bridge.js with QQ↔DSH forwarding, a whitelist, role injection, and an MCP tool surface).

My version (v0.2.1-r1) reworks that baseline in four directions:

- **Protocol adaptation and self-healing**: adapted to DSH 2.0.18's cookie auth and remote.mux event stream (session/follow, projection baselines, inbox queues, verified one by one); automatic discovery and self-healing of SnowLuma's separate HTTP/WS tokens when the QQ account changes; every read call falls back from WS to HTTP so a half-dead gateway doesn't block chat
- **Security hardening**: group chat content is treated as untrusted input — per-session tokens with constant-time comparison, sensitive-content audit on outbound text, dual-gate token redaction (exact token list plus heuristic regex), ACL hardening of the state directory (Windows icacls), fail-closed session creation when preset validation fails (never falling back to a default preset with local tools), and full SSRF protection on outbound fetches (all DNS results validated, private ranges blocked, every redirect hop re-validated)
- **Long-run resilience**: messages queue during DSH/SnowLuma outages and replay in order on recovery (failed items go back untouched; only transport-level failures are safe to retry); corrupted state files are quarantined as .corrupt with read-only degradation — an empty in-memory state never overwrites the real file; the single-instance lock distinguishes "another instance is truly running" from "someone else took the port" (exit 2 vs exit 3, so the guard script knows whether to give up or retry); logs rotate by bytes with write-failure counters in the heartbeat
- **Simulation details**: a wake scheduler (conditional triggers, batching window, per-minute and per-hour quotas with deferred retry instead of dropping), human-feel delivery (message splitting, randomized gaps, long-gap probability, dual-rate hard limits), pre-sleep observation windows, time-awareness injection, a sticker system (favorites sync, frame-sampled contact sheets, battle strategies), voice (ffmpeg loudness normalization), slang learning (extract → research online → human confirm), per-person long-term memory, and token-ledger pricing with a daily budget soft cap

The codebase is now ~22.4k lines (src) with 96 test and tool scripts, 45 of which form the offline regression suite `test:audit`.

## Key features

- Simulation mode (reserved2): the AI decides via MCP tools whether to reply or wrap up; supports both always-on (wake per message) and diving/finite-sleep forms
- Multimedia: reading and sending images/stickers/animated GIFs (frame-sampled contact sheets)/voice/merged forward histories
- Slang learning: auto-extracts candidate terms, researches them online, and injects a confirmed slang table into prompts, with manual review in the console
- Long-term memory: a per-person ledger plus a cross-session chat log — the AI knows the same person across private and group chats
- Budget guardrails: token-ledger-based pricing, daily soft caps, midnight rollover with resume, and a daily spend report to the admin
- Observability: 5-minute heartbeats (memory/queues/handles/log-write failures), a runtime snapshot API, hourly sampling

## Tech stack

Node.js (ESM, >=22.13) / SnowLuma SDK (OneBot v11 over WebSocket) / DSH 2.0.18 Web API (cookie auth + remote.mux event stream) / three MCP stdio servers (zod-validated: messaging, gateway status, safe web search) / ffmpeg (voice and GIF processing) / Windows icacls (state directory ACL) / Git Bash + scheduled tasks (autostart and guard)

## How it was built

**Step 1: get the baseline running.** Started with the 15-minute quick start — bring up the SnowLuma gateway, connect DSH, verify two-way delivery — then rolled out the full implementation following the build-your-own tutorial. The guiding decision was "make the pipe work first, simulation second": every later feature hangs on the skeleton of real message delivery.

**Step 2: from Q&A to group member.** Added the wake scheduler: which conditions rouse the AI (@/name/keyword/question/poke/probability), how multiple messages merge into one wake (batching window), and per-minute/per-hour wake quotas (overflow defers and retries instead of dropping). The hardest pitfall was **turn-state loss**: after a DSH event-stream reconnect, the turn-end signal might never arrive, leaving the conversation "permanently busy" — on QQ it looks like the AI suddenly stops responding. The fix is a lease (forced release after 15 minutes) plus stashing wake reasons while busy and replaying them when the turn ends, plus transport-failure detection so only "the request never reached DSH" is retried. Another pitfall was wake deliveries failing silently — they now go into a replay queue and are re-delivered on recovery.

**Step 3: multimedia and memory.** Two upstream limits surfaced while adding stickers, voice, and GIFs: DSH's MCP image entry validates base64 with a regex that inevitably overflows the stack at ≥3.2MiB, so the bridge normalizes first (downscale/re-encode); and DSH flattens every GIF to its first frame, leaving the model blind to animation — so ffmpeg samples frames into a tiled contact sheet (measured: 4.8MB/200 frames → 92KB/269ms). Memory follows a per-person ledger plus a cross-session log, under one iron rule: group chats never receive any private-chat content, so the AI can never retell a private conversation into a group.

**Step 4: security, forced by reality.** Once group members could coax the AI into calling send tools through conversation, prompt injection stopped being theoretical. Layer by layer came: per-session tokens (one per QQ conversation; the AI's tools can only touch their own conversation), outbound text audit (blocking local paths/credential patterns), an exact-token redaction list (a bare 32-hex token matches no regex — only a list can catch it), pre-send permission re-checks (a send queued before a permission change is abandoned), and ACL hardening of the state directory. Even that last step hit an icacls pitfall: applying the directory-only (OI)(CI) flags over a /T file tree fails after /inheritance:r has already stripped inherited ACEs — net result, child files left with empty DACLs. The lesson from the fix: the read-back self-check must exclude the DSH sandbox's Low-integrity label line, or "already hardened" is misjudged as "not hardened" and the destructive command repeats on every boot.

**Step 5: soak acceptance.** A bot isn't done when it starts: it ran 24–72 hours with hourly sampling of memory/handles/queues; fault injection verified the guard restarts it within 5 seconds of a kill, the exit-3 retry loop on an occupied port 3100, and quarantine-plus-recovery for deliberately corrupted state files. The regression suite grew from a dozen scripts to 45. A final 25k-line full code audit fixed 2 P1s (a message-drop window in the wait tool, a keyword regex-injection hazard) and 15 P2s, holding the suite at 43/45 (the 2 failures are missing environment items). Only when everything stayed green did I dare to leave it running unattended.
