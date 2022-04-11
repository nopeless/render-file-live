#!/usr/bin/node
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { promisify } from "util";
import http from "http";
import readline from "readline";

import express from "express";
import serveIndex from "serve-index";
import chokidar from "chokidar";
import ejs from "ejs";
import WebSocket, { WebSocketServer } from "ws";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function relPath(p: string): string {
  return path.resolve(__dirname, p);
}

let FILE = process.argv[2];
let PORT: number | string = process.argv[3];

PORT = Number(PORT ?? 3000);

if (!FILE) {
  console.error(`No file specified`);
  process.exit(1);
}

FILE = path.resolve(process.cwd(), FILE);

console.log(chalk.cyan(`Watching file ${FILE}`));

const watcher = chokidar.watch(FILE, {
  ignored: /(^|[/\\])\../, // ignore dotfiles
  persistent: true,
});

const envStr = JSON.stringify({
  PORT,
});

const app = new express();

const indexFile = fs.readFileSync(relPath(`../src/index.ejs`), {
  encoding: `utf8`,
});

app.set(`view engine`, ejs);

app.get(`/`, (req, res) => {
  res.send(ejs.render(indexFile, { str: fs.readFileSync(FILE), envStr }));
});

const server = app.listen(PORT, () => {
  console.log(chalk.magenta(`Server: http://localhost:${PORT}`));
});

const colors = [
  `red`,
  `green`,
  `yellow`,
  `blue`,
  `magenta`,
  `cyan`,
  `blackBright`,
  `redBright`,
  `greenBright`,
  `yellowBright`,
  `blueBright`,
  `magentaBright`,
  `cyanBright`,
];

let i = -1;

function colorCounter() {
  i = (i + 1) % colors.length;
  return i;
}

function setStatus(msg: string) {
  readline.clearLine(process.stdout, 0);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(chalk[colors[colorCounter()]](msg));
}

const wss = new WebSocketServer({ server });

wss.on(`connection`, function connection(socket) {
  setStatus(`A client has connected (yourself)`);
  socket.on(`message`, function message(msg) {
    console.log(msg.toString());
  });
});

wss.broadcast = function broadcast(msg) {
  wss.clients.forEach(function each(client) {
    client.send(msg);
  });
};

watcher.on(`change`, () => {
  setStatus(`reloading :)`);
  wss.broadcast(`reload`);
});
