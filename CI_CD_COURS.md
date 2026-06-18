# Cours CI/CD pour ce projet

Ce projet est un bon exemple pour apprendre la CI/CD, parce qu'il a deux parties :

- un backend Django dans `Backend`
- un frontend React/Vite dans `Frontend`
- une livraison Docker avec `docker-compose.yml`
- une analyse SonarQube deja configuree avec `sonar-project.properties`

Le pipeline ajoute dans `.github/workflows/ci-cd.yml` est pense pour GitHub Actions. Si tu utilises GitLab CI ou Jenkins, la logique reste la meme, seule la syntaxe change.

## 1. C'est quoi CI/CD ?

CI veut dire Continuous Integration. L'idee est simple : a chaque push ou pull request, la machine verifie automatiquement que le projet reste propre.

Dans ton projet, la CI fait :

- installation des dependances Python
- verification Django
- tests backend avec coverage
- installation des dependances Node
- lint frontend
- tests frontend avec coverage
- build frontend
- build des images Docker
- analyse SonarQube si les secrets sont configures

CD veut dire Continuous Delivery ou Continuous Deployment.

Dans ton projet, la CD fait :

- seulement sur la branche `main`
- seulement apres une CI reussie
- connexion au serveur par SSH
- `git pull`
- `docker compose up -d --build`
- migrations Django

La CI repond a la question : "Est-ce que le code est correct ?"

La CD repond a la question : "Est-ce qu'on peut livrer ce code automatiquement ?"

## 2. Le flux normal d'un pipeline

Un pipeline professionnel suit presque toujours ce chemin :

1. Recuperer le code
2. Installer les dependances
3. Verifier la qualite
4. Lancer les tests
5. Construire l'application
6. Construire les images Docker
7. Analyser la qualite/securite
8. Deployer si on est sur la bonne branche

Dans ton cas :

```text
push / pull request
        |
        v
backend-ci          frontend-ci
        \            /
         \          /
          v        v
           sonar + docker-build
                  |
                  v
              deploy sur main
```

## 3. Pourquoi separer backend et frontend ?

On separe les jobs parce que le backend et le frontend n'ont pas le meme environnement.

Le backend a besoin de :

- Python 3.12
- `requirements.txt`
- Django
- coverage

Le frontend a besoin de :

- Node 22
- `package-lock.json`
- ESLint
- Vitest
- Vite build

Cette separation rend le pipeline plus rapide et plus lisible. Si le frontend casse, tu le vois directement. Si le backend casse, pareil.

## 4. Backend CI expliquee

Le job `backend-ci` fait ceci :

```yaml
python manage.py check
python manage.py makemigrations --check --dry-run
python -m coverage run manage.py test admin_config.tests
python -m coverage xml -o coverage.xml
```

`python manage.py check` detecte les problemes de configuration Django.

`makemigrations --check --dry-run` verifie que tu n'as pas oublie de creer une migration apres avoir modifie un modele.

`python -m coverage run manage.py test admin_config.tests` lance les tests Django.

`python -m coverage xml` genere `Backend/coverage.xml`, que SonarQube peut lire.

Les variables CI importantes :

```yaml
DJANGO_DEBUG: "true"
DJANGO_SECRET_KEY: "ci-secret-key"
EMAIL_BACKEND: "django.core.mail.backends.locmem.EmailBackend"
SQLITE_NAME: "ci.sqlite3"
```

Elles evitent d'utiliser des vrais secrets ou un vrai SMTP pendant les tests.

## 5. Frontend CI expliquee

Le job `frontend-ci` fait ceci :

```yaml
npm ci
npm run lint
npm run test:coverage
npm run build
```

`npm ci` installe exactement les versions de `package-lock.json`. En CI, c'est mieux que `npm install`, parce que le resultat est reproductible.

`npm run lint` verifie le style et les erreurs JavaScript/React.

`npm run test:coverage` lance Vitest et produit `Frontend/coverage/lcov.info`.

`npm run build` verifie que l'application frontend peut etre compilee pour production.

## 6. SonarQube

Ton fichier `sonar-project.properties` est deja pret :

```properties
sonar.python.coverage.reportPaths=Backend/coverage.xml
sonar.javascript.lcov.reportPaths=Frontend/coverage/lcov.info
```

Le pipeline telecharge les rapports de coverage generes par les jobs backend/frontend, puis lance SonarQube.

Pour activer SonarQube dans GitHub :

1. Va dans `Settings > Secrets and variables > Actions`
2. Ajoute `SONAR_TOKEN`
3. Ajoute `SONAR_HOST_URL`

Exemple :

```text
SONAR_HOST_URL=https://sonarqube.mon-entreprise.com
```

Si ces secrets ne sont pas presents, le job SonarQube est ignore proprement.

## 7. Docker dans le pipeline

Le job `docker-build` construit les deux images :

```text
./Backend  -> validation-platform-backend:ci
./Frontend -> validation-platform-frontend:ci
```

Pourquoi le faire en CI ?

Parce qu'un projet peut passer les tests mais casser au moment de construire l'image Docker. Par exemple :

- fichier oublie dans le `Dockerfile`
- dependance manquante
- erreur de build Vite
- probleme de version Python ou Node

Le pipeline detecte ca avant le deploiement.

## 8. Deploiement

Le job `deploy` se lance seulement si :

- l'evenement est un `push`
- la branche est `main`
- les jobs precedents ont reussi

Il a besoin de ces secrets GitHub :

```text
DEPLOY_HOST      adresse IP ou domaine du serveur
DEPLOY_USER      utilisateur SSH
DEPLOY_SSH_KEY   cle privee SSH
DEPLOY_PATH      chemin du projet sur le serveur, optionnel
```

Si `DEPLOY_PATH` n'est pas defini, le pipeline utilise :

```text
/opt/validation-platform
```

Sur le serveur, il faut deja avoir :

- Docker installe
- Docker Compose installe
- le repository clone dans `DEPLOY_PATH`
- un fichier `Backend/.env` avec les vrais secrets de production

Le deploiement execute :

```bash
git pull --ff-only
docker compose up -d --build
docker compose exec -T backend python manage.py migrate --noinput
docker compose ps
```

## 9. Branches conseillees

Une organisation simple :

```text
develop -> integration et tests frequents
main    -> production
```

Quand tu fais une pull request vers `main`, la CI tourne.

Quand tu merges dans `main`, la CI tourne encore, puis la CD peut deployer.

## 10. Les secrets a ne jamais mettre dans le code

Ne mets jamais ces valeurs dans Git :

- `DJANGO_SECRET_KEY`
- mot de passe base de donnees
- mot de passe email
- cle SSH
- token SonarQube
- token Docker registry

Dans ton projet, `Backend/.env` est deja ignore par `.gitignore`, c'est bien.

## 11. Commandes locales equivalentes

Avant de pousser, tu peux simuler la CI localement.

Backend :

```powershell
cd Backend
python -m pip install -r requirements.txt
python manage.py check
python manage.py makemigrations --check --dry-run
python -m coverage run manage.py test admin_config.tests
python -m coverage xml -o coverage.xml
```

Frontend :

```powershell
cd Frontend
npm ci
npm run lint
npm run test:coverage
npm run build
```

Docker :

```powershell
docker build -t validation-platform-backend:ci ./Backend
docker build --build-arg VITE_API_URL=/ -t validation-platform-frontend:ci ./Frontend
```

Deploiement local :

```powershell
docker compose up -d --build
```

## 12. Ce qu'il faut retenir

Un pipeline CI/CD n'est pas juste un fichier YAML.

C'est une suite de garanties :

- le code installe ses dependances
- les tests passent
- le frontend compile
- Docker sait construire les images
- SonarQube peut analyser la qualite
- le deploiement ne part que depuis `main`
- les secrets restent hors du code

Le bon pipeline est celui qui casse vite, clairement, et avant la production.
