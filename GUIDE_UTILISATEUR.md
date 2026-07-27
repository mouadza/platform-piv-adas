# Guide utilisateur — Validation App

**Version du guide :** 1.0  
**Date de mise à jour :** 24 juillet 2026  
**Public concerné :** administrateurs, PPL, valideurs et visiteurs

> Les fonctions affichées dépendent du rôle et des projets affectés au compte. Un utilisateur peut avoir plusieurs rôles.

## Sommaire

1. [Présentation de l’application](#1-présentation-de-lapplication)
2. [Rôles et droits d’accès](#2-rôles-et-droits-daccès)
3. [Se connecter](#3-se-connecter)
4. [Se repérer dans l’application](#4-se-repérer-dans-lapplication)
5. [Fonctions communes](#5-fonctions-communes)
6. [Guide Administrateur](#6-guide-administrateur)
7. [Guide PPL](#7-guide-ppl)
8. [Guide Valideur](#8-guide-valideur)
9. [Guide Visiteur](#9-guide-visiteur)
10. [Réaliser une validation](#10-réaliser-une-validation)
11. [Rapports et exports](#11-rapports-et-exports)
12. [Résoudre les problèmes courants](#12-résoudre-les-problèmes-courants)
13. [Bonnes pratiques](#13-bonnes-pratiques)
14. [Glossaire](#14-glossaire)

---

## 1. Présentation de l’application

Validation App permet de préparer, organiser, exécuter et suivre des gammes de validation automobile.

L’application centralise notamment :

- les comptes utilisateurs et leurs affectations ;
- les projets, véhicules, architectures et motorisations ;
- les gammes et leurs fichiers Excel ;
- la planification des validations ;
- les cotations et commentaires ;
- les indicateurs KPI, rapports et fichiers Excel complétés ;
- la traçabilité des actions.

**Adresse de l’application :** `[À compléter]`  
**Contact support :** `[À compléter]`

## 2. Rôles et droits d’accès

| Fonction | Administrateur | PPL | Valideur | Visiteur |
|---|:---:|:---:|:---:|:---:|
| Consulter les projets affectés | Oui | Oui | Oui | Oui |
| Consulter les gammes et l’avancement | Oui | Oui | Oui | Oui |
| Gérer les utilisateurs et affectations | Oui | Non | Non | Non |
| Créer, modifier ou supprimer un projet | Oui | Limité aux fonctions autorisées | Non | Non |
| Créer ou modifier une gamme | Oui | Oui | Non | Non |
| Planifier les dates d’une gamme | Oui | Oui | Non | Non |
| Modifier les cotations | Oui | Non | Oui | Non |
| Consulter le rapport de validation | Oui | Oui | Oui | Oui |
| Gérer les paramétrages | Oui | Non | Non | Non |
| Consulter les journaux d’audit | Oui | Non | Non | Non |

Les droits réels restent limités aux projets affectés au compte.

## 3. Se connecter

La connexion s’effectue sans mot de passe, à l’aide d’un code OTP envoyé par e-mail.

1. Ouvrez l’adresse de Validation App.
2. Saisissez votre **e-mail Stellantis**.
3. Cliquez sur **Recevoir le code OTP**.
4. Consultez votre boîte e-mail.
5. Saisissez le code numérique à 6 chiffres.
6. Cliquez sur **Vérifier le code**.

Le code expire après **10 minutes**.

Si le code n’arrive pas :

- vérifiez le dossier des courriers indésirables ;
- cliquez sur **Renvoyer** ;
- vérifiez l’adresse avec **Changer email** ;
- contactez le support si le problème persiste.

### Choisir un espace de travail

Si votre compte possède plusieurs rôles, l’écran **Choisir votre espace de travail** s’affiche après la connexion.

1. Repérez le rôle souhaité : Administration, PPL, Valideur ou Visiteur.
2. Vérifiez les projets associés au rôle.
3. Cliquez sur **Accéder**.

Si un seul rôle est disponible, l’application ouvre directement l’espace correspondant. Le sélecteur de rôle situé dans l’en-tête permet également de changer d’espace lorsque plusieurs rôles sont disponibles.

### Se déconnecter

Cliquez sur **Déconnexion** en bas du menu latéral. Pour protéger les données, déconnectez-vous avant de quitter un poste partagé.

## 4. Se repérer dans l’application

Sur ordinateur, le menu principal se trouve à gauche. Sur mobile, les principales rubriques apparaissent en bas de l’écran.

L’en-tête affiche :

- le titre de la page ;
- le rôle actif ;
- le compte connecté ;
- les notifications disponibles.

Les principaux menus sont :

- **Accueil** : synthèse des activités et accès aux projets affectés ;
- **Utilisateurs** : comptes et affectations, pour l’administrateur ;
- **Projets** : liste et gestion des projets, pour l’administrateur ;
- **Gammes de validation** : planification, validation, commentaires et exports ;
- **Paramétrages** : référentiels utilisés dans les formulaires ;
- **Audit logs** : historique des actions.

## 5. Fonctions communes

### Rechercher un élément

Les listes proposent un champ de recherche. Saisissez une partie du nom, de l’e-mail ou de l’information recherchée. La liste se met à jour selon les critères saisis.

### Consulter une gamme

Depuis **Gammes de validation** :

1. recherchez le projet concerné ;
2. repérez la gamme ;
3. cliquez sur son nom pour visualiser son fichier ;
4. utilisez **Validation** pour ouvrir son avancement détaillé.

Une ligne de gamme présente notamment le type de procédure, la fonction, le véhicule, le nombre de jours, les pistes, les boîtiers, les dates et le statut.

### Notifications

L’icône de notification dans l’en-tête signale les nouveaux événements. Ouvrez-la pour consulter les messages associés à votre activité.

## 6. Guide Administrateur

### 6.1 Tableau de bord

L’accueil administrateur fournit une vue globale :

- nombre d’utilisateurs, de projets et de gammes ;
- gammes commencées ;
- taux OK et NOK ;
- cotations suivies ;
- projets à risque.

### 6.2 Créer un utilisateur

1. Ouvrez **Utilisateurs**.
2. Cliquez sur le bouton de création d’un compte.
3. Renseignez le nom d’utilisateur et l’e-mail Stellantis.
4. Dans **Affectations**, sélectionnez un projet et un rôle.
5. Utilisez **Ajouter une affectation** si le compte intervient sur plusieurs projets ou avec plusieurs rôles.
6. Cliquez sur **Créer**.

Chaque ligne d’affectation doit contenir un projet et un rôle. Une adresse déjà utilisée ou hors du domaine autorisé ne peut pas être enregistrée.

Pour modifier un compte, ouvrez l’action **Modifier**, ajustez les informations ou affectations, puis cliquez sur **Enregistrer**.

### 6.3 Créer un projet

1. Ouvrez **Projets**.
2. Lancez **Créer un nouveau projet**.
3. Renseignez le nom, l’architecture et la ou les motorisations.
4. Ajoutez les véhicules avec leur **CMQ**, leur **VIN** et leur motorisation.
5. Affectez les utilisateurs dans les groupes **PPL**, **Valideurs** et **Visiteurs**.
6. Enregistrez le projet.

Un utilisateur ne doit être affecté qu’au rôle attendu pour le projet. Vérifiez les affectations avant l’enregistrement.

Depuis la liste, les actions permettent de consulter les détails, modifier ou supprimer un projet. Une suppression est définitive : contrôlez le projet sélectionné avant de confirmer.

### 6.4 Créer une gamme

1. Ouvrez le projet concerné.
2. Cliquez sur **Créer une gamme**.
3. Renseignez les informations générales :
   - configuration S/H ;
   - type de procédure ;
   - fonction ;
   - nombre de jours ;
   - véhicule ou véhicules ;
   - pistes ;
   - boîtiers.
4. Ajoutez au moins un fichier de gamme.
5. Ajoutez, si nécessaire, un fichier associé au format `.zip`.
6. Validez la création.

Formats acceptés pour le fichier principal : `.xls`, `.xlsx` et `.xlsm`. Lors de l’import de plusieurs fichiers, les champs cochés sont appliqués à toutes les gammes créées. Les doublons déjà présents dans le projet ou dans la sélection sont refusés.

### 6.5 Gérer les paramétrages

Le menu **Paramétrages** permet de gérer :

- les architectures ;
- les motorisations ;
- les fonctions de gamme ;
- les types de procédure ;
- les rôles et niveaux d’accès.

Pour ajouter une valeur, saisissez son nom puis cliquez sur **Ajouter**. Pour une valeur existante, utilisez **Modifier**, puis **Enregistrer**. La suppression demande une confirmation et peut être définitive.

Les rôles système ne disposent pas de toutes les actions de suppression. Modifiez les niveaux d’accès avec prudence, car ils déterminent les fonctions visibles.

### 6.6 Consulter les journaux d’audit

1. Ouvrez **Audit logs**.
2. Utilisez la recherche par utilisateur, action, gamme ou adresse IP.
3. Consultez le détail de l’événement souhaité.

Les journaux servent à retrouver l’auteur, la date et le contexte d’une action sensible.

## 7. Guide PPL

Le PPL prépare les gammes et suit leur réalisation sur les projets qui lui sont affectés.

### 7.1 Accéder à un projet

Depuis **Accueil**, ouvrez un projet affecté. Vous pouvez consulter ses informations, ses véhicules et ses gammes.

### 7.2 Créer et préparer une gamme

Depuis le détail du projet :

1. cliquez sur **Créer une gamme** ;
2. complétez les informations de préparation ;
3. sélectionnez le ou les véhicules ;
4. joignez le ou les fichiers Excel ;
5. enregistrez.

Les fichiers principaux acceptés sont `.xls`, `.xlsx` et `.xlsm`. Le fichier associé facultatif doit être un `.zip`.

### 7.3 Importer une gamme `.xlsm`

L’écran d’import dédié applique les règles suivantes :

- format accepté : `.xlsm` ;
- taille maximale : **10 Mo** ;
- le fichier doit respecter le modèle attendu ;
- les données déjà présentes peuvent être mises à jour.

Procédure :

1. ouvrez l’import depuis le projet ;
2. glissez-déposez le fichier ou cliquez sur **Sélectionner un fichier** ;
3. vérifiez son nom ;
4. cliquez sur **Importer la gamme** ;
5. attendez le message **Fichier importé avec succès**.

### 7.4 Planifier et suivre

Dans **Gammes de validation** :

1. renseignez les dates de début et de fin ;
2. cliquez sur l’icône d’enregistrement ;
3. contrôlez que la date de fin est postérieure ou égale à la date de début ;
4. utilisez **KPI** pour suivre la gamme ;
5. utilisez **KPI Projet** pour une synthèse de toutes les gammes du projet.

Le PPL peut ouvrir **Validation** en lecture seule afin de suivre l’avancement et consulter le rapport en temps réel.

## 8. Guide Valideur

Le valideur exécute les contrôles et renseigne les cotations pour les projets auxquels il est affecté.

1. Depuis **Accueil**, ouvrez un projet affecté.
2. Repérez la gamme à traiter.
3. Cliquez sur **Validation**.
4. Parcourez les blocs et renseignez chaque étape.
5. Contrôlez le résultat de l’EV et le statut global.
6. Cliquez sur **Terminer** dans le dernier bloc lorsque toutes les informations obligatoires sont complétées.

Le valideur peut également :

- consulter les KPI ;
- ouvrir le rapport en temps réel ;
- ajouter ou consulter les commentaires autorisés ;
- télécharger le fichier Excel modifié lorsque la gamme est terminée.

## 9. Guide Visiteur

Le visiteur dispose d’un accès en lecture seule.

Depuis **Accueil**, il peut :

- consulter les projets qui lui sont affectés ;
- suivre l’avancement des gammes ;
- ouvrir une validation sans la modifier ;
- consulter le rapport de validation et les indicateurs disponibles.

Si une action de modification est nécessaire, contactez le PPL, le valideur ou l’administrateur du projet.

## 10. Réaliser une validation

### 10.1 Parcourir les blocs

L’écran affiche :

- le nom et le statut de la gamme ;
- l’EV en cours et son résultat ;
- le numéro du bloc actuel ;
- une barre de progression ;
- les boutons précédent, suivant et **Terminer**.

Utilisez les flèches pour passer d’un bloc à l’autre. Lorsque vous avancez, les données modifiées sont contrôlées et enregistrées.

### 10.2 Renseigner une cotation

Les valeurs proposées sont :

| Cotation | Utilisation |
|---|---|
| **À coter** | Étape non encore traitée |
| **OK** | Résultat conforme |
| **NOK mineur** | Écart mineur |
| **NOK** | Résultat non conforme |
| **Non coté** | Étape non cotée ou non applicable selon le contexte |

Une cotation finale doit remplacer **À coter** avant la fin de la validation.

Pour toute cotation différente de **OK**, un commentaire est obligatoire. Décrivez clairement l’écart, le contexte et, si possible, l’action attendue.

### 10.3 Ajouter un commentaire

Les zones liées aux résultats permettent d’ouvrir l’historique des commentaires, puis d’ajouter un commentaire. Selon vos droits, vous pouvez modifier ou supprimer vos contributions.

Un commentaire utile contient :

- le constat ;
- les conditions d’essai ;
- l’impact observé ;
- la référence d’une preuve ou d’un ticket, si disponible.

### 10.4 Terminer

Dans le dernier bloc, cliquez sur **Terminer**. L’application signale les étapes sans cotation finale et les commentaires obligatoires manquants.

Une fois tous les EV terminés :

- la gamme passe au statut terminé ;
- le fichier **Excel modifié** devient téléchargeable ;
- le rapport reflète les résultats consolidés.

## 11. Rapports et exports

### Rapport en temps réel

Le bouton **Rapport temps réel** présente :

- le nombre total d’EV ;
- les EV terminés et en cours ;
- les étapes terminées et restant à coter ;
- les répartitions OK, NOK, NOK mineur, non coté et à coter ;
- le détail des étapes, avec une recherche.

### KPI de gamme

Le bouton **KPI** affiche la progression et les répartitions de résultats pour une gamme. Utilisez-le pour repérer rapidement les cotations restantes et les écarts.

### KPI projet

Le bouton **KPI Projet** consolide les indicateurs de toutes les gammes d’un projet.

### Excel modifié

Le téléchargement est disponible uniquement lorsque toutes les validations attendues sont terminées. Si le bouton est désactivé, ouvrez le rapport pour identifier les EV ou étapes encore en cours.

## 12. Résoudre les problèmes courants

| Problème | Vérifications et solution |
|---|---|
| Aucun code OTP reçu | Vérifiez l’adresse et les courriers indésirables, puis cliquez sur **Renvoyer**. |
| Code OTP refusé | Le code peut être erroné ou expiré. Demandez un nouveau code. |
| Aucun espace disponible | Aucune affectation n’est configurée. Contactez un administrateur. |
| Un projet n’apparaît pas | Vérifiez que le rôle actif et l’affectation au projet sont corrects. |
| Fichier refusé à l’import dédié | Utilisez un fichier `.xlsm` de 10 Mo maximum respectant le modèle. |
| Fichier refusé à la création d’une gamme | Utilisez `.xls`, `.xlsx` ou `.xlsm` pour la gamme et `.zip` pour la pièce associée. |
| Doublon détecté | Renommez ou retirez le fichier déjà sélectionné ; vérifiez aussi les gammes existantes du projet. |
| Impossible de terminer une validation | Remplacez toutes les valeurs **À coter** et ajoutez un commentaire pour chaque cotation différente de **OK**. |
| Bouton Excel modifié désactivé | Tous les EV ne sont pas encore terminés. Consultez le rapport en temps réel. |
| Session expirée | Reconnectez-vous avec un nouveau code OTP. |
| Page interdite ou fonction absente | Le rôle actif ne possède pas le droit requis. Changez d’espace ou contactez l’administrateur. |

Lors d’un signalement au support, transmettez :

- votre e-mail professionnel ;
- le rôle actif ;
- le nom du projet et de la gamme ;
- l’heure approximative de l’erreur ;
- une capture du message, sans donnée confidentielle inutile.

## 13. Bonnes pratiques

- Vérifiez le projet et le rôle actifs avant toute modification.
- Utilisez des noms de fichiers explicites et versionnés.
- Ne modifiez pas la structure du modèle Excel attendu.
- Renseignez les dates de planification avant le démarrage.
- Justifiez précisément les cotations NOK, NOK mineur et Non coté.
- Consultez le rapport avant de terminer une gamme.
- Évitez les suppressions si une correction ou une modification suffit.
- Déconnectez-vous après utilisation d’un poste partagé.
- Ne transmettez jamais un code OTP à une autre personne.

## 14. Glossaire

| Terme | Définition |
|---|---|
| **PPL** | Profil chargé de préparer, organiser et suivre les gammes. |
| **Gamme** | Ensemble structuré d’étapes ou d’essais de validation. |
| **EV** | Élément ou ensemble de validation suivi dans une gamme. |
| **Cotation** | Qualification du résultat : OK, NOK mineur, NOK, Non coté ou À coter. |
| **KPI** | Indicateur synthétique de progression et de résultat. |
| **OTP** | Code de connexion temporaire à usage unique. |
| **CMQ** | Identifiant de véhicule utilisé dans le projet. |
| **VIN** | Numéro d’identification du véhicule. |
| **Audit log** | Journal retraçant les actions réalisées dans l’application. |

---

**Historique du document**

| Version | Date | Modification |
|---|---|---|
| 1.0 | 24/07/2026 | Première version du guide utilisateur |
