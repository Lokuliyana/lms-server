"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !serviceRoleKey) {
    console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}
exports.supabase = url && serviceRoleKey ? (0, supabase_js_1.createClient)(url, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
}) : null;
