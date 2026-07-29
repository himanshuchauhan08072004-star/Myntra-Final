const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email, password are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const existinguser = await User.findOne({ email });
    if (existinguser)
      return res.status(409).json({ message: "User already exisits" });
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullName,
      email,
      password: hashedpassword,
    });
    await user.save();
    const { password: _, ...userData } = user.toObject();
    const token = issueToken(user._id);
    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const ismatch = await bcrypt.compare(password, user.password);
    if (!ismatch) return res.status(401).json({ message: "Invalid password" });

    const { password: _, ...userData } = user.toObject();
    const token = issueToken(user._id);
    res.status(200).json({ user: userData, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
module.exports = router;