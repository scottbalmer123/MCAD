# MedDispatch CAD

Responsive medical CAD built for Firebase with three operational views:

- `Call taker`: captures incoming calls and creates a job with an AMPDS-inspired determinant ladder.
- `Dispatcher`: monitors live incidents, assigns units, and watches status/location updates in real time.
- `Unit console`: designed for an iPad workflow where a crew logs in, updates status, and streams GPS telemetry.

This is a browser-based web app. It can be deployed to Firebase Hosting and opened on desktop, iPad Safari, or other modern browsers.

## Important note on AMPDS

This project includes a **sample determinant structure inspired by AMPDS** so the workflow is usable immediately. It does **not** include the proprietary AMPDS card set or scripted clinical content. Replace the sample protocol list with your licensed AMPDS content before operational use.

## Stack

- React + TypeScript + Vite
- Firebase Auth (email/password roles), Firestore, and Hosting
- Web app manifest + service worker for installable/PWA behavior
- Demo fallback mode when Firebase environment variables are not configured

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy [.env.example](/Users/scottbalmer/Desktop/CAD Software/.env.example) to `.env` and fill in your Firebase project values.

3. Enable these Firebase products:

   - Authentication with `Email/Password` sign-in
   - Cloud Firestore
   - Firebase Hosting

4. Start the app:

   ```bash
   npm run dev
   ```

## iPad web app use

- Open the deployed site in Safari on the iPad
- Use `Share` -> `Add to Home Screen` to install it like an app
- Allow location access so unit telemetry can stream back to dispatch

The included service worker caches the app shell only. Realtime CAD data still depends on Firebase connectivity.

## User roles

Every live user needs both:

1. A Firebase Authentication email/password account
2. A matching Firestore document at `users/{uid}`

Required fields in `users/{uid}`:

- `displayName`: string
- `role`: `dispatcher`, `call-taker`, or `unit`
- `active`: boolean
- `allowedUnitId`: string for `unit` accounts, otherwise null or omitted

Example unit profile:

```json
{
  "displayName": "North MICA iPad",
  "role": "unit",
  "active": true,
  "allowedUnitId": "MICA401"
}
```

Role behavior:

- `dispatcher`: can read/update incidents, units, and status events
- `call-taker`: can create incidents and read the incident queue
- `unit`: can only operate the assigned `allowedUnitId` and read incidents assigned to that unit

## Firestore collections

- `incidents`
  - active CAD jobs created from the call-taking form
- `units`
  - vehicle/device sessions, current status, active incident, latest location
- `statusEvents`
  - activity feed for assignments, status changes, and job creation

## Deploy

1. Build the app:

   ```bash
   npm run build
   ```

2. Deploy with the Firebase CLI after configuring your project:

   ```bash
   firebase deploy
   ```

## Operational hardening still required

- Migrate Firestore role documents to custom claims/Cloud Functions for stronger admin control
- Lock down Firestore rules by role and service region
- Add audit trails, QA review, and offline sync strategy
- Replace sample determinant content with licensed AMPDS or your approved protocol library
- Validate incident geocoding and AVL update intervals against your local policy
