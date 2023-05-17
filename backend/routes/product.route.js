const express = require("express");
const { createProduct } = require("../controllers/product.controller");
const protect = require("../middleware/auth.middleware");
const { uploadService } = require("../utils/fileService");
const router = express.Router();

router.post("/", protect, uploadService.single("image"), createProduct);

module.exports = router;