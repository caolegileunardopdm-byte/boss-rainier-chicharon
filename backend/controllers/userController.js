const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../services/emailService");

// ==================== REGISTER ====================
exports.register = async (req, res) => {
  try {
    const { full_name, email, username, password, phone, address, role } =
      req.body;

    // Check kung existing na ang email o username
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email or username already exists",
      });
    }

    // Hash ang password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Gumawa ng bagong user (unverified)
    const user = await User.create({
      full_name,
      email,
      username,
      password: hashedPassword,
      phone,
      address,
      role: role || "customer",
      isVerified: false,
      otpCode: otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send OTP via email
    await sendOtpEmail(email, otp, "registration");

    // Huwag i-return ang password
    const userResponse = {
      _id: user._id,
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
      address: user.address,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      data: userResponse,
      message: "Account created. Check terminal for OTP code.",
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
// ==================== LOGIN ====================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hanapin ang user sa email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // I-compare ang password
    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // ==================== CHECK VERIFICATION ====================
    // Bypass verification for admin and staff
    if (user.role === "customer" && !user.isVerified) {
      return res.status(403).json({
        success: false,
        error: "Account not verified. Please verify your email with OTP.",
        needsVerification: true,
        email: user.email,
      });
    }
    // ============================================================

    // Gumawa ng JWT token
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          full_name: user.full_name,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET ALL USERS (Admin only) ====================
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== GET SINGLE USER ====================
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== UPDATE USER ====================
exports.updateUser = async (req, res) => {
  try {
    // Huwag i-update ang password dito (may separate endpoint)
    const { password, ...updates } = req.body;

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ==================== DELETE USER ====================
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Email not registered",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to user (expires in 10 minutes)
    user.resetOtpCode = otp;
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Print OTP to console (for demo purposes)
    // Send OTP via email
    await sendOtpEmail(email, otp, "reset");
    res.json({
      success: true,
      message: "OTP sent to your email. Check your inbox.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== VERIFY RESET OTP ====================
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Email not registered",
      });
    }

    if (!user.resetOtpCode || user.resetOtpCode !== otp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP code",
      });
    }

    if (new Date() > user.resetOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one.",
      });
    }

    res.json({
      success: true,
      message: "OTP verified. You can now reset your password.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== RESET PASSWORD ====================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Email not registered",
      });
    }

    if (!user.resetOtpCode || user.resetOtpCode !== otp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP code",
      });
    }

    if (new Date() > user.resetOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one.",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetOtpCode = null;
    user.resetOtpExpiresAt = null;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== VERIFY REGISTRATION OTP ====================
exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Email not registered",
      });
    }

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP code",
      });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one.",
      });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({
      success: true,
      message: "Account verified successfully!",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== RESEND OTP ====================
exports.resendOtp = async (req, res) => {
  try {
    const { email, type } = req.body; // type: 'register' or 'reset'

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Email not registered",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (type === "register") {
      user.otpCode = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    } else {
      user.resetOtpCode = otp;
      user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }

    await user.save();

    // Send new OTP via email
    await sendOtpEmail(email, otp, type);
    res.json({
      success: true,
      message: "New OTP sent. Check your inbox.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
