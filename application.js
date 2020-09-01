const fs = require('fs');
const app = require('express')();

const simpleParser = require('mailparser').simpleParser;
const Mbox = require('node-mbox');

let emails = {};

const parseMboxFile = filename => {
  emails = {};

  const mbox = new Mbox(filename);

  mbox.on('message', async raw => {
    const email = await simpleParser(raw);
    const to = email.to.value[0].address;

    if (!emails[to]) {
      emails[to] = [];
    }

    emails[to].push(email);
  });
};

const FILENAME = process.argv[3];
fs.watchFile(FILENAME, () => {
  console.log('file changed!');
  parseMboxFile(FILENAME);
});
parseMboxFile(FILENAME);

app.get('/', (req, res) => {
  res.send(
    `<h3>Usage: </h3><p>Append a email address to the url to see all emails for that recipient.<br>Example: bots.godsss.online/manugay1@gmail.com</p>`
  );
});

app.get('/:email', (req, res) => {
  if (!emails[req.params.email]) {
    return res.send(
      `<h3>There are no emails for ${req.params.email}.</h3><p>Try searching for another address.</p>`
    );
  }

  const addressEmails = [...emails[req.params.email]];
  addressEmails.sort((a, b) => b.date - a.date);

  res.send(
    `${emails[req.params.email]
      .map(
        (email, i) =>
          `<div style="padding: 16px; background: ${
            i % 2 ? '#BBCBCB' : '#E5FFDE'
          };">${email.html ? email.html : email.textAsHtml}</div>`
      )
      .join('')}`
  );
});

const PORT = +process.argv[2];
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
