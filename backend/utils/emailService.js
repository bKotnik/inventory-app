const nodeMailer = require('nodemailer');

const sendEmail = async (subject, message, sender, receiver, replyTo) => {
  const transporter = nodeMailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const options = {
    from: sender,
    to: receiver,
    replyTo: replyTo,
    subject: subject,
    html: message
  };

  transporter.sendMail(options, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
};

module.exports = sendEmail;