import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// RBAC Middleware Placeholder
export const requirePermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    // Check RBAC schema
    next();
  };
};

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
