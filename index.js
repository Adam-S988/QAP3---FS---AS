const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

const session = require("express-session");

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    },
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "replace_this_with_a_secure_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const USERS = [
  {
    id: 1,
    username: "AdminUser",
    email: "admin@example.com",
    password: bcrypt.hashSync("admin123", SALT_ROUNDS), //In a database, you'd just store the hashes, but for
    // our purposes we'll hash these existing users when the
    // app loads
    role: "admin",
  },
  {
    id: 2,
    username: "RegularUser",
    email: "user@example.com",
    password: bcrypt.hashSync("user123", SALT_ROUNDS),
    role: "user", // Regular user
  },
];

function authenticateUser(username, password) {
  const user = USERS.find((user) => user.username === username);
  return user && bcrypt.compareSync(password, user.password);
}

function getUserId(username) {
  const user = USERS.find((user) => user.username === username);
  return user ? user.id : null;
}

// GET /login - Render login form
app.get("/login", (req, res) => {
  res.render("login", { errorMessage: null });
});

// POST /login - Allows a user to login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  const user = USERS.find((u) => u.email === email);

  // Validate email and password
  if (!user || user.password !== password) {
    return res.render("login", {
      errorMessage: "Invalid email or password.",
    });
  }

  // Start a session for the user
  req.session.userId = user.id;

  res.redirect("/landing"); // Redirect to the landing page on successful login
});

// GET /signup - Render signup form
app.get("/signup", (request, response) => {
  response.render("signup");
});

// POST /signup - Allows a user to signup
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  // Check for duplicate email
  const existingUser = USERS.find((user) => user.email === email);
  if (existingUser) {
    return res.status(400).send("Email is already registered.");
  }

  // Create a new user
  const newUser = {
    id: USERS.length + 1, // Incremental ID
    username,
    email,
    password, // In a real app, hash the password before storing
    role: "user", // Default role for new users
  };

  // Add the user to the array
  USERS.push(newUser);

  res.redirect("/login"); // Redirect to login after successful registration
});

// GET / - Render index page or redirect to landing if logged in
app.get("/", (request, response) => {
  if (request.session.user) {
    return response.redirect("/landing");
  }
  response.render("index");
});

// GET /landing - Shows a welcome page for users, shows the names of all users if an admin
app.get("/landing", ensureAuthenticated, (req, res) => {
  // Find the logged-in user's details based on their session data
  const user = USERS.find((u) => u.id === req.session.userId);

  if (!user) {
    // If the user is not found in the database (e.g., manually deleted), handle the case gracefully
    req.session.destroy(() => {
      res.redirect("/login"); // Redirect to the login page
    });
    return;
  }

  // Render the landing page with the user's information
  res.render("landing", {
    username: user.username, // Pass the user's username to the template
    email: user.email, // Optionally pass additional user details
    role: user.role, // Pass the user's role (useful for role-based display or actions)
  });
});

//POST /logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/landing");
    }
    res.redirect("/login");
  });
});

// Middleware
function ensureAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next(); // User is authenticated, proceed
  }
  res.redirect("/login"); // Redirect to login page if not authenticated
}

app.use((req, res, next) => {
  if (req.session.userId) {
    // Find the logged-in user
    const user = USERS.find((u) => u.id === req.session.userId);
    req.user = user; // Attach the user object to the request
  }
  next();
});

app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
