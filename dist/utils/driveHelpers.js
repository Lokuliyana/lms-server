"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderAndId = getProviderAndId;
exports.extractDriveFileId = extractDriveFileId;
exports.drivePreviewUrl = drivePreviewUrl;
function getProviderAndId(input) {
    try {
        const s = String(input).trim();
        if (/^[a-zA-Z0-9_-]{10,}$/.test(s) && !s.startsWith("http")) {
            return { id: s, provider: s.length === 11 ? "youtube" : "drive" };
        }
        const url = new URL(s);
        if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
            let id = null;
            if (url.hostname === "youtu.be")
                id = url.pathname.slice(1);
            else if (url.pathname.startsWith("/embed/"))
                id = url.pathname.split("/")[2];
            else
                id = url.searchParams.get("v");
            if (id)
                return { id, provider: "youtube" };
        }
        const m1 = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
        if (m1?.[1])
            return { id: m1[1], provider: "drive" };
        const driveId = url.searchParams.get("id");
        if (driveId && /^[a-zA-Z0-9_-]{10,}$/.test(driveId)) {
            return { id: driveId, provider: "drive" };
        }
        return null;
    }
    catch {
        return null;
    }
}
function extractDriveFileId(input) {
    const result = getProviderAndId(input);
    return result ? result.id : null;
}
function drivePreviewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
}
