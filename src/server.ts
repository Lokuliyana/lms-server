import { app } from './app';
import { config } from './config/env';
import { connectDB } from './config/db';
import { seedPermissionsAndRoles } from './scripts/seedPermissions';
import { initStorageCleaner } from "./scripts/storageCleaner";

const startServer = async () => {
  await connectDB();
  
  // Fix 7.6: Duplicate server bootstrapping -> One seed script, called once
  if (config.mongoUri) {
    await seedPermissionsAndRoles();
    initStorageCleaner();
  }

  app.listen(config.port, () => {
    console.log(`Server running in ${config.env} mode on port ${config.port}`);
  });
};

startServer();
