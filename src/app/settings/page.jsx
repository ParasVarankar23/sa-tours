"use client";

import { showAppToast } from "@/lib/client/toast";
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("change");

  // ---------------- CHANGE PASSWORD ----------------
  const [changeForm, setChangeForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [changeLoading, setChangeLoading] = useState(false);

  const [showChangePasswords, setShowChangePasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // ---------------- FORGOT PASSWORD ----------------
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [forgotForm, setForgotForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showForgotPasswords, setShowForgotPasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  // ---------------- HANDLERS ----------------
  function handleChangeInput(e) {
    const { name, value } = e.target;
    setChangeForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleForgotInput(e) {
    const { name, value } = e.target;
    setForgotForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleChangePassword(field) {
    setShowChangePasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }

  function toggleForgotPassword(field) {
    setShowForgotPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }

  function resetForgotFlow() {
    setForgotStep(1);
    setForgotForm({
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  // ---------------- CHANGE PASSWORD API ----------------
  async function handleChangePassword(e) {
    e.preventDefault();

    const { oldPassword, newPassword, confirmPassword } = changeForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showAppToast("warning", "Please fill all fields.");
      return;
    }

    if (newPassword.length < 6) {
      showAppToast("warning", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAppToast("warning", "New password and confirm password do not match.");
      return;
    }

    setChangeLoading(true);

    try {
      const authToken = localStorage.getItem("authToken");

      const res = await fetch("/api/auth/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showAppToast("error", data?.error || "Failed to change password.");
        return;
      }

      showAppToast("success", data?.message || "Password changed successfully.");

      setChangeForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      showAppToast("error", "Something went wrong. Please try again.");
    } finally {
      setChangeLoading(false);
    }
  }

  // ---------------- FORGOT PASSWORD - STEP 1 ----------------
  async function handleSendOtp(e) {
    e.preventDefault();

    if (!forgotForm.email) {
      showAppToast("warning", "Please enter your email address.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send-otp",
          email: forgotForm.email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showAppToast("error", data?.error || "Failed to send OTP.");
        return;
      }

      showAppToast("success", data?.message || "OTP sent successfully.");
      setForgotStep(2);
    } catch {
      showAppToast("error", "Something went wrong while sending OTP.");
    } finally {
      setForgotLoading(false);
    }
  }

  // ---------------- FORGOT PASSWORD - STEP 2 ----------------
  function handleOtpNext(e) {
    e.preventDefault();

    if (!forgotForm.otp) {
      showAppToast("warning", "Please enter OTP.");
      return;
    }

    if (forgotForm.otp.length < 6) {
      showAppToast("warning", "Please enter a valid 6-digit OTP.");
      return;
    }

    // UI only: actual OTP verification happens in reset-password API
    setForgotStep(3);
  }

  // ---------------- FORGOT PASSWORD - STEP 3 ----------------
  async function handleResetPassword(e) {
    e.preventDefault();

    const { email, otp, newPassword, confirmPassword } = forgotForm;

    if (!newPassword || !confirmPassword) {
      showAppToast("warning", "Please fill all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      showAppToast("warning", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAppToast("warning", "New password and confirm password do not match.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reset-password",
          email,
          otp,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showAppToast("error", data?.error || "Failed to reset password.");
        return;
      }

      showAppToast("success", data?.message || "Password reset successfully.");

      setForgotForm({
        email: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });

      setForgotStep(1);
      setActiveTab("change");
    } catch {
      showAppToast("error", "Something went wrong while resetting password.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your password and account security settings.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setActiveTab("change")}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === "change"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
                }`}
            >
              <KeyRound size={18} />
              Change Password
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("forgot");
                resetForgotFlow();
              }}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${activeTab === "forgot"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
                }`}
            >
              <ShieldCheck size={18} />
              Forgot Password
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-5 sm:p-6">
          {/* ---------------- CHANGE PASSWORD TAB ---------------- */}
          {activeTab === "change" && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your password securely using your current password.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  {/* Old Password */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Old Password
                    </label>
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                      <Lock size={18} className="mr-3 text-slate-400" />
                      <input
                        type={showChangePasswords.oldPassword ? "text" : "password"}
                        name="oldPassword"
                        value={changeForm.oldPassword}
                        onChange={handleChangeInput}
                        placeholder="Enter old password"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleChangePassword("oldPassword")}
                        className="ml-3 text-slate-400 transition hover:text-orange-500"
                      >
                        {showChangePasswords.oldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      New Password
                    </label>
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                      <Lock size={18} className="mr-3 text-slate-400" />
                      <input
                        type={showChangePasswords.newPassword ? "text" : "password"}
                        name="newPassword"
                        value={changeForm.newPassword}
                        onChange={handleChangeInput}
                        placeholder="Enter new password"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleChangePassword("newPassword")}
                        className="ml-3 text-slate-400 transition hover:text-orange-500"
                      >
                        {showChangePasswords.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Confirm Password
                    </label>
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                      <Lock size={18} className="mr-3 text-slate-400" />
                      <input
                        type={showChangePasswords.confirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={changeForm.confirmPassword}
                        onChange={handleChangeInput}
                        placeholder="Confirm new password"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleChangePassword("confirmPassword")}
                        className="ml-3 text-slate-400 transition hover:text-orange-500"
                      >
                        {showChangePasswords.confirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changeLoading}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {changeLoading ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>

              {/* Info Card */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-bold text-slate-900">Password Tips</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>• Use at least 6 characters.</li>
                  <li>• Avoid reusing your old password.</li>
                  <li>• Mix letters, numbers, and symbols for better security.</li>
                  <li>• Keep your password private and secure.</li>
                </ul>

                <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-4">
                  <p className="text-sm font-medium text-slate-800">
                    Tip: If you forgot your password, use the{" "}
                    <span className="font-semibold text-orange-600">Forgot Password</span> tab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- FORGOT PASSWORD TAB ---------------- */}
          {activeTab === "forgot" && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-900">Forgot Password</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Reset your password using email verification and OTP.
                  </p>
                </div>

                {/* Step Indicator */}
                <div className="mb-6 flex items-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${forgotStep >= step
                            ? "bg-orange-500 text-white"
                            : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {step}
                      </div>
                      {step < 3 && (
                        <div
                          className={`h-1 w-8 rounded-full ${forgotStep > step ? "bg-orange-500" : "bg-slate-200"
                            }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* STEP 1 */}
                {forgotStep === 1 && (
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Email ID
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                        <Mail size={18} className="mr-3 text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          value={forgotForm.email}
                          onChange={handleForgotInput}
                          placeholder="Enter your registered email"
                          className="w-full bg-transparent text-sm text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {forgotLoading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </form>
                )}

                {/* STEP 2 */}
                {forgotStep === 2 && (
                  <form onSubmit={handleOtpNext} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Enter OTP
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                        <ShieldCheck size={18} className="mr-3 text-slate-400" />
                        <input
                          type="text"
                          name="otp"
                          value={forgotForm.otp}
                          onChange={handleForgotInput}
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          className="w-full bg-transparent text-sm text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Back
                      </button>

                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                      >
                        Continue
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3 */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        New Password
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                        <Lock size={18} className="mr-3 text-slate-400" />
                        <input
                          type={showForgotPasswords.newPassword ? "text" : "password"}
                          name="newPassword"
                          value={forgotForm.newPassword}
                          onChange={handleForgotInput}
                          placeholder="Enter new password"
                          className="w-full bg-transparent text-sm text-slate-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleForgotPassword("newPassword")}
                          className="ml-3 text-slate-400 transition hover:text-orange-500"
                        >
                          {showForgotPasswords.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Confirm Password
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                        <Lock size={18} className="mr-3 text-slate-400" />
                        <input
                          type={showForgotPasswords.confirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={forgotForm.confirmPassword}
                          onChange={handleForgotInput}
                          placeholder="Confirm new password"
                          className="w-full bg-transparent text-sm text-slate-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleForgotPassword("confirmPassword")}
                          className="ml-3 text-slate-400 transition hover:text-orange-500"
                        >
                          {showForgotPasswords.confirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setForgotStep(2)}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {forgotLoading ? "Resetting Password..." : "Reset Password"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Info Card */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-bold text-slate-900">Reset Password Flow</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>• Step 1: Enter your registered email address.</li>
                  <li>• Step 2: Enter the 6-digit OTP sent to your email.</li>
                  <li>• Step 3: Create a new password and confirm it.</li>
                </ul>

                <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-4">
                  <p className="text-sm font-medium text-slate-800">
                    OTP is verified during the final reset step using your backend.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}