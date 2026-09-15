# Riff Prompter

A voice-tracking teleprompter that lets you go off script.

Live: https://riff-prompter-production.up.railway.app

## What it does

- **Follows your voice.** The highlighted word advances as you speak, using the browser's built-in speech recognition (no server-side audio, nothing is uploaded).
- **Waits while you riff.** Go off script and the cursor stays exactly where you left it. It only moves when you say words that match the script *ahead* of you — it never moves backward.
- **Forgives skipped words.** Drop a few words and it catches up. It looks up to 10 words ahead; skipping more than 3 requires a 3-word match so a stray "and the" in a riff can't pull you forward. It will not jump paragraphs.
- **Stage directions in brackets.** Anything in `[square brackets]` is displayed in blue italics and never expected to be spoken.

## Using it

1. Paste your script and hit **Start prompter**. Allow mic access when asked.
2. Read. The yellow word is where you are.
3. Keys: `space` mic on/off · `←` `→` nudge a word · `esc` back to the editor. Move the mouse for the HUD (font size, mirror flip for beam-splitter rigs, restart).

Your script is saved in the browser's localStorage so it survives a refresh.

Works in Chrome, Edge, and Safari. Firefox has no speech recognition API. Chrome gives the fastest interim results.

## How the matching works

`matcher.js` is the whole brain. Each speech event, the last 2–4 words heard are compared against a sliding window of script words starting at the current position:

```
findAdvance(spoken, scriptWords, pos, lookahead = 10, minMatch = 2)
```

- Tries the longest tail first (4 words, then 3, then 2) and returns the position after the earliest match that ends past `pos`.
- Word comparison is lenient: exact match, shared prefix for words ≥ 4 letters, or edit distance ≤ 1 for words ≥ 5 letters, to absorb speech-recognition mishears.
- No match → returns `null` → the cursor stays put. That's the riff.

Tuning knobs live in one call in `index.html`: `Matcher.findAdvance(heard, words, pos, 10, 2)`.

## Development

```
npm test        # unit tests for the matcher (node --test)
npm start       # serves on http://localhost:3000
```

Note: speech recognition needs a secure origin. `localhost` counts, so local dev works; a plain `file://` open does not.

## Deploy

Hosted on Railway. Zero-dependency Node server (`server.js`) serves two files. From this folder:

```
railway up
```

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole UI — editor view, prompter view, speech recognition wiring |
| `matcher.js` | Tokenizer + forward-only fuzzy matcher (browser and Node) |
| `matcher.test.js` | Unit tests for the matcher |
| `server.js` | 15-line static server |
