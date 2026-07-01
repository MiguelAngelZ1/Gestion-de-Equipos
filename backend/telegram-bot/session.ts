const sessions = new Map();

const STATES = {
  IDLE: 'IDLE',
  MAIN_MENU: 'MAIN_MENU',
  SUB_MENU: 'SUB_MENU',
  AWAITING_INPUT: 'AWAITING_INPUT',
  RESULT: 'RESULT',
};

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { state: STATES.IDLE, inviteAttempts: 0 });
  }
  return sessions.get(chatId);
}

function setState(chatId, state, extra = {}) {
  const previous = getSession(chatId);
  const clean = { inviteAttempts: previous.inviteAttempts || 0 };
  sessions.set(chatId, { ...clean, state, ...extra });
}

function resetSession(chatId) {
  sessions.delete(chatId);
}

module.exports = { sessions, STATES, getSession, setState, resetSession };