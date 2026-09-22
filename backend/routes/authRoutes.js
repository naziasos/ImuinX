const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const OTP = require("../models/OTP");
const { sendOTPEmail } = require("../utils/email");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    message: "Auth route is working!",
  });
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create citizen account
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "citizen",
      emailVerified: false,
    });


    // Generate 6-digit OTP
const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

// OTP expires in 10 minutes
const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

// Save OTP
await OTP.create({
  email,
  otp: otpCode,
  purpose: "registration",
  expiresAt,
});

// Send OTP email
await sendOTPEmail(email, otpCode, "registration");

    res.status(201).json({
  message: "Registration successful. OTP sent to your email.",
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  },
});
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});



router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: "registration",
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.emailVerified = true;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    res.status(500).json({
      message: "Server error during email verification",
    });
  }
});










router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        clinicId: user.clinicId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error during login",
    });
  }
});


router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    // Don't reveal whether the email is registered
    if (!user) {
      return res.json({
        message: "If that email is registered, a reset OTP has been sent.",
      });
    }

    // Remove any previous forgot-password OTPs for this email
    await OTP.deleteMany({ email, purpose: "forgot-password" });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.create({
      email,
      otp: otpCode,
      purpose: "forgot-password",
      expiresAt,
    });

    await sendOTPEmail(email, otpCode, "forgot-password");

    res.json({
      message: "If that email is registered, a reset OTP has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    res.status(500).json({
      message: "Server error while requesting password reset",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: "forgot-password",
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    res.status(500).json({
      message: "Server error during password reset",
    });
  }
});




router.post("/create-admin", async (req, res) => {
  try {
    const { name, email, password, setupKey } = req.body;

    // Check required fields
    if (!name || !email || !password || !setupKey) {
      return res.status(400).json({
        message: "Name, email, password and setup key are required",
      });
    }

    // Check setup key
    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({
        message: "Invalid admin setup key",
      });
    }

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      return res.status(409).json({
        message: "Admin already exists",
      });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      emailVerified: true,
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin creation error:", error.message);

    res.status(500).json({
      message: "Server error during admin creation",
    });
  }
});












module.exports = router;

