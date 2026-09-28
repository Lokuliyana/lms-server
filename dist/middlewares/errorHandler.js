"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const env_1 = require("../config/env");
const errorHandler = (err, req, res, next) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    const message = env_1.config.env === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        message,
        ...(env_1.config.env === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
