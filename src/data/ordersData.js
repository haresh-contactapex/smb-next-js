/**
 * Sample order list for the Orders module (All/Pending/Processing/Completed/Cancelled).
 * In a real project this would come from an API — kept as static data here.
 * Shape matches src/components/dashboard/RecentOrdersTable.js's recentOrders so both
 * views stay visually consistent.
 */

export const orders = [
  { id: "#SMB-10504", customer: "Kavya Reddy", initials: "KR", avatarColor: "primary", date: "Aug 26, 2026", products: "1 item", amount: "₹52,000", payment: "Paid", paymentColor: "success", status: "Processing", statusColor: "info" },
  { id: "#SMB-10503", customer: "Arjun Malhotra", initials: "AM", avatarColor: "accent", date: "Aug 26, 2026", products: "2 items", amount: "₹38,400", payment: "Unpaid", paymentColor: "warning", status: "Pending", statusColor: "warning" },
  { id: "#SMB-10502", customer: "Ishita Bose", initials: "IB", avatarColor: "info", date: "Aug 25, 2026", products: "1 item", amount: "₹64,900", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10501", customer: "Karan Kapoor", initials: "KK", avatarColor: "success", date: "Aug 25, 2026", products: "3 items", amount: "₹1,08,200", payment: "Paid", paymentColor: "success", status: "Processing", statusColor: "info" },
  { id: "#SMB-10500", customer: "Meera Iyer", initials: "MI", avatarColor: "error", date: "Aug 25, 2026", products: "1 item", amount: "₹29,750", payment: "Unpaid", paymentColor: "warning", status: "Pending", statusColor: "warning" },
  { id: "#SMB-10499", customer: "Priya Nair", initials: "PN", avatarColor: "primary", date: "Aug 26, 2026", products: "2 items", amount: "₹42,500", payment: "Paid", paymentColor: "success", status: "Processing", statusColor: "info" },
  { id: "#SMB-10498", customer: "Rohan Kulkarni", initials: "RK", avatarColor: "accent", date: "Aug 25, 2026", products: "1 item", amount: "₹28,900", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10497", customer: "Ananya Shah", initials: "AS", avatarColor: "info", date: "Aug 25, 2026", products: "3 items", amount: "₹67,200", payment: "Unpaid", paymentColor: "warning", status: "Pending", statusColor: "warning" },
  { id: "#SMB-10496", customer: "Vikram Mehta", initials: "VM", avatarColor: "success", date: "Aug 24, 2026", products: "1 item", amount: "₹1,12,400", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10495", customer: "Sonal Desai", initials: "SD", avatarColor: "error", date: "Aug 23, 2026", products: "2 items", amount: "₹35,750", payment: "Refunded", paymentColor: "info", status: "Cancelled", statusColor: "error" },
  { id: "#SMB-10494", customer: "Devika Menon", initials: "DM", avatarColor: "primary", date: "Aug 23, 2026", products: "1 item", amount: "₹47,300", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10493", customer: "Aditya Rao", initials: "AR", avatarColor: "accent", date: "Aug 22, 2026", products: "2 items", amount: "₹73,600", payment: "Paid", paymentColor: "success", status: "Processing", statusColor: "info" },
  { id: "#SMB-10492", customer: "Neha Gupta", initials: "NG", avatarColor: "info", date: "Aug 22, 2026", products: "1 item", amount: "₹19,850", payment: "Refunded", paymentColor: "info", status: "Cancelled", statusColor: "error" },
  { id: "#SMB-10491", customer: "Siddharth Joshi", initials: "SJ", avatarColor: "success", date: "Aug 21, 2026", products: "4 items", amount: "₹1,54,000", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10490", customer: "Pooja Varma", initials: "PV", avatarColor: "error", date: "Aug 21, 2026", products: "1 item", amount: "₹31,200", payment: "Unpaid", paymentColor: "warning", status: "Pending", statusColor: "warning" },
  { id: "#SMB-10489", customer: "Rahul Chawla", initials: "RC", avatarColor: "primary", date: "Aug 20, 2026", products: "2 items", amount: "₹58,900", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10488", customer: "Divya Pillai", initials: "DP", avatarColor: "accent", date: "Aug 20, 2026", products: "1 item", amount: "₹22,400", payment: "Paid", paymentColor: "success", status: "Processing", statusColor: "info" },
  { id: "#SMB-10487", customer: "Manish Trivedi", initials: "MT", avatarColor: "info", date: "Aug 19, 2026", products: "3 items", amount: "₹96,700", payment: "Refunded", paymentColor: "info", status: "Cancelled", statusColor: "error" },
  { id: "#SMB-10486", customer: "Sneha Kulkarni", initials: "SK", avatarColor: "success", date: "Aug 19, 2026", products: "1 item", amount: "₹40,000", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10485", customer: "Yash Agarwal", initials: "YA", avatarColor: "error", date: "Aug 18, 2026", products: "2 items", amount: "₹63,500", payment: "Unpaid", paymentColor: "warning", status: "Pending", statusColor: "warning" },
  { id: "#SMB-10484", customer: "Tanvi Bhatt", initials: "TB", avatarColor: "primary", date: "Aug 18, 2026", products: "1 item", amount: "₹27,900", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10483", customer: "Nikhil Saxena", initials: "NS", avatarColor: "accent", date: "Aug 17, 2026", products: "1 item", amount: "₹34,600", payment: "Paid", paymentColor: "success", status: "Processing", statusColor: "info" },
  { id: "#SMB-10482", customer: "Priya Nair", initials: "PN", avatarColor: "primary", date: "Aug 17, 2026", products: "2 items", amount: "₹49,200", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10481", customer: "Rohan Kulkarni", initials: "RK", avatarColor: "accent", date: "Aug 16, 2026", products: "1 item", amount: "₹18,700", payment: "Refunded", paymentColor: "info", status: "Cancelled", statusColor: "error" },
  { id: "#SMB-10480", customer: "Ananya Shah", initials: "AS", avatarColor: "info", date: "Aug 16, 2026", products: "3 items", amount: "₹81,400", payment: "Paid", paymentColor: "success", status: "Completed", statusColor: "success" },
  { id: "#SMB-10479", customer: "Vikram Mehta", initials: "VM", avatarColor: "success", date: "Aug 15, 2026", products: "1 item", amount: "₹1,03,000", payment: "Unpaid", paymentColor: "warning", status: "Pending", statusColor: "warning" },
];
