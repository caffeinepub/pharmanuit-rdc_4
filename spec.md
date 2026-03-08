# PharmaNuit RDC

## Current State

- Backend Motoko avec pharmacies stockées, statuts en_attente/approuve/rejete
- Frontend React avec écrans: home, nearby, register, admin, pharmacien, list
- Enregistrement pharmacie -> poll toutes 5s -> redirection si approuvé par admin
- Admin accède via 5 taps sur le logo + mot de passe
- Espace pharmacien accès via 3 taps coin bas-droite, puis recherche par nom
- Admin peut approuver, rejeter, révoquer, toggler visibilité

## Requested Changes (Diff)

### Add
- Champ `codeSecret` (Text) dans le type Pharmacy du backend
- Fonction `submitPharmacy` retourne maintenant un Record `{ id: Nat, code: Text }` au lieu de juste `Nat` — le code à 6 chiffres est généré aléatoirement au moment de l'inscription
- Nouvelle fonction backend `getPharmacyByCode(code: Text) : async ?Pharmacy` — permet au pharmacien de retrouver sa pharmacie par son code secret
- Toutes les pharmacies s'enregistrent automatiquement comme "approuve" et visible = true dès soumission (plus de validation admin nécessaire)
- Dans l'admin: remplacer les boutons Approuver/Rejeter par un seul bouton "Supprimer définitivement" (deletePharmacy)
- Nouvelle fonction backend `deletePharmacy(id: Nat) : async Bool`
- Écran RegisterScreen: après soumission, afficher le code secret à 6 chiffres avec message de félicitations — l'utilisateur doit noter ce code
- Écran PharmacistScreen: remplacer la recherche par nom par une saisie de code secret à 6 chiffres — si le code correspond, ouvre le dashboard de la pharmacie
- Le geste secret (3 taps coin bas-droite) mène maintenant vers un écran de saisie de code (pas plus de recherche par nom)

### Modify
- `submitPharmacy` backend: génère un code aléatoire à 6 chiffres, marque directement approuve=true, visible=true, statut="approuve", retourne `{ id; code }`
- Admin onglet "En attente" → remplacé par onglet "Toutes les pharmacies" avec bouton supprimer sur chaque entrée
- Admin onglet "Approuvées" → garde toggle visibilité, remplace "Révoquer" par "Supprimer"
- Statistiques admin: retirer compteur "en attente", ajouter compteur "supprimées" si utile
- RegisterScreen: afficher code après soumission, pas de polling (plus besoin puisque auto-approuvé)
- PharmacistScreen: saisie de code à la place de la recherche par nom

### Remove
- `approvePharmacy`, `rejectPharmacy`, `revokePharmacy` du backend (non nécessaires)
- Le polling toutes les 5 secondes dans RegisterScreen (plus besoin)
- La logique de redirection automatique après approbation admin
- `getPharmacyByName` (remplacé par `getPharmacyByCode`)
- L'onglet "En attente" dans l'admin (plus de validation)

## Implementation Plan

1. **Backend**: Ajouter `codeSecret` au type Pharmacy. Modifier `submitPharmacy` pour générer code 6 chiffres aléatoire, auto-approuver, retourner `{ id; code }`. Ajouter `getPharmacyByCode`. Ajouter `deletePharmacy`. Supprimer `approvePharmacy`, `rejectPharmacy`, `revokePharmacy`, `getPharmacyByName`.

2. **Frontend RegisterScreen**: Après soumission, afficher le code à 6 chiffres reçu du backend dans un grand encadré bien visible avec message "Notez ce code, c'est votre clé d'accès". Supprimer le polling.

3. **Frontend PharmacistScreen**: Remplacer la recherche par nom par une saisie de code à 6 chiffres. Si code valide -> dashboard pharmacie. Si code invalide -> message d'erreur.

4. **Frontend AdminScreen**: Supprimer onglet "En attente". Modifier onglet "Approuvées" → "Pharmacies" avec liste de toutes les pharmacies, bouton "Supprimer" sur chaque carte. Mettre à jour statistiques.

5. **Frontend hooks**: Mettre à jour les hooks pour correspondre aux nouvelles fonctions backend (submitPharmacy retourne Record, nouveaux/supprimés hooks).
