import crypto from "node:crypto";

export function generateId() {
    return crypto.randomUUID();
}

export function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateTempPassword(fullName = "User") {
    const onlyLetters = String(fullName || "")
        .replace(/[^a-zA-Z]/g, "")
        .trim();

    let base = onlyLetters.slice(0, 4);
    if (base.length < 4) {
        base = `${base}User`.slice(0, 4);
    }

    const prefix = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    const randomNumber = String(crypto.randomInt(1000, 10000));
    const symbols = "!@#$";
    const randomSymbol = symbols[crypto.randomInt(0, symbols.length)];

    return `${prefix}${randomNumber}${randomSymbol}`;
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
    const check = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(hash));
}

export function signToken(payload) {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
    const data = `${header}.${body}`;
    const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${sig}`;
}

export function verifyToken(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const secret = process.env.JWT_SECRET || "dev-secret";
    const data = `${header}.${body}`;
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");

    if (sig !== expected) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        if (!payload.exp || Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}
