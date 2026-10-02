import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { errorHandler } from './middlewares/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { usersRoutes } from './routes/usersRoutes';
import permissionsRoutes from './routes/permissionsRoutes';
import classRoutes from './routes/classRoutes';
import classApplicationRoutes from './routes/classApplicationRoutes';
import quizRoutes from './routes/quizRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import recordingsRoutes from './routes/recordingsRoutes';
import mediaRoute from './routes/mediaRoute';
import customizationRoutes from './routes/customizationRoutes';
import challengeRoutes from './routes/challengeRoutes';
import paymentRoutes from './routes/payments/paymentRoutes';
import systemConfigRoutes from './routes/systemConfigRoutes';
import meetingRoutes from './routes/meetingRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import gradeRoutes from './routes/gradeRoutes';
import storeRoutes from './routes/storeRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import examRoutes from './routes/examRoutes';
import studyPackRoutes from './routes/studyPackRoutes';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false, // allow serving static images
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Normalize double /api/api to /api if present
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/api/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));

// CMS Admin content save handler for visual editors
const handleAdminContent = async (req: express.Request, res: express.Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    const { SiteSettings } = await import('./models/SiteSettings');
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings({ site: {}, pages: {} });
    }
    const keys = key.split('.');
    let target = settings as any;
    if (keys[0] === 'site' || keys[0] === 'pages') {
      let sub = target[keys[0]] || {};
      let cur = sub;
      for (let i = 1; i < keys.length - 1; i++) {
        if (!cur[keys[i]]) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      target[keys[0]] = sub;
      target.markModified(keys[0]);
    }
    await settings.save();
    return res.json({ success: true, key, value });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update content' });
  }
};
app.post('/api/admin/content', handleAdminContent);
app.post('/admin/content', handleAdminContent);

// Routes: Mount all routers under both `/api/*` and `/*`
const routes: [string, any][] = [
  ['/auth', authRoutes],
  ['/users', usersRoutes],
  ['/permissions', permissionsRoutes],
  ['/classes', classRoutes],
  ['/class-applications', classApplicationRoutes],
  ['/quizzes', quizRoutes],
  ['/challenges', challengeRoutes],
  ['/assignments', assignmentRoutes],
  ['/recordings', recordingsRoutes],
  ['/media', mediaRoute],
  ['/payments', paymentRoutes],
  ['/customization', customizationRoutes],
  ['/system', systemConfigRoutes],
  ['/meetings', meetingRoutes],
  ['/attendance', attendanceRoutes],
  ['/grades', gradeRoutes],
  ['/store', storeRoutes],
  ['/deliveries', deliveryRoutes],
  ['/exams', examRoutes],
  ['/study-packs', studyPackRoutes],
];

for (const [routePath, router] of routes) {
  app.use(`/api${routePath}`, router);
  app.use(routePath, router);
}

// Fix 7.5: Global error handler
app.use(errorHandler);

export { app };
