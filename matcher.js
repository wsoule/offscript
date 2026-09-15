// Script/speech matching for the teleprompter.
// Works both in the browser (window.Matcher) and Node (module.exports) so it can be unit tested.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Matcher = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // Lowercase, strip anything that isn't a letter/number. "Hello," -> "hello"
  function normalize(word) {
    return word.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/'/g, '');
  }

  // Break a script into tokens. Bracketed text like [pause] or [show slide]
  // becomes a "direction" token that is displayed but never matched against speech.
  function tokenize(script) {
    const re = /\[[^\]]*\]|\n+|\S+/g;
    const tokens = [];
    let m;
    while ((m = re.exec(script)) !== null) {
      const text = m[0];
      if (text[0] === '[') tokens.push({ type: 'direction', text });
      else if (text[0] === '\n') tokens.push({ type: 'break', text, count: text.length });
      else tokens.push({ type: 'word', text, norm: normalize(text) });
    }
    return tokens;
  }

  // Levenshtein distance, only used for short strings so a naive DP is fine.
  function editDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return dp[a.length][b.length];
  }

  // Speech recognition mishears things; be lenient on longer words.
  function similar(a, b) {
    if (a === b) return true;
    if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
    if (a.length >= 5 && b.length >= 5 && editDistance(a, b) <= 1) return true;
    return false;
  }

  // Given the last few spoken words, find where the speaker is in the script.
  //
  //   spoken    - array of normalized words the speaker just said (most recent last)
  //   words     - array of normalized matchable script words
  //   pos       - index of the next script word we expect to hear
  //   lookahead - how far ahead of pos we're willing to jump (a few words, not paragraphs)
  //   minMatch  - how many consecutive words must match before we move
  //
  // Jumps beyond the next few words require one extra matching word, so a stray
  // "and the" mid-riff can't skip the speaker ahead.
  //
  // Returns the new position (index after the matched phrase), or null if the
  // speech didn't match anything ahead - i.e. the speaker is riffing, so stay put.
  function findAdvance(spoken, words, pos, lookahead, minMatch) {
    lookahead = lookahead == null ? 10 : lookahead;
    minMatch = minMatch == null ? 2 : minMatch;
    const nearJump = 3; // jumps past this many skipped words need minMatch + 1
    const end = Math.min(words.length, pos + lookahead);
    const maxN = Math.min(spoken.length, 4);
    for (let n = maxN; n >= minMatch; n--) {
      const tail = spoken.slice(-n);
      // Allow the phrase to start slightly behind pos (re-reading the last word
      // or two is normal), but it must end at or past pos so we only go forward.
      const start = Math.max(0, pos - n + 1);
      for (let p = start; p + n <= end; p++) {
        let ok = true;
        for (let i = 0; i < n; i++) {
          if (!similar(tail[i], words[p + i])) { ok = false; break; }
        }
        if (ok && p + n > pos) {
          const skipped = p - pos;
          if (skipped > nearJump && n < minMatch + 1) continue;
          return p + n;
        }
      }
    }
    return null;
  }

  return { normalize, tokenize, similar, findAdvance, editDistance };
});
