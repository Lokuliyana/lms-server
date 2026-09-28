import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
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

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/class-applications', classApplicationRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/recordings', recordingsRoutes);
app.use('/api/media', mediaRoute);

// Fix 7.5: Global error handler
app.use(errorHandler);

export { app };
