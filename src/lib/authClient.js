/**
 * Authentication API Client
 * Utility functions to interact with the Firebase authentication API
 */

export async function signup(name, email, role = "student") {
    const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Signup failed");
    }

    return data;
}

export async function login(email, password, role = "student") {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Login failed");
    }

    // Store only auth token in localStorage
    if (data.authToken) {
        localStorage.setItem("authToken", data.authToken);
    }

    return data;
}

export function logout() {
    localStorage.removeItem("authToken");
}

export function getAuthToken() {
    if (globalThis.window !== undefined) {
        return localStorage.getItem("authToken");
    }
    return null;
}

export function getStoredUser() {
    // User object is no longer persisted in localStorage
    return null;
}

export function isAuthenticated() {
    if (globalThis.window !== undefined) {
        return !!localStorage.getItem("authToken");
    }
    return false;
}
