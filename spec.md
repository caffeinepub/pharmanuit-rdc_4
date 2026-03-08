# PharmaNuit RDC

## Current State
- App mobile web pour trouver les pharmacies de nuit en RDC
- Panneau admin caché (5 taps sur le logo + mot de passe)
- Admin peut approuver, rejeter, révoquer les pharmacies
- Deux onglets : "En attente" et "Approuvées"
- Footer affiche "Built with love using caffeine.ai"
- Les pharmacies approuvées sont toutes visibles automatiquement

## Requested Changes (Diff)

### Add
- Champ `visible` (Bool) dans le type Pharmacy du backend
- Fonction `togglePharmacyVisibility(id: Nat)` dans le backend
- `getApprovedPharmacies` ne retourne que les pharmacies approuvées ET visibles
- Onglet "Statistiques" dans le panneau admin avec : total enregistrées, en attente, visibles
- Bouton toggle visibilité sur chaque pharmacie approuvée dans l'onglet admin
- Les pharmacies invisibles restent dans la liste admin avec indicateur visuel "Masqué"

### Modify
- `getApprovedPharmacies` filtre maintenant aussi sur `visible == true`
- `approvePharmacy` met `visible = true` par défaut lors de l'approbation
- `initializeSeedData` inclut `visible = true` pour les pharmacies approuvées
- `ApprovedPharmacyCard` : remplacer "Révoquer" par deux boutons : toggle visibilité + révoquer
- Supprimer le lien "caffeine.ai" du footer de l'écran d'accueil

### Remove
- Texte "Built with love using caffeine.ai" dans le footer

## Implementation Plan
1. Mettre à jour main.mo : ajouter champ `visible`, fonction `togglePharmacyVisibility`, modifier `getApprovedPharmacies`
2. Mettre à jour backend.d.ts avec la nouvelle interface
3. Mettre à jour les hooks useQueries pour ajouter `useTogglePharmacyVisibility`
4. Ajouter onglet Statistiques dans AdminScreen
5. Ajouter bouton toggle visibilité dans ApprovedPharmacyCard
6. Supprimer le footer caffeine.ai de HomeScreen
