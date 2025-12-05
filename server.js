const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
// const pty = require('node-pty'); // Раскомментировать на Ubuntu

const app = express();
const PORT = 3000;

// Настраиваем сессии
app.use(session({
  secret: 'webmin-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Инициализация Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());

// Аутентификация: логин 'admin', пароль от сервера (здесь упрощено, замените на чтение из файла или хэширование)
const serverPassword = 'root_password_here'; // Замените на чтение из /etc/shadow или безопасный способ
passport.use(new LocalStrategy(
  function(username, password, done) {
    if (username === 'admin' && password === serverPassword) {
      return done(null, { username: username });
    } else {
      return done(null, false, { message: 'Неверные учетные данные.' });
    }
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  done(null, { username: username });
});

// Статические файлы
app.use(express.static('public'));

// Страница логина
app.get('/login.html', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// Виртуальная блокировка - редирект на страницу логина без авторизации
app.use((req, res, next) => {
  if (req.isAuthenticated() || req.path.startsWith('/login')) {
    return next();
  }
  res.redirect('/login.html');
});

// Обработка логина
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

// Выход
app.post('/logout', (req, res) => {
  req.logout();
  res.redirect('/login.html');
});

// Получить список установленных пакетов
app.get('/packages', (req, res) => {
  exec('dpkg-query -W -f="${Package}\\t${Version}\\t${Status}\\n"', (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка получения пакетов:', error);
      return res.status(500).send('Ошибка получения пакетов');
    }
    const packages = stdout.split('\n').filter(line => line).map(line => {
      const parts = line.split('\t');
      return {
        name: parts[0],
        version: parts[1],
        status: parts[2]
      };
    });
    res.json(packages);
  });
});

// Удалить пакет (с sudo для полного доступа)
app.delete('/packages/:package', (req, res) => {
  const packageName = req.params.package;
  exec(`sudo apt-get remove --yes --purge ${packageName}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка удаления пакета:', error);
      return res.status(500).send('Ошибка удаления пакета: ' + stderr);
    }
    res.send('Пакет удален');
  });
});

// WebSocket для терминала
const wss = new WebSocket.Server({ port: 8080 }); // Отдельный порт для WS

wss.on('connection', function connection(ws) {
  // const bash = pty.spawn('/bin/bash', [], {
  //   name: 'xterm-color',
  //   cwd: process.env.HOME,
  //   env: process.env
  // });

  // bash.onData((data) => {
  //   ws.send(data);
  // });

  // ws.on('message', function incoming(message) {
  //   bash.write(message);
  // });

  // ws.on('close', function close() {
  //   bash.kill();
  // });

  // временно заменить на простой echo до установки node-pty на Ubuntu
  ws.on('message', function incoming(message) {
    exec(message.toString(), (error, stdout, stderr) => {
      ws.send(stdout || stderr || error.message);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
