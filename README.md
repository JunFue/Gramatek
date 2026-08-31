This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Synchronous Live Sessions (Architecture & Realtime Budget)

Gramatek supports synchronous **Live Sessions** for classrooms in two modes:
- **Individual Mode:** Teacher hosts question cards in real-time, students submit answers individually, live leaderboard with first-correct-answer recognition.
- **Group Mode:** Students are split into groups, elect/assign a leader, and only the leader submits answers while members collaborate outside the app.

### Realtime Message-Budget Reasoning & Supabase Free-Tier Compliance
Supabase Free Tier limits:
- Max **200 concurrent realtime connections**
- Max **2,000,000 realtime messages / month**
- Max **500MB Postgres database storage**

To stay safely within free-tier boundaries at all times:
1. **Zero Server-Pushed Timer Ticks:**
   - No timers broadcast per-second ticks over Supabase Realtime.
   - Timers are computed strictly client-side from a single `question_started_at` timestamp + `time_limit_seconds`.
   - Each client calibrates clock skew once on mount via `get_server_time()` (`serverOffset = server_time - local_time`).
2. **Server-Enforced Capacity Cap (Max 50 Users):**
   - Each live session enforces a hard maximum of 50 concurrent participants (1 teacher + up to 49 students) via database `CHECK (capacity >= 1 AND capacity <= 50)` and atomic capacity validation in `join_live_session` RPC.
   - 50 concurrent users consumes only 25% of the 200 free-tier connection limit per active session.
3. **Low Message Fan-out Design:**
   - Lifecycle state transitions (status, current question) only write 1 row update to `live_sessions`.
   - Leaderboard updates subscribe to aggregated score tables (`live_session_participants` / `live_session_groups`), not raw answer streams.
4. **Estimated Message Budget Breakdown per Typical Session:**
   - **Scenario:** 1 session with 50 students, 1 teacher, 10 questions, group mode with 10 groups (or individual mode).
   - Joins / Presence: ~50 join writes + initial state fetch = ~50 messages.
   - Leader election (group mode): ~50 votes total = ~50 messages.
   - Question transitions: 10 questions x 1 session update = 10 messages (broadcast to 50 users = 500 delivery messages).
   - Score / Answer updates: 10 questions x 10 groups (or 50 individual answers) = ~100 to 500 messages.
   - **Total Estimated Realtime Messages per 10-Question Session:** **~700 to 1,200 messages**.
   - With a 2,000,000 monthly limit, the free tier can support over **1,600 full 50-student live sessions per month**.

### Data Retention (Future Task)
To keep DB size under the 500MB free-tier cap indefinitely:
- Periodically archive or delete `live_sessions` (and cascaded `live_session_questions`, `live_session_participants`, `live_session_groups`, `live_session_answers`) older than 90 days where `status = 'ended'`.
- Standings & accuracy summaries can be exported client-side to CSV by educators after each session.

