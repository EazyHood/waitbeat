# Waitbeat

A small musical waiting experience for AI agents. Build a four-track, sixteen-step drum loop while a task runs. When the task resolves, fails or is cancelled, scheduled sound fades out and the interface returns to the result. The pattern remains on the device for the next wait.

Built for Commonsmade's **Make Waiting for AI Fun** (August 27–September 17, 2026).

## What is real, and what is simulated

- Real: editable sequencer, synthesized Web Audio drums, tempo control, pause/mute, device-local pattern, interruption and failure handling, a provider-independent Promise adapter, and page tools for supported WebMCP browsers.
- Simulated: the three demo agent tasks use explicitly labelled delays and prepared responses. They do not call an AI model. This project does not claim a live integration with an AI provider or with Commonsmade's x402 services.
- No microphone, external API key, account, payment, or model credit is needed to use the standalone prototype. Google Fonts is the only external runtime asset request; system fonts are fallback.

The idea is an activity that does not need to be finished. A loop has no score or failure screen to dismiss. Completion of the main task takes priority over playback, and a hidden tab pauses sound without cancelling the main task.

## Run

Serve `dist/` with a local static server, for example `python -m http.server 5187 --directory dist`, then open `http://localhost:5187`. No dependency installation or build is needed. ES modules require HTTP, not a `file:` URL. Node 24 can run `npm test` or `node --test test/*.test.mjs`.

1. Toggle steps and choose a tempo.
2. Choose a demo task and delay, then **Start a wait**. Sound is off by default.
3. Choose **Sound on** to hear the synthesized loop.
4. Use **Answer now**, **Cancel task**, or let the demo finish. Playback stops; the pattern remains.
5. Start another wait to reuse or change it. No personal data is stored.

On narrow screens each sixteen-step row wraps into two groups of eight, or four groups of four on the smallest screens. Every step is a native button with track, step number and pressed state. All actions work with keyboard navigation.

## Connect a real agent

`dist/core.js` exports `createTaskBridge(onState)`. This is an integration seam, not an installed integration. Replace the demonstration task with a real asynchronous function you control:

```js
import { createTaskBridge } from './core.js';
const bridge = createTaskBridge(state => {
  if (state.phase === 'waiting') showWaitingExperience();
  else {
    stopSequencer();
    showResultOrFailure(state);
  }
});
await bridge.start(async signal => {
  const response = await fetch('/your-agent', { signal });
  if (!response.ok) throw new Error('The agent request failed.');
  return response.text();
}, { timeoutMs: 120000 });
// Cancel user-requested work: bridge.cancel().
```

Keep provider credentials on your server. The bridge blocks overlapping tasks, aborts cancellation/timeouts, and ignores late results from older runs. A provider must respect the AbortSignal to actually stop its remote work; this adapter cannot guarantee remote cancellation.

## Validation and limits

Tests cover state transitions, rejection, immediate cancellation, stale results, timeouts, bounded tool inputs, and audio scheduling cleanup with a fake AudioContext. They do not constitute listening tests on all browsers. Performance, satisfaction, commercial impact, and repeat usage have not been measured with users.

WebMCP is optional; the normal interface does not depend on it. The state tool is read-only; rhythm changes update the same state as the grid. Starting a demo does not grant audio permission or make an external AI call.

Code was created with Codex and independently reviewed by another agent. Original application code is MIT licensed. No third-party song, sample, or audio recording is included.
