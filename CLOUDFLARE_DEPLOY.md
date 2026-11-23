# Hướng dẫn triển khai MY LIFE – Personal Manager lên GitHub + Cloudflare Pages + D1

Ứng dụng sử dụng kiến trúc:
- **Frontend**: React + Vite + Tailwind CSS (`dist/`)
- **Backend API**: Cloudflare Pages Functions (`functions/api/*`)
- **Database**: Cloudflare D1 (`migrations/*.sql`, binding tên `DB`)
- **Authentication**: Server-side session cookies (`HttpOnly`, `Secure`, `Partitioned`), mật khẩu băm PBKDF2-HMAC-SHA-256 (100.000 vòng + salt ngẫu nhiên 16 byte), chống CSRF, rate limit lưu trên D1.

---

## 1. Cấu trúc triển khai chính

```text
├── migrations/
│   ├── 0001_create_users.sql
│   ├── 0002_create_sessions.sql
│   ├── 0003_create_finance_tables.sql
│   └── 0004_create_planner_tables.sql
├── functions/
│   ├── _lib/ (crypto, auth, security, types)
│   └── api/
│       ├── _middleware.ts
│       ├── auth/ (register, login, logout, me, sessions, change-password, forgot-password, reset-password)
│       ├── sync/bootstrap.ts
│       ├── transactions/
│       ├── savings/
│       ├── plans/
│       ├── bank-accounts/
│       └── profile/
├── public/_routes.json
├── wrangler.jsonc
└── .dev.vars.example
```

---

## 2. Chạy thử trên máy cá nhân (Local Development)

### Cách A: Dùng Node.js Express + SQLite D1 Adapter (nhanh nhất)
```bash
npm install
npm run dev
```
Ứng dụng chạy tại `http://localhost:3000`, tự động khởi tạo tệp `.mylife-local.sqlite` (đã nằm trong `.gitignore`) và chạy toàn bộ `migrations/*.sql`.

### Cách B: Dùng Wrangler Pages Dev (mô phỏng chuẩn Cloudflare Workers)
```bash
cp .dev.vars.example .dev.vars
npm run build
npx wrangler d1 migrations apply mylife-db --local
npx wrangler pages dev dist --d1=DB=mylife-db
```

---

## 3. Tạo Cloudflare D1 & Chạy Migration Production

1. Đăng nhập Wrangler CLI:
   ```bash
   npx wrangler login
   ```
2. Tạo cơ sở dữ liệu D1 mới:
   ```bash
   npx wrangler d1 create mylife-db
   ```
3. Sao chép `database_id` trả về và cập nhật vào tệp `wrangler.jsonc`:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "mylife-db",
       "database_id": "<YOUR_DATABASE_ID>",
       "migrations_dir": "migrations"
     }
   ]
   ```
4. Áp dụng migration lên D1 Remote (Production):
   ```bash
   npx wrangler d1 migrations apply mylife-db --remote
   ```

---

## 4. Đưa mã nguồn lên GitHub & Kết nối Cloudflare Pages

1. Đảm bảo tệp `.dev.vars`, `.env`, `*.sqlite` KHÔNG bị commit (đã được chặn trong `.gitignore`).
2. Push toàn bộ dự án lên GitHub Repository.
3. Vào **Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git**:
   - Chọn repository vừa push.
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Cấu hình **Database Binding** cho cả **Production** và **Preview**:
   - Vào **Settings > Functions > D1 database bindings**
   - Thêm binding tên chính xác là: **`DB`** -> chọn database `mylife-db` (có thể tạo `mylife-db-preview` riêng cho môi trường Preview).
5. Cấu hình **Variables and Secrets** (nếu bật email đặt lại mật khẩu thực tế):
   - Vào **Settings > Variables and Secrets**
   - `APP_URL`: `https://<your-project>.pages.dev`
   - `RESEND_API_KEY` *(Secret)*: khóa API từ Resend (chỉ khi cấu hình khóa này, API `/api/auth/forgot-password` mới gửi email thực tế).
   - `EMAIL_FROM`: `MY LIFE <noreply@yourdomain.com>`
6. Lưu cấu hình và **Retry deployment** để kích hoạt binding `DB`. Mọi lần push mới lên GitHub sẽ tự động triển khai bản cập nhật lên Cloudflare Pages.
