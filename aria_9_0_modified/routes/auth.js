// routes/auth.js

const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// -------------------- AUTH MIDDLEWARE --------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// -------------------- REGISTER --------------------
router.post("/register", async (req, res) => {
  try {
    console.log("Register attempt:", req.body);
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    // Password validation
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push("8+ characters");
    if (!/[a-z]/.test(password)) passwordErrors.push("lowercase letter");
    if (!/[A-Z]/.test(password)) passwordErrors.push("uppercase letter");
    if (!/\d/.test(password)) passwordErrors.push("number");

    if (passwordErrors.length > 0) {
      console.log("Password validation failed:", passwordErrors);
      return res.status(400).json({
        error: `Password must include: ${passwordErrors.join(", ")}`,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();
    console.log("Normalized email:", normalizedEmail);

    const existingUser = await User.findOne({ email: normalizedEmail });
    console.log("Existing user:", !!existingUser);
    if (existingUser)
      return res.status(409).json({ error: "Email already registered" });

    console.log("Creating user...");
    const user = new User({
      email: normalizedEmail,
      password: trimmedPassword, // will be hashed in model
    });

    console.log("Saving user...");
    await user.save();
    console.log("User saved, id:", user._id);

    console.log("Generating token...");
    const token = jwt.sign(
      { id: user._id, email: normalizedEmail },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    console.log("Token generated, sending response...");

    res.json({ token, email: normalizedEmail });
  } catch (err) {
    console.error("Registration error:", err);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    if (err.code === 11000)
      return res.status(409).json({ error: "Email already exists" });

    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- LOGIN --------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await user.comparePassword(trimmedPassword);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: normalizedEmail },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ token, email: normalizedEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- CHANGE PASSWORD --------------------
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Basic validation
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Both current and new password are required" });
    }

    // Validate new password strength (same rules as registration)
    const passwordErrors = [];
    if (newPassword.length < 8) passwordErrors.push("8+ characters");
    if (!/[a-z]/.test(newPassword)) passwordErrors.push("lowercase letter");
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push("uppercase letter");
    if (!/\d/.test(newPassword)) passwordErrors.push("number");

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: `New password must include: ${passwordErrors.join(", ")}`,
      });
    }

    // Get user from database
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ error: "Current password is incorrect" });

    // Hash new password and update
    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// -------------------- GET CURRENT USER --------------------
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
