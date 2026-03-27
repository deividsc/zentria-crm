# Setup Odoo 17 en GCP (Compute Engine)

Guía paso a paso para desplegar Odoo Community en Google Cloud Platform.

## Requisitos Previos

- Cuenta de GCP con facturación habilitada
- Dominio configurado (opcional pero recomendado)
- CLI de Google Cloud (`gcloud`) instalado
- SSH configurado

## Paso 1: Crear VM en GCP

### Via Console

1. Ir a [GCP Console](https://console.cloud.google.com)
2. Compute Engine > Instancias de VM > Crear
3. Configurar:

| Campo | Valor Recomendado |
|-------|-------------------|
| Nombre | `odoo-zentria` |
| Región | `us-central1` (o más cercano) |
| Zona | `us-central1-a` |
| Familia de máquinas | `e2-medium` (2 vCPU, 4GB) |
| Disco de arranque | `Ubuntu 22.04 LTS` (20GB SSD) |
| Firewall | Permitir HTTP, HTTPS |

### Via CLI

```bash
gcloud compute instances create odoo-zentria \
    --machine-type=e2-medium \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-ssd \
    --zone=us-central1-a \
    --tags=http-server,https-server
```

## Paso 2: Configurar Firewall

```bash
# Abrir puertos para Odoo
gcloud compute firewall-rules create allow-odoo \
    --allow=tcp:8069,tcp:8072 \
    --target-tags=odoo-server

# Abrir puerto 80/443
gcloud compute firewall-rules create allow-http-https \
    --allow=tcp:80,tcp:443 \
    --target-tags=http-server
```

## Paso 3: Conectar a la VM

```bash
gcloud compute ssh odoo-zentria --zone=us-central1-a
```

## Paso 4: Instalar Docker

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y ca-certificates curl gnupg lsb-release

# Agregar Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Agregar repositorio
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
```

## Paso 5: Desplegar Odoo con Docker Compose

### En la VM, crear directorio:

```bash
mkdir -p /opt/odoo
cd /opt/odoo
```

### Crear docker-compose.yml:

```bash
cat > /opt/odoo/docker-compose.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: odoo
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

  odoo:
    image: odoo:17
    depends_on:
      - db
    environment:
      HOST: db
      USER: odoo
      PASSWORD: ${DB_PASSWORD}
      - SUPABASE_HOST=${SUPABASE_HOST}
      - SUPABASE_PORT=${SUPABASE_PORT}
      - SUPABASE_DB=${SUPABASE_DB}
      - SUPABASE_USER=${SUPABASE_USER}
      - SUPABASE_PASSWORD=${SUPABASE_PASSWORD}
    volumes:
      - odoo_data:/var/lib/odoo
      - ./config:/etc/odoo
      - ./addons:/mnt/extra-addons
    ports:
      - "8069:8069"
    restart: unless-stopped

  nginx:
    image: nginx:latest
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - odoo
    restart: unless-stopped

volumes:
  db_data:
  odoo_data:
EOF
```

### Crear archivo de entorno:

```bash
cat > /opt/odoo/.env << 'EOF'
# Database
DB_PASSWORD=tu_password_seguro_aqui

# Supabase
SUPABASE_HOST=your-project.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=tu_supabase_password
EOF
```

### Crear directorio de configuración:

```bash
mkdir -p /opt/odoo/config /opt/odoo/addons /opt/odoo/ssl
```

## Paso 6: Configurar Nginx con SSL

### Generar SSL con Let's Encrypt (después de tener dominio):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### nginx.conf básico:

```bash
cat > /opt/odoo/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream odoo {
        server odoo:8069;
    }

    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name tu-dominio.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        proxy_read_timeout 720s;
        proxy_connect_timeout 720s;
        proxy_send_timeout 720s;

        client_max_body_size 25M;

        location / {
            proxy_pass http://odoo;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /longpolling {
            proxy_pass http://odoo:8072;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF
```

## Paso 7: Iniciar Odoo

```bash
cd /opt/odoo
docker compose up -d
```

Verificar logs:
```bash
docker compose logs -f
```

## Paso 8: Configuración Inicial de Odoo

1. Abrir `http://TU_IP:8069` en el navegador
2. Crear base de datos:
   - Master Password: contraseña maestra
   - Database Name: `zentria`
   - Email: tu email
   - Password: contraseña admin
   - Phone: opcional
   - Language: Spanish
   - Country: Argentina

3. Instalar módulos básicos:
   - CRM
   - Contactos
   - Ventas
   - Facturación

## Paso 9: Configurar Supabase en Odoo

### Instalar módulo custom o usar External API

Crear archivo de conexión en `/opt/odoo/addons/sg_crm_sync/models/supabase_connection.py`:

```python
import psycopg2
from psycopg2 import sql

class SupabaseConnection:
    def __init__(self):
        self.host = os.getenv('SUPABASE_HOST')
        self.port = os.getenv('SUPABASE_PORT', '5432')
        self.dbname = os.getenv('SUPABASE_DB')
        self.user = os.getenv('SUPABASE_USER')
        self.password = os.getenv('SUPABASE_PASSWORD')
    
    def connect(self):
        return psycopg2.connect(
            host=self.host,
            port=self.port,
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            sslmode='require'
        )
```

## Comandos Útiles

```bash
# Reiniciar Odoo
docker compose restart odoo

# Ver logs
docker compose logs -f odoo

# Actualizar Odoo
docker compose pull odoo
docker compose up -d

# Backup de la base de datos
docker compose exec db pg_dump -U odoo odoo > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Odoo no inicia
```bash
docker compose logs odoo
docker compose restart odoo
```

### Error de conexión a DB
```bash
docker compose exec db pg_isready -U odoo
```

### Problemas de permisos
```bash
sudo chown -R $(id -u):$(id -g) /opt/odoo
```

## Próximos Pasos

1. [ ] Configurar dominio con DNS
2. [ ] Instalar SSL con Let's Encrypt
3. [ ] Configurar pipeline de CRM en Odoo
4. [ ] Sincronizar con Supabase
5. [ ] Configurar backup automático

---

**Soporte:** david@zentria.com
