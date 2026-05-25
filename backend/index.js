import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import usersStore from './usersStore.js';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8686930492:AAGE9X1JO9y8DEJVHFnxfVDcdELhe55i9x0';

// In‑memory stores
const sessions = new Map(); // sessionId -> { phone, telegramChatId, connected }
const otpStore = new Map();  // sessionId -> { sessionId, chatId, otp, expiry, used }

// Initialize Telegram Bot (polling mode)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Helper to send a Telegram message
async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: chatId, text });
    console.log(`Telegram message sent to chat ID ${chatId}`);
  } catch (e) {
    console.error('Telegram send error:', e.response?.data || e.message);
  }
}

// 5. User opens Telegram bot and presses START
// 6. Telegram bot receives: /start <sessionId>
bot.onText(/\/start (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const sessionId = match[1];
    const session = sessions.get(sessionId);
    
    if (!session) {
      await sendTelegramMessage(chatId, '⚠️ Invalid session. Please start the login flow from the website again.');
      return;
    }
    
    // 7. Backend extracts Telegram chat_id and sessionId
    session.telegramChatId = chatId;
    session.connected = true;
    sessions.set(sessionId, session);

    // 8. Backend generates secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // 9. OTP stored in database/Redis (in-memory map) with sessionId, chatId, expiry time, used status
    otpStore.set(sessionId, {
      sessionId,
      chatId,
      otp,
      expiry,
      used: false
    });

    console.log(`[Telegram Bot] Linked sessionId ${sessionId} to chatId ${chatId}. Generated OTP ${otp}.`);

    // 10. Backend sends OTP to Telegram using sendMessage API
    await sendTelegramMessage(chatId, `🔐 Your StanbicX Security OTP is: ${otp}\n\nThis code expires in 10 minutes.`);
    await sendTelegramMessage(chatId, '✅ Connected successfully! Please enter this code back on the StanbicX Security website to complete authentication.');
  } catch (e) {
    console.error('Bot start handler error:', e);
  }
});

// GET /api/auth/check-session/:sessionId – returns connection status
app.get('/api/auth/check-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  
  const record = otpStore.get(sessionId);
  res.json({
    connected: !!session.connected,
    telegramChatId: session.telegramChatId || null,
    otpSent: !!record && !record.used,
  });
});

// POST /api/auth/send-otp – manually trigger/resend OTP for a connected session
app.post('/api/auth/send-otp', async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session || !session.connected || !session.telegramChatId) {
    return res.status(400).json({ message: 'Telegram not connected for this session' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  otpStore.set(sessionId, {
    sessionId,
    chatId: session.telegramChatId,
    otp,
    expiry,
    used: false
  });

  try {
    await sendTelegramMessage(session.telegramChatId, `🔐 Your new StanbicX Security OTP is: ${otp}\n\nThis code expires in 10 minutes.`);
    res.json({ success: true, message: 'OTP sent' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to send OTP via Telegram' });
  }
});

// POST /api/auth/verify-otp – validates: OTP correct, OTP not expired, OTP unused, session valid
app.post('/api/auth/verify-otp', (req, res) => {
  const { sessionId, otp } = req.body;
  if (!sessionId || !otp) return res.status(400).json({ message: 'sessionId and otp required' });
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(400).json({ message: 'Session is invalid or has expired' });
  }

  const record = otpStore.get(sessionId);
  if (!record) {
    return res.status(404).json({ message: 'No OTP generated for this session. Please start the Telegram bot first.' });
  }

  const { otp: storedOtp, expiry, used } = record;

  // Validate OTP unused
  if (used) {
    return res.status(400).json({ message: 'This OTP has already been used' });
  }

  // Validate OTP not expired
  if (Date.now() > expiry) {
    otpStore.delete(sessionId);
    return res.status(410).json({ message: 'This OTP has expired (10 minutes limit)' });
  }

  // Validate OTP correct
  if (otp !== storedOtp) {
    return res.status(401).json({ message: 'Invalid OTP code. Please try again.' });
  }

  // OTP valid – Mark as used
  record.used = true;
  otpStore.set(sessionId, record);

  res.json({ success: true, message: 'OTP verified successfully' });
});

// POST /api/auth/create-session – generates a temporary login session ID
app.post('/api/auth/create-session', (req, res) => {
  const { phone } = req.body;
  const sessionId = crypto.randomBytes(12).toString('hex');
  sessions.set(sessionId, { phone: phone || null, telegramChatId: null, connected: false });
  console.log(`[Session Created] sessionId: ${sessionId}, phone: ${phone || 'N/A'}`);
  res.json({ success: true, sessionId });
});

// POST /api/auth/register – stores user phone and telegram username (for mapping)
app.post('/api/auth/register', (req, res) => {
  const { phone, telegramUsername } = req.body;
  if (!phone || !telegramUsername) {
    return res.status(400).json({ message: 'phone and telegramUsername required' });
  }
  usersStore.addOrUpdateUser({ phone, telegramUsername });
  return res.json({ success: true, message: 'User registered' });
});

app.listen(PORT, () => {
  console.log(`🚀 StanbicX backend listening on http://localhost:${PORT}`);
});
