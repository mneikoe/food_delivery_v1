declare module 'react-native-razorpay' {
  export interface RazorpayPrefill {
    email?: string;
    contact?: string;
    name?: string;
  }

  export interface RazorpayTheme {
    color?: string;
  }

  export interface RazorpayOptions {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: number;
    name: string;
    order_id: string;
    prefill?: RazorpayPrefill;
    theme?: RazorpayTheme;
  }

  export default class RazorpayCheckout {
    static open(options: RazorpayOptions): Promise<{
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }>;
  }
}
