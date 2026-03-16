import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { equalTo, get, orderByChild, query, ref } from "firebase/database";
import jwt from "jsonwebtoken";

function mapLoginError(error) {
    if (error.code === "auth/user-not-found") {
        return { error: "User not found", status: 401 };
    }

    if (error.code === "auth/wrong-password") {
        return { error: "Wrong password", status: 401 };
    }

    if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-login-credentials"
    ) {
        return { error: "Invalid email or password", status: 401 };
    }

    if (error.code === "auth/invalid-email") {
        return { error: "Invalid email address", status: 400 };
    }

    if (error.code === "auth/user-disabled") {
        return { error: "User account is disabled", status: 403 };
    }

    return { error: error.message || "Login failed", status: 500 };
}

function normalizeRole(role) {
    if (!role) return "user";
    return String(role).trim().toLowerCase();
}

function normalizePhone(phone) {
    return String(phone || "").replaceAll(/\D/g, "");
}

function resolveIdentifierType(value) {
    const identifier = String(value || "").trim();
    if (!identifier) return "";

    if (identifier.includes("@")) return "email";
    if (/^\d{10,15}$/.test(normalizePhone(identifier))) return "phone";
    return "applicationId";
}

function isMissingIndexError(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("index not defined") || message.includes(".indexon");
}

async function getByChildWithFallback(db, path, childKey, value) {
    try {
        return await get(query(ref(db, path), orderByChild(childKey), equalTo(value)));
    } catch (error) {
        if (!isMissingIndexError(error)) {
            throw error;
        }

        console.warn("Missing Firebase index, using fallback scan:", {
            path,
            childKey,
        });
        return get(ref(db, path));
    }
}

async function findEmailByPhone(db, phoneValue) {
    const normalizedInput = normalizePhone(phoneValue);
    if (!normalizedInput) return null;

    const usersSnapshot = await getByChildWithFallback(
        db,
        "users",
        "phone",
        normalizedInput
    );
    if (!usersSnapshot.exists()) {
        return null;
    }

    const users = usersSnapshot.val() || {};
    const matched = Object.values(users).find((user) => normalizePhone(user?.phone) === normalizedInput);
    return matched?.email ? String(matched.email).toLowerCase() : null;
}

async function findEmailByApplicationId(db, applicationId) {
    const normalizedApplicationId = String(applicationId || "").trim().toUpperCase();
    if (!normalizedApplicationId) return null;

    const admissionsSnapshot = await getByChildWithFallback(
        db,
        "admissions",
        "applicationId",
        normalizedApplicationId
    );
    if (!admissionsSnapshot.exists()) {
        return null;
    }

    const admissions = admissionsSnapshot.val() || {};
    const matchedAdmission = Object.values(admissions).find(
        (admission) => String(admission?.applicationId || "").trim().toUpperCase() === normalizedApplicationId
    );

    const admissionEmail = matchedAdmission?.payload?.email;
    if (admissionEmail) {
        return String(admissionEmail).toLowerCase();
    }

    const studentsSnapshot = await getByChildWithFallback(
        db,
        "students",
        "applicationId",
        normalizedApplicationId
    );

    if (!studentsSnapshot.exists()) {
        return null;
    }

    const students = studentsSnapshot.val() || {};
    const student = Object.values(students).find(
        (row) => String(row?.applicationId || "").trim().toUpperCase() === normalizedApplicationId
    );

    return student?.email ? String(student.email).toLowerCase() : null;
}

async function resolveEmailFromIdentifier(db, identifier) {
    const input = String(identifier || "").trim();
    const identifierType = resolveIdentifierType(input);

    if (identifierType === "email") {
        return input.toLowerCase();
    }

    if (identifierType === "phone") {
        return findEmailByPhone(db, input);
    }

    return findEmailByApplicationId(db, input);
}

export async function POST(request) {
    try {
        const auth = getFirebaseAuth();
        const db = getFirebaseDb();

        const { loginId, password } = await request.json();
        const normalizedLoginId = String(loginId || "").trim();

        // Validation
        if (!normalizedLoginId || !password) {
            return Response.json(
                { error: "Login ID and password are required" },
                { status: 400 }
            );
        }

        const resolvedEmail = await resolveEmailFromIdentifier(db, normalizedLoginId);
        if (!resolvedEmail) {
            return Response.json(
                { error: "No user found for the provided login ID" },
                { status: 404 }
            );
        }

        // Sign in user with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(
            auth,
            resolvedEmail,
            password
        );

        const user = userCredential.user;

        // Fetch user info from Realtime Database
        const userSnapshot = await get(ref(db, `users/${user.uid}`));
        const userData = userSnapshot.exists() ? userSnapshot.val() : null;

        // Get ID token for client-side verification
        await user.getIdToken();

        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiration = process.env.JWT_EXPIRATION || "7d";

        if (!jwtSecret) {
            return Response.json(
                { error: "Server configuration error: missing JWT_SECRET" },
                { status: 500 }
            );
        }

        // App token with only user_id claim
        const normalizedRole = normalizeRole(userData?.role) || "student";

        const appToken = jwt.sign(
            { user_id: user.uid, role: normalizedRole },
            jwtSecret,
            { expiresIn: jwtExpiration }
        );

        return Response.json(
            {
                success: true,
                message: "Login successful",
                user: {
                    uid: user.uid,
                    email: user.email,
                    name: userData?.name || null,
                    role: normalizedRole,
                },
                authToken: appToken,
            },
            { status: 200 }
        );
    } catch (error) {
        const mapped = mapLoginError(error);
        if (mapped.status >= 500) {
            console.error("Login error:", error);
        }
        return Response.json({ error: mapped.error }, { status: mapped.status });
    }
}
