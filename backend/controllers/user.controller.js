const asyncHandler = require("express-async-handler");
const User = require("../models/user.model");
const Token = require("../models/token.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("../utils/emailService");

// Registration
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters long");
  }

  // check if email already exists
  const exists = await User.findOne({ email });

  if (exists) {
    throw new Error("User with that email already exists");
  }

  // create new user
  const user = await User.create({
    name,
    email,
    password,
  });

  // generate token
  const token = generateToken(user._id);

  // send http-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, name, email, photo, phone, bio } = user;
    res.status(201).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// Login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please enter email and password");
  }

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, Please sign up");
  }

  // Check if password is correct
  const passwordIsCorrect = await bcrypt.compare(password, user.password);
  if (passwordIsCorrect) {
    // generate token
    const token = generateToken(user._id);

    // send http-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });
    const { _id, name, email, photo, phone, bio } = user;
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
      token
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

// Logout
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });

  return res.status(200).json({ message: "Successfully logged out." });
});

const getUserData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { _id, name, email, photo, phone, bio } = user;
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json(false);
  }

  // Verify token
  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }

  return res.json(false);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { name, email, photo, phone, bio } = user;
    user.email = email;
    user.name = req.body.name || name;
    user.photo = req.body.photo || photo;
    user.phone = req.body.phone || phone;
    user.bio = req.body.bio || bio;

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      photo: updatedUser.photo,
      phone: updatedUser.phone,
      bio: updatedUser.bio
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(400);
    throw new Error("User not found. Please login or sign up.");
  }

  const { oldPassword, newPassword } = req.body;

  // Validation
  if (!oldPassword || !newPassword) {
    res.status(400);
    throw new Error("Please enter old and new password");
  }

  // Check if old password is correct
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // update password
  if (passwordIsCorrect) {
    user.password = newPassword;
    await user.save();
    res.status(200).send("Password changed successfully");
  } else {
    res.status(400);
    throw new Error("Passwords do not match");
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({email});

  if (!user) {
    res.status(404);
    throw new Error("User does not exist");
  }

  // Delete token if it already exists in DB - to create a fresh one
  let token = await Token.findOne({userId: user._id});
  if (token) {
    await token.deleteOne();
  }

  // Create reset token
  let resetToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(resetToken);

  // Hash token before saving to DB
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Save token to DB
  await new Token({
    userId: user._id,
    token: hashedToken,
    createdAt: Date.now(),
    expiresIn: Date.now() + 30 * (60 * 1000) // 30 minutes
  }).save();

  // Construct Reset URL
  const resetUrl = `${process.env.CLIENT_URL}/resetpassword/${resetToken}`;

  // Reset email
  const message = `
    <h2>Hello ${user.name}</h2>
    <p>Please use the url below to reset your password</p>
    <p>This reset link is valid for 30 minutes.</p>
    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
    <p>Kind regards, </p>
    <p>Kekec</p>
  `
  const subject = "Password Reset Request";
  const to = user.email;
  const from = process.env.EMAIL_USER;
  
  try {
    await sendEmail(subject, message, from, to);
    res.status(200).json({success: true, message: "Reset email sent"})
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again.");
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const { resetToken } = req.params;

  // Try and find the token in the database
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const userToken = await Token.findOne({
    token: hashedToken,
    expiresIn: {$gt: Date.now()}
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or expired token.");
  }

  // Find user and update password
  const user = await User.findOne({_id: userToken.userId});
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    message: "Password reset successfully, please log in."
  });
});

//#region Private Methods
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};
//#endregion

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserData,
  loginStatus,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword
};
