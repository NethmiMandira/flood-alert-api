# Flood Alert API

A small serverless API that sends push notifications for the [Flood Alert](https://github.com/NethmiMandira/flood-alert) mobile app. Built with **Next.js** and the **Firebase Admin SDK**, deployed on **Vercel**.

## What it does

When a user submits a flood, landslide or road-blocked report, the app calls this API. The API:

1. Verifies the caller's Firebase ID token
2. Loads the report from Cloud Firestore and checks that the caller created it
3. Sends a push notification to the report's district topic through Firebase Cloud Messaging
4. Marks the report as notified, so it is never sent twice

## Endpoint

`POST /api/notify`

| | |
|---|---|
| Header | `Authorization: Bearer <Firebase ID token>` |
| Body | `{ "reportId": "<Firestore document id>" }` |

| Status | Meaning |
|---|---|
| `200` | Notification sent (or already sent earlier) |
| `400` | `reportId` is missing |
| `401` | Missing or invalid token |
| `403` | The caller did not create this report |
| `404` | Report not found |
| `500` | Server configuration or delivery error |

## Environment variables

| Name | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project id |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |

Never commit these values. For local development put them in `.env.local` (ignored by git); on Vercel add them under Project Settings, then Environment Variables.

## Run locally

```bash
npm install
npm run dev
```

## Notes

- Firebase Admin is initialized lazily, so a missing or invalid key returns a clear `500` instead of breaking the build.
- `jose` is pinned to v4 in `package.json` (`overrides`) for compatibility with `firebase-admin`.