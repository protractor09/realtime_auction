const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, text, attachments = []) {
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM,
    subject,
    text,
    attachments,
  });
}

module.exports = { sendEmail };
