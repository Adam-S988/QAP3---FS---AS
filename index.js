const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

app.use(
  session({
    secret: "your-secret-key",
    resave: true, // Temporarily set to true to debug
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    },
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const USERS = [
  {
    id: 1,
    username: "AdminUser",
    email: "admin@example.com",
    password: bcrypt.hashSync("admin123", SALT_ROUNDS), // Hash the password for storage
    role: "admin",
  },
  {
    id: 2,
    username: "RegularUser",
    email: "user@example.com",
    password: bcrypt.hashSync("user123", SALT_ROUNDS),
    role: "user",
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
  console.log(user); // Log the user found (if any)

  // Validate email and password
  if (!user || !bcrypt.compareSync(password, user.password)) {
    console.log("Invalid credentials");
    return res.render("login", {
      errorMessage: "Invalid email or password.",
    });
  }

  // Start a session for the user
  req.session.userId = user.id;
  console.log("Session userId set to:", req.session.userId); // Log the session data

  res.redirect("/landing"); // Redirect to the landing page on successful login
});

// GET /signup - Render signup form
app.get("/signup", (req, res) => {
  res.render("signup");
});

// POST /signup - Allows a user to signup
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  // Check for duplicate email
  const existingUser = USERS.find((user) => user.email === email);
  if (existingUser) {
    // Pass the error message when rendering the signup page again
    return res.render("signup", {
      errorMessage: "Email is already registered.", // Pass the error message to the template
    });
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
app.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/landing");
  }
  res.render("index");
});

// GET /landing - Shows a welcome page for users, shows the names of all users if an admin
app.get("/landing", ensureAuthenticated, (req, res) => {
  console.log("Session userId:", req.session.userId); // Log the session userId

  // Find the logged-in user's details based on their session data
  const user = USERS.find((u) => u.id === req.session.userId);
  console.log("Logged-in user:", user); // Log the user found

  if (!user) {
    // If the user is not found in the database (e.g., manually deleted), handle the case gracefully
    req.session.destroy(() => {
      console.log("Session destroyed, redirecting to login");
      res.redirect("/login"); // Redirect to the login page
    });
    return;
  }

  // Render the landing page with the user's information and all users if the logged-in user is an admin
  res.render("landing", {
    username: user.username,
    email: user.email,
    role: user.role,
    users: user.role === "admin" ? USERS : null, // Pass all users if admin, else null
  });
});

// POST /logout
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
  console.log("Session data:", req.session); // Log the session data
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
