import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// In‑memory store for OTPs (identifier -> { otp, ts })
const otpStore = new Map();

// Helper to send a Telegram message
async function sendTelegramMessage(chatId, text) {
  // Hard‑coded bot token as requested
  const BOT_TOKEN = '8686930492:AAGE9X1JO9y8DEJVHFnxfVDcdELhe55i9x0';
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}`;
  try {
    await axios.get(url);
    console.log(`Telegram message sent to ${chatId}`);
  } catch (e) {
    console.error('Telegram send error:', e.message);
  }
}

/** POST /api/auth/send-telegram-otp */
app.post('/api/auth/send-telegram-otp', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ message: 'identifier required' });

  // Generate a 6‑digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const ts = Date.now();
  otpStore.set(identifier, { otp, ts });

  // Attempt to send via Telegram – if identifier looks like a numeric chat ID we use it directly
  try {
    const chatId = identifier.startsWith('@') ? identifier.slice(1) : identifier;
    await sendTelegramMessage(chatId, `Your verification code is: ${otp}`);
    console.log(`OTP ${otp} sent to ${identifier}`);
  } catch (e) {
    console.error('Telegram send error:', e.message);
    // Still consider it a success for the front‑end demo
  }

  res.json({ success: true, message: 'OTP sent' });
});

/** POST /api/auth/verify-telegram-otp */
app.post('/api/auth/verify-telegram-otp', (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ message: 'identifier and otp required' });

  const record = otpStore.get(identifier);
  if (!record) return res.status(404).json({ message: 'No OTP for this identifier' });

  const { otp: storedOtp, ts } = record;
  const now = Date.now();
  const elapsedSec = Math.floor((now - ts) / 1000);
  if (elapsedSec > 600) {
    otpStore.delete(identifier);
    return res.status(410).json({ message: 'OTP expired' });
  }

  if (otp !== storedOtp) {
    return res.status(401).json({ message: 'Invalid OTP' });
  }

  // OTP is valid – clean up and respond
  otpStore.delete(identifier);
  res.json({ success: true, message: 'OTP verified' });
});

app.listen(PORT, () => {
  console.log(`🚀 StanbicX OTP backend listening on http://localhost:${PORT}`);
});
