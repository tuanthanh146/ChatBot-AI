# Hướng dẫn xử lý lỗi HTTP 405 trên Vercel

## Lỗi HTTP 405 "Method Not Allowed"

### Nguyên nhân có thể:
1. **Vercel đang cache route handler cũ** - Cần redeploy
2. **Route handler chưa được deploy đúng** - Kiểm tra build logs
3. **Vấn đề với Next.js App Router trên Vercel** - Cần kiểm tra cấu hình

### Giải pháp từng bước:

#### Bước 1: Kiểm tra code đã được commit và push
```bash
git status
git add .
git commit -m "Fix HTTP 405 error - improve error handling"
git push
```

#### Bước 2: Redeploy trên Vercel
1. Vào Vercel Dashboard → Deployments
2. Tìm deployment mới nhất
3. Click "Redeploy" (hoặc đợi auto-deploy từ git push)
4. Đợi deployment hoàn tất

#### Bước 3: Kiểm tra build logs
1. Vào Vercel Dashboard → Deployments → Click vào deployment mới nhất
2. Xem "Build Logs" để đảm bảo không có lỗi
3. Kiểm tra "Function Logs" khi test API

#### Bước 4: Test API trực tiếp
Sau khi redeploy, test API bằng cách:

**Trong browser console (F12):**
```javascript
fetch('https://your-vercel-app.vercel.app/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'test' }],
    model: 'gpt-oss:120b-cloud'
  })
})
.then(r => r.text())
.then(console.log)
.catch(console.error)
```

**Hoặc dùng curl:**
```bash
curl -X POST https://your-vercel-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"model":"gpt-oss:120b-cloud"}'
```

#### Bước 5: Kiểm tra Function Logs trên Vercel
1. Vào Vercel Dashboard → Deployments → Chọn deployment
2. Click "Functions" tab
3. Xem logs khi gọi API để tìm lỗi cụ thể

### Kiểm tra các điểm quan trọng:

#### ✅ Route handler đã export đúng:
```typescript
// app/api/chat/route.ts phải có:
export function GET() { ... }
export function OPTIONS() { ... }
export async function POST(req: NextRequest) { ... }
```

#### ✅ Runtime configuration:
```typescript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
```

#### ✅ CORS headers đã được thêm:
Tất cả responses phải có:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### Nếu vẫn lỗi sau khi redeploy:

#### 1. Xóa cache Vercel
- Vào Vercel Dashboard → Settings → Clear Build Cache
- Redeploy lại

#### 2. Kiểm tra Next.js version
```bash
npm list next
```
Đảm bảo đang dùng Next.js 14+ (App Router)

#### 3. Kiểm tra vercel.json (nếu có)
Đảm bảo không có cấu hình conflict:
```json
{
  "rewrites": [...],
  "headers": [...]
}
```

#### 4. Test local trước
```bash
npm run build
npm run start
```
Test trên localhost:3000 trước khi deploy

### Debug trên Vercel:

#### Thêm logging:
```typescript
export async function POST(req: NextRequest) {
  console.log('POST /api/chat called')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // ... rest of code
}
```

Sau đó xem logs trong Vercel Dashboard → Functions → Logs

### Liên hệ support:
Nếu vẫn không giải quyết được:
1. Thu thập thông tin:
   - Vercel deployment URL
   - Function logs từ Vercel
   - Build logs
   - Error message đầy đủ
2. Tạo issue trên GitHub hoặc liên hệ Vercel support

