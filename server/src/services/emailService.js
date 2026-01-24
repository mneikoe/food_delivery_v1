const supabase = require("../config/supabase");

class EmailService {
  async sendOtpEmail(email, otp) {
    try {
      // Use Supabase's email function or direct email sending
      // For now, we'll use Supabase's admin API to send email
      // Note: This requires Supabase email templates or we can use a service like nodemailer
      
      // Log OTP for development (remove in production)
      console.log(`OTP for ${email}: ${otp}`);
      
      // If you have Supabase email configured, you can use:
      // const { data, error } = await supabase.functions.invoke('send-email', {
      //   body: { email, otp }
      // });
      
      // For now, return success (in production, implement actual email sending)
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      throw new Error("Failed to send email");
    }
  }
}

module.exports = new EmailService();
