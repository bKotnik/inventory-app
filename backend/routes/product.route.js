const express = require("express");
const { createProduct } = require("../controllers/product.controller");
const protect = require("../middleware/auth.middleware");
const router = express.Router();

router.post("/", protect, createProduct);

module.exports = router;