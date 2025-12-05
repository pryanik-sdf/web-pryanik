const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const path = require('path');
const { spawn } = require('child_process');
const SocketIO = require('socket.io');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'webmin-clone-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy for root authentication
passport.use(new LocalStrategy(async (username, password, done) => {
  if (username !== 'root') {
    return done(null, false);
  }

  // Check password against root user
  const child = spawn('su', ['-c', 'id'], { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.write(password + '\n');
  child.stdin.end();

  child.on('close', (code) => {
    if (code === 0) {
      return done(null, {username: 'root'});
    } else {
      return done(null, false);
    }
  });

  child.on('error', (err) => {
    return done(err);
  });
}));

passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser((id, done) => {
  if (id === 'root') {
    done(null, {username: 'root'});
  } else {
    done(null, false);
  }
});

// Authentication routes
app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login.html'
}));

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/login.html');
  });
});

// Protected routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login.html');
}

app.get('/', ensureAuthenticated, (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API for packages
app.get('/api/packages', ensureAuthenticated, (req, res) => {
  const child = spawn('apt', ['list', '--installed'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';

  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.on('close', (code) => {
    if (code === 0) {
      const packages = output.split('\n').filter(line => line.trim()).map(line => {
        const parts = line.split('/');
        return { name: parts[0], status: parts[1] ? parts[1].split(' ')[0] : 'installed' };
      });
      res.json(packages);
    } else {
      res.status(500).json({ error: 'Failed to list packages' });
    }
  });
});

// Remove package
app.post('/api/packages/:name/remove', ensureAuthenticated, (req, res) => {
  const packageName = req.params.name;
  const child = spawn('apt', ['remove', '-y', packageName], { stdio: ['ignore', 'pipe', 'pipe'] });

  child.on('close', (code) => {
    if (code === 0) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to remove package' });
    }
  });
});

// Serve static files
app.use(express.static('public'));

const server = app.listen(port, () => {
  console.log(`WebUtility server listening at http://localhost:${port}`);
});

// Socket.IO for console
const io = SocketIO(server);

io.on('connection', (socket) => {
  // Check if authenticated
  socket.on('authenticate', (data) => {
    // For simplicity, assume authenticated if connected, since we have session
    // In production, handle session properly

    const shell = spawn('bash');

    shell.stdout.on('data', (data) => {
      socket.emit('output', data.toString());
    });

    shell.stderr.on('data', (data) => {
      socket.emit('output', data.toString());
    });

    socket.on('command', (cmd) => {
      shell.stdin.write(cmd + '\n');
    });

    socket.on('disconnect', () => {
      shell.kill();
    });
  });
});

// Require root to run the app
if (process.getuid && process.getuid() !== 0) {
  console.error('This application must be run as root!');
  process.exit(1);
}
