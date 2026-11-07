// Local app data that is not part of the SQL schema: how plants look (emoji / colour / photo),
// community boards and posts, and persistence of the demo database.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { kvGet, kvSet } from './store';
import { USE_MOCK, exportMock, importMock, setPersist } from './api';
import { PASTELS, CATEGORY_ICON } from './theme';
import { isIconName } from './Icon';

const MOCK_KEY = 'rootesp.mock.v2';
const LOOKS_KEY = 'rootesp.looks.v1';
const COMMUNITY_KEY = 'rootesp.community.v1';
const SOCIAL_KEY = 'rootesp.social.v1';
const GAME_KEY = 'rootesp.game.v1';
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayKey = () => localDay();
const yesterdayKey = () => localDay(new Date(Date.now() - 86400000));
const mode = USE_MOCK ? 'm' : 'r';

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

export const SEED_BOARDS = [
  { id: 'general', name: 'General', emoji: '🌍', color: '#DDEFD9' },
  { id: 'show', name: 'Show off', emoji: '📸', color: '#F7DDE6' },
  { id: 'help', name: 'Need help', emoji: '🆘', color: '#FCE7D0' },
  { id: 'edible', name: 'Herbs & veggies', emoji: '🥬', color: '#D9F0EC' },
  { id: 'house', name: 'Houseplants', emoji: '🪴', color: '#EDE3F7' },
];

const SEED_POSTS = [
  { id: 'p1', boardId: 'show', author: 'Ioana', authorId: 2, text: 'My monstera finally grew a split leaf!', emoji: '🍃', color: '#DDEFD9', image: null, createdAt: ago(60 * 5), likes: ['Dan', 'Sara'], comments: [{ id: 'c1', author: 'Dan', text: 'Gorgeous!', createdAt: ago(60 * 4) }] },
  { id: 'p2', boardId: 'help', author: 'Dan', authorId: 3, text: 'Any tips for basil indoors in winter?', emoji: '🌿', color: '#FCE7D0', image: null, createdAt: ago(60 * 20), likes: [], comments: [] },
  { id: 'p3', boardId: 'house', author: 'Sara', authorId: null, text: 'Repotted my snake plant with extra perlite.', emoji: '🪴', color: '#EDE3F7', image: null, createdAt: ago(60 * 48), likes: ['Ioana'], comments: [] },
];

// Follows are stored as { followerKey: [targetKey, ...] }. A key is "u<UserID>" for registered users, "n:<name>" otherwise.
export const authorKey = (post) => (post.authorId != null ? `u${post.authorId}` : `n:${post.author}`);
export const userKey = (user) => `u${user.UserID}`;
const SEED_SOCIAL = {
  follows: { u3: ['u2'], 'n:Sara': ['u2', 'u3'], u2: [] },
  names: { u2: 'Ioana', u3: 'Dan', 'n:Sara': 'Sara' },
  notifs: [
    { id: 'n1', userId: 2, type: 'Like', title: 'Dan liked your post', message: '“My monstera finally grew a split leaf!”', createdAt: ago(90), isRead: false, postId: 'p1', fromKey: 'u3' },
    { id: 'n2', userId: 2, type: 'Follow', title: 'Sara started following you', message: 'Say hi and follow back!', createdAt: ago(240), isRead: false, fromKey: 'n:Sara' },
  ],
};

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [looks, setLooks] = useState({});
  const [community, setCommunity] = useState({ boards: SEED_BOARDS, posts: SEED_POSTS });
  const [social, setSocial] = useState(SEED_SOCIAL);
  const [games, setGames] = useState({});
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (USE_MOCK) {
        const saved = await kvGet(MOCK_KEY, null);
        if (saved) importMock(saved);
        setPersist(() => {
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => kvSet(MOCK_KEY, exportMock()), 250);
        });
      }
      const [l, c, so, gm] = await Promise.all([kvGet(LOOKS_KEY, {}), kvGet(COMMUNITY_KEY, null), kvGet(SOCIAL_KEY, null), kvGet(GAME_KEY, {})]);
      if (!alive) return;
      setLooks(l || {});
      if (so?.follows && so?.notifs) setSocial(so);
      setGames(gm || {});
      if (c?.boards && c?.posts) setCommunity(c);
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  // ---- plant looks ----
  const getLook = useCallback((plant) => {
    const saved = looks[`${mode}${plant.PlantID}`] || {};
    const sp = plant.species;
    return {
      icon: (isIconName(saved.icon) && saved.icon) || (isIconName(saved.emoji) && saved.emoji) || CATEGORY_ICON[sp?.Category] || 'sprout',
      emoji: saved.emoji || null,
      color: saved.color || PASTELS[(plant.PlantID || 0) % PASTELS.length],
      photo: saved.photo || null,
    };
  }, [looks]);

  const setLook = useCallback((plantId, patch) => {
    setLooks((old) => {
      const next = { ...old, [`${mode}${plantId}`]: { ...(old[`${mode}${plantId}`] || {}), ...patch } };
      kvSet(LOOKS_KEY, next);
      return next;
    });
  }, []);

  // A user avatar uses the same storage with a "u" prefix.
  const getUserLook = useCallback((u) => {
    const saved = looks[`${mode}u${u.UserID}`] || {};
    return { icon: (isIconName(saved.icon) && saved.icon) || 'account', emoji: saved.emoji || null, color: saved.color || PASTELS[(u.UserID || 0) % PASTELS.length], photo: saved.photo || null };
  }, [looks]);
  const setUserLook = useCallback((userId, patch) => setLook(`u${userId}`, patch), [setLook]);

  // ---- community ----
  const updateCommunity = useCallback((fn) => {
    setCommunity((old) => {
      const next = fn(old);
      kvSet(COMMUNITY_KEY, next);
      return next;
    });
  }, []);
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const addPost = (user, { boardId, text, emoji, color, image }) =>
    updateCommunity((c) => ({ ...c, posts: [{ id: uid(), boardId, author: user.Username, authorId: user.UserID, text: text.trim(), emoji: emoji || null, color, image: image || null, createdAt: new Date().toISOString(), likes: [], comments: [] }, ...c.posts] }));
  const updateSocial = useCallback((fn) => {
    setSocial((old) => { const next = fn(old); kvSet(SOCIAL_KEY, next); return next; });
  }, []);
  const pushNotif = (n) => updateSocial((o) => ({ ...o, notifs: [{ id: uid(), createdAt: new Date().toISOString(), isRead: false, ...n }, ...o.notifs].slice(0, 200) }));

  const toggleLike = (user, postId) => {
    const post = community.posts.find((p) => p.id === postId);
    const liked = post?.likes.includes(user.Username);
    updateCommunity((c) => ({ ...c, posts: c.posts.map((p) => p.id !== postId ? p : { ...p, likes: liked ? p.likes.filter((x) => x !== user.Username) : [...p.likes, user.Username] }) }));
    if (post && !liked && post.authorId != null && post.authorId !== user.UserID) {
      pushNotif({ userId: post.authorId, type: 'Like', title: `${user.Username} liked your post`, message: post.text ? `“${post.text.slice(0, 80)}”` : 'Your photo post', postId, fromKey: userKey(user) });
    }
  };
  const addComment = (user, postId, text) => {
    const post = community.posts.find((p) => p.id === postId);
    updateCommunity((c) => ({ ...c, posts: c.posts.map((p) => p.id !== postId ? p : { ...p, comments: [...p.comments, { id: uid(), author: user.Username, text: text.trim(), createdAt: new Date().toISOString() }] }) }));
    if (post && post.authorId != null && post.authorId !== user.UserID) {
      pushNotif({ userId: post.authorId, type: 'Comment', title: `${user.Username} commented on your post`, message: `“${text.trim().slice(0, 80)}”`, postId, fromKey: userKey(user) });
    }
  };

  // ---- daily watering game (progress is per user, stored on the device) ----
  const gameFor = (userId) => {
    const g = games[userId] || { streak: 0, best: 0, xp: 0, plays: 0, lastPlayed: null };
    // a streak is only alive if the last daily play was today or yesterday
    const alive = g.lastPlayed === todayKey() || g.lastPlayed === yesterdayKey();
    return { ...g, streak: alive ? g.streak : 0, playedToday: g.lastPlayed === todayKey() };
  };
  const recordGame = (userId, score, stars) => {
    const g = gameFor(userId);
    const firstToday = !g.playedToday;
    const next = { streak: firstToday ? g.streak + 1 : g.streak, best: Math.max(g.best, score), xp: g.xp + score, plays: g.plays + 1, lastPlayed: todayKey() };
    setGames((old) => { const all = { ...old, [userId]: next }; kvSet(GAME_KEY, all); return all; });
    return { firstToday, streak: next.streak, xp: next.xp };
  };

  // ---- follow ----
  const isFollowing = (user, key) => (social.follows[userKey(user)] || []).includes(key);
  const toggleFollow = (user, key, name) => {
    const me = userKey(user);
    if (key === me) return;
    const was = isFollowing(user, key);
    updateSocial((o) => {
      const list = o.follows[me] || [];
      return { ...o, follows: { ...o.follows, [me]: was ? list.filter((k) => k !== key) : [...list, key] }, names: { ...o.names, [key]: name || o.names[key] || key, [me]: user.Username } };
    });
    if (!was && key.startsWith('u')) pushNotif({ userId: Number(key.slice(1)), type: 'Follow', title: `${user.Username} started following you`, message: 'Say hi and follow back!', fromKey: me });
  };
  const followCounts = (key) => ({
    followers: Object.entries(social.follows).filter(([k, list]) => k !== key && list.includes(key)).length,
    following: (social.follows[key] || []).length,
  });

  // ---- social notifications (stored on the device) ----
  const notifsFor = (userId) => social.notifs.filter((n) => n.userId === userId);
  const markNotifRead = (id) => updateSocial((o) => ({ ...o, notifs: o.notifs.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }));
  const markAllNotifsRead = (userId) => updateSocial((o) => ({ ...o, notifs: o.notifs.map((n) => (n.userId === userId ? { ...n, isRead: true } : n)) }));

  const deletePost = (postId) => updateCommunity((c) => ({ ...c, posts: c.posts.filter((p) => p.id !== postId) }));
  const addBoard = ({ name, emoji, color }) => {
    const board = { id: uid(), name: name.trim(), emoji, color };
    updateCommunity((c) => ({ ...c, boards: [...c.boards, board] }));
    return board;
  };

  return (
    <DataContext.Provider value={{ ready, getLook, setLook, getUserLook, setUserLook, community, addPost, toggleLike, addComment, deletePost, addBoard, isFollowing, toggleFollow, followCounts, social, gameFor, recordGame, notifsFor, markNotifRead, markAllNotifsRead }}>
      {children}
    </DataContext.Provider>
  );
}
