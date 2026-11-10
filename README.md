# PKT-Form-ICAVIET

Monorepo gồm hai dự án:

- **icaviet-forms** — WordPress plugin + Vue app xử lý các biểu mẫu ICAVIET.
- **pkt-ds160** — Backend (`ds160-backend`) và frontend (`ds160-checker`) cho hệ thống kiểm tra biểu mẫu DS-160 / DS-260 / I-130A / I-129F / I-90 / N-400.

## Cấu trúc

```
icaviet-forms/      # plugin WordPress, vue-app, forms, includes
pkt-ds160/
  ds160-backend/    # Node.js API server
  ds160-checker/    # Vue/Vite frontend
```

## Chạy dự án

```bash
# Backend
cd pkt-ds160/ds160-backend && npm install && npm start

# Frontend
cd pkt-ds160/ds160-checker && npm install && npm run dev

# Vue app của icaviet-forms
cd icaviet-forms/vue-app && npm install && npm run dev
```

> Các file `.env` chứa thông tin kết nối CSDL không được commit. Tham khảo biến môi trường cần thiết trong mã nguồn trước khi chạy.
