const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserData,
  loginStatus,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/user.controller");

router.get("/logout", logoutUser);
router.get("/getuser", protect, getUserData);
router.get("/loggedin", loginStatus);

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgotpassword", forgotPassword);

router.patch("/updateuser", protect, updateUser);
router.patch("/changepassword", protect, changePassword);

router.put("/resetpassword/:resetToken", resetPassword);

module.exports = router;
