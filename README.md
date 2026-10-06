# Cardiff Christmas meal vote



A local, three-round anonymous poll. No external services, packages, names or email addresses. Requires Node.js 20 or later.



## Run



Open this folder in a terminal and run `npm start` (or `node server.mjs`). Open http://localhost:3000 on the organiser’s laptop.



1. Open nominations. Each colleague suggests one favourite Cardiff venue anonymously. Existing suggestions appear as typing hints. Differences in case, spacing and punctuation are combined; different spellings or aliases are not automatically combined.

2. Close nominations. The top five venues are selected for the shortlist vote. If there is a tie at the cutoff, the organiser chooses between tied venues; venues with higher totals must be included. If fewer than five distinct venues were suggested, all go through. Open the shortlist vote; each colleague chooses one venue.

3. Close the venue vote. Only the highest voted venue can be selected, or one of the tied winners. Contact that venue and check three available dates against the work rota. Enter those dates and open the final vote. Choose either all dates a colleague can attend (the default) or one favourite date. Close the date vote to reveal totals.



Closing a round is final. Ties are decided by the organiser; results do not claim a booking has been made. Colleagues should refresh the page when a new round opens.



On this laptop, the bundled Node executable can also run the server:



```powershell

& 'C:\Users\steve\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\server.mjs

```



## Share locally



The server prints a same-network voting address. Colleagues connected to the same network can open that address while the laptop and server remain running, subject to firewall and network access rules. Organiser controls require localhost on your laptop. Colleagues elsewhere cannot access this local address. Do not forward a router port for this prototype.



## Privacy and vote limits



The application does not collect names, email addresses or store IP addresses, and contains no analytics or external assets. Votes and hashed, random browser receipts are stored locally in `data/poll.json`. Separate cookies are used for each round. The cookie discourages repeated voting in the same browser; private windows, cleared cookies and different devices can bypass this. It is an anonymous informal poll, not a verified one-person-one-vote system. Availability mode allows each person to select several dates, so percentages need not add to 100%.



## Storage and future hosting



Votes survive server restarts. Back up the data folder privately; it is excluded from Git. Closing each round is final. For a new poll, stop the server and move the data folder to a private backup before restarting.



You can later store this project in a GitHub repository. GitHub Pages serves static pages and cannot run this server or store shared votes: an online version will need a hosted backend and organiser authentication. This version is intended for local laptop use.



## Participation count



Each round shows the number of responses out of 11 and automatically refreshes that total every 10 seconds without clearing form entries. A response selecting several dates counts as one person, not several votes. At 11 responses it displays a completion message; the organiser still closes the round manually. The count measures submitted responses, not verified identities. More than 11 responses is shown explicitly rather than hidden.



## Reset and demo



Organiser controls include **Reset poll**, which clears all rounds after confirmation and lets the same browsers vote again. **Load 10 sample responses** replaces the poll with a clearly labelled demo. It opens nominations with ten fictional responses across six fictional venues, leaving you to add the eleventh. When you open each later round it also contains ten sample votes; add your own eleventh vote and close the round. Reset before inviting real colleagues; sample responses are not carried into the real poll.



## Tied venue and date votes



When a venue or date round closes, tied highest-scoring choices are highlighted. The organiser must open a runoff between those choices. Everyone votes again, choosing exactly one option, with a fresh participation count for that runoff. Further ties require another runoff; date voting cannot start until the venue has a single winner. The nomination shortlist cutoff still uses the existing organiser selection rule. Demo runoffs contain ten sample votes.


If two or more venues tie for the highest nomination total, only those tied leaders enter the venue vote. Lower-ranked nominations are excluded. Otherwise the normal top-five shortlist applies.

## Online hosting

The online version uses Sites hosting with a D1 database. The guest page is public and anonymous; use **Organiser sign-in** to sign in with the ChatGPT account matching the configured organiser email. Every organiser API action is checked on the server. Reset and sample-vote controls are unchanged. Online polls start empty; local saved votes are never uploaded.

Build the online version with `npm run build`. `node verify-online.mjs` checks the generated Worker against a real SQLite database, including concurrent submissions. Database migrations are generated with `npm run db:generate` and applied by Sites during publishing. ADMIN_EMAIL is stored as a private hosting setting, never in the browser or GitHub. GitHub contains the same source; GitHub Pages alone cannot host the vote backend.
