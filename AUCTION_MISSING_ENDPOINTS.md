# Missing Auction Endpoints

Only endpoints that are **not present** in the current OpenAPI and are required for the new auction flow:

1. `GET /api/lots/{lot_id}/bids`
   - Returns bid history for chart timeline.
   - Suggested fields: `amount`, `created_at`, `bidder_id`, `bidder_name`, `bidder_avatar`.

2. `POST /api/lots/{lot_id}/close`
   - Finalizes one lot when auction time is over.
   - Must set winner, mark lot as completed, and transfer collection ownership.

3. `POST /api/lots/settle-expired`
   - Batch settles all expired lots (for scheduler/cron/manual trigger).
   - Useful to guarantee completion even without active clients.

4. `POST /api/auth/me/avatar`
   - Upload/update current user avatar.
   - Response should include `avatar_url`.

5. `GET /api/users/{user_id}/avatar`
   - Public avatar endpoint for user profile and bid chart timeline.
   - Can return redirect or JSON with `avatar_url`.
