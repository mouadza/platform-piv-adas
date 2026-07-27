# Validation Platform

Application de gestion et de validation des projets, gammes et résultats.
Le backend utilise Django REST Framework, le frontend React, PostgreSQL pour
les données, ainsi que RabbitMQ et Redis pour les tâches Celery.

## 1. Configuration du fichier `.env`

Depuis la racine du projet, créer le fichier de configuration local.

Sous Windows PowerShell :

```powershell
Copy-Item Backend/.env.example Backend/.env
```

Sous Linux ou macOS :

```bash
cp Backend/.env.example Backend/.env
```

Modifier ensuite les valeurs suivantes dans `Backend/.env` :

```dotenv
DJANGO_SECRET_KEY=une-cle-locale-longue-et-aleatoire

DB_PASSWORD=un-mot-de-passe-local
POSTGRES_PASSWORD=un-mot-de-passe-local

# En développement, les e-mails et codes OTP seront affichés dans les logs.
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

`DB_PASSWORD` et `POSTGRES_PASSWORD` doivent avoir la même valeur.

Le fichier `.env` contient des secrets et ne doit jamais être ajouté à Git.

## 2. Démarrage rapide avec Docker

### Prérequis

- Git ;
- Docker Desktop avec Docker Compose ;
- les ports `5173`, `8000`, `5432`, `5672`, `6379` et `15672` disponibles.

Depuis la racine du projet :

```bash
docker compose up --build -d
docker compose ps
```

Au premier démarrage, le backend attend PostgreSQL, applique les migrations et
collecte automatiquement les fichiers statiques.

| Service | Adresse |
| --- | --- |
| Application | <http://localhost:5173> |
| API Django | <http://localhost:8000> |
| Documentation Swagger | <http://localhost:8000/api/docs/> |
| RabbitMQ Management | <http://localhost:15672> |

Les identifiants RabbitMQ locaux par défaut sont :

```text
Utilisateur : validation
Mot de passe : validation_rabbitmq
```

Pour consulter les logs :

```bash
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f celery_email
```

Pour arrêter l'application en conservant les données :

```bash
docker compose down
```

La commande `docker compose down -v` supprime également la base de données et
les volumes. Ne l'utiliser que si cette suppression est volontaire.

## 3. Création d'un administrateur OTP

Utiliser une adresse dont le domaine est présent dans
`OTP_ALLOWED_EMAIL_DOMAINS` du fichier `Backend/.env` :

```bash
docker compose exec backend python manage.py ensure_otp_admin adresse@stellantis.com
```

Avec le backend e-mail `console`, suivre les logs du worker e-mail pour obtenir
le code OTP :

```bash
docker compose logs -f celery_email
```

Pour utiliser un autre domaine dans un environnement local :

1. Ajouter le domaine dans `OTP_ALLOWED_EMAIL_DOMAINS`.
2. Redémarrer les services :

   ```bash
   docker compose restart backend celery celery_email
   ```

3. Relancer la commande `ensure_otp_admin`.

## 4. Présentation de l'architecture

```text
.
├── Backend/
│   ├── validation_platform/  # Configuration Django, URLs, ASGI/WSGI et Celery
│   ├── validation_core/      # Application métier Django
│   │   ├── models/           # Modèles et relations de données
│   │   ├── serializers/      # Validation et représentation des données API
│   │   ├── services/         # Règles métier et traitements
│   │   ├── views/            # Endpoints REST
│   │   ├── migrations/       # Historique du schéma de base de données
│   │   ├── tests/            # Tests backend
│   │   ├── tasks.py          # Tâches Celery
│   │   └── urls.py           # Routes de l'application
│   ├── manage.py
│   └── requirements.txt
├── Frontend/
│   ├── src/api/              # Client HTTP
│   ├── src/components/       # Composants réutilisables
│   ├── src/pages/            # Pages de l'application
│   └── package.json
└── docker-compose.yml        # Orchestration de tous les services
```

### Rôle des composants

| Composant | Rôle |
| --- | --- |
| `frontend` | Interface React servie par Nginx |
| `backend` | API Django et gestion des données |
| `db` | Base PostgreSQL |
| `rabbitmq` | File de messages pour Celery |
| `redis` | Cache et stockage des résultats Celery |
| `celery` | Traitements asynchrones généraux et Excel |
| `celery_email` | Envoi asynchrone des e-mails et OTP |

Le package `validation_platform` contient uniquement la configuration du
projet. Le code fonctionnel et métier se trouve dans `validation_core`.

Le label Django historique `admin_config` et le préfixe d'API
`/admin_config/` sont conservés pour garantir la compatibilité avec les
migrations, la base de données et le frontend existants.
