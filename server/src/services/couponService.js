const Coupon = require("../models/Coupon");

class CouponService {
  async validateCoupon(code, orderAmount) {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: null }],
    });

    if (!coupon) {
      throw new Error("Invalid or expired coupon");
    }

    if (orderAmount < coupon.minOrderValue) {
      throw new Error(`Minimum order value is ₹${coupon.minOrderValue}`);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Coupon usage limit reached");
    }

    let discount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    if (discount > orderAmount) {
      discount = orderAmount;
    }

    return {
      valid: true,
      code: coupon.code,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      finalAmount: orderAmount - discount,
    };
  }

  async applyCoupon(orderId, couponCode) {
    const Order = require("../models/Order");
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    const validation = await this.validateCoupon(couponCode, order.subtotal);

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Update coupon usage count
    await Coupon.findOneAndUpdate(
      { code: couponCode.toUpperCase() },
      { $inc: { usedCount: 1 } }
    );

    // Update order with discount
    order.couponCode = couponCode;
    order.discount = validation.discount;
    order.totalAmount =
      order.subtotal + order.deliveryFee - validation.discount;

    await order.save();

    return {
      success: true,
      discount: validation.discount,
      finalAmount: order.totalAmount,
    };
  }
}

module.exports = new CouponService();
