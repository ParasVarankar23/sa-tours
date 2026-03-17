import { sendSignupEmail } from "@/lib/emailService";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";

// Function to generate password
function generatePassword(name) {
    // First 4 letters of name (lowercase)
    const namePrefix = name.slice(0, 4).toLowerCase();

    // 4 random numbers
    const randomNumbers = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");

    // 1 random symbol
    const symbols = ["@", "!", "#", "$"];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];

    return `${namePrefix}${randomNumbers}${randomSymbol}`;
}

export async function POST(request) {
    try {
        const auth = getFirebaseAuth();
        const db = getFirebaseDb();

        const { fullName, email } = await request.json();
        const name = fullName;
        const normalizedRole = "user";

        // Validation
        if (!name || !email) {
            return Response.json(
                { error: "Name and email are required" },
                { status: 400 }
            );
        }

        if (name.trim().length < 2) {
            return Response.json(
                { error: "Name must be at least 2 characters" },
                { status: 400 }
            );
        }

        // Generate password
        const generatedPassword = generatePassword(name);

        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            generatedPassword
        );

        const user = userCredential.user;

        // Store user info in Realtime Database under users/{uid}
        await set(ref(db, `users/${user.uid}`), {
            name: fullName.trim(),
            email: email.toLowerCase(),
            role: normalizedRole,
            createdAt: new Date().toISOString(),
        });

        // Send signup email with password
        try {
            await sendSignupEmail(email, name.trim(), generatedPassword);
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
            // Don't fail the signup if email fails, just log the error
        }

        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiration = process.env.JWT_EXPIRATION || "7d";

        let authToken = null;
        if (jwtSecret) {
            authToken = jwt.sign({ user_id: user.uid, role: normalizedRole }, jwtSecret, { expiresIn: jwtExpiration });
        }

        return Response.json(
            {
                success: true,
                message: "User created successfully and password sent to email",
                user: {
                    uid: user.uid,
                    email: user.email,
                    name: name.trim(),
                    role: normalizedRole,
                },
                authToken,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Signup error:", error);

        // Handle Firebase specific errors
        if (error.code === "auth/email-already-in-use") {
            return Response.json(
                { error: "Email already in use" },
                { status: 400 }
            );
        }

        if (error.code === "auth/invalid-email") {
            return Response.json(
                { error: "Invalid email address" },
                { status: 400 }
            );
        }

        if (error.code === "auth/weak-password") {
            return Response.json(
                { error: "Password is too weak" },
                { status: 400 }
            );
        }

        return Response.json(
            { error: error.message || "Failed to create user" },
            { status: 500 }
        );
    }
}
