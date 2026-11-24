const nodemailer = require('nodemailer');

let transport = null;

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransport = () => {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT) || 587;
  transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
};

const sendLoginCode = async (to, code) => {
  const from = process.env.MAIL_FROM || `StudyMind <${process.env.SMTP_USER}>`;
  const spaced = code.split('').join(' ');
  await getTransport().sendMail({
    from,
    to,
    subject: `${code} is your StudyMind sign-in code`,
    text: `Your StudyMind sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:Georgia,serif;max-width:460px;margin:0 auto;padding:32px 24px;color:#1c1b18;background:#f4f1e9">
        <p style="font-size:20px;margin:0 0 20px">Study<em style="color:#c4432a">mind</em></p>
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 18px">Here’s your sign-in code:</p>
        <p style="font-family:'Courier New',monospace;font-size:34px;letter-spacing:6px;margin:0 0 18px;padding:16px;background:#fffdf8;border:1px solid #d9d3c4;border-radius:8px;text-align:center">${spaced}</p>
        <p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#56524a;margin:0">It expires in 10 minutes. If you didn’t try to sign in, you can safely ignore this email.</p>
      </div>`,
  });
};

module.exports = { smtpConfigured, sendLoginCode };
