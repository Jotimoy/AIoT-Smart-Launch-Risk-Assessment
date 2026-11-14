# Local Role-Based Authentication & Authorization Guide

**Project:** AIoT Smart Launch Risk Assessment  
**Stack:** Node.js + Express + SQLite (`better-sqlite3`) + `bcryptjs` + Server-Side HTTP-Only Sessions (`express-session`)

---

## 1. SQLite Database Schema (`./data/smart_launch.db`)

- **`users`**: `id`, `full_name`, `email` (`UNIQUE COLLATE NOCASE`), `password_hash`, `role` (`ADMIN` | `CAPTAIN` | `AUTHORITY`), `is_active` (`0` | `1`), `must_change_password` (`0` | `1`), `created_at`, `updated_at`
- **`sessions`**: `sid` (`PRIMARY KEY`), `user_id` (`FK -> users.id ON DELETE CASCADE`), `sess`, `expires_at`, `last_activity_at`, `created_at`
- **`audit_logs`**: `id`, `actor_user_id`, `actor_email`, `actor_role`, `target_user_id`, `target_email`, `event_type`, `details`, `ip_address`, `created_at`
- **`system_config`**: `key` (`PRIMARY KEY`), `value`, `updated_at`

---

## 2. Initial Setup & Startup Commands

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment (optional)**
   Copy `.env.example` to `.env` and set a strong `SESSION_SECRET`.
3. **Provision the single Initial Admin account (one-time)**
   Interactive setup:
   ```bash
   npm run setup:admin
   ```
   Or auto-generate a secure random Admin password for local demo:
   ```bash
   npm run setup:admin -- --generate
   ```
   Or specify via environment variables:
   ```bash
   INITIAL_ADMIN_EMAIL="admin@smartlaunch.local" INITIAL_ADMIN_PASSWORD="YourStrong!Password1" npm run setup:admin
   ```
4. **Run automated backend & risk tests**
   ```bash
   npm test
   ```
5. **Start the application locally**
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000** in your browser.
   *(If connecting a physical ESP32 over Wi-Fi on your local hotspot, start with `HOST=0.0.0.0 npm run dev`.)*
