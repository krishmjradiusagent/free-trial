# Free Trial Onboarding App

Static prototype for the Radius free trial onboarding flow.

## Purpose

This project models the free trial journey from landing page entry through business setup.

Primary flow:

1. Landing page hero opens first
2. Click the landing image to start onboarding
3. Step 1: Basic details
4. Step 2: Verify code
5. Step 3: Business details

## Files

- `index.html`: app shell and asset loading
- `styles.css`: layout, typography, and component styling
- `app.js`: onboarding state, rendering, and interactions
- `landing-hero.png`: landing page hero image

## Current UX Patterns

- Landing page is the required entry point
- Business details uses Radius-style city and MLS dropdown fields
- MLS selection is city-aware
- Stepper is a 3-step onboarding indicator
- Split-screen layout keeps the trust rail on the left and form flow on the right

## Run Locally

Because this is a static app, open `index.html` directly in the browser or serve the folder locally.

Example:

```bash
python3 -m http.server
```

Then open:

```text
http://localhost:8000
```

## Notes

- This is a prototype-oriented implementation, not a production auth flow
- State is stored in browser local storage for quick iteration
- Figma-based dropdown styling was adapted from Radius DS references
