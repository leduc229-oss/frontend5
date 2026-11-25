import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ENV } from './config/env.config.js';

const app = express();

// Chạy sau reverse proxy (Render/Railway/Vercel): lấy đúng IP client để rate-limit không gộp mọi người làm một
app.set('trust proxy', 1);
const allowedOrigins = new Set(
  ENV.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.has(origin));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trang gốc để nền tảng deploy kiểm tra server còn sống
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'GeoZone AI Backend', api: '/api/v1' });
});

// API versioning prefix
app.use('/api/v1', apiRouter);

// 404 dạng JSON cho đường dẫn không tồn tại
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use(errorHandler);

export default app;
