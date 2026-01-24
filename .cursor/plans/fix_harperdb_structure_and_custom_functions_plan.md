# Fix HarperDB Structure and Custom Functions Deployment

## Overview

Tìm hiểu cách deploy custom functions qua HarperDB Studio và sửa lại cấu trúc `apps/web` theo đúng cách của HarperDB. Kiến trúc hiện tại có vẻ sai - cần tách biệt rõ ràng giữa Next.js app và HarperDB custom functions.

## Vấn đề hiện tại

1. **Cấu trúc `apps/web` sai**: 
   - Next.js API routes (`apps/web/app/api/`) đang gọi HarperDB custom functions
   - Có thể không đúng với kiến trúc HarperDB builtin Next.js
   - Cần tách biệt rõ ràng: Next.js chỉ là client, HarperDB custom functions là API

2. **Custom functions không được load**:
   - Files đã mount nhưng HarperDB không detect
   - Cần tìm cách deploy qua Studio hoặc API

3. **Kiến trúc không rõ ràng**:
   - Không rõ Next.js app nên được mount như thế nào vào `/opt/harperdb/app`
   - Không rõ custom functions nên được deploy như thế nào

## Implementation Steps

1. **Research HarperDB Custom Functions Deployment**
   - Tìm hiểu cách deploy custom functions qua Studio UI
   - Tìm hiểu cách deploy qua API
   - Tìm hiểu cách HarperDB auto-detect custom functions

2. **Research HarperDB Next.js App Structure**
   - Tìm hiểu cấu trúc đúng cho Next.js app khi mount vào `/opt/harperdb/app`
   - Kiểm tra xem Next.js có cần build trước không
   - Kiểm tra xem có cần cấu hình đặc biệt không

3. **Refactor Project Structure**
   - Tách biệt rõ ràng: Next.js client vs HarperDB API
   - Sửa lại cách Next.js app được mount
   - Đảm bảo custom functions được deploy đúng cách

4. **Update Documentation**
   - Cập nhật README với cấu trúc đúng
   - Hướng dẫn deploy custom functions qua Studio
   - Làm rõ kiến trúc

## Key Questions to Answer

1. Custom functions có cần deploy qua Studio UI không?
2. Next.js app có cần build trước khi mount vào `/opt/harperdb/app` không?
3. Cấu trúc `/opt/harperdb/app` nên như thế nào? (root của Next.js app hay chỉ build output?)
4. API routes trong Next.js có nên tồn tại không, hay chỉ gọi trực tiếp HarperDB custom functions từ client?

## Files to Research/Modify

- HarperDB official documentation (web search)
- `docker-compose.yml` - Cấu trúc mount
- `Dockerfile.integrated` - Cách build và copy Next.js app
- `apps/web/` structure - Có thể cần refactor
- `HARPERDB_SETUP.md` - Update với cách deploy đúng
