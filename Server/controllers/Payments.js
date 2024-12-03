// controllers/Payments.js
const crypto = require("crypto");
const { instance } = require("../config/razorpay"); // Ensure Razorpay instance is configured here
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail, paymentSuccessEmail } = require("../mail/templates/courseEnrollmentEmail");
const CourseProgress = require("../models/CourseProgress");

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user?.id;

  if (!courses || courses.length === 0) {
    return res.status(400).json({ success: false, message: "Please provide Course IDs." });
  }

  let totalAmount = 0;
  for (const courseId of courses) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found." });
      }
      if (course.studentsEnrolled.includes(userId)) {
        return res.status(400).json({ success: false, message: "Already enrolled." });
      }
      totalAmount += course.price;
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  const options = {
    amount: totalAmount * 100,
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  };

  try {
    const paymentResponse = await instance.orders.create(options);
    res.json({ success: true, data: paymentResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: "Order initiation failed." });
  }
};

// Verify the payment
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courses } = req.body;
  const userId = req.user?.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
    return res.status(400).json({ success: false, message: "Payment verification failed." });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    await enrollStudents(courses, userId, res);
    return res.status(200).json({ success: true, message: "Payment verified." });
  }

  return res.status(400).json({ success: false, message: "Invalid signature." });
};

// Send payment success email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;
  const userId = req.user?.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({ success: false, message: "Incomplete payment details." });
  }

  try {
    const enrolledStudent = await User.findById(userId);
    await mailSender(
      enrolledStudent.email,
      "Payment Received",
      paymentSuccessEmail(enrolledStudent.firstName, amount / 100, orderId, paymentId)
    );
    res.status(200).json({ success: true, message: "Email sent successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not send email." });
  }
};

// Enroll students in courses
const enrollStudents = async (courses, userId, res) => {
  for (const courseId of courses) {
    try {
      const course = await Course.findByIdAndUpdate(courseId, { $push: { studentsEnrolled: userId } }, { new: true });
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found." });
      }
      await CourseProgress.create({ courseID: courseId, userId, completedVideos: [] });
      await User.findByIdAndUpdate(userId, { $push: { courses: courseId } }, { new: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Enrollment failed." });
    }
  }
};
