# SWS2026 — Hosting Center

A containerized hosting center built with Docker Compose.

## Stack

| Service  | Technology        | Port  |
|----------|-------------------|-------|
| Database | PostgreSQL 15     | 5432  |
| Web server | Apache httpd    | 80    |
| Backend  | Node.js / Express | 8765  |
| Frontend | React + Vite      | 5274  |
| FTP      | Pure-FTPd         | 21    |

---

## Setup (everyone on the team does this once)

### 1. Clone the repo

```bash
git clone <repo-url>
cd SWS2026
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

You can leave the default values as-is for local development.

### 3. Add test hosts to `/etc/hosts`

Open the file with sudo (macOS/Linux):

```bash
sudo nano /etc/hosts
```

Add these lines at the bottom:

```
127.0.0.1   www.mojefirma.cz
127.0.0.1   www.example.cz
```

Save and exit (`Ctrl+X`, then `Y`).

> **Windows:** Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator.

### 4. Start all services

```bash
docker compose up --build
```

First run takes a few minutes to pull images and install dependencies.

### 5. Verify everything works

| URL | Expected result |
|-----|----------------|
| `http://localhost` | Apache default page |
| `http://www.mojefirma.cz` | Moje Firma test site |
| `http://localhost:8765` | Backend health check |
| `http://localhost:5274` | React frontend |

FTP connection: host `localhost`, port `21`, user/pass from your `.env`.

---

## Project structure

```
SWS2026/
├── apache/                  # Apache Dockerfile (enables vhosts)
├── apache-config/           # Virtual host config files
│   └── httpd-vhosts.conf    # Virtual host definitions
├── backend/                 # Node.js Express API
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── db/
│   └── init.sql             # DB schema — runs automatically on first start
├── frontend/                # React + Vite app
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── hosted-sites/            # Files served by Apache
│   ├── index.html           # Default (localhost)
│   └── mojefirma/           # www.mojefirma.cz
│       └── index.html
├── .env                     # Local credentials (not committed)
├── .env.example             # Template — commit this
└── docker-compose.yml
```

---

## Adding a new virtual host (team workflow)

1. Add a folder in `hosted-sites/yoursite/`
2. Add an `index.html` inside it
3. Add a new `<VirtualHost>` block in `apache-config/httpd-vhosts.conf`
4. Add `127.0.0.1 www.yoursite.cz` to your local `/etc/hosts`
5. Restart Apache: `docker compose restart apache`

---

## Common commands

```bash
# Start everything
docker compose up --build

# Stop everything
docker compose down

# View logs for a specific service
docker compose logs -f apache
docker compose logs -f backend

# Reset database (⚠️ deletes all data)
docker compose down -v
docker compose up --build
```
