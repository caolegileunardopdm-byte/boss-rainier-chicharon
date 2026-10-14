const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  verifyRegistrationOtp,
  resendOtp,
} = require("../controllers/userController");

// ==================== AUTH ROUTES ====================
router.post("/register", register);
router.post("/login", login);

// ==================== OTP VERIFICATION ====================
router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/resend-otp", resendOtp);

// ==================== FORGOT PASSWORD ====================
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// ==================== TEMPORARY: VERIFY ALL USERS ====================
// ⚠️ PARA SA TESTING LANG — i-delete pagkatapos gamitin
router.get("/verify-all-users", async (req, res) => {
  try {
    const User = require("../models/User");
    const result = await User.updateMany({}, { $set: { isVerified: true } });
    res.json({
      success: true,
      message: `${result.modifiedCount} users verified successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// ==================================================================

// ==================== USER MANAGEMENT ROUTES ====================
router.get("/", getUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
