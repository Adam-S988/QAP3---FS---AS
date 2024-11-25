const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

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
app.get("/login", (request, response) => {
  response.render("login");
});

// POST /login - Allows a user to login
app.post("/login", (req, res) => {
  console.log("Form Data:", req.body); // Log submitted data
  const { email, password } = req.body;
  const user = USERS.find((user) => user.email === email);

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id;
    res.redirect("/landing");
  } else {
    console.log("Authentication failed: Invalid credentials");
    res.status(401).send("Authentication failed: Invalid email or password.");
  }
});

// GET /signup - Render signup form
app.get("/signup", (request, response) => {
  response.render("signup");
});

// POST /signup - Allows a user to signup
app.post("/signup", (req, res) => {
  const { email, password } = req.body; // Use 'email' here to match the form field
  const user = USERS.find((user) => user.email === email); // Check email, not username

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id; // Store the user's ID in the session
    res.redirect("/landing"); // Redirect to landing page on success
  } else {
    res.status(401).send("Authentication failed: Invalid email or password.");
  }
});

// GET / - Render index page or redirect to landing if logged in
app.get("/", (request, response) => {
  if (request.session.user) {
    return response.redirect("/landing");
  }
  response.render("index");
});

// GET /landing - Shows a welcome page for users, shows the names of all users if an admin
app.get("/landing", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please log in to view this page.");
  }

  // Find the logged-in user by ID
  const currentUser = USERS.find((user) => user.id === req.session.userId);

  if (!currentUser) {
    return res.status(404).send("User not found.");
  }

  // If the user is an admin, render a list of all users
  if (currentUser.role === "admin") {
    return res.render("landing", {
      username: currentUser.username,
      users: USERS, // Pass the list of users to the template
    });
  }

  // If not an admin, show the dashboard for a regular user
  res.render("landing", {
    username: currentUser.username,
    users: null, // No users list for non-admins
  });
});

//POST /logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Failed to destroy session:", err);
      return res.status(500).send("An error occurred while logging out.");
    }
    return res.redirect("/");
  });
});

// Middleware
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
