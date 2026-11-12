
# AI Failure Audit – PUBG Vietnam Championship

## Project Overview
This project simulates a PUBG Vietnam Championship website with an airdrop countdown, ticket claiming system, and team leaderboard.

The following cases document potential AI-generated code failures discovered during development and testing.

## Failure Case 1: Countdown Timer Drift

- **Problem:** A countdown based only on decrementing a counter every second may become inaccurate when the browser tab is inactive or the device is delayed.
- **Impact:** The displayed event time may drift away from the actual target time.
- **Fix:** Calculate the remaining time using an absolute target timestamp and `Date.now()`. Recalculate when the browser tab becomes visible again.
- **Testing:** Leave the tab inactive, return to the page, and verify that the countdown updates based on the current time.

## Failure Case 2: Optimistic Claim Without Rollback

- **Problem:** The UI may immediately show a successful ticket claim before the server confirms the request.
- **Impact:** Users may see incorrect ticket and G-Coin balances if the server rejects the request.
- **Fix:** Save the previous state before updating the UI. If the simulated API returns HTTP 409 Conflict, restore the previous values.
- **Testing:** Click "Mô phỏng lỗi 409" and verify that the ticket stock, claimed tickets, and G-Coin balance return to their previous values.

## Failure Case 3: Duplicate Ticket Requests

- **Problem:** Users may click the claim button multiple times while a request is still processing.
- **Impact:** Duplicate requests could cause incorrect reward balances or multiple claims.
- **Fix:** Use a request lock with `useRef` and disable the claim buttons while processing.
- **Testing:** Click the claim button repeatedly and verify that only one request is processed at a time.

## Failure Case 4: Incorrect Leaderboard Sorting

- **Problem:** Sorting teams by one score field may accidentally use the wrong field or sort in the wrong direction.
- **Impact:** Teams may appear in an incorrect ranking order.
- **Fix:** Calculate total points from Placement Points and Kill Points, then sort using the selected field and sort direction.
- **Testing:** Click WWCD, PLACEMENT, KILLS, and TOTAL to verify ascending and descending sorting.

## Limitations

- The ticket claim API is simulated locally; no real backend request is sent.
- The leaderboard uses sample data and is not connected to a live PUBG data source.
- The countdown uses a local demonstration timestamp rather than an official tournament server timestamp.
