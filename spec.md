# PharmaNuit RDC

## Current State
Application de gestion de pharmacies de nuit en RDC. Le backend Motoko gère les pharmacies avec des statuts (en_attente, approuve, rejete). L'accès admin dans le frontend est sécurisé par un mot de passe local (sessionStorage). Le backend utilise un système AccessControl ICP pour vérifier les permissions sur les fonctions admin.

## Problème identifié
Les fonctions `approvePharmacy`, `rejectPharmacy`, `revokePharmacy`, `togglePharmacyVisibility` exigent `AccessControl.hasPermission(accessControlState, caller, #admin)`. Or, l'administrateur se connecte uniquement via un mot de passe local dans le frontend -- il n'est pas enregistré comme admin ICP dans le canister. Résultat : tous les appels admin échouent silencieusement (Runtime.trap).

De même, `setPharmacyOpenStatus` exige `#user` auth ICP, ce qui empêche les pharmaciens anonymes de mettre à jour leur statut.

## Requested Changes (Diff)

### Add
- Rien à ajouter

### Modify
- `approvePharmacy` : supprimer la vérification AccessControl admin, garder la logique de mise à jour
- `rejectPharmacy` : supprimer la vérification AccessControl admin
- `revokePharmacy` : supprimer la vérification AccessControl admin
- `togglePharmacyVisibility` : supprimer la vérification AccessControl admin
- `setPharmacyOpenStatus` : supprimer la vérification AccessControl user (accès libre pour permettre aux pharmaciens anonymes de gérer leur statut)
- `initializeSeedData` : supprimer la vérification AccessControl admin

### Remove
- Les imports/usages AccessControl non nécessaires si plus aucune fonction les utilise

## Implementation Plan
1. Régénérer le backend Motoko avec toutes les mêmes fonctions mais sans les vérifications AccessControl sur les fonctions admin/pharmacien
2. Conserver exactement le même modèle de données Pharmacy (id, nom, tel, adresse, lat, lng, statut, approuve, visible, ouvert)
3. Conserver les seeds data identiques (IDs 1-7)
4. nextId commence à 8
