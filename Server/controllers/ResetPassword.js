const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

exports.resetPasswordToken = async (req, res) => {
	try {
	  const { email } = req.body;
  
	  // Check if the user exists
	  const user = await User.findOne({ email });
	  if (!user) {
		return res.status(404).json({
		  success: false,
		  message: `This Email: ${email} is not registered with us.`,
		});
	  }
  
	  // Generate a secure token
	  const token = crypto.randomBytes(32).toString("hex");
  
	  // Update the user with the token and expiry time
	  user.token = crypto.createHash("sha256").update(token).digest("hex"); // Hash the token for security
	  user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
	  await user.save();
  
	  // Send the password reset email
	  const resetUrl = `${process.env.FRONTEND_URL}/update-password/${token}`;
	  await mailSender(
		email,
		"Password Reset",
		`Click the following link to reset your password: ${resetUrl}. This link is valid for 1 hour.`
	  );
  
	  return res.status(200).json({
		success: true,
		message: "Password reset email sent successfully.",
	  });
	} catch (error) {
	  return res.status(500).json({
		success: false,
		message: "Error sending password reset email.",
		error: error.message,
	  });
	}
  };
  

  exports.resetPassword = async (req, res) => {
	try {
	  const { token, password, confirmPassword } = req.body;
  
	  // Validate passwords
	  if (password !== confirmPassword) {
		return res.status(400).json({
		  success: false,
		  message: "Password and Confirm Password do not match.",
		});
	  }
  
	  // Hash the token and find the user
	  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
	  const user = await User.findOne({
		token: hashedToken,
		resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
	  });
  
	  if (!user) {
		return res.status(400).json({
		  success: false,
		  message: "Invalid or expired token.",
		});
	  }
  
	  // Update the user's password and clear the token
	  user.password = await bcrypt.hash(password, 10);
	  user.token = undefined;
	  user.resetPasswordExpires = undefined;
	  await user.save();
  
	  return res.status(200).json({
		success: true,
		message: "Password reset successful.",
	  });
	} catch (error) {
	  return res.status(500).json({
		success: false,
		message: "Error resetting password.",
		error: error.message,
	  });
	}
  };
  