"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasActiveEntitlement = void 0;
const ClassEntitlement_1 = require("../models/ClassEntitlement");
const hasActiveEntitlement = async (userId, classId, targetMonthKey) => {
    // 1. Check if they have the entitlement for the target month
    const hasCurrent = await ClassEntitlement_1.ClassEntitlement.exists({
        user_id: userId,
        class_id: classId,
        month_key: targetMonthKey,
    });
    if (hasCurrent)
        return true;
    // 2. Grace period check (14 days)
    // Only applies if they are trying to access the *current* month's resources
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (targetMonthKey === currentMonthKey) {
        if (now.getDate() <= 14) {
            // It's within the first 14 days of the current month.
            // Check if they had an entitlement for the previous month.
            const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
            const hasPrev = await ClassEntitlement_1.ClassEntitlement.exists({
                user_id: userId,
                class_id: classId,
                month_key: prevMonthKey,
            });
            if (hasPrev)
                return true;
        }
    }
    return false;
};
exports.hasActiveEntitlement = hasActiveEntitlement;
