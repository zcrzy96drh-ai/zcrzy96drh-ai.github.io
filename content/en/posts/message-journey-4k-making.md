---
title: "46 Milliseconds: Production Notes for a 4K Short About One Message's Round Trip"
date: "2026-10-24"
draft: false
summary: "2:54, 5,223 frames, 29 captions, 17 voice-over groups and 22 sourced facts. These notes document the key technical decisions, implementation and verification data in production order, including a downmix defect that doubled the length of the narration."
cover:
  image: "/images/message-journey/cover-16x9.jpg"
  alt: "A Message's Journey · film cover"
  caption: "2:54 · 3840×2160 · everything generated from code"
  relative: false
ShowToc: true
---

"The second you hit send, this message is about to cross half the planet." This is the opening caption of the film.

The subject is a process that happens every day yet is rarely observed end to end: a message leaves a phone, passes through a cell tower, fibre, DNS, routing tables and a submarine cable, and surfaces on another continent. The film is divided into nine scenes; the final cut runs 2:54 at 3840×2160, with picture, captions, voice-over, music and sound effects all generated from code.

> **Made by: DeepSeek Harness (DSH) + DeepSeek v4.1 Flash**
>
> **Spec: 3840×2160 / 30fps / 2:54 / 5,223 frames**
>
> All code, script, voice-over, mixing, rendering and acceptance testing were produced by DSH + DeepSeek v4.1 Flash. The author's role was the brief, the acceptance criteria and the final review.

The sections below document the key decisions and verification methods in production order; section 9 summarises the finished film and its delivery specifications.

## 1. Establish the Data Before the Visuals

The difficulty of this subject is its data density: 99%, 600+ cables, 1.5 million km, 996,000 routes, 1 ms, 46 ms, 150–200 faults per year. A single incorrect figure undermines the credibility of the whole film.

The first artefact was therefore a **fact sheet** rather than a script: 22 entries, each recording three things — what the film claims, what the source states, and what was simplified. The sheet surfaced three substantive issues:

- **The same institution uses several figures.** ITU writes "approximately 99%" on one page, "estimated 95%" on another, and elsewhere a "99%–99.9%" range. The film adopts "about 99%" and prints the source in the caption.
- **0.37% is not a global share.** The FCC figure is "satellites account for 0.37% of all U.S. international capacity". Writing only "satellites are 0.37%" would substitute a national figure for a global one.
- **150–250 ms has no authoritative statistic.** The range is an engineering estimate for transpacific paths. Both the film and the fact sheet label it an "empirical range" and state that it is not an official statistic.

In the finished film, every cited figure carries a source note; every diagram is marked "not to scale" or "illustrative rows"; the cable route on the map is a great-circle approximation rather than the real cable path. These boundaries appear on screen, not only in the manuscript.

## 2. Technology Choices: Remotion + d3-geo + NumPy

- **Picture**: Remotion, with React components as frames. It outputs 4K H.264 directly, so no PNG sequence is written to disk; any value can be changed and re-rendered.
- **Map**: `d3-geo` with Natural Earth 110m data from `world-atlas`, and great-circle arcs sampled via `geoInterpolate`. Implementation note: the default projection splits the transpacific arc in two; setting the projection centre to 170°E is what renders Shanghai to the US West Coast as one continuous curve.
- **Music and sound effects**: NumPy synthesis. Pads, arpeggios, sub pulses, hi-hats, whooshes and sonar are generated from sines, noise and envelopes, with no sample files.
- **Voice-over**: `edge-tts` with the `zh-CN-XiaoxiaoNeural` voice. Its naturalness is sufficient for narration, and it returns sentence-level timestamps.
- **Verification**: `ffprobe` and `ffmpeg`. Every acceptance criterion is fixed as a command rather than left to subjective judgement.

## 3. Audio-Driven Timeline

An earlier project (the [98-second DeepSeek self-portrait](/en/projects/deepseek-film/)) laid out the scenes first and added narration afterwards, which left captions and speech misaligned and required time-stretching as a remedy. This film inverts the process: **the audio determines the timeline**.

1. The script is split into 29 captions, and adjacent lines are grouped into 17 "breath groups", each synthesised in a single TTS call;
2. `SentenceBoundary` events provide the exact start and end of every sentence;
3. Scene duration = lead-in + group durations + inter-group gaps + tail, rounded up to whole 30fps frames;
4. A single `timeline.json` records scene frame ranges and the absolute time of every caption.

Every later stage reads that file: caption timing, data-card entrances, mark drawing and sound-effect placement all derive from the same set of times, so no cumulative error can arise.

A second implementation detail is that scene starts must be **aligned to frame boundaries** (cumulative `durFrames / 30`), and the audio is laid out on those same boundaries. Scene-level A/V offset is therefore exactly zero frames; cross-correlating the delivered audio against the voice master gives a measured offset of **+0.0 ms**.

{{< figure src="/images/message-journey/frame-01-hook.jpg" caption="Opening: the title rises behind the phone as the first caption appears" align="center" >}}

## 4. Voice-over: From Read-aloud Synthesis to Conversational Delivery

The first voice-over had three problems: it was slow, flat, and read-aloud in character. The causes were independent synthesis per line, one global speaking rate, and uniformly spaced pauses.

The revisions covered three areas:

- **Group-level synthesis**: 2–3 sentences per TTS call, leaving intra-sentence pauses to the model rather than imposing them by concatenation.
- **Per-group rate and pitch**: opening +26% / +4Hz (momentum), undersea −4% / −4Hz (scale), ending −10% / −5Hz (settling), across 17 parameter sets.
- **Textual rhythm**: dashes for pauses, short clauses and rhetorical questions, with stress placed on the figures.

The more important step was converting a subjective impression into assertable metrics. Two hard checks are built into the generation script, and the build fails if either is not met:

```python
assert np.std(rates) > 0.25   # speaking-rate variance: no monotone delivery
assert f0_sd > 15             # pitch variance: no flat intonation
```

Final metrics: 4.57 characters per second (SD 0.32, range 4.01–5.25), F0 standard deviation 52.8 Hz, and a pitch p10–p90 span of 139 Hz.

## 5. The Costliest Defect: Missing Stereo Downmix

After the voice-over was replaced and the first full render completed, the film sounded clearly wrong: the narration appeared to run at half speed, and its drift from the picture increased towards the end.

The diagnosis did not rely on repeated listening. The first step was to measure the fundamental frequency: mean **123 Hz**. A female voice normally sits near 240 Hz, an exact factor of two, which points to **2× time stretching**.

Following that lead into the audio assembly code located the cause precisely:

```python
# scene audio is written as stereo
write_wav(path, np.stack([buf, buf], axis=1))

# read back without downmixing
x = np.frombuffer(w.readframes(n), dtype=np.int16)
buf[i0:i1] += x[: i1 - i0]     # stereo frames treated as mono samples → 2× duration
```

Each stereo frame (two samples, L and R) was written as two consecutive mono samples, doubling the audio length and overlapping the following scene. The audible result was slow playback and loss of synchronisation.

The fix is a single line — downmix on read:

```python
if ch == 2:
    x = x.reshape(-1, 2).mean(1)
```

The assertion matters more than the fix. Every build now checks that the first voiced sample falls within ±80 ms of the first caption. Had that assertion existed in the earlier version, the defective build would never have been delivered.

Post-fix metrics: F0 returned to **236.8 Hz**, and runtime fell from 191.8 s to **174.1 s**, with the global speaking rate raised by a further 10 percentage points.

## 6. Emphasis Marks: Highlighting Figures Without Covering Captions

Audiences retain long sentences poorly and figures well, so the film uses four kinds of mark:

| Type | Count | Examples |
|---|---|---|
| Keyword highlights | 15 | "send", "only wireless leg", "one million routes" |
| Hand-drawn circles | 5 | 1 ms, 200,000, 996,000, 99, 46 |
| Underlines | 3 | IPv4 address, 1.5 million, 150–200 |
| Colour wash | 1 | 150–250 ms |

The implementation consists of three components: `Circled` (two SVG ellipses, offset by a few degrees to approximate a hand-drawn stroke), `Underlined` and `HighlightBlock`. Reveal animations use `pathLength=1` with `strokeDashoffset`, or a `scaleX` wipe from left to right.

Two hard constraints apply:

1. **The marks layer always sits below the captions**, which remain the topmost layer of the frame;
2. Nothing is placed within 240 px above the caption baseline. The number of marks may be reduced, but captions must not be covered.

Two issues arose during implementation: underlines were being obscured by the explanatory text below, resolved by adding bottom margin to the marker container; and the circle component expanded row height when placed in a flex layout, requiring an `inline-block` wrapper.

{{< figure src="/images/message-journey/frame-02-wireless.jpg" caption="Hand-drawn circle around the 1 ms 5G air-interface target; the two ellipses are offset by a few degrees" align="center" >}}

## 7. Three End Cards, One Master Render

The film had to be delivered as three versions, one per rights holder, each ending on its own name with no platform names shown.

Rendering the whole film three times would encode 169 seconds of picture three times over. The approach taken was split rendering:

1. Render the body once (`Body`, 5,073 frames, without the end card);
2. Render the end card three times (`CreditsA/B/C`, 150 frames / 5 s each, with only the name parameter changed);
3. Join with `ffmpeg concat -c copy`, **without re-encoding**.

```bash
ffmpeg -f concat -safe 0 -i listA.txt -i mix.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart out.mp4
```

Join quality is verified by PSNR: the three versions are **pixel-identical at t=100 s** (PSNR = inf) and differ at t=171 s with PSNR 24.1 dB, a difference confined to the end-card text. This confirms that the three versions differ only in the closing page.

{{< figure src="/images/message-journey/credits-A.jpg" caption="Version A end card: copyright belongs to 是天才威🅥, with no platform names on the page" align="center" >}}

## 8. Acceptance: Turning Judgement into Metrics

{{< figure src="/images/message-journey/frame-04-latency.jpg" caption="Three layers on one page: 46 ms theoretical floor, 150–250 ms empirical range, and 43 ms / 13 hops measured locally" align="center" >}}

| Item | Result |
|---|---|
| Resolution / frame rate | 3840×2160 / 30 fps (constant) |
| Frames / runtime | 5,223 / 174.10 s |
| Video | H.264 High@5.1 · CRF 15 · 6.3 Mbps |
| Audio | AAC-LC 48 kHz · −13.2 LUFS · −0.9 dBFS peak |
| A/V offset | +0.0 ms (cross-correlation) |
| Caption lead | 94 ms avg (ahead of speech) |
| End-card hold | 5.0 s · PSNR 64.4 dB vs last frame |
| Playability | full decode, no errors |

A second commonly misread issue is apparent sharpness: the cause is usually insufficient bitrate rather than insufficient resolution. The first pass used CRF 19 and produced only 3.7 Mbps at 4K, with visible banding in dark gradients; CRF 15 raised this to 6.3 Mbps and eliminated the banding.

## 9. The Film and Delivery Specifications

Specification: **3840×2160 / 30fps / 2:54 / 5,223 frames**. Picture, animation, captions, voice-over, music and sound effects are entirely procedurally generated; no stock footage, sample libraries or bundled font files were used. The film is published as 《从手机到海底：一条消息的完整旅程》.

{{< video bilibili="BV16BHN6MEym" embed="1" >}}

{{< figure src="/images/message-journey/frame-03-cable.jpg" caption="Submarine cable cross-section: 600+ systems, ~1.5 million km (TeleGeography 2026)" align="center" >}}

{{< figure src="/images/message-journey/frame-05-close.jpg" caption="Closing: a world connected by fibre" align="center" >}}

The covers were laid out separately per platform rather than cropped from a single master:

{{< figure src="/images/message-journey/covers-3up.jpg" caption="16:9 / 4:3 / 3:4 cover layouts" align="center" >}}

The three versions correspond to three publishing accounts — 抖音「是天才威🅥」, 视频号「叫我胡巴胡巴」 and Bilibili「big胃袋」 — and differ only in the end card, as described in section 7.

## 10. Retrospective: Improvement Priorities

1. **Add unit tests for audio assembly.** Assert channel count, duration and the position of the first voiced sample immediately after reading the file. This single check avoids a full re-render.
2. **Make "captions must not overlap" a hard constraint of the timeline data layer** rather than relying on manual inspection. TTS sentence boundaries carry a trailing pause of about 50 ms; without clamping, two captions appear on screen for two frames.
3. **Determine CRF earlier.** The first full render was completed at CRF 19 before the banding in dark areas was noticed, which required a complete re-render.

---

Project structure: `film/timeline.json` is the single time reference, `tools/build_vo2.py` produces the voice-over and timeline, `tools/build_audio.py` synthesises the score, sound effects and final mix, and `src/scenes/` contains nine scenes plus a parameterised end card.

The 22-entry fact sheet is archived with the project, and every entry records three things: **what the film claims, what the source states, and what was simplified**. This is the part most worth retaining: pictures can be rebuilt, but incorrect data cannot be undone.

---

**Credits**: this film was produced by **DeepSeek Harness (DSH) + DeepSeek v4.1 Flash**, including all code, visuals, voice-over, music and sound effects, rendering and acceptance testing. Each version's end card states only its rights holder, with no platform names.
