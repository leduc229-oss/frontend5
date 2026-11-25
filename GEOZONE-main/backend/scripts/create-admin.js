// Tạo (hoặc nâng quyền) tài khoản ADMIN.
// Chạy:  npm run create-admin
// Tùy chọn: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run create-admin
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/utils/prisma.js';

const email = String(process.env.ADMIN_EMAIL || 'admin@geozone.vn').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || 'admin123');
const name = String(process.env.ADMIN_NAME || 'Quản trị viên').trim();

if (password.length < 8 || password.length > 72) {
  console.error('Mật khẩu admin phải từ 8 đến 72 ký tự.');
  process.exit(1);
}

try {
  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password_hash, role: 'ADMIN', is_active: true, is_verified: true },
    create: { email, name, password_hash, role: 'ADMIN', is_active: true, is_verified: true }
  });
  console.log(`✅ Admin sẵn sàng: ${user.email} (mật khẩu: ${process.env.ADMIN_PASSWORD ? '[theo ADMIN_PASSWORD]' : 'admin123'})`);
} catch (error) {
  console.error('❌ Không tạo được admin:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
