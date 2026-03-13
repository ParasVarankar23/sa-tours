import { generateId, verifyToken } from "@/lib/server/auth";
import { getStaffEntries, saveStaffEntries } from "@/lib/server/dataStore";
import { NextResponse } from "next/server";

function getAuthPayload(request) {
    const token = request.cookies.get("sa_auth_token")?.value;
    return verifyToken(token);
}

function canManageEntries(role) {
    return role === "staff" || role === "admin";
}

function sanitizeRow({ fullName, email, phone }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    return {
        fullName: String(fullName || "").trim(),
        email: normalizedEmail,
        phone: String(phone || "").trim(),
    };
}

function isValidRow(row) {
    return Boolean(row.fullName && row.email && row.phone);
}

function parseCsv(text) {
    const lines = String(text || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h === "name" || h === "fullname" || h === "full_name");
    const emailIdx = headers.findIndex((h) => h === "email" || h === "emailaddress" || h === "email_address");
    const phoneIdx = headers.findIndex((h) => h === "phone" || h === "phonenumber" || h === "phone_number");

    if (nameIdx < 0 || emailIdx < 0 || phoneIdx < 0) return [];

    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
        const cols = lines[i].split(",");
        rows.push(
            sanitizeRow({
                fullName: cols[nameIdx],
                email: cols[emailIdx],
                phone: cols[phoneIdx],
            })
        );
    }

    return rows.filter(isValidRow);
}

function pickValue(row, keys) {
    for (const key of keys) {
        const value = row?.[key];
        if (value !== undefined && value !== null && String(value).trim()) {
            return String(value).trim();
        }
    }
    return "";
}

async function parseSpreadsheet(file) {
    const fileName = String(file?.name || "").toLowerCase();
    const ext = fileName.split(".").pop();

    if (ext === "csv") {
        const text = await file.text();
        return parseCsv(text);
    }

    let xlsx;
    try {
        xlsx = await import("xlsx");
    } catch {
        throw new Error("Install package 'xlsx' to upload Excel files (.xls/.xlsx).");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = xlsx.read(bytes, { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];

    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
    return rawRows
        .map((row) => {
            const normalized = Object.fromEntries(
                Object.entries(row).map(([k, v]) => [String(k).trim().toLowerCase().replaceAll(/\s+/g, ""), v])
            );

            return sanitizeRow({
                fullName: pickValue(normalized, ["name", "fullname", "full_name"]),
                email: pickValue(normalized, ["email", "emailaddress", "email_address"]),
                phone: pickValue(normalized, ["phone", "phonenumber", "phone_number", "mobilenumber"]),
            });
        })
        .filter(isValidRow);
}

export async function GET(request) {
    const payload = getAuthPayload(request);
    if (!canManageEntries(payload?.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const entries = await getStaffEntries();
    return NextResponse.json({ entries });
}

export async function POST(request) {
    const payload = getAuthPayload(request);
    if (!canManageEntries(payload?.role)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existing = await getStaffEntries();

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file === "string") {
            return NextResponse.json({ message: "File is required" }, { status: 400 });
        }

        try {
            const rows = await parseSpreadsheet(file);
            if (!rows.length) {
                return NextResponse.json({ message: "No valid rows found. Use columns: name, email, phone" }, { status: 400 });
            }

            const now = new Date().toISOString();
            const createdRows = rows.map((row) => ({
                id: generateId(),
                ...row,
                source: "excel",
                createdAt: now,
                createdBy: payload.userId,
                createdByRole: payload.role,
            }));

            const updated = [...createdRows, ...existing];
            await saveStaffEntries(updated);

            return NextResponse.json({
                message: `${createdRows.length} row(s) imported successfully`,
                count: createdRows.length,
                entries: updated,
            });
        } catch (error) {
            return NextResponse.json({ message: String(error?.message || error) }, { status: 400 });
        }
    }

    const body = await request.json();
    const row = sanitizeRow(body);
    if (!isValidRow(row)) {
        return NextResponse.json({ message: "Name, email and phone are required" }, { status: 400 });
    }

    const entry = {
        id: generateId(),
        ...row,
        source: "manual",
        createdAt: new Date().toISOString(),
        createdBy: payload.userId,
        createdByRole: payload.role,
    };

    const updated = [entry, ...existing];
    await saveStaffEntries(updated);

    return NextResponse.json({ message: "Entry added successfully", entries: updated });
}
