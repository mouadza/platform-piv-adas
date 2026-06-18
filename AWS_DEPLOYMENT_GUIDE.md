# Guide AWS pas a pas pour heberger l'application

Objectif : heberger ce projet Django + React sur AWS avec une VM EC2 Ubuntu, Docker Compose, PostgreSQL, Nginx, HTTPS et GitHub Actions.

Ce guide suppose que tu pars de zero.

## 0. Ce qu'on va construire

Architecture simple, propre et comprehensible :

```text
Internet
  |
Nom de domaine HTTPS
  |
AWS EC2 Ubuntu
  |
Nginx installe sur la VM
  |
Frontend Docker sur 127.0.0.1:5173
  |
Backend Docker sur 127.0.0.1:8000
  |
PostgreSQL Docker prive
```

Pourquoi ce choix ?

- EC2 est une VM : facile a comprendre quand on debute.
- Docker Compose est deja adapte a ton projet.
- PostgreSQL remplace SQLite pour une vraie prod.
- Nginx gere l'entree publique et HTTPS.
- GitHub Actions peut deployer automatiquement apres un push sur `main`.

## 1. Vocabulaire minimum

AWS : fournisseur cloud.

EC2 : machine virtuelle chez AWS.

Instance : une VM EC2 lancee.

AMI : image de depart de la VM, par exemple Ubuntu.

Security Group : pare-feu AWS autour de la VM.

Key Pair : cle SSH pour se connecter a la VM.

Elastic IP : IP publique fixe.

Route 53 : service DNS AWS.

Docker : outil pour lancer l'application dans des conteneurs.

Docker Compose : fichier qui lance plusieurs conteneurs ensemble.

Nginx : serveur web / reverse proxy.

Certbot / Let's Encrypt : outil pour obtenir HTTPS gratuit.

## 2. Avant de commencer

Il te faut :

- un compte AWS
- une carte bancaire configuree dans AWS
- ton projet pousse sur GitHub
- un terminal local, par exemple PowerShell sur Windows
- un nom de domaine si tu veux HTTPS propre

Important cout : AWS peut facturer meme si tu testes. Mets un budget avant de creer les ressources.

## 3. Securiser le compte AWS

### 3.1 Activer MFA

1. Connecte-toi a AWS Console.
2. Va dans `IAM`.
3. Va dans `Security recommendations`.
4. Active MFA sur le compte root.

Ne travaille pas tous les jours avec le compte root.

### 3.2 Creer un budget

1. Va dans `Billing and Cost Management`.
2. Va dans `Budgets`.
3. Clique `Create budget`.
4. Choisis `Cost budget`.
5. Mets par exemple `10 USD` ou `20 USD`.
6. Ajoute ton email pour recevoir les alertes.

But : recevoir un email avant une mauvaise surprise.

## 4. Choisir la region AWS

Une region est un datacenter AWS geographique.

Exemples :

- `eu-west-3` : Paris
- `eu-west-1` : Ireland
- `eu-central-1` : Frankfurt

Pour Maroc / France / Europe, commence avec :

```text
eu-west-3 Paris
```

Dans la console AWS, selectionne la region en haut a droite.

## 5. Creer la VM EC2

### 5.1 Ouvrir EC2

1. Dans AWS Console, cherche `EC2`.
2. Clique `Instances`.
3. Clique `Launch instances`.

### 5.2 Nom de l'instance

Mets :

```text
validation-platform-prod
```

### 5.3 Choisir l'OS

Dans `Application and OS Images` :

```text
Ubuntu Server 24.04 LTS
Architecture: 64-bit x86
```

Choisis x86 pour eviter les surprises au debut.

### 5.4 Choisir le type d'instance

Pour debuter :

```text
t3.small
```

Minimum possible :

```text
t3.micro
```

Mais `t3.micro` peut etre trop petit pour Docker + build frontend + backend + PostgreSQL.

Conseil :

```text
Dev/demo: t3.small
Prod plus confortable: t3.medium
```

### 5.5 Creer la cle SSH

Dans `Key pair` :

1. Clique `Create new key pair`.
2. Nom :

```text
validation-platform-prod-key
```

3. Type :

```text
RSA ou ED25519
```

4. Format :

```text
.pem
```

5. Telecharge le fichier `.pem`.

Garde ce fichier en securite. Celui qui a cette cle peut entrer sur ta VM.

### 5.6 Configurer le Security Group

Dans `Network settings`, cree un Security Group.

Nom :

```text
validation-platform-prod-sg
```

Regles entrantes :

```text
SSH   TCP 22   My IP
HTTP  TCP 80   0.0.0.0/0
HTTPS TCP 443  0.0.0.0/0
```

Ne pas ouvrir :

```text
8000
5173
5432
```

Ces ports doivent rester internes a la VM.

### 5.7 Stockage

Dans `Configure storage` :

```text
30 Go gp3 minimum
50 Go gp3 conseille
```

### 5.8 Lancer

Clique :

```text
Launch instance
```

Attends que l'etat devienne :

```text
Running
```

## 6. Creer une Elastic IP

L'IP publique normale d'une instance peut changer si tu arretes/redemarres certaines ressources. Une Elastic IP reste fixe.

1. EC2 > `Elastic IPs`.
2. Clique `Allocate Elastic IP address`.
3. Clique `Allocate`.
4. Selectionne l'Elastic IP.
5. Clique `Actions > Associate Elastic IP address`.
6. Choisis ton instance `validation-platform-prod`.
7. Clique `Associate`.

Note cout : AWS facture les IPv4 publiques et les Elastic IP. Verifie toujours avec AWS Pricing Calculator.

## 7. Se connecter a la VM

Dans PowerShell, va dans le dossier ou tu as mis la cle `.pem`.

Exemple :

```powershell
cd C:\Users\TON_USER\Downloads
```

Protege la cle sur Windows :

```powershell
icacls .\validation-platform-prod-key.pem /inheritance:r
icacls .\validation-platform-prod-key.pem /grant:r "$env:USERNAME:R"
```

Connecte-toi :

```powershell
ssh -i .\validation-platform-prod-key.pem ubuntu@ELASTIC_IP
```

Remplace `ELASTIC_IP` par ton IP AWS.

Si AWS demande confirmation :

```text
Are you sure you want to continue connecting?
```

Tape :

```text
yes
```

## 8. Preparer Ubuntu

Sur la VM :

```bash
sudo apt update
sudo apt -y upgrade
sudo apt install -y git curl ca-certificates gnupg nginx snapd ufw
```

Activer le pare-feu Ubuntu :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

## 9. Installer Docker

Sur la VM :

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Ajouter le depot Docker :

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Installer Docker :

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Autoriser l'utilisateur `ubuntu` a lancer Docker sans `sudo` :

```bash
sudo usermod -aG docker $USER
```

Ferme la session SSH :

```bash
exit
```

Reconnecte-toi :

```powershell
ssh -i .\validation-platform-prod-key.pem ubuntu@ELASTIC_IP
```

Teste Docker :

```bash
docker --version
docker compose version
docker run hello-world
```

## 10. Mettre le projet sur la VM

Va dans `/opt` :

```bash
cd /opt
sudo mkdir -p validation-platform
sudo chown -R ubuntu:ubuntu validation-platform
```

Si ton repo est public :

```bash
git clone https://github.com/TON_ORG/TON_REPO.git validation-platform
```

Si ton repo est prive, le plus propre est d'utiliser une GitHub Deploy Key.

Pour l'instant, adapte `TON_ORG/TON_REPO`.

Entre dans le projet :

```bash
cd /opt/validation-platform
```

## 11. Creer le fichier de production `.env`

Copie l'exemple AWS :

```bash
cp Backend/.env.aws.example Backend/.env
```

Genere une cle Django :

```bash
openssl rand -hex 32
```

Edite le fichier :

```bash
nano Backend/.env
```

Exemple avec domaine :

```env
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=COLLE_ICI_LA_CLE_GENEREE
DJANGO_ALLOWED_HOSTS=ton-domaine.com,www.ton-domaine.com
FRONTEND_URL=https://ton-domaine.com
CORS_ALLOWED_ORIGINS=https://ton-domaine.com,https://www.ton-domaine.com
CSRF_TRUSTED_ORIGINS=https://ton-domaine.com,https://www.ton-domaine.com
USE_X_FORWARDED_PROTO=true
SECURE_SSL_REDIRECT=false
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true

DB_ENGINE=postgresql
DB_NAME=validation_app
DB_USER=validation_app
DB_PASSWORD=MOT_DE_PASSE_POSTGRES_TRES_FORT
DB_HOST=db
DB_PORT=5432
DB_SSLMODE=disable

POSTGRES_DB=validation_app
POSTGRES_USER=validation_app
POSTGRES_PASSWORD=MOT_DE_PASSE_POSTGRES_TRES_FORT

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=no-reply@ton-domaine.com
```

Si tu n'as pas encore de domaine, pour tester avec IP :

```env
DJANGO_ALLOWED_HOSTS=ELASTIC_IP
FRONTEND_URL=http://ELASTIC_IP
CORS_ALLOWED_ORIGINS=http://ELASTIC_IP
CSRF_TRUSTED_ORIGINS=http://ELASTIC_IP
SESSION_COOKIE_SECURE=false
CSRF_COOKIE_SECURE=false
```

Mais pour production, utilise un domaine + HTTPS.

Sauvegarder dans nano :

```text
CTRL + O
Enter
CTRL + X
```

## 12. Lancer l'application avec Docker Compose AWS

Depuis `/opt/validation-platform` :

```bash
docker compose -f docker-compose.aws.yml build
docker compose -f docker-compose.aws.yml up -d
docker compose -f docker-compose.aws.yml ps
```

Voir les logs backend :

```bash
docker compose -f docker-compose.aws.yml logs -f backend
```

Tester depuis la VM :

```bash
curl -I http://127.0.0.1:5173
curl -I http://127.0.0.1:8000
```

Commandes utiles :

```bash
docker compose -f docker-compose.aws.yml logs -f
docker compose -f docker-compose.aws.yml restart
docker compose -f docker-compose.aws.yml down
docker compose -f docker-compose.aws.yml up -d --build
```

## 13. Configurer Nginx sur la VM

Nginx public va recevoir `http://ton-domaine.com` puis envoyer vers le frontend Docker en local.

Copie l'exemple :

```bash
sudo cp deploy/nginx/validation-platform.conf.example /etc/nginx/sites-available/validation-platform
```

Edite :

```bash
sudo nano /etc/nginx/sites-available/validation-platform
```

Remplace :

```text
example.com www.example.com
```

par :

```text
ton-domaine.com www.ton-domaine.com
```

Active le site :

```bash
sudo ln -s /etc/nginx/sites-available/validation-platform /etc/nginx/sites-enabled/validation-platform
```

Desactive le site par defaut si besoin :

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Teste Nginx :

```bash
sudo nginx -t
```

Recharge :

```bash
sudo systemctl reload nginx
```

Teste dans navigateur :

```text
http://ton-domaine.com
```

## 14. Configurer DNS

### Option A : domaine dans Route 53

1. Va dans AWS `Route 53`.
2. Va dans `Hosted zones`.
3. Cree ou ouvre la hosted zone de ton domaine.
4. Cree un record :

```text
Type: A
Name: ton-domaine.com
Value: ELASTIC_IP
TTL: 300
```

5. Cree un autre record :

```text
Type: A
Name: www.ton-domaine.com
Value: ELASTIC_IP
TTL: 300
```

### Option B : domaine chez un autre fournisseur

Va chez ton fournisseur DNS, puis cree :

```text
A    @      ELASTIC_IP
A    www    ELASTIC_IP
```

Attends quelques minutes. Parfois la propagation DNS peut prendre plus longtemps.

Tester depuis ton PC :

```powershell
nslookup ton-domaine.com
```

## 15. Activer HTTPS avec Certbot

HTTPS necessite que le domaine pointe deja vers l'Elastic IP.

Sur la VM :

```bash
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
```

Demander le certificat :

```bash
sudo certbot --nginx -d ton-domaine.com -d www.ton-domaine.com
```

Certbot va modifier Nginx automatiquement.

Tester le renouvellement :

```bash
sudo certbot renew --dry-run
```

Tester dans navigateur :

```text
https://ton-domaine.com
```

## 16. Creer un super admin Django

Sur la VM :

```bash
cd /opt/validation-platform
docker compose -f docker-compose.aws.yml exec backend python manage.py createsuperuser
```

Ensuite teste :

```text
https://ton-domaine.com/admin/
```

## 17. Brancher GitHub Actions vers AWS

Le workflow existe deja dans :

```text
.github/workflows/ci-cd.yml
```

Il deploie sur AWS quand tu fais un push sur `main`, si les secrets sont configures.

### 17.1 Creer une cle SSH dediee au deploiement

Sur ton PC local :

```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f .\aws-github-actions-deploy
```

Tu obtiens :

```text
aws-github-actions-deploy
aws-github-actions-deploy.pub
```

Ajoute la cle publique sur EC2 :

```powershell
type .\aws-github-actions-deploy.pub | ssh -i .\validation-platform-prod-key.pem ubuntu@ELASTIC_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

Teste :

```powershell
ssh -i .\aws-github-actions-deploy ubuntu@ELASTIC_IP
```

### 17.2 Ajouter les secrets GitHub

Dans GitHub :

```text
Repository > Settings > Secrets and variables > Actions > New repository secret
```

Ajoute :

```text
DEPLOY_HOST=ELASTIC_IP
DEPLOY_USER=ubuntu
DEPLOY_PATH=/opt/validation-platform
DEPLOY_SSH_KEY=contenu du fichier aws-github-actions-deploy
```

Pour afficher la cle privee dans PowerShell :

```powershell
Get-Content .\aws-github-actions-deploy -Raw
```

Copie tout, y compris :

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 17.3 Tester le deploiement

Fais un commit puis push sur `main` :

```bash
git add .
git commit -m "Prepare AWS deployment"
git push origin main
```

Dans GitHub :

```text
Actions > CI/CD Validation Platform
```

Verifie que tous les jobs passent.

## 18. Commandes d'exploitation

Se connecter :

```bash
ssh -i validation-platform-prod-key.pem ubuntu@ELASTIC_IP
```

Voir les conteneurs :

```bash
cd /opt/validation-platform
docker compose -f docker-compose.aws.yml ps
```

Voir les logs :

```bash
docker compose -f docker-compose.aws.yml logs -f backend
docker compose -f docker-compose.aws.yml logs -f frontend
docker compose -f docker-compose.aws.yml logs -f db
```

Redemarrer :

```bash
docker compose -f docker-compose.aws.yml restart
```

Mettre a jour manuellement :

```bash
cd /opt/validation-platform
git pull --ff-only
docker compose -f docker-compose.aws.yml up -d --build
docker compose -f docker-compose.aws.yml exec -T backend python manage.py migrate --noinput
docker compose -f docker-compose.aws.yml ps
```

Verifier Nginx :

```bash
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx
```

Verifier le disque :

```bash
df -h
```

Verifier la memoire :

```bash
free -h
```

## 19. Backup minimum

Cree un dossier :

```bash
mkdir -p /opt/validation-platform/backups
cd /opt/validation-platform
```

Backup PostgreSQL :

```bash
docker compose -f docker-compose.aws.yml exec -T db pg_dump -U validation_app validation_app > backups/db_$(date +%F_%H%M).sql
```

Backup fichiers media :

```bash
docker compose -f docker-compose.aws.yml exec -T backend tar -czf - -C /app/gammes . > backups/media_$(date +%F_%H%M).tgz
```

Liste :

```bash
ls -lh backups
```

Pour une vraie production, envoie ces backups vers S3 automatiquement.

## 20. Monitoring minimum

Au debut :

```bash
docker compose -f docker-compose.aws.yml ps
docker compose -f docker-compose.aws.yml logs --tail=100 backend
df -h
free -h
```

Ensuite, ajoute CloudWatch Agent pour collecter :

- CPU
- RAM
- disque
- logs

## 21. Evolution professionnelle

Phase 1, simple :

```text
EC2 + Docker Compose + PostgreSQL Docker
```

Phase 2, plus propre :

```text
EC2 + Docker Compose + RDS PostgreSQL
```

Phase 3, plus scalable :

```text
ECS Fargate + RDS + S3 + ALB + ACM
```

Phase 4, grande equipe :

```text
Terraform + ECS/EKS + RDS Multi-AZ + CloudWatch + CI/CD complet
```

Pour ton niveau actuel, fais d'abord Phase 1. Quand ca marche, on migre vers RDS.

## 22. Checklist finale

Avant de dire "c'est en production", verifie :

```text
[ ] Budget AWS cree
[ ] MFA active
[ ] EC2 lancee
[ ] Security Group : 22 My IP, 80 public, 443 public
[ ] Elastic IP associee
[ ] Docker installe
[ ] Repo clone dans /opt/validation-platform
[ ] Backend/.env cree
[ ] docker-compose.aws.yml up
[ ] Nginx proxy actif
[ ] Domaine pointe vers Elastic IP
[ ] HTTPS Certbot actif
[ ] Superuser Django cree
[ ] GitHub Actions secrets ajoutes
[ ] Backup manuel teste
```

## Sources officielles

- AWS EC2 get started: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html
- AWS EC2 key pairs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
- AWS security groups: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- AWS Elastic IP: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS Route 53 records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html
- AWS Budgets: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
- AWS Pricing Calculator: https://calculator.aws/
- Docker Ubuntu install: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin: https://docs.docker.com/compose/install/linux/
- Certbot Nginx: https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal
- Django deployment checklist: https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
- GitHub Actions secrets: https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
