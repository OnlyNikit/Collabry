const MailComposer = require("nodemailer/lib/mail-composer");

/*
  Poora RFC 822 message (attachments ke saath) Buffer mein banata hai.
*/
const buildMime = async ({
  from,
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  attachments = [],
  inReplyTo,
  references,
}) => {
  const mail = new MailComposer({
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    inReplyTo,
    references,
    attachments,
  });

  return new Promise((resolve, reject) => {
    mail.compile().build((err, message) =>
      err ? reject(err) : resolve(message),
    );
  });
};

module.exports = { buildMime };