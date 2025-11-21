# Hướng dẫn cấu hình Cloudflare Tunnel cho Vercel Deployment

## Kiến trúc ứng dụng

Ứng dụng ChatBot-AI của bạn có 3 phần chính:

1. **Frontend (Next.js trên Vercel)**: Giao diện web, nơi người dùng chat
2. **Backend API (Next.js API Routes trên Vercel)**: Xử lý requests, streaming, metrics
3. **Ollama Server (chạy trên máy local)**: AI engine, xử lý chat và trả về phản hồi

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │  ────>  │  Backend API      │  ────>  │  Ollama Server  │
│   (Vercel)      │         │  (Vercel)         │         │  (localhost:11434)│
│                 │         │                   │         │                 │
│  - UI/UX        │         │  - /api/chat      │         │  - AI Models    │
│  - Chat UI      │         │  - Streaming      │         │  - LLM Engine   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**`localhost:11434` là gì?**
- Đây là địa chỉ mặc định của **Ollama server** chạy trên máy tính của bạn
- Ollama là một ứng dụng cho phép chạy các mô hình AI (LLM) trên máy local
- Port `11434` là port mặc định mà Ollama sử dụng
- Khi bạn cài Ollama và chạy nó, server sẽ lắng nghe tại `http://localhost:11434`

## Vấn đề
Khi deploy lên Vercel, frontend và backend API chạy trên server của Vercel (không phải máy bạn). Do đó, backend API không thể truy cập trực tiếp đến `localhost:11434` trên máy bạn. Cần sử dụng Cloudflare Tunnel để expose Ollama server ra internet.

## Giải pháp
Sử dụng Cloudflare Tunnel để tạo một URL công khai trỏ đến Ollama server trên máy local, sau đó cấu hình Vercel để sử dụng URL này.

## Các bước thực hiện

### 1. Cài đặt Cloudflare Tunnel (cloudflared)

**Windows:**

**Cách 1: Sử dụng winget (Khuyến nghị)**
```powershell
winget install --id Cloudflare.cloudflared
```

**Cách 2: Tải thủ công**
1. Tải file `cloudflared-windows-amd64.exe` từ: https://github.com/cloudflare/cloudflared/releases/latest
2. Đổi tên file thành `cloudflared.exe`
3. Di chuyển vào thư mục (ví dụ: `C:\cloudflared\`)
4. Thêm thư mục vào PATH:
   - Mở "Environment Variables" (Biến môi trường)
   - Thêm `C:\cloudflared\` vào PATH
   - Hoặc chạy trực tiếp: `.\cloudflared.exe tunnel --url http://localhost:11434` (nếu file ở thư mục hiện tại)

**Cách 3: Chạy trực tiếp từ thư mục tải về**
Nếu bạn đã tải file về thư mục `D:\cloudflare\`, chạy:
```powershell
cd D:\cloudflare
.\cloudflared.exe tunnel --url http://localhost:11434
```

**Linux/Mac:**
```bash
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Mac
brew install cloudflared
```

### 2. Chạy Cloudflare Tunnel

**Bước 1: Kiểm tra Ollama đang chạy**
```powershell
# Kiểm tra Ollama server
curl http://localhost:11434/api/tags
```
Nếu thấy danh sách models, Ollama đang chạy tốt.

**Bước 2: Chạy Cloudflare Tunnel**

**Nếu đã cài đặt vào PATH:**
```powershell
cloudflared tunnel --url http://localhost:11434
```

**Nếu chạy trực tiếp từ file (không cần cài đặt):**
```powershell
# Di chuyển đến thư mục chứa cloudflared.exe
cd D:\cloudflare

# Chạy với .\ để chỉ định file trong thư mục hiện tại
.\cloudflared.exe tunnel --url http://localhost:11434
```

**Bước 3: Lấy URL từ output**

Sau khi chạy, bạn sẽ thấy output như:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://xxxxx.trycloudflare.com                                                          |
+--------------------------------------------------------------------------------------------+
```

**Lưu ý quan trọng:**
- URL này sẽ thay đổi mỗi lần chạy lại tunnel
- Nếu gặp lỗi 403, tạo tunnel mới bằng cách dừng (Ctrl+C) và chạy lại
- **Để có URL cố định**, xem phần "Tạo Cloudflare Tunnel cố định với tài khoản" bên dưới

---

## Tạo Cloudflare Tunnel cố định với tài khoản (Khuyến nghị)

Với cách này, bạn sẽ có một URL cố định không thay đổi, và có thể quản lý tunnel qua Cloudflare Dashboard.

### Bước 1: Đăng ký tài khoản Cloudflare (Miễn phí)

1. Truy cập: https://dash.cloudflare.com/sign-up
2. Đăng ký tài khoản miễn phí (chỉ cần email)
3. Xác thực email và đăng nhập

### Bước 2: Đăng nhập cloudflared

```powershell
# Đăng nhập vào Cloudflare
.\cloudflared.exe tunnel login
```

Lệnh này sẽ:
- Mở trình duyệt để đăng nhập Cloudflare
- Tự động lưu token vào `C:\Users\<username>\.cloudflared\cert.pem`

### Bước 3: Tạo Named Tunnel

```powershell
# Tạo tunnel với tên (ví dụ: ollama-tunnel)
.\cloudflared.exe tunnel create ollama-tunnel
```

Output sẽ hiển thị:
```
Tunnel credentials written to C:\Users\<username>\.cloudflared\<tunnel-id>.json
```

**Lưu ý:** Lưu lại `<tunnel-id>` để sử dụng sau.

### Bước 4: Tạo file cấu hình

Tạo file `C:\Users\<username>\.cloudflared\config.yml` với nội dung:

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\<username>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: ollama-tunnel.your-domain.com  # Nếu có domain
    service: http://localhost:11434
  - service: http_status:404  # Catch-all rule
```

**Nếu không có domain**, sử dụng cấu hình đơn giản hơn:

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\<username>\.cloudflared\<tunnel-id>.json

ingress:
  - service: http://localhost:11434
```

### Bước 5: Chạy tunnel

```powershell
# Chạy tunnel với file config
.\cloudflared.exe tunnel run ollama-tunnel
```

Hoặc nếu không có file config:

```powershell
# Chạy trực tiếp với tunnel ID
.\cloudflared.exe tunnel run <tunnel-id>
```

### Bước 6: Lấy URL công khai

Sau khi chạy, bạn sẽ thấy output:
```
+--------------------------------------------------------------------------------------------+
|  Your tunnel is now running!                                                              |
|  Public URL: https://<tunnel-id>.cfargotunnel.com                                         |
+--------------------------------------------------------------------------------------------+
```

**URL này sẽ cố định** và không thay đổi khi restart tunnel!

### Bước 7: (Tùy chọn) Thêm Custom Domain

Nếu bạn có domain riêng:

1. Vào Cloudflare Dashboard → Zero Trust → Networks → Tunnels
2. Chọn tunnel vừa tạo
3. Click "Configure" → "Public Hostname"
4. Thêm hostname mới:
   - **Subdomain:** `ollama` (hoặc tên bạn muốn)
   - **Domain:** Chọn domain của bạn
   - **Service:** `http://localhost:11434`
5. Save

Sau đó bạn có thể dùng: `https://ollama.your-domain.com`

### Bước 8: Cấu hình trên Vercel

1. Vào Vercel Dashboard → Settings → Environment Variables
2. Thêm biến:
   - **Name:** `OLLAMA_BASE_URL`
   - **Value:** `https://<tunnel-id>.cfargotunnel.com` (URL từ bước 6)
   - **Environment:** Production, Preview, Development

### Lợi ích của Named Tunnel:

✅ **URL cố định** - Không thay đổi khi restart  
✅ **Quản lý qua Dashboard** - Xem logs, metrics, cấu hình  
✅ **Ổn định hơn** - Ít bị lỗi 403  
✅ **Custom Domain** - Có thể dùng domain riêng  
✅ **Miễn phí** - Cloudflare Zero Trust có gói miễn phí

---

## So sánh 2 cách:

| Tính năng | Quick Tunnel | Named Tunnel |
|----------|--------------|--------------|
| URL cố định | ❌ Thay đổi mỗi lần | ✅ Cố định |
| Cần tài khoản | ❌ Không | ✅ Có (miễn phí) |
| Custom Domain | ❌ Không | ✅ Có |
| Quản lý Dashboard | ❌ Không | ✅ Có |
| Độ phức tạp | ⭐ Đơn giản | ⭐⭐ Trung bình |
| Ổn định | ⭐⭐ | ⭐⭐⭐ |

### 3. Cấu hình biến môi trường trên Vercel

1. Vào Vercel Dashboard → Project Settings → Environment Variables
2. Thêm biến môi trường mới:
   - **Name:** `OLLAMA_BASE_URL`
   - **Value:** `https://xxxxx.trycloudflare.com` (URL từ Cloudflare tunnel, KHÔNG có `/api/chat` ở cuối)
   - **Environment:** Production, Preview, Development (chọn tất cả nếu cần)

**Ví dụ:**
```
OLLAMA_BASE_URL=https://silicon-bay-represented-transition.trycloudflare.com
```

### 4. Redeploy ứng dụng trên Vercel

Sau khi thêm biến môi trường, cần redeploy:
- Vào Deployments tab
- Click "Redeploy" cho deployment mới nhất
- Hoặc push một commit mới để trigger auto-deploy

### 5. Kiểm tra kết nối

1. Đảm bảo Ollama đang chạy trên máy local:
   ```bash
   # Kiểm tra Ollama
   curl http://localhost:11434/api/tags
   ```

2. Đảm bảo Cloudflare tunnel đang chạy và kết nối được:
   ```bash
   # Test qua Cloudflare tunnel
   curl https://xxxxx.trycloudflare.com/api/tags
   ```

3. Kiểm tra trên Vercel:
   - Vào trang chat trên Vercel
   - Gửi một message test
   - Kiểm tra console logs trên Vercel để xem có lỗi không

## Xử lý lỗi thường gặp

### Lỗi HTTP 403 "Access Denied" (Quan trọng!)
- **Nguyên nhân:** 
  - Cloudflare đã chặn truy cập do abuse detection hoặc policy
  - URL tunnel đã bị vô hiệu hóa
  - Cloudflare tunnel chưa được cấu hình đúng
  - Quá nhiều requests trong thời gian ngắn
  
- **Giải pháp:**
  1. **Tạo tunnel mới:** Đóng tunnel hiện tại và tạo một tunnel mới:
     ```powershell
     # Dừng tunnel hiện tại (Ctrl+C)
     # Chạy lại tunnel để có URL mới
     .\cloudflared.exe tunnel --url http://localhost:11434
     ```
  
  2. **Kiểm tra Ollama đang chạy:** Đảm bảo Ollama server đang hoạt động:
     ```powershell
     curl http://localhost:11434/api/tags
     ```
  
  3. **Sử dụng authentication (khuyến nghị):** Thêm authentication để tránh abuse:
     ```powershell
     .\cloudflared.exe tunnel --url http://localhost:11434 --no-tls-verify
     ```
  
  4. **Thử lại sau vài phút:** Nếu bị chặn do abuse, đợi 5-10 phút rồi thử lại
  
  5. **Kiểm tra logs của cloudflared:** Xem có thông báo lỗi gì không trong terminal chạy tunnel

### Lỗi HTTP 405
- **Nguyên nhân:** API route không hỗ trợ method được gọi
- **Giải pháp:** Đã được fix trong code, API route hiện hỗ trợ GET, POST, và OPTIONS

### Lỗi "Unable to reach the origin service"
- **Nguyên nhân:** Cloudflare tunnel không thể kết nối đến localhost:11434
- **Giải pháp:** 
  - Kiểm tra Ollama có đang chạy không: `curl http://localhost:11434/api/tags`
  - Kiểm tra firewall có chặn port 11434 không
  - Đảm bảo cloudflared đang chạy và kết nối được

### Lỗi "Connection timeout"
- **Nguyên nhân:** Cloudflare tunnel quá chậm hoặc bị ngắt kết nối
- **Giải pháp:**
  - Kiểm tra kết nối internet
  - Thử restart Cloudflare tunnel
  - Kiểm tra logs của cloudflared

### Lỗi CORS
- **Nguyên nhân:** Cloudflare tunnel có thể có vấn đề với CORS
- **Giải pháp:** Đã được xử lý trong code với CORS headers

## Lưu ý quan trọng

1. **URL Cloudflare Tunnel thay đổi:** Mỗi lần chạy lại `cloudflared tunnel`, URL sẽ thay đổi. Cần cập nhật lại biến môi trường trên Vercel.

2. **Bảo mật:** Cloudflare Tunnel URL công khai, ai có URL đều có thể truy cập Ollama server. Cân nhắc:
   - Sử dụng Cloudflare Tunnel với authentication
   - Hoặc chỉ expose khi cần thiết

3. **Hiệu suất:** Cloudflare Tunnel có thể chậm hơn kết nối trực tiếp. Timeout đã được tăng lên 5 phút trong code.

4. **Giữ Cloudflare Tunnel chạy:** Cần giữ terminal chạy cloudflared mở. Nếu đóng, tunnel sẽ ngắt và Vercel không thể kết nối.

## Tự động hóa (Tùy chọn)

Để tự động chạy Cloudflare Tunnel khi khởi động máy:

**Windows (Task Scheduler):**
1. Mở Task Scheduler
2. Tạo task mới
3. Trigger: "At startup"
4. Action: Chạy `cloudflared tunnel --url http://localhost:11434`

**Linux (systemd service):**
Tạo file `/etc/systemd/system/cloudflared-ollama.service`:
```ini
[Unit]
Description=Cloudflare Tunnel for Ollama
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:11434
Restart=always

[Install]
WantedBy=multi-user.target
```

Sau đó:
```bash
sudo systemctl enable cloudflared-ollama
sudo systemctl start cloudflared-ollama
```

