"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/Button";
import * as authApi from "@/lib/auth-api";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
  }, [user?.avatarUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        avatarUrl: avatarUrl.trim() || null,
      });
      if (typeof window !== "undefined" && "localStorage" in window) {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored) as authApi.User;
          localStorage.setItem(
            "user",
            JSON.stringify({ ...parsed, avatarUrl: updated.avatarUrl })
          );
        }
      }
      await refresh();
      setMessage({ type: "success", text: "Profile picture updated." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-width section-padding py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-[#2B3448] mb-2">Settings</h1>
      <p className="text-[#4f4f4f] mb-8">
        Manage your account and profile.
      </p>

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-[#2B3448] mb-4">Profile picture</h2>
        <p className="text-sm text-[#4f4f4f] mb-4">
          Add a profile picture so others can recognize you when you share calendars or collaborate.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-[#2B3448] mb-1">
              Image URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="w-full px-4 py-2 rounded-xl border border-[#4FB3B3]/30 focus:ring-2 focus:ring-[#4FB3B3] focus:border-[#4FB3B3] outline-none"
            />
            <p className="text-xs text-[#4f4f4f] mt-1">
              Paste a direct link to an image (e.g. from Imgur, Cloudinary, or your own hosting).
            </p>
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </div>
    </div>
  );
}
