# D Shift Christmas Meal vote

Anonymous venue and date voting, with a manual venue list and an editable participant count (12 by default).

## Organiser flow

1. Sign in using **Organiser sign-in** on the live site, or open localhost on your laptop.
2. For a fresh poll, enter the venue suggestions collected by email, one per line. Enter 2 to 20 distinct venues. All entries appear in the venue vote; staff no longer need to nominate on the website.
3. Set **Expected participants**, initially 12, and open the venue vote. You can change this number at any time in Organiser controls as the group changes (1 to 100). It cannot be lower than the attendance replies already received, or the votes plus declines in the current round.
4. Close venue voting when ready. A tie requires another vote between the tied leaders; each runoff starts with a fresh response count.
5. Contact the winning venue and check dates against the work rota. Enter three available dates and open the date vote. Choose all dates people can attend, or a single favourite date. Date runoffs always accept one choice per person.
6. Close date voting. A unique winning date produces a large announcement for guests; tied dates require another runoff.

Before voting, each visitor chooses **I will be attending** or **I won't be attending**. Only confirmed attendees may vote; the backend enforces this for venue and date rounds and every runoff. The participant field is the number invited, initially 12. Declines are subtracted from the voting target; attending, declined and awaiting-reply totals are visible to everyone. Once a winning venue is chosen, attendees may change to not attending before casting a date ballot, even if they voted for the venue. Completed venue points remain intact. Declines reduce the date voting target and block date ballots; people may rejoin before voting. Once someone casts a date ballot in the current round, withdrawal is blocked to preserve that ballot. Reset clears attendance too. No names or email addresses are required.

The public count and progress bar update every 10 seconds. Venue and date choice totals stay hidden until each round closes. No names or email addresses are collected with votes.

## Reset and demo

**Reset poll** clears venues, dates and responses after confirmation, keeping the selected participant count. Everyone can vote again. **Load sample responses** replaces the poll with fictional venues and up to 10 sample responses per round, always leaving room for at least one manual response. Reset before inviting real participants.

Existing saved votes are preserved when the software is updated. Older polls without a saved participant count use the new default of 12. Existing nomination rounds remain readable for compatibility; use the manual venue setup if venue voting has not started, or reset when ready for a fresh poll.

## Repeat votes and limits

Every round and runoff enforces the configured participant count as its response limit. A random browser receipt, held in local storage and also in a cookie, blocks repeat voting in the same browser. Signed-in accounts are also checked using a salted hash of their user ID. Anonymous people can still use a different browser/device; this is an informal anonymous poll rather than a verified identity election. The overall response limit still applies. Multiple date selections count as one response.

## Local use

Requires Node.js 20 or later. Run `npm start` (or `node server.mjs`), then open http://localhost:3000. The organiser controls are restricted to localhost. A same-network address is printed for colleagues on your network while the laptop is running. Votes survive restarts in `data/poll.json`; keep private backups and never upload this folder to GitHub.

## Online use

The online version uses Sites hosting and a D1 database. Guests vote anonymously using the public URL. The organiser signs in with ChatGPT; the configured ADMIN_EMAIL is checked on every organiser action and kept in hosting settings. Browser receipts contain no names or emails. Concurrent database updates cannot overwrite another response.

GitHub holds the same source. GitHub Pages alone cannot run this backend. `npm run build` builds the hosted Worker; `npm run db:generate` generates database migrations, applied by Sites during publication. Existing migration files must not be rewritten after publication.

## Checks

`npm test` checks the local server using a temporary isolated poll. `npm run test:online` checks the built Worker against a real SQLite database. Both cover manual venues, changing participant counts, response limits, repeats, tie runoffs, resets and sample votes. The online checks also cover organiser access, concurrent writes, and legacy data.

## Three-point venue ballots

New venue rounds give each attendee exactly three points, allocated as 3 to one venue, 2+1, or 1+1+1. Every submission is one person regardless of its split; results show total points. Venue runoffs also give three points, restricted to tied leaders. Date voting is unchanged. Existing rounds that already contain legacy single-choice ballots keep the original one-vote rule to avoid mixing voting systems; reset for a fresh three-point poll. Old saved ballots and results are preserved.
