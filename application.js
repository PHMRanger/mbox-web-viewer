const app = require('express')();
const PORT = 3000;

const Mbox = require('node-mbox');
const simpleParser = require('mailparser').simpleParser;

const mbox = new Mbox();
process.stdin.pipe(mbox);

const emails = [];

mbox.on('message', async raw => {
    const email = await simpleParser(raw);
    emails.push(email.textAsHtml);
});

app.get('/', (req, res) => {
    res.send(`${emails.map(email => `<div>${email}</div>`).join('')}`);
});

app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
});