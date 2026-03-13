import { generateId, hashPassword } from "@/lib/server/auth";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

async function ensureDir() {
    await mkdir(DATA_DIR, { recursive: true });
}

async function readJson(fileName, fallback = []) {
    await ensureDir();
    const filePath = path.join(DATA_DIR, fileName);

    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

async function writeJson(fileName, data) {
    await ensureDir();
    const filePath = path.join(DATA_DIR, fileName);
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getUsers() {
    const users = await readJson("users.json", []);
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();

    if (!adminEmail || !adminPassword) {
        return users;
    }

    const hasAdmin = users.some((user) => user.role === "admin");
    if (hasAdmin) {
        return users;
    }

    const { salt, hash } = hashPassword(adminPassword);
    const seededAdmin = {
        id: generateId(),
        fullName: String(process.env.ADMIN_NAME || "Primary Admin").trim(),
        email: adminEmail,
        phone: String(process.env.ADMIN_PHONE || "9999999999").trim(),
        role: "admin",
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        seededFromEnv: true,
    };

    const updatedUsers = [...users, seededAdmin];
    await saveUsers(updatedUsers);
    return updatedUsers;
}

export async function saveUsers(users) {
    return writeJson("users.json", users);
}

export async function getOtps() {
    return readJson("otps.json", []);
}

export async function saveOtps(otps) {
    return writeJson("otps.json", otps);
}
