"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const seedPermissions_1 = require("./scripts/seedPermissions");
const startServer = async () => {
    await (0, db_1.connectDB)();
    // Fix 7.6: Duplicate server bootstrapping -> One seed script, called once
    if (env_1.config.mongoUri) {
        await (0, seedPermissions_1.seedPermissionsAndRoles)();
    }
    app_1.app.listen(env_1.config.port, () => {
        console.log(`Server running in ${env_1.config.env} mode on port ${env_1.config.port}`);
    });
};
startServer();
