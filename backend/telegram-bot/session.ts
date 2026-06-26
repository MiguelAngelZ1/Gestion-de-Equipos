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
    sessions.set(chatId, { state: STATES.IDLE });
  }
  return sessions.get(chatId);
}

function setState(chatId, state, extra = {}) {
  const session = getSession(chatId);
  session.state = state;
  Object.assign(session, extra);
}

function resetSession(chatId) {
  sessions.delete(chatId);
}

module.exports = { sessions, STATES, getSession, setState, resetSession };
