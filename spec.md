# PharmaNuit RDC

## Current State
- Pharmacists register with: nom, tel, adresse
- After registration, a 6-digit code is shown and used to access the pharmacist space
- Pharmacist space is accessed via 3 secret taps + code input
- Home screen has a visible "Itinéraire" button (redundant)
- Backend: submitPharmacy(nom, tel, adresse) returns {id, code}
- Backend: getPharmacyByCode(code) for pharmacist login

## Requested Changes (Diff)

### Add
- New backend function: registerPharmacist(email, nom, tel, adresse) — stores email, generates 6-digit code tied to email, returns code. Pharmacy immediately visible/active.
- New backend function: getPharmacyByEmail(email) — returns pharmacy associated with email (for login step 1 validation)
- New backend function: loginPharmacist(email, code) — validates email + code combination, returns pharmacy if valid
- Pharmacy data model gets an `email` field

### Modify
- Register screen: replace current form (nom, tel, adresse) with new flow:
  - Step 1: Enter Gmail/email → validate → if new, proceed to Step 2; if existing, redirect to login
  - Step 2: Enter nom, tel, adresse, statut initial (ouvert/fermé) → submit → backend registers, returns code
  - Step 3: Show generated code to save
- Pharmacist login flow (accessible via 3 secret taps):
  - Step 1: Enter email → submit
  - Step 2: Enter 6-digit code → submit → access dashboard
- Remove "Itinéraire" button from home screen (keep Google Maps link inside NearbyScreen)

### Remove
- Old submitPharmacy approach from frontend (keep backend function for backward compatibility with seed data)
- "Itinéraire" button from HomeScreen

## Implementation Plan
1. Update backend main.mo: add email field to Pharmacy, add registerPharmacist(email, nom, tel, adresse, ouvert), add loginPharmacist(email, code), add getPharmacyByEmail(email)
2. Regenerate backend bindings
3. Update frontend:
   - HomeScreen: remove Itinéraire button
   - RegisterScreen: new 3-step flow (email → info+statut → code shown)
   - PharmacistScreen (login): new 2-step flow (email → code)
   - Wire new backend hooks
