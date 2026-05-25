const users = new Map(); // key: telegramUsername (lowercase)

/**
 * Add a new user record or update existing one.
 * @param {Object} param0
 * @param {string} param0.phone - User's phone number.
 * @param {string} param0.telegramUsername - Telegram username (without @).
 */
export function addOrUpdateUser({ phone, telegramUsername }) {
  const key = telegramUsername.toLowerCase();
  const existing = users.get(key) || {};
  users.set(key, { ...existing, phone, telegramUsername: key });
}

/** Retrieve a user by telegram username (case‑insensitive) */
export function getUserByUsername(username) {
  if (!username) return null;
  return users.get(username.toLowerCase()) || null;
}

/** Update the Telegram chat ID for a given username */
export function setChatIdForUser(username, chatId) {
  const user = getUserByUsername(username);
  if (user) {
    user.telegramChatId = chatId;
    users.set(username.toLowerCase(), user);
    return true;
  }
  return false;
}

/** Find a user by phone number */
export function getUserByPhone(phone) {
  for (const user of users.values()) {
    if (user.phone === phone) return user;
  }
  return null;
}

export default {
  addOrUpdateUser,
  getUserByUsername,
  setChatIdForUser,
  getUserByPhone,
};
