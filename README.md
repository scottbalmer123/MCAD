# MACD Prototype

Static HTML prototype for a Medical Computer Aided Dispatch workflow with:

- Dispatcher board
- Call taking form that creates incidents
- Unit/iPad login with status changes
- Browser geolocation or manual location updates
- Dispatcher visibility of unit status and location
- Role-based log on for dispatcher, call taker, and unit iPad access
- Optional Firebase Realtime Database state sync for cross-device updates

## Files

- `index.html`: app shell and views
- `styles.css`: layout and visual styling
- `app.js`: state, rendering, incident creation, unit tracking, dispatcher actions, and backend selection
- `firebase-config.js`: Firebase project config and state path settings
- `firebase-service.js`: Firebase Realtime Database integration
- `assets/`: MACD logo and app icon SVG assets

## Important limits

- If Firebase cannot connect, the app falls back to browser storage plus `BroadcastChannel` demo sync.
- The current role-based log on is still a frontend demo account system. It is not secure authentication.
- Browser geolocation usually requires `https://` or `http://localhost`.
- AMPDS is proprietary. This prototype includes an AMPDS-inspired category and determinant structure only, not licensed AMPDS protocol content.

## Demo log on

- Dispatcher: `dispatch01 / 2468`
- Call taker: `calltake01 / 1357`
- Unit iPad: `MED-402 / 0402`
- Unit iPad: `MED-411 / 0411`
- Unit iPad: `SUP-01 / 0001`

## Enable Firebase

1. Create or verify a Realtime Database in the Firebase project.
2. Confirm the `databaseURL` in `firebase-config.js` matches your actual database instance.
3. Serve the app over `http://localhost` or deploy it to Firebase Hosting or another HTTPS host.
4. Open the app on multiple devices. Incident, assignment, unit status, and location updates will sync through Firebase.

Example prototype Realtime Database rules:

```json
{
  "rules": {
    "macd": {
      ".read": true,
      ".write": true
    }
  }
}
```

These rules are only suitable for a prototype. For production, replace the demo log on with Firebase Authentication and locked-down database rules. If the configured database is missing or blocked by rules, the app falls back to local demo sync and shows `Firebase unavailable`.

## Run locally

For best results, serve it from localhost instead of opening the file directly:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/?view=dispatcher`
- `http://localhost:8080/?view=calltaking`
- `http://localhost:8080/?view=unit`

## Next production step

1. Replace the demo log on with Firebase Authentication or another real identity provider.
2. Enforce role-based security with database rules or server-side APIs.
3. Store accounts, units, and protocol configuration outside the client bundle.
4. Add audit-safe backend validation for status changes and incident updates.
5. Integrate licensed AMPDS content or a lawful alternative clinical coding model.
