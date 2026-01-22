/**
 * HarperDB Custom Function: Authentication
 * Handles user registration, login, and JWT token generation
 * 
 * This function is auto-deployed by HarperDB when placed in custom_functions folder
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

module.exports = async (req, res) => {
  const { operation, data } = req.body;

  try {
    switch (operation) {
      case "register":
        return await registerUser(data);
      case "login":
        return await loginUser(data);
      case "verify_token":
        return await verifyToken(data.token);
      default:
        return res.status(400).json({ error: "Invalid operation" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

async function registerUser(data) {
  const { email, password, username } = data;

  if (!email || !password || !username) {
    throw new Error("Missing required fields");
  }

  // Use HarperDB's built-in client (available in custom functions context)
  const existingUser = await harperdb.searchByValue(
    "pylomarket",
    "users",
    "email",
    email,
    ["id"]
  );

  if (existingUser && existingUser.length > 0) {
    throw new Error("User already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const user = {
    id: userId,
    email,
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await harperdb.insert("pylomarket", "users", [user]);

  // Create initial balance
  await harperdb.insert("pylomarket", "balances", [
    {
      id: `balance_${userId}`,
      user_id: userId,
      balance: 0,
      currency: "USD",
      updated_at: new Date().toISOString(),
    },
  ]);

  // Generate token
  const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });

  return res.json({
    success: true,
    user: { id: userId, email, username },
    token,
  });
}

async function loginUser(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error("Missing email or password");
  }

  // Find user
  const users = await harperdb.searchByValue(
    "pylomarket",
    "users",
    "email",
    email,
    ["id", "email", "username", "password_hash"]
  );

  if (!users || users.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = users[0];

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Generate token
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return res.json({
    success: true,
    user: { id: user.id, email: user.email, username: user.username },
    token,
  });
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, user: decoded });
  } catch (error) {
    return res.json({ valid: false, error: error.message });
  }
}
