"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertSubmission = void 0;
const ClassEntitlement_1 = require("../models/ClassEntitlement");
const Class_1 = require("../models/Class");
const upsertSubmission = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const userId = req.user._id;
        const d = new Date();
        const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const classId = req.body.classId; // or fetch from assignment
        if (classId) {
            const cls = await Class_1.Class.findById(classId);
            if (!cls || !cls.enrolled_students.some(id => id.toString() === userId.toString())) {
                return res.status(403).json({ success: false, message: 'Not enrolled in this class' });
            }
            const hasEntitlement = await ClassEntitlement_1.ClassEntitlement.exists({
                user_id: userId,
                class_id: classId,
                month_key: currentMonth,
            });
            if (!hasEntitlement) {
                return res.status(403).json({ success: false, message: 'No active monthly payment (Entitlement missing)' });
            }
        }
        res.json({ success: true, message: 'Assignment submitted with entitlement check' });
    }
    catch (error) {
        console.error('Error submitting assignment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.upsertSubmission = upsertSubmission;
