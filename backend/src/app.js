const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
const allowedClientUrl = process.env.CLIENT_URL;
const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const legacyUploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV !== 'production' && localDevOriginPattern.test(origin)) {
        return callback(null, true);
      }

      if (allowedClientUrl && origin === allowedClientUrl) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadsDir));
app.use('/backend/uploads', express.static(legacyUploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'Xverse API' });
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;