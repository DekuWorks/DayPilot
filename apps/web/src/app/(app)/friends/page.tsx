"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pin, PinOff, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { useAuth } from "@/providers/AuthProvider";
import * as friendsApi from "@/lib/friends-supabase";
import type {
  Friend,
  FriendRequest,
  PublicUser,
  UserRelation,
} from "@/lib/friends-supabase";

type Tab = "search" | "friends" | "requests" | "favorites";

function Avatar({ user, size = "md" }: { user: PublicUser; size?: "sm" | "md" }) {
  const label = friendsApi.formatPublicName(user);
  const initial = (label.replace(/^@/, "").trim()[0] || "?").toUpperCase();
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] font-semibold text-[var(--brand-500)]`}
    >
      {initial}
    </div>
  );
}

function UserMeta({ user }: { user: PublicUser }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
        {friendsApi.formatPublicName(user)}
      </p>
      <p className="truncate text-xs text-[var(--text-tertiary)]">
        {user.username ? `@${user.username}` : "No username"}
      </p>
    </div>
  );
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [favorites, setFavorites] = useState<PublicUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
  const [relations, setRelations] = useState<Record<string, UserRelation>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const favoriteCount = favorites.length;
  const pendingCount = incoming.length;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [friendList, favList, requests] = await Promise.all([
        friendsApi.listFriends(user.id),
        friendsApi.listFavorites(user.id),
        friendsApi.listFriendRequests(user.id),
      ]);
      setFriends(friendList);
      setFavorites(favList);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setRelations({});
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        setError("");
        try {
          const results = await friendsApi.searchUsers(q);
          if (cancelled) return;
          setSearchResults(results);
          const next: Record<string, UserRelation> = {};
          await Promise.all(
            results.map(async (r) => {
              next[r.id] = await friendsApi.getRelationToUser(user.id, r.id);
            })
          );
          if (!cancelled) setRelations(next);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Search failed");
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, user]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.id)),
    [favorites]
  );

  async function withBusy(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSendRequest(targetId: string) {
    await withBusy(targetId, async () => {
      await friendsApi.sendFriendRequest(targetId);
      if (user) {
        setRelations((prev) => ({
          ...prev,
          [targetId]: { kind: "outgoing_pending", requestId: "pending" },
        }));
      }
      setTab("requests");
    });
  }

  async function handleToggleFavorite(targetId: string, isFavorite: boolean) {
    if (!user) return;
    await withBusy(targetId, async () => {
      if (isFavorite) {
        await friendsApi.unpinFavorite(user.id, targetId);
      } else {
        await friendsApi.pinFavorite(user.id, targetId);
      }
    });
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "friends", label: "Friends", badge: friends.length },
    { id: "requests", label: "Requests", badge: pendingCount },
    { id: "favorites", label: "Favorites", badge: favoriteCount },
    { id: "search", label: "Find people" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Friends
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Find DayPilot users, manage requests, and pin up to{" "}
            {friendsApi.MAX_FAVORITES} favorites.
          </p>
        </div>
        <Button size="sm" onClick={() => setTab("search")}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Find people
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
            }`}
          >
            {t.label}
            {typeof t.badge === "number" && (
              <span className="ml-1.5 text-xs text-[var(--text-tertiary)]">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or name…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              autoFocus
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Search uses public username and display name — emails stay private.
          </p>
          <ul className="space-y-1">
            {searching ? (
              <li className="px-2 py-4 text-sm text-[var(--text-tertiary)]">
                Searching…
              </li>
            ) : searchQuery.trim().length < 1 ? (
              <li className="px-2 py-4 text-sm text-[var(--text-tertiary)]">
                Type a username or name to find people on DayPilot.
              </li>
            ) : searchResults.length === 0 ? (
              <li className="px-2 py-4 text-sm text-[var(--text-tertiary)]">
                No users found.
              </li>
            ) : (
              searchResults.map((u) => {
                const relation = relations[u.id] ?? { kind: "none" as const };
                return (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--surface-secondary)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar user={u} />
                      <UserMeta user={u} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {relation.kind === "friends" && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          Friends
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                          busyId === u.id ||
                          (!favoriteIds.has(u.id) &&
                            favoriteCount >= friendsApi.MAX_FAVORITES)
                        }
                        onClick={() =>
                          handleToggleFavorite(u.id, favoriteIds.has(u.id))
                        }
                        title={
                          favoriteIds.has(u.id)
                            ? "Unpin favorite"
                            : favoriteCount >= friendsApi.MAX_FAVORITES
                              ? `Max ${friendsApi.MAX_FAVORITES} favorites`
                              : "Pin as favorite"
                        }
                      >
                        {favoriteIds.has(u.id) ? (
                          <>
                            <PinOff className="mr-1 h-3.5 w-3.5" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="mr-1 h-3.5 w-3.5" />
                            Pin
                          </>
                        )}
                      </Button>
                      {relation.kind === "outgoing_pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            busyId === u.id ||
                            busyId === relation.requestId
                          }
                          onClick={() =>
                            withBusy(relation.requestId, () =>
                              friendsApi.cancelFriendRequest(relation.requestId)
                            )
                          }
                        >
                          Cancel request
                        </Button>
                      )}
                      {relation.kind === "incoming_pending" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === relation.requestId}
                            onClick={() =>
                              withBusy(relation.requestId, () =>
                                friendsApi.acceptFriendRequest(
                                  relation.requestId
                                )
                              )
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === relation.requestId}
                            onClick={() =>
                              withBusy(relation.requestId, () =>
                                friendsApi.declineFriendRequest(
                                  relation.requestId
                                )
                              )
                            }
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {relation.kind === "none" && (
                        <Button
                          size="sm"
                          disabled={busyId === u.id}
                          onClick={() => handleSendRequest(u.id)}
                        >
                          Add friend
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      )}

      {tab === "friends" && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          {loading ? (
            <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <Users className="h-8 w-8 text-[var(--text-tertiary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  No friends yet
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Search for people by username and send a request.
                </p>
              </div>
              <Button size="sm" onClick={() => setTab("search")}>
                Find people
              </Button>
            </div>
          ) : (
            <ul className="space-y-1">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--surface-secondary)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={f} />
                    <div className="min-w-0">
                      <UserMeta user={f} />
                      {f.isFavorite && (
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--brand-500)]">
                          Favorite
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={
                        busyId === f.id ||
                        (!f.isFavorite &&
                          favoriteCount >= friendsApi.MAX_FAVORITES)
                      }
                      onClick={() => handleToggleFavorite(f.id, f.isFavorite)}
                      title={
                        f.isFavorite
                          ? "Unpin favorite"
                          : favoriteCount >= friendsApi.MAX_FAVORITES
                            ? `Max ${friendsApi.MAX_FAVORITES} favorites`
                            : "Pin as favorite"
                      }
                    >
                      {f.isFavorite ? (
                        <>
                          <PinOff className="mr-1 h-3.5 w-3.5" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="mr-1 h-3.5 w-3.5" />
                          Pin
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === f.id}
                      onClick={() =>
                        withBusy(f.id, () => friendsApi.removeFriend(f.id))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Incoming
            </h2>
            {loading ? (
              <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
            ) : incoming.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                No pending requests.
              </p>
            ) : (
              <ul className="space-y-1">
                {incoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--surface-secondary)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {r.otherUser ? (
                        <>
                          <Avatar user={r.otherUser} />
                          <UserMeta user={r.otherUser} />
                        </>
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Unknown user
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() =>
                          withBusy(r.id, () =>
                            friendsApi.acceptFriendRequest(r.id)
                          )
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() =>
                          withBusy(r.id, () =>
                            friendsApi.declineFriendRequest(r.id)
                          )
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Sent
            </h2>
            {loading ? (
              <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
            ) : outgoing.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                No outgoing requests.
              </p>
            ) : (
              <ul className="space-y-1">
                {outgoing.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--surface-secondary)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {r.otherUser ? (
                        <>
                          <Avatar user={r.otherUser} />
                          <UserMeta user={r.otherUser} />
                        </>
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Unknown user
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() =>
                        withBusy(r.id, () =>
                          friendsApi.cancelFriendRequest(r.id)
                        )
                      }
                    >
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "favorites" && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <p className="mb-3 text-xs text-[var(--text-tertiary)]">
            {favoriteCount}/{friendsApi.MAX_FAVORITES} pins used. Favorites are
            layered on (not the same as) friendships — pin anyone from search.
          </p>
          {loading ? (
            <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              No favorites yet. Pin people from Friends or Find people.
            </p>
          ) : (
            <ul className="space-y-1">
              {favorites.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--surface-secondary)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={f} />
                    <UserMeta user={f} />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === f.id}
                    onClick={() => handleToggleFavorite(f.id, true)}
                  >
                    <PinOff className="mr-1 h-3.5 w-3.5" />
                    Unpin
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
