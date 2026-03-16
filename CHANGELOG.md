# WortTrek Vocabulary App – Changelog

-----

## v2.7

*Current release*

### New Features

- **PWA + Offline Support** — App is now installable as a Progressive Web App. Service worker caches all assets on first visit so the app works fully offline.
- **iOS Install Banner** — Floating pill banner guides iOS Safari users through the Add to Home Screen flow (3-step guide). Shows every visit until installed, hidden once running in standalone mode.
- **Confetti Animations** — Teal/mint particle burst on streak milestones (every 5) and session complete screen.
- **My Tips (Mnemonics)** — Add personal memory tips to any word directly in the wrong drawer. Tips persist across sessions. A 💡 hint button appears before answering words that have a tip saved.
- **My Tips Mode** — New mode pill that drills only words with saved tips. Shows count badge, disabled when empty.
- **💡 Indicator in Word List** — Words with tips show a 💡 icon in the word list table. Hover to preview the tip text.

### UI Polish

- Segmented pill bar with horizontal scroll and per-mode glow colours
- Pill reorder: Mixed & Endless → Session → My Mistakes → My Tips → Articles → 🇩🇪→🇬🇧 → 🇬🇧→🇩🇪
- Pill renaming: Mixed & Endless, 🔥 My Mistakes, 💡 My Tips, ⚡ Articles
- Scroll dots below pill bar to indicate scrollable content

### Bug Fixes

- Word list tab was blank due to missing closing `</div>` on mode selector
- Scroll dots listener was re-added on every settings open causing stacking
- iOS install banner check moved from `toggleSettings()` to `init()`
- Mistakes pill text was not updating after JS overwrote it
- Mode switch while on round-complete screen left stale summary visible
- Saving a new mnemonic in the drawer did not update the drawer UI

### Version

- App title updated to WortTrek Vocab V2.7
- Logo updated to `// v2.7`

-----

## v2.6

*Previous release*

### New Features

- **Complete Feedback System Redesign** — Three distinct feedback states with auto-advance timers and a sliding drawer for wrong answers.

|Result   |Color|Auto-advance|UI                                                           |
|---------|-----|------------|-------------------------------------------------------------|
|✅ Correct|Green|1s          |Question word turns green, input flashes green               |
|〜 Lenient|Amber|1.5s        |Struck typo + correct shown in amber, peek bar slides up     |
|❌ Wrong  |Red  |No          |Struck answer + correct in cyan, drawer slides up from bottom|

- **Input Shake** — Submitting an empty answer triggers a shake animation instead of a silent fail.
- **Dynamic Feedback Phrases** — Cycles through randomised feedback phrases (Wunderbar! / So close! / Almost!) instead of static text.
- **Session Mode** — Fixed 30-word session with an end screen showing correct, wrong, accuracy %, time taken, and star rating (⭐ / ⭐⭐ / ⭐⭐⭐).
- **Word Type Expansion** — Added support for 5 new word types: adjective, adverb, conjunction, preposition, phrase, pronoun (8 types total). Each has its own colour-coded tag in the word list.
- **Article Mode Fix** — Article mode now only pulls nouns from the queue. Non-noun types no longer appear in article-only sessions.
- **Article Mode Meaning** — English meaning now shows below the German word in article mode so context is visible while guessing.
- **`also[]` field** — Words now support alternate accepted answers. Synonyms listed in `also` are accepted in DE→EN checking but never shown as questions.
- **Word Database Expansion** — Word list expanded from ~300 to ~2000 entries across all 8 word types.
- **Mixed Unlimited rename** — Mixed mode renamed to Mixed Unlimited to distinguish it from Session Mode.

### UI / Labels

- App title updated to WortTrek Vocab V2.6
- Logo updated to `// v2.6`

-----

## v2.5

### New Features

- **Show Answer Button** — Reveals the correct answer without marking right or wrong. Highlights the correct article button in article mode.
- **Hard Words Weighting** — Words answered incorrectly appear more frequently. 1–2 wrong = +2 weight boost. 3+ wrong = +4 weight boost.

### UI Fix

- Check and Show buttons now align correctly with the answer input bar
- Input re-enabled on each new question (fix: Show button was permanently disabling it)

-----

## v2.4

### Bug Fixes

- Fixed smart/curly quotes throughout `words.js` preventing Chrome from loading words
- Fixed apostrophe on Kinderzimmer entry
- Moved `<script src="words.js">` to correct position before main script

### Refactor

- Split monolithic `index.html` into three files: `index.html`, `style.css`, `app.js`

### New Features

- **Sound Effects** — Web Audio API sounds for correct, wrong, and streak events. Toggle in settings. No audio files required.
- **Lenient Checking** — Small typos forgiven automatically. Umlaut alternatives accepted (ae/oe/ue). “to “ prefix stripped for verbs. Amber feedback shown on lenient pass. Tolerance scales with word length.

### App Rename

- Renamed from **Wortschatz** to **WortTrek**

-----

## v2.3

### Bug Fixes

- Fixed Chrome localStorage compatibility issue
- Fixed smart quote encoding in word data

### New Features

- Hard Words mode with wrongCount tracking
- Strength bar per word (5 dots)
- Haptics toggle in settings
- Theme switcher (system / light / dark / pastel)
- Virtual scroll for word list (300+ words performant)
- Import tool (bulk add words via text)
- About modal
- Save indicator (✓ saved)
- Round complete screen with accuracy stats

-----

## v2.0 — Beta

*Structured rebuild*

### New Features

- SRS weighted queue
- Article quiz (der/die/das buttons)
- Auto-play toggle
- Add / delete words
- localStorage persistence (v2 format)
- Score tracking (correct / wrong / streak)
- Progress bar

-----

## v1.0 — Alpha

*Initial release*

- Core practice loop (Mixed, DE→EN, EN→DE modes)
- Text-to-speech pronunciation
- Basic word list with 300 entries
- Simple correct / wrong answer checking

-----

## Backlog

|F     |Feature                                              |Status                      |
|------|-----------------------------------------------------|----------------------------|
|F 1.1 |Persist stats + daily streak                         |📋 Backlog                   |
|F 1.2 |Lenient checking                                     |✅ v2.4                      |
|F 1.3 |Hard Words weighting                                 |✅ v2.5                      |
|F 1.4 |Smart Reversal — direction-aware SRS                 |📋 Backlog                   |
|F 1.5 |Ghost Typos — lenient words reappear within 3–5 turns|📋 Backlog                   |
|F 1.6 |Spaced Repetition (SRS)                              |📋 Backlog                   |
|F 2.1 |Export button                                        |📋 Backlog                   |
|F 2.2 |Enhanced round-complete screen                       |📋 Backlog                   |
|F 2.3 |Mobile keyboard fix + confetti                       |✅ v2.7                      |
|F 2.4 |Bulk Export                                          |📋 Backlog                   |
|F 2.5 |Clear All Words                                      |📋 Backlog                   |
|F 2.6 |Undo last delete                                     |📋 Backlog                   |
|F 3.1 |Categories                                           |📋 Backlog                   |
|F 3.2 |Mnemonics / My Tips field                            |✅ v2.7                      |
|F 3.3 |Voice fallback message                               |✅ v2.6                      |
|F 3.4 |Confusion pairs                                      |📋 Backlog                   |
|F 3.5 |Word notes                                           |🗑 Dropped — covered by F 3.2|
|F 4.1 |Show answer button                                   |✅ v2.5                      |
|F 4.2 |Complete feedback system redesign                    |✅ v2.6                      |
|F 4.3 |Sound effects                                        |✅ v2.4                      |
|F 4.4 |Offline-first / PWA                                  |✅ v2.7                      |
|F 4.5 |Input shake                                          |✅ v2.6                      |
|F 4.6 |Dynamic feedback phrases                             |✅ v2.6                      |
|F 4.7 |Confetti animations                                  |✅ v2.7                      |
|F 5.1 |Normal / Free Practice                               |✅ existing                  |
|F 5.2 |Daily Goal / Target Cards                            |📋 Backlog                   |
|F 5.3 |Timed Round                                          |📋 Backlog                   |
|F 5.4 |Weak Words First / Hard Review                       |📋 Backlog                   |
|F 5.5 |New Words Only                                       |📋 Backlog                   |
|F 5.6 |Category Drill                                       |📋 Backlog                   |
|F 5.7 |Speed Drill / Blitz                                  |📋 Backlog                   |
|F 5.8 |No-Skip Marathon                                     |📋 Backlog                   |
|F 5.9 |Production Marathon (EN→DE only)                     |📋 Backlog                   |
|F 5.10|Infinite Streak Challenge                            |📋 Backlog                   |
|F 5.11|Combo / Multiplier Mode                              |📋 Backlog                   |
|F 5.12|Listening Drill (TTS → type what you hear)           |📋 Backlog                   |
|F 5.13|Audio-Only Surprise                                  |📋 Backlog                   |
|F 5.14|Session Mode — 30-word session with end screen       |✅ v2.6                      |
|F 5.15|Mastered Words filter                                |📋 Backlog                   |
|F 5.16|My Tips mode — drill words with mnemonics            |✅ v2.7                      |
|F 6.1 |AI Import Assistant                                  |📋 Backlog                   |
|F 6.2 |Progress Dashboard                                   |📋 Backlog                   |
|F 6.3 |Personal Bests                                       |📋 Backlog                   |
|F 6.4 |Weak Spot Report                                     |📋 Backlog                   |
