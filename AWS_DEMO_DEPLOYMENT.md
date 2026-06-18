# Demo AWS simple pour comprendre le deploiement

But : lancer l'application sur AWS juste pour apprendre comment le deploiement marche.

Cette demo est volontairement simple :

- pas de domaine
- pas de HTTPS
- pas de GitHub Actions
- pas de RDS
- pas de production officielle

Tu vas ouvrir ton app avec :

```text
http://IP_PUBLIQUE_AWS
```

Quand tu as compris, tu peux passer au guide complet : `AWS_DEPLOYMENT_GUIDE.md`.

## 1. Architecture de la demo

```text
Ton navigateur
  |
http://IP_PUBLIQUE_AWS
  |
Security Group AWS port 80
  |
Nginx sur EC2
  |
Frontend Docker sur 127.0.0.1:5173
  |
Backend Docker sur 127.0.0.1:8000
  |
PostgreSQL Docker prive
```

Le port public visible par le monde est seulement :

```text
80
```

SSH est ouvert seulement pour ton IP :

```text
22
```

## 2. Creer et configurer une instance EC2

### 2.1 Aller dans EC2

1. Ouvre AWS Console.
2. En haut a droite, choisis une region proche, par exemple :

```text
eu-west-3 Paris
```

3. Dans la barre de recherche AWS, tape :

```text
EC2
```

4. Clique sur `EC2`.
5. Dans le menu gauche, clique `Instances`.
6. Clique sur le bouton orange :

```text
Launch instances
```

### 2.2 Name and tags

Dans `Name and tags`, mets :

```text
validation-platform-demo
```

Ce nom sert juste a reconnaitre ta VM dans AWS.

### 2.3 Application and OS Images

Dans `Application and OS Images`, choisis :

```text
Quick Start: Ubuntu
AMI: Ubuntu Server 24.04 LTS
Architecture: 64-bit x86
```

Si AWS te propose plusieurs Ubuntu, prends la version LTS. LTS veut dire support long terme.

### 2.4 Instance type

Dans `Instance type`, choisis :

```text
t3.small
```

Pourquoi pas `t3.micro` ?

`t3.micro` peut marcher pour une page simple, mais ton projet build un frontend React, lance Django et PostgreSQL. Pour eviter de bloquer pendant le build Docker, `t3.small` est plus confortable.

Pour une demo courte :

```text
t3.small
```

Pour depenser moins mais avec risque de lenteur :

```text
t3.micro
```

### 2.5 Key pair

Dans `Key pair`, clique :

```text
Create new key pair
```

Remplis :

```text
Key pair name: validation-platform-demo-key
Key pair type: RSA
Private key file format: .pem
```

Clique :

```text
Create key pair
```

AWS va telecharger un fichier :

```text
validation-platform-demo-key.pem
```

Garde ce fichier. Sans lui, tu ne peux pas entrer dans la VM par SSH.

### 2.6 Network settings

Dans `Network settings`, clique `Edit`.

Garde :

```text
VPC: default VPC
Subnet: No preference
Auto-assign public IP: Enable
```

Pour une demo, le VPC par defaut suffit.

### 2.7 Security Group

Dans `Firewall`, choisis :

```text
Create security group
```

Nom :

```text
validation-platform-demo-sg
```

Description :

```text
Security group for validation platform demo
```

Regles entrantes a mettre :

```text
Type: SSH
Protocol: TCP
Port: 22
Source: My IP
Description: SSH from my computer
```

Puis ajoute une deuxieme regle :

```text
Type: HTTP
Protocol: TCP
Port: 80
Source: Anywhere IPv4
Description: Public web access
```

Pour cette demo, ne mets pas HTTPS tout de suite.

Ne mets surtout pas ces ports en public :

```text
8000
5173
5432
```

Explication :

- `8000` : backend Django, doit rester interne
- `5173` : frontend Docker, doit rester interne
- `5432` : PostgreSQL, ne jamais exposer publiquement

Le navigateur va entrer par le port `80`, puis Nginx va rediriger en interne vers le frontend.

### 2.8 Configure storage

Dans `Configure storage`, mets :

```text
30 GiB
gp3
```

Pourquoi 30 Go ?

Docker garde des images, des caches et les donnees PostgreSQL. 8 Go devient vite trop petit.

### 2.9 Advanced details

Pour la demo, ne change rien dans `Advanced details`.

Laisse :

```text
IAM instance profile: None
Shutdown behavior: Stop
Termination protection: Disabled
```

### 2.10 Summary

A droite, AWS affiche le resume.

Verifie :

```text
Name: validation-platform-demo
AMI: Ubuntu Server 24.04 LTS
Instance type: t3.small
Key pair: validation-platform-demo-key
Security group: validation-platform-demo-sg
Storage: 30 GiB
```

Puis clique :

```text
Launch instance
```

### 2.11 Attendre que la VM soit prete

Va dans :

```text
EC2 > Instances
```

Selectionne `validation-platform-demo`.

Attends :

```text
Instance state: Running
Status check: 2/2 checks passed
```

### 2.12 Recuperer l'IP publique

Dans les details de l'instance, copie :

```text
Public IPv4 address
```

Exemple :

```text
13.38.120.10
```

Dans tout le guide, remplace :

```text
IP_PUBLIQUE_AWS
```

par cette IP.

## 3. Verifier la configuration reseau EC2

Avant de te connecter, verifie encore le Security Group.

Dans AWS :

```text
EC2 > Instances > validation-platform-demo > Security
```

Tu dois voir :

```text
Inbound rules:
SSH   TCP 22   Ton IP
HTTP  TCP 80   0.0.0.0/0
```

Tu ne dois pas voir :

```text
8000
5173
5432
```

Si SSH est `Anywhere`, change-le vers `My IP`. Pour une demo courte ca peut marcher, mais c'est une mauvaise habitude.

## 4. Se connecter a la VM

Dans PowerShell, va dans le dossier ou se trouve la cle :

```powershell
cd C:\Users\TON_USER\Downloads
```

Protege la cle :

```powershell
icacls .\validation-platform-demo-key.pem /inheritance:r
icacls .\validation-platform-demo-key.pem /grant:r "$env:USERNAME:R"
```

Connecte-toi :

```powershell
ssh -i .\validation-platform-demo-key.pem ubuntu@IP_PUBLIQUE_AWS
```

## 5. Installer les outils sur Ubuntu

Sur la VM :

```bash
sudo apt update
sudo apt -y upgrade
sudo apt install -y git curl ca-certificates gnupg nginx ufw
```

Activer le firewall local :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw enable
sudo ufw status
```

## 6. Installer Docker

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

Installer :

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Autoriser l'utilisateur `ubuntu` :

```bash
sudo usermod -aG docker $USER
```

Ferme SSH :

```bash
exit
```

Reconnecte-toi :

```powershell
ssh -i .\validation-platform-demo-key.pem ubuntu@IP_PUBLIQUE_AWS
```

Verifie :

```bash
docker --version
docker compose version
```

## 7. Cloner le projet

Sur la VM :

```bash
cd /opt
sudo mkdir -p validation-platform-demo
sudo chown -R ubuntu:ubuntu validation-platform-demo
```

Clone ton repo :

```bash
git clone https://github.com/TON_ORG/TON_REPO.git validation-platform-demo
cd /opt/validation-platform-demo
```

Remplace `TON_ORG/TON_REPO`.

## 8. Creer le `.env` demo

Copie l'exemple :

```bash
cp Backend/.env.aws.example Backend/.env
```

Genere deux secrets :

```bash
openssl rand -hex 32
openssl rand -hex 24
```

Edite :

```bash
nano Backend/.env
```

Pour demo avec IP publique, mets ceci :

```env
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=COLLE_ICI_LA_CLE_DJANGO
DJANGO_ALLOWED_HOSTS=IP_PUBLIQUE_AWS
FRONTEND_URL=http://IP_PUBLIQUE_AWS
CORS_ALLOWED_ORIGINS=http://IP_PUBLIQUE_AWS
CSRF_TRUSTED_ORIGINS=http://IP_PUBLIQUE_AWS
USE_X_FORWARDED_PROTO=true
SECURE_SSL_REDIRECT=false
SESSION_COOKIE_SECURE=false
CSRF_COOKIE_SECURE=false

DB_ENGINE=postgresql
DB_NAME=validation_app
DB_USER=validation_app
DB_PASSWORD=COLLE_ICI_LE_MOT_DE_PASSE_POSTGRES
DB_HOST=db
DB_PORT=5432
DB_SSLMODE=disable

POSTGRES_DB=validation_app
POSTGRES_USER=validation_app
POSTGRES_PASSWORD=COLLE_ICI_LE_MOT_DE_PASSE_POSTGRES

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=no-reply@demo.local
```

Important : remplace `IP_PUBLIQUE_AWS` partout.

Sauvegarder dans nano :

```text
CTRL + O
Enter
CTRL + X
```

## 9. Lancer l'app avec Docker

Depuis `/opt/validation-platform-demo` :

```bash
docker compose -f docker-compose.aws.yml up -d --build
```

Verifier :

```bash
docker compose -f docker-compose.aws.yml ps
```

Voir les logs :

```bash
docker compose -f docker-compose.aws.yml logs -f
```

Tester localement depuis la VM :

```bash
curl -I http://127.0.0.1:5173
curl -I http://127.0.0.1:8000
```

## 10. Configurer Nginx pour l'IP

Copie la config demo :

```bash
sudo cp deploy/nginx/validation-platform-demo.conf.example /etc/nginx/sites-available/validation-platform-demo
```

Active-la :

```bash
sudo ln -s /etc/nginx/sites-available/validation-platform-demo /etc/nginx/sites-enabled/validation-platform-demo
sudo rm -f /etc/nginx/sites-enabled/default
```

Teste :

```bash
sudo nginx -t
```

Recharge :

```bash
sudo systemctl reload nginx
```

## 11. Ouvrir la demo

Dans ton navigateur :

```text
http://IP_PUBLIQUE_AWS
```

Si tu vois l'application, bravo : tu as compris le deploiement minimum.

## 12. Creer un admin Django

Sur la VM :

```bash
cd /opt/validation-platform-demo
docker compose -f docker-compose.aws.yml exec backend python manage.py createsuperuser
```

Puis ouvre :

```text
http://IP_PUBLIQUE_AWS/admin/
```

## 13. Modifier le code et redeployer manuellement

Sur ton PC :

```bash
git add .
git commit -m "Demo deployment change"
git push
```

Sur la VM :

```bash
cd /opt/validation-platform-demo
git pull
docker compose -f docker-compose.aws.yml up -d --build
docker compose -f docker-compose.aws.yml exec -T backend python manage.py migrate --noinput
```

C'est ca, le cycle de deploiement manuel :

```text
push code -> pull sur serveur -> rebuild Docker -> restart app -> migrate DB
```

## 14. Arreter la demo pour ne pas payer

Quand tu as fini le test :

```bash
cd /opt/validation-platform-demo
docker compose -f docker-compose.aws.yml down
```

Dans AWS Console :

```text
EC2 > Instances > selectionner l'instance > Instance state > Terminate
```

Attention : `Terminate` supprime la VM.

Supprime aussi l'Elastic IP si tu en as cree une :

```text
EC2 > Elastic IPs > Release Elastic IP
```

## 15. Problemes frequents

### EC2 Instance Connect affiche "Failed to connect to your instance"

Si tu vois dans la console AWS :

```text
Failed to connect to your instance
Error establishing SSH connection to your instance. Try again later.
```

Tu es probablement en train d'utiliser le bouton AWS `Connect` dans le navigateur.

Point important : si ton Security Group contient seulement :

```text
SSH TCP 22 My IP
```

alors la connexion SSH depuis ton PC marche, mais la connexion depuis le bouton AWS peut echouer. Pourquoi ? Parce que le bouton AWS `Connect` utilise le service AWS `EC2 Instance Connect`, et la connexion peut venir des IP AWS de ce service, pas directement de ton PC.

Solution conseillee pour la demo : utilise PowerShell avec ta cle `.pem`.

```powershell
ssh -i .\validation-platform-demo-key.pem ubuntu@IP_PUBLIQUE_AWS
```

Si tu veux absolument utiliser le bouton AWS `Connect`, ajoute une regle inbound dans le Security Group pour EC2 Instance Connect.

Dans AWS Console :

```text
EC2 > Security Groups > validation-platform-demo-sg > Edit inbound rules
```

Ajoute :

```text
Type: SSH
Port: 22
Source: EC2 Instance Connect prefix list
```

Dans ta region actuelle, Stockholm, le code region est :

```text
eu-north-1
```

La prefix list ressemble a :

```text
com.amazonaws.eu-north-1.ec2-instance-connect
```

Si AWS ne te propose pas la prefix list dans l'interface, le plus simple reste PowerShell avec la cle `.pem`.

Pour une demo tres courte seulement, tu peux temporairement ouvrir :

```text
SSH TCP 22 0.0.0.0/0
```

Mais remets ensuite :

```text
SSH TCP 22 My IP
```

Ne garde pas SSH ouvert au monde.

Verifie aussi :

```text
[ ] Instance state = Running
[ ] Status checks = 2/2 checks passed
[ ] Public IPv4 existe
[ ] Security Group autorise SSH port 22
[ ] Username = ubuntu
[ ] Tu utilises la bonne cle .pem
[ ] L'instance est Ubuntu, pas Amazon Linux
```

### PowerShell affiche "connect to host ... port 22: Connection timed out"

Si PowerShell affiche :

```text
ssh: connect to host IP_PUBLIQUE_AWS port 22: Connection timed out
```

Alors le probleme n'est pas encore la cle `.pem`.

Ca veut dire :

```text
Ton PC n'arrive pas a atteindre le port SSH 22 de la VM.
```

Les causes les plus frequentes :

```text
[ ] Mauvaise IP publique
[ ] Instance arretee ou pas encore prete
[ ] Security Group n'autorise pas ton IP sur le port 22
[ ] Ton IP publique a change
[ ] Ton reseau d'entreprise bloque le port 22 sortant
[ ] Instance dans un subnet prive sans acces internet
```

Etape 1, verifier ton IP publique depuis PowerShell :

```powershell
(Invoke-RestMethod https://checkip.amazonaws.com).Trim()
```

Copie le resultat.

Etape 2, dans AWS Console :

```text
EC2 > Instances > validation-platform-demo > Security > Security groups
```

Clique le Security Group, puis `Edit inbound rules`.

Mets une regle SSH comme ceci :

```text
Type: SSH
Protocol: TCP
Port: 22
Source: TON_IP_PUBLIQUE/32
```

Exemple :

```text
Type: SSH
Port: 22
Source: 196.70.12.34/32
```

Etape 3, verifier que le port 22 repond depuis PowerShell :

```powershell
Test-NetConnection IP_PUBLIQUE_AWS -Port 22
```

Si tu vois :

```text
TcpTestSucceeded : True
```

alors retente SSH :

```powershell
ssh -i .\validation-platform-demo-key.pem ubuntu@IP_PUBLIQUE_AWS
```

Si tu vois :

```text
TcpTestSucceeded : False
```

le port 22 est encore bloque.

Pour une demo courte, tu peux tester temporairement :

```text
Type: SSH
Port: 22
Source: 0.0.0.0/0
```

Puis reteste :

```powershell
Test-NetConnection IP_PUBLIQUE_AWS -Port 22
```

Si ca marche avec `0.0.0.0/0` mais pas avec `My IP`, alors ton IP publique n'etait pas la bonne ou elle a change.

Important : apres le test, remets SSH sur ton IP uniquement :

```text
Source: TON_IP_PUBLIQUE/32
```

Si meme `0.0.0.0/0` ne marche pas, verifie :

```text
[ ] Instance state = Running
[ ] Status checks = 2/2 passed
[ ] Public IPv4 = la meme IP que dans ta commande SSH
[ ] Subnet public avec route 0.0.0.0/0 vers Internet Gateway
[ ] Ton reseau local n'interdit pas SSH sortant
```

Si tu es sur un reseau d'entreprise, il est possible que le port 22 sortant soit bloque. Dans ce cas, essaie depuis un autre reseau, par exemple partage 4G/5G du telephone, ou utilise AWS EC2 Instance Connect dans le navigateur avec sa prefix list.

Si le navigateur ne marche pas :

```bash
sudo systemctl status nginx
sudo nginx -t
docker compose -f docker-compose.aws.yml ps
docker compose -f docker-compose.aws.yml logs --tail=100
```

Si erreur `DisallowedHost` :

Verifie dans `Backend/.env` :

```env
DJANGO_ALLOWED_HOSTS=IP_PUBLIQUE_AWS
```

Si erreur CORS ou CSRF :

Verifie :

```env
CORS_ALLOWED_ORIGINS=http://IP_PUBLIQUE_AWS
CSRF_TRUSTED_ORIGINS=http://IP_PUBLIQUE_AWS
```

Si Nginx retourne 502 :

Le frontend Docker n'est probablement pas pret :

```bash
docker compose -f docker-compose.aws.yml logs frontend
```

Si PostgreSQL ne demarre pas :

Verifie que `POSTGRES_PASSWORD` existe dans `Backend/.env`.

## 16. Apres cette demo

Quand la demo fonctionne, passe a la vraie version :

```text
1. Acheter/configurer un domaine
2. Ajouter HTTPS avec Certbot
3. Brancher GitHub Actions
4. Ajouter des backups
5. Eventuellement migrer PostgreSQL vers AWS RDS
```
