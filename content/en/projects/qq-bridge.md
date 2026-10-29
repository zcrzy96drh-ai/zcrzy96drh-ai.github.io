---
title: "qq-bridge: an AI companion living in QQ, with a persistent persona"
date: "2026-10-29"
draft: false
summary: "Bridges QQ (via SnowLuma OneBot v11) to a local DeepSeek harness: an AI plays a group member with a persistent persona — it joins conversations, goes quiet, sends stickers and voice notes, all behind budget caps and a full safety gate."
---

## What it is

I wanted an AI in my QQ group that feels alive: a fixed persona, memory of what was discussed, and a sense of when to speak and when to stay quiet — not a command-answering bot. qq-bridge connects QQ messages to a long-running local DeepSeek Harness (DSH) session and sends the AI's replies back to QQ: bidirectional, always-on, low-latency.

## Background

An original project written from scratch, currently at v0.2.1-r1. Existing QQ bot frameworks are built around command-style interaction; what I wanted was a simulated group member — one that chimes in, plays dead, and trades stickers. DSH provides the sessions and tool surface, SnowLuma provides the OneBot v11 gateway, and this project is the scheduling, safety, and state-management layer in between.

## Key features

- Simulation mode (reserved2): a wake scheduler rouses the AI on @/name/keyword/question/poke/probability triggers, with a batching window and per-minute/per-hour wake quotas; the AI decides via MCP tools whether to reply or wrap up
- Human-feel delivery: array-based message splitting, randomized inter-message gaps, long-gap probability, per-message character caps, hard per-minute/per-hour send limits
- Multimedia: reading and sending images/stickers/animated GIFs (frame-sampled contact sheets)/voice (ffmpeg loudness normalization)/merged forward histories
- Slang learning: auto-extracts candidate terms, researches them online, and injects a confirmed slang table into prompts, with manual review in the console
- Long-term memory: a per-person ledger plus a cross-session chat log, so the AI knows the same person across private and group chats
- Budget guardrails: token-ledger-based pricing, daily soft caps, midnight rollover with resume, and a daily spend report to the admin
- Safety boundaries: per-session tokens with constant-time comparison, sensitive-content audit and redaction on outbound text, dual-gate token-leak prevention, ACL hardening of the state directory (Windows icacls), and fail-closed session creation when preset validation fails
- Long-run resilience: message queue-and-replay during DSH/SnowLuma outages, .corrupt quarantine with read-only degradation for damaged state files, token self-healing, and 5-minute heartbeats with runtime snapshots

## Tech stack

Node.js (ESM, >=22.13) / SnowLuma SDK (OneBot v11 over WebSocket) / DSH 2.0.18 Web API (cookie auth + remote.mux event stream) / three MCP stdio servers (zod-validated: messaging, gateway status, safe web search) / a 45-script offline regression suite (`test:audit`)

## How it was built

The hard part was never sending messages — it was state. Wake scheduling, unread watermarks, sleep timers, and send queues were scattered across tens of thousands of lines, and any missed cleanup turned into a silent failure. All teardown paths were eventually unified into one cleanup function, and every state file adopted a "quarantine on corruption, never write back" policy. The second pitfall was security: group chat content is untrusted input, so the AI's send tools must be authorized per-session token and outbound text must be audited — otherwise one prompt injection could make the bot paste local paths into the group. Finally came a 24–72-hour soak acceptance run: hourly sampling of memory/handles/queues, fault injection (killing processes, occupying ports, corrupting state files). Only when everything stayed green did I dare to leave it running unattended.
