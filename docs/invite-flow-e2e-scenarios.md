# Invite Flow E2E/Integration Scenarios

## 1. Authenticated user opens invite link
1. Sign in as user that is not a member of target team.
2. Open `/invite/:code` in browser.
3. Verify pre-check request `GET /team-invites/:code` is called.
4. Verify accept request `POST /team-invites/:code/accept` is called immediately.
5. Verify redirect to `redirectPath` from accept response.

Expected:
- User lands on target board.
- No pending invite remains in `localStorage` (`retro.pendingInvite` absent).

## 2. Unauthenticated user opens invite, then logs in
1. Sign out.
2. Open `/invite/:code`.
3. Verify `retro.pendingInvite` is written with `{ v: 1, code, source: "invite", createdAt }`.
4. Verify redirect to `/auth`.
5. Complete login or registration.

Expected:
- App calls `POST /team-invites/:code/accept` after auth success.
- User is redirected to `redirectPath`.
- `retro.pendingInvite` is deleted.

## 3. Invalid invite link
1. Open `/invite/:invalidCode`.
2. Ensure backend returns `404` for `GET /team-invites/:code` or `POST /team-invites/:code/accept`.

Expected:
- Invalid invite screen is shown.
- `retro.pendingInvite` is removed.
- Retry is not shown for invalid state.

## 4. Pending invite cleanup
1. Repeat scenario 2 and force each terminal result:
   - success
   - invalid (404)
   - non-401 terminal failure (network/server)
2. Inspect `localStorage`.

Expected:
- `retro.pendingInvite` is removed for each terminal result.
- For `401` accept response, pending state is preserved and user is redirected to auth.

## 5. Share modal copies correct URL
1. Open board as `OWNER` or `ADMIN`.
2. Open board settings and click `Поделиться`.
3. Verify request `POST /retro/boards/:boardId/share-link`.
4. Click `Скопировать ссылку`.

Expected:
- Clipboard contains URL with frontend route format `/invite/:code`.
- Success toast `Ссылка скопирована` is shown.
