# Export KPI asynchrone avec RabbitMQ, Celery et Redis

## 1. Ce qui a ete mis en place

Le bouton d'export KPI Projet ne genere plus le fichier dans le navigateur.
Le traitement est maintenant execute en arriere-plan sur le serveur.

```text
React
  | POST /admin_config/jobs/project-kpi/
  v
Django cree un BackgroundJob en base
  | publie une tache
  v
RabbitMQ conserve la tache dans une file
  | distribue la tache
  v
Celery Worker genere le meme fichier Excel KPI Projet
  | enregistre le fichier et la progression
  v
Volume media + Redis + base Django
  | React interroge le statut du job
  v
Bouton/progression puis telechargement automatique
```

Responsabilites:

- RabbitMQ: file de messages entre Django et Celery.
- Celery: execute la generation Excel hors de la requete HTTP.
- Redis DB 1: resultats techniques Celery.
- Redis DB 2: progression rapide des jobs et cache Django.
- `BackgroundJob`: etat durable du job en base de donnees.
- Volume `backend_media`: stockage durable des fichiers `.xlsx`.

## 2. Fichiers importants

- `Backend/admin_config/models/background_job.py`: modele du job.
- `Backend/admin_config/tasks.py`: tache Celery et progression.
- `Backend/admin_config/services/project_kpi_excel_service.py`: generation Excel.
- `Backend/admin_config/views/jobs.py`: endpoints creation, suivi, telechargement.
- `Frontend/src/utils/backgroundProjectKpiExport.js`: lancement et polling React.
- `docker-compose.yml`: environnement local.
- `docker-compose.aws.yml`: environnement AWS avec PostgreSQL.

Le fichier genere contient une seule feuille `KPI Projet` et conserve la mise
en page KPI actuelle: tableaux globaux, KPI par EV, KPI par gamme, totaux,
avancement et calendrier.

## 3. Demarrage local avec Docker

### Etape 1: verifier Docker

Ouvrir PowerShell dans la racine du projet:

```powershell
docker --version
docker compose version
```

Docker Desktop doit etre demarre.

### Etape 2: configurer `Backend/.env`

Ajouter ou remplacer ces variables:

```env
RABBITMQ_DEFAULT_USER=validation
RABBITMQ_DEFAULT_PASS=validation_rabbitmq
CELERY_BROKER_URL=amqp://validation:validation_rabbitmq@rabbitmq:5672//
CELERY_RESULT_BACKEND=redis://redis:6379/1
REDIS_CACHE_URL=redis://redis:6379/2
CELERY_RESULT_EXPIRES=86400
CELERY_TASK_SOFT_TIME_LIMIT=1500
CELERY_TASK_TIME_LIMIT=1800
CELERY_EMAIL_ASYNC=true
CELERY_EMAIL_FALLBACK_SYNC=true
```

Dans Docker, les noms `rabbitmq` et `redis` sont les noms DNS des services.
Ne pas utiliser `localhost` entre les conteneurs.

### Etape 3: construire et demarrer

```powershell
docker compose up -d --build
```

Cette commande demarre:

- `rabbitmq`
- `redis`
- `backend`
- `celery`
- `frontend`

### Etape 4: appliquer les migrations

```powershell
docker compose exec backend python manage.py migrate
```

La migration `0010_backgroundjob.py` cree la table des jobs.

### Etape 5: verifier les services

```powershell
docker compose ps
docker compose logs --tail=100 celery
docker compose logs --tail=100 rabbitmq
```

Tous les services doivent etre `running` ou `healthy`. Le worker Celery doit
afficher qu'il est connecte a RabbitMQ et qu'il connait la tache
`admin_config.tasks.generate_project_kpi_task`.

### Etape 6: ouvrir les interfaces

- Application: `http://localhost:5173`
- API Django: `http://localhost:8000`
- RabbitMQ Management: `http://localhost:15672`

Identifiants RabbitMQ locaux:

```text
Utilisateur: validation
Mot de passe: validation_rabbitmq
```

Dans RabbitMQ Management, l'onglet `Queues and Streams` permet de voir les
taches en attente et en cours de consommation.

## 4. Tester l'export de bout en bout

1. Se connecter a l'application.
2. Ouvrir un projet qui contient plusieurs gammes.
3. Ouvrir le popup KPI Projet.
4. Cliquer sur `Exporter Excel`.
5. Observer la progression affichee dans le popup.
6. Continuer a utiliser l'application pendant la generation.
7. Le fichier est telecharge lorsque le job atteint 100 %.

Pour observer le worker pendant le test:

```powershell
docker compose logs -f celery
```

Pour observer la progression durable en base:

```powershell
docker compose exec backend python manage.py shell
```

Puis dans le shell Python:

```python
from admin_config.models import BackgroundJob
BackgroundJob.objects.order_by("-created_at").values(
    "id", "status", "progress", "result_file", "error_message"
).first()
```

Quitter le shell avec `exit()`.

## 5. API utilisee par React

### Creer le job

```http
POST /admin_config/jobs/project-kpi/
Authorization: Bearer <token>
Content-Type: application/json

{"project_id": 1}
```

Reponse HTTP 202:

```json
{"job_id": "uuid", "status": "PENDING", "progress": 0}
```

### Lire la progression

```http
GET /admin_config/jobs/<job_id>/
Authorization: Bearer <token>
```

Etats possibles: `PENDING`, `STARTED`, `SUCCESS`, `FAILURE`.

### Telecharger

```http
GET /admin_config/jobs/<job_id>/download/
Authorization: Bearer <token>
```

Le serveur retourne HTTP 409 si le fichier n'est pas encore pret. Un utilisateur
ne peut consulter et telecharger que ses propres jobs; le super-administrateur
peut consulter tous les jobs.

## 6. Deploiement sur AWS EC2

### Etape 1: configurer les secrets

Dans `Backend/.env` sur EC2, utiliser un mot de passe RabbitMQ long et unique,
sans caractere qui doit etre encode dans une URL. Exemple:

```env
RABBITMQ_DEFAULT_USER=validation
RABBITMQ_DEFAULT_PASS=REMPLACER_PAR_UN_SECRET_LONG
CELERY_BROKER_URL=amqp://validation:REMPLACER_PAR_UN_SECRET_LONG@rabbitmq:5672//
CELERY_RESULT_BACKEND=redis://redis:6379/1
REDIS_CACHE_URL=redis://redis:6379/2
CELERY_EMAIL_ASYNC=true
```

Le mot de passe dans `CELERY_BROKER_URL` doit etre exactement le meme que
`RABBITMQ_DEFAULT_PASS`.

### Etape 2: demarrer la stack AWS

```bash
docker compose -f docker-compose.aws.yml up -d --build
docker compose -f docker-compose.aws.yml exec backend python manage.py migrate
docker compose -f docker-compose.aws.yml ps
```

### Etape 3: verifier le worker

```bash
docker compose -f docker-compose.aws.yml logs --tail=100 celery
docker compose -f docker-compose.aws.yml logs --tail=100 rabbitmq
```

RabbitMQ et Redis ne sont pas exposes publiquement dans la configuration AWS.
Il ne faut pas ouvrir les ports `5672`, `6379` ou `15672` dans le Security Group.
Seuls HTTP/HTTPS et l'acces d'administration necessaire doivent etre exposes.

### Etape 4: verifier le stockage

Le backend et le worker partagent le volume `backend_media`. Les exports sont
enregistres sous `jobs/kpi/` dans ce volume. Un redemarrage des conteneurs ne
supprime pas les fichiers. Ne pas executer `docker compose down -v` en production,
car l'option `-v` supprime les volumes.

## 7. Diagnostic rapide

### Le job reste en `PENDING`

```powershell
docker compose ps
docker compose logs --tail=200 celery
docker compose logs --tail=200 rabbitmq
```

Verifier que `CELERY_BROKER_URL` contient `@rabbitmq:5672//` dans Docker.

### Erreur `Connection refused` Redis

```powershell
docker compose exec redis redis-cli ping
```

Le resultat attendu est `PONG`. Verifier que le backend utilise
`redis://redis:6379/2` et Celery `redis://redis:6379/1`.

### Le job est `SUCCESS` mais le fichier est absent

Verifier que `backend` et `celery` montent tous les deux:

```yaml
- backend_media:/app/gammes
```

### Relancer seulement le worker

```powershell
docker compose restart celery
docker compose logs -f celery
```

Les jobs deja presents dans RabbitMQ seront repris par le worker.

## 8. Commandes de validation du code

Backend:

```powershell
cd Backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test admin_config.tests
```

Frontend:

```powershell
cd Frontend
npm run lint
npm run build
```

Docker:

```powershell
docker compose config --quiet
docker compose -f docker-compose.aws.yml config --quiet
```
