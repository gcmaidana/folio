# Folio iteration log

Folio was created with GPT-6 Astra through Codex. The project owner defined requirements, reviewed results, and directed improvements; AI agents implemented the code. This log highlights that process through concrete changes rather than counting prompts or generated lines of code.

Entries are newest first. Dates use America/Chicago. Earlier entries were reconstructed from the repository history and development conversation; related work is grouped into milestones. Validation describes checks performed at the time, not a guarantee of future provider availability.

## October 31, 2026

### Added Folio’s soft F favicon

- **Feedback:** Replace the default browser icon with a simple, modern mark without sharp corners. Selected the soft F after reviewing two rounds of concepts.
- **Change:** Added a lime favicon with a rounded charcoal F and changed the browser title to “Folio · Stock Analysis.” The vector icon stays crisp at different sizes.
- **Validation:** Reviewed the selected design at 16 and 32 pixels in light and dark tab mockups; production build passed and includes the favicon asset.

### Refined the logo tiles

- **Feedback:** Square logo backgrounds looked like smaller boxes inside rounded holders.
- **Change:** Removed excess padding, matched the tile background to the image theme, and applied the holder’s rounded corners to the image. Missing-image initials retain their original appearance.
- **Validation:** Reviewed the local NVIDIA preview alongside Apple, Microsoft, and Alphabet in the sidebar; production build passed.

### Added company logos with reliable fallbacks

- **Requirement:** Show company logos without a new account or an attribution badge; keep initials when a logo is unavailable.
- **Change:** An initial AnyLogo trial returned a malformed Apple image. Switched to exact-symbol logo metadata from the existing Yahoo source, preferring dark-theme images. Shared requests between logo tiles and the market snapshot, and kept initials for missing or failed images.
- **Validation:** Checked Apple, NVIDIA, Microsoft, and Alphabet against Yahoo, inspected the local preview, and passed 42 automated tests plus the production build. Deployed the matching Worker and verified its live Apple logo response.
- **Code:** [9595397](https://github.com/gcmaidana/folio/commit/9595397)

### Fixed a live deployment mismatch

- **Feedback:** MAX export failed and market snapshot fields disappeared after the website update.
- **Finding:** GitHub Pages had the new frontend, but the Cloudflare Worker still ran older code. The new routes returned HTTP 404, not a Yahoo history-limit error.
- **Change:** Deployed the matching Worker. This was an operational repair, not a new source-code commit.
- **Validation:** The live API returned snapshot statistics and 24,826 daily S&P 500 observations back to December 1927, with the website’s origin allowed.
- **Lesson:** Frontend and backend changes must be deployed together. Worker deployment remains a separate step from the GitHub Pages workflow.

### Made the project easier to evaluate

- Added a screenshot of the live dashboard and a live-site link to the README.
- Added this iteration log, linked from the README and the website’s About tab, so reviewers can follow the development decisions.
- **Screenshot commit:** [1487a0b](https://github.com/gcmaidana/folio/commit/1487a0b)

## October 30, 2026

### Corrected daily performance and chart direction

- **Feedback:** The daily percentage disagreed with the expected market movement, the default chart opened on 1Y, and the price line stayed green on losing days.
- **Change:** Defaulted stock selection to 1D. Daily returns now use the previous session’s close, including the overnight move. Price lines and fills follow the selected period’s return direction. Missing baselines remain unavailable rather than using the preceding intraday bar.
- **Validation:** Added an overnight-loss regression case, including a −1.77% daily result even when intraday prices rise. All 30 tests and the build passed.
- **Code:** [b3d0e86](https://github.com/gcmaidana/folio/commit/b3d0e86)

### Expanded and corrected the market snapshot

- **Requirement:** Add familiar stock facts such as market cap, P/E, dividend yield, dividend amount, and 52-week extremes.
- **Change:** Loaded company statistics separately from chart history. Used session values for daily high, low, and volume. Labeled the actual latest dividend payment instead of assuming every company pays quarterly. Removed “Workspace” from navigation to reflect a public site without accounts.
- **Validation:** Checked live stock and index responses; missing or inapplicable statistics stay blank. All 33 tests and the build passed.
- **Code:** [74c9157](https://github.com/gcmaidana/folio/commit/74c9157)

### Clarified CSV ranges and enabled full daily exports

- **Feedback:** The meaning of 5D exports was unclear, and long-established companies needed usable all-time exports.
- **Change:** Enforced the latest five trading dates in the exchange’s time zone; those dates can span more than five calendar days. MAX exports fetch available daily history independently of the monthly chart, using the provider’s first-trade timestamp rather than a 1970 cutoff. Filenames include the interval and actual date coverage. Exports omit indicator warmup and comparison data and report failures explicitly.
- **Validation:** Tested session boundaries, missing values, duplicate observations, and a 25,000-row export. Live checks returned IBM history from 1962 and S&P 500 history from 1927. Verified the browser’s MAX download confirmation. All 40 tests and the build passed.
- **Code:** [a1afb54](https://github.com/gcmaidana/folio/commit/a1afb54)

### Explained the AI-directed development process

- Added an About tab crediting GPT-6 Astra and Codex and describing the owner’s role in specification, review, debugging, and iteration.
- Included the daily-return correction as a concrete example of evaluating and improving agent-generated work.
- **Code:** [a1afb54](https://github.com/gcmaidana/folio/commit/a1afb54)

## October 27, 2026 — Recorded project baseline

The initial repository contained stock search, multiple chart ranges, moving averages, ticker comparisons, a browser-local watchlist, analytics, and CSV export, with a React/TypeScript frontend and Yahoo retrieval through a Cloudflare Worker. The README recorded daily-percentage and CSV-export concerns that became later iterations.

This baseline summarizes the initial repository; the earlier development sequence is not reconstructed as individual milestones.

## Maintaining this log

For future meaningful changes, add a dated entry with the user feedback or requirement, the resulting behavior, and the validation actually performed. Link the relevant commit when available. Record deployment work separately from code pushes and keep unresolved limitations explicit. Keep detailed history here; the README and About tab should remain concise entry points.
