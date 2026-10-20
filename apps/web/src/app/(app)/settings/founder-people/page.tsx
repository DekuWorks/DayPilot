"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FounderOwnerNav } from "@/components/founder-hub/FounderOwnerNav";
import { OwnerMessageForm } from "@/components/founder-hub/OwnerMessageForm";
import { useAuth } from "@/providers/AuthProvider";
import {
  listFounderPeople,
  setWaitlistStatus,
  type FoundingPerson,
  type WaitlistPerson,
} from "@/lib/founder-hub-api";

function when(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function spot(number: number | null) {
  if (number == null) return "—";
  return `#${String(number).padStart(2, "0")}`;
}

export default function FounderPeoplePage() {
  const { user, isLoading } = useAuth();
  const owner = user?.founderHub?.isOwner === true;
  const [founding, setFounding] = useState<FoundingPerson[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistPerson[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [messagingId, setMessagingId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const people = await listFounderPeople();
      setFounding(people.founding);
      setWaitlist(people.waitlist);
    } catch (err) {
      setFounding([]);
      setWaitlist([]);
      setError(err instanceof Error ? err.message : "Could not load people");
    }
  }, []);

  useEffect(() => {
    if (!owner) return;
    void load();
  }, [owner, load]);

  async function update(id: string, status: "open" | "handled" | "removed") {
    setBusyId(id);
    setError("");
    try {
      await setWaitlistStatus(id, status);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update that row",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/settings" className="text-sm text-[var(--brand-500)]">
        Settings
      </Link>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          People
        </h1>
        <FounderOwnerNav current="people" />
        <p className="text-sm text-[var(--text-secondary)]">
          Founding subscribers and Team or Enterprise waitlist requests. This
          page is only for the hub owner.
        </p>
      </div>
      {!isLoading && !owner ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Only the hub owner can open this.
        </p>
      ) : null}
      {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}

      {owner ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Founding subscribers ({founding.length})
            </h2>
            {founding.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No founding subscribers stored yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {founding.map((person) => (
                  <li
                    key={`${person.email ?? "spot"}-${person.founderNumber ?? "x"}`}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"
                  >
                    <p className="font-medium text-[var(--text-primary)]">
                      {person.name || person.email || "Unlinked spot"}{" "}
                      <span className="text-[var(--text-secondary)]">
                        {spot(person.founderNumber)}
                      </span>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {person.email ?? "No email"} · {person.plan} ·{" "}
                      {person.status ?? "claim"}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Claimed {when(person.claimCreatedAt)} · Subscribed{" "}
                      {when(person.subscribedAt)} · Access until{" "}
                      {when(person.currentPeriodEnd)}
                    </p>
                    {person.canMessage && person.userId ? (
                      <div className="mt-3 space-y-3">
                        <button
                          type="button"
                          onClick={() =>
                            setMessagingId((current) =>
                              current === person.userId
                                ? ""
                                : (person.userId ?? ""),
                            )
                          }
                          className="min-h-11 rounded-lg bg-[var(--brand-500)] px-3 py-2 text-sm font-semibold text-black"
                        >
                          Message founder
                        </button>
                        {messagingId === person.userId ? (
                          <OwnerMessageForm recipientUserId={person.userId} />
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Waitlist ({waitlist.length})
            </h2>
            {waitlist.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                No waitlist requests stored yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {waitlist.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"
                  >
                    <p className="font-medium text-[var(--text-primary)]">
                      {row.email}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {row.plan} · {row.status} · {when(row.createdAt)}
                    </p>
                    {row.companyName || row.teamSize ? (
                      <p className="text-sm text-[var(--text-secondary)]">
                        {row.companyName ?? "No company"}
                        {row.teamSize ? ` · team size ${row.teamSize}` : ""}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.status !== "handled" ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void update(row.id, "handled")}
                          className="min-h-11 rounded-lg bg-[var(--brand-500)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
                        >
                          Mark handled
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void update(row.id, "open")}
                          className="min-h-11 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] disabled:opacity-60"
                        >
                          Mark open
                        </button>
                      )}
                      {row.status !== "removed" ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void update(row.id, "removed")}
                          className="min-h-11 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] disabled:opacity-60"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
