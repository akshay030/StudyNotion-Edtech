import { toast } from "react-hot-toast";
import { studentEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import rzpLogo from "../../assets/Logo/rzp_logo.png";
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart } from "../../slices/cartSlice";

// Destructure the API endpoints
const { COURSE_PAYMENT_API, COURSE_VERIFY_API, SEND_PAYMENT_SUCCESS_EMAIL_API } = studentEndpoints;

// Function to load the Razorpay SDK script dynamically
function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

// Main function to handle course payment
export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
  const toastId = toast.loading("Loading...");
  try {
      // Load Razorpay script
      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

      if (!res) {
          toast.error("RazorPay SDK failed to load");
          return;
      }

      // Initiate the order
      const orderResponse = await apiConnector("POST", COURSE_PAYMENT_API, { courses }, {
          Authorization: `Bearer ${token}`,
      });

      // Log the full orderResponse to inspect its structure
      console.log("Full order response:", orderResponse);

      // Check if orderResponse.data exists and contains the necessary fields
      if (!orderResponse.data || !orderResponse.data.data) {
          throw new Error("Order response is missing necessary data.");
      }

      // Destructure message from orderResponse.data.data
      const message = orderResponse.data.data;

      // Log the message object to check its properties
      console.log("Message data:", message);

      // Ensure 'currency', 'amount', and 'id' are available
      if (!message.currency || !message.amount || !message.id) {
          throw new Error("Order response is missing required fields: currency, amount, or id.");
      }

      // Convert amount to paise (smallest currency unit) if necessary
      const amountInPaise = message.amount * 100; // Assuming amount is in rupees, Razorpay needs it in paise.

      // Options for Razorpay
      const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY,
          currency: message.currency || "INR", // Default to INR if currency is missing
          amount: amountInPaise.toString(),  // Razorpay expects amount in paise as a string
          order_id: message.id,
          name: "StudyNotion",
          description: "Thank You for Purchasing the Course",
          image: rzpLogo,
          prefill: {
              name: `${userDetails.firstName}`,
              email: userDetails.email,
          },
          handler: function(response) {
              sendPaymentSuccessEmail(response, message.amount, token);
              verifyPayment({ ...response, courses }, token, navigate, dispatch);
          },
      };

      // Ensure Razorpay object is available before calling it
      if (typeof window.Razorpay === "undefined") {
          throw new Error("Razorpay SDK is not available.");
      }

      // Open Razorpay payment window
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

      // Handle failed payment
      paymentObject.on("payment.failed", function(response) {
          toast.error("Oops, payment failed");
          console.log(response.error);
      });

  } catch (error) {
      console.log("PAYMENT API ERROR.....", error);
      toast.error(`Could not make Payment: ${error.message}`);
  }

  toast.dismiss(toastId);
}


// Function to send success email after a successful payment
async function sendPaymentSuccessEmail(response, amount, token) {
  try {
    await apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, {
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      amount,
    }, {
      Authorization: `Bearer ${token}`,
    });
  } catch (error) {
    console.error("PAYMENT SUCCESS EMAIL ERROR:", error);
  }
}

// Function to verify payment after successful transaction
async function verifyPayment(bodyData, token, navigate, dispatch) {
  const toastId = toast.loading("Verifying Payment....");
  dispatch(setPaymentLoading(true));

  try {
    const response = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Payment verification failed");
    }

    toast.success("Payment successful, you're added to the course");
    navigate("/dashboard/enrolled-courses");
    dispatch(resetCart());
  } catch (error) {
    console.error("PAYMENT VERIFY ERROR:", error);
    toast.error("Could not verify Payment");
  }

  toast.dismiss(toastId);
  dispatch(setPaymentLoading(false));
}
