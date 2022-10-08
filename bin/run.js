#!/usr/bin/env node

const fs = require("fs");
const app = require("express")();
const dashdash = require("dashdash");

const simpleParser = require("mailparser").simpleParser;
const Mbox = require("node-mbox");

/* Parse command line args. */

const options = [
  {
    names: ["help", "h"],
    type: "bool",
    help: "Print this help and exit.",
  },
  {
    names: ["file", "f"],
    type: "string",
    help: "Mbox file to process. Usually in /var/spool/mail/$USER or /var/mail/$USER",
    helpArg: "FILE",
    default: `/var/mail/${require("os").userInfo().username}`,
  },
  {
    names: ["port", "p"],
    type: "number",
    help: "Port for the web server.",
    helpArg: "PORT",
    default: "8800",
  },
];

const parser = dashdash.createParser({ options });
let opts;
try {
    opts = parser.parse(process.argv);
} catch (e) {
    console.error("mbox-web-viewer: error: %s", e.message);
    process.exit(1);
}

if (opts.help) {
    const help = parser.help({ includeEnv: true });
    console.log("usage: mbox-web-viewer [OPTIONS]\n"
                + "options:\n"
                + help);
    process.exit(0);
}

/* Define each html page as it"s own function returning a string. */

const MainPage = (emails = {}) => `
  <h3>Usage: </h3>
  <p>Append a email address to the url to see all emails for that recipient.</p>
  ${Object.keys(emails).length ? `
    <span>There exists mail for the following users:</span>
    <ul>
      ${Object.keys(emails).map(to => `<li><a href="${to}">${to}</a></li>`).join("")}
    </ul>
  ` : `
    <span>There currently exists no mail.</span>
  `}
`;

const EmailList = (emails = []) =>
  emails.map((email, i) => `
    <div style="padding: 16px; background: ${i % 2 ? "#BBCBCB" : "#E5FFDE"};">
      ${email.html ? email.html : email.textAsHtml}
    </div>
  `).join("");

const NoEmails = (email) => `
  <h3>There are no emails for ${email}.</h3>
  <p>Try searching for another address.</p>
`;

/* Parse mbox file and store content in emails global. */

let emails = {};

const parseMboxFile = filename => {
  emails = {};

  const mbox = new Mbox(filename);

  mbox.on("message", async raw => {
    const email = await simpleParser(raw);
    const to = email.to.value[0].address;

    if (!emails[to]) {
      emails[to] = [];
    }

    emails[to].push(email);
  });
};

fs.watchFile(opts.file, () => { parseMboxFile(opts.file) });
parseMboxFile(opts.file);

/* Declare the routes. */

app.get("/", (_, res) => {
  res.send(MainPage(emails));
});

app.get("/:email", (req, res) => {
  if (!emails[req.params.email]) return res.send(NoEmails(req.params.email));

  const addressEmails = [...emails[req.params.email]];
  addressEmails.sort((a, b) => b.date - a.date);

  res.send(EmailList(addressEmails));
});

/* Start the server */

const CE = {
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  end: "\x1b[0m",
};

app.listen(opts.port, () => {
  console.clear();
  console.log(CE.cyan, "[mbox-web-viewer]", CE.end, CE.green, "server running at:", CE.end);
  console.log(" > Local: ", CE.cyan, `http://localhost:${opts.port}`, CE.end);
});
