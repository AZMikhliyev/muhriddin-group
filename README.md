# 🌾 Muhriddin Group v2.0

Qishloq xo'jaligi ishlarini boshqaruvchi zamonaviy web-tizim.

## 🚀 Xususiyatlar

- ✅ **Admin Panel** — bugungi ishlar, barcha ishlar, filtrlash, qidiruv, Excel eksport
- ✅ **Worker Panel** — ish yuborish, o'z ishlarini ko'rish, 10 soat ichida tahrirlash/o'chirish
- ✅ **Telegram Mini App** qo'llab-quvvatlash
- ✅ **Zamonaviy UI** — dark mode, glassmorphism, animatsiyalar
- ✅ **0$ budjet** — bepul hosting va ma'lumotlar bazasi

## 🛠️ Texnologiyalar

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (MySQL dan o'tkazildi)
- **Frontend**: Vanilla HTML/CSS/JS (zamonaviy dizayn)
- **Hosting**: Fly.io (bepul tier)

## 📦 O'rnatish (lokal)

```bash
# 1. Loyihani klonlash
git clone <repo-url>
cd muhriddin-group

# 2. Paketlarni o'rnatish
npm install

# 3. .env faylini yaratish
cp .env.example .env
# .env faylida DATABASE_URL ni to'ldiring

# 4. Ma'lumotlar bazasini yaratish (PostgreSQL)
# init-db.sql faylini ishga tushiring

# 5. Serverni ishga tushirish
npm start
# yoki
npm run dev
```

## 🌐 Fly.io ga Deploy qilish (0$ budjet)

### 1-qadam: Fly.io CLI o'rnatish

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### 2-qadam: Fly.io ga ro'yxatdan o'tish

```bash
fly auth signup
```
Telefon orqali tasdiqlash talab qilinadi. Kredit karta **TALAB ETILMAYDI** (bepul tier).

### 3-qadam: Ilovani yaratish

```bash
# Loyiha papkasiga kiring
cd muhriddin-group

# Fly.io ilovasini yaratish
fly launch
```

So'rovlarga javob bering:
- App name: `muhriddin-group` (yoki boshqa)
- Region: `fra` (Frankfurt) yoki `ams` (Amsterdam) — O'zbekistonga yaqin
- **PostgreSQL ma'lumotlar bazasini yaratish**: `Y` (ha)
- **Redis**: `N` (yo'q)

### 4-qadam: Ma'lumotlar bazasini sozlash

```bash
# PostgreSQL ga ulanish
fly postgres connect -a <your-db-app-name>

# init-db.sql ni ishga tushirish
\i init-db.sql

# Yoki:
fly postgres connect -a <your-db-app-name> < init-db.sql
```

### 5-qadam: Environment o'zgaruvchilarini sozlash

```bash
# DATABASE_URL avtomatik yaratiladi, lekin tekshiring
fly secrets list

# Agar kerak bo'lsa, qo'shimcha secret qo'shing
fly secrets set NODE_ENV=production
```

### 6-qadam: Deploy

```bash
# Kodlarni yuklash
fly deploy

# Loglarni ko'rish
fly logs

# Ilovani ochish
fly open
```

## 🔧 Sozlash

### Admin va Worker loginlari

Boshlang'ich loginlar (init-db.sql dan):

| Rol | Login | Parol |
|-----|-------|-------|
| Admin | `admin` | `admin123` |
| Worker | `worker1` | `worker123` |

**⚠️ MUHIM**: Productionga o'tishdan oldin parollarni o'zgartiring!

```sql
-- PostgreSQL da parolni o'zgartirish
UPDATE users SET password = 'yangi-parol' WHERE login = 'admin';
```

### Yangi worker qo'shish

```sql
INSERT INTO users (login, password, role) VALUES 
  ('yangi-worker', 'parol123', 'worker');
```

## 📁 Fayl strukturasi

```
muhriddin-group/
├── server.js          # Express backend
├── package.json       # Node.js paketlar
├── .env.example       # Environment namuna
├── fly.toml           # Fly.io konfiguratsiyasi
├── init-db.sql        # Ma'lumotlar bazasi skripti
├── README.md          # Ushbu fayl
└── public/
    ├── index.html     # Asosiy sahifa
    ├── style.css      # Zamonaviy stillar
    └── script.js      # Frontend logikasi
```

## 🔄 Yangilanishlar

### v2.0 (2026)
- MySQL → PostgreSQL migratsiya
- Zamonaviy dark mode dizayn
- Toast notification tizimi
- Loading states
- Fly.io deploy qo'llab-quvvatlash
- Optimallashtirilgan API

## 🆘 Yordam

Muammolar yuzaga kelsa:

1. **Fly.io loglari**: `fly logs`
2. **Database ulanishi**: `fly postgres connect -a <db-name>`
3. **Status**: `fly status`
4. **Qayta deploy**: `fly deploy`

## 📄 Litsenziya

MIT
