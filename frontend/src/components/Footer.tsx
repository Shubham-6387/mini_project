import { motion } from "motion/react";
import { Droplet, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube, Send } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log("Subscribing:", email);
    setEmail("");
  };

  const quickLinks = [
    { name: "Home", href: "#home" },
    { name: "About Us", href: "#about" },
    { name: "Services", href: "#services" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
  ];

  const services = [
    { name: "Shirodhara Therapy", href: "#" },
    { name: "Ayurvedic Massage", href: "#" },
    { name: "Wellness Consultation", href: "#" },
    { name: "Herbal Treatments", href: "#" },
    { name: "Meditation Sessions", href: "#" },
    { name: "Gift Certificates", href: "#" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-amber-900 via-orange-900 to-amber-800 text-amber-50 pt-20 pb-8 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 border border-amber-300 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand and About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Droplet className="w-8 h-8 text-amber-300" />
              </motion.div>
              <span className="text-white">ShiroPulse</span>
            </div>
            <p className="text-amber-200 mb-6 leading-relaxed">
              Experience the ancient wisdom of Ayurveda through our authentic Shirodhara therapy. Restore balance, find peace, and rejuvenate your spirit.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.2, y: -3 }}
                  className="w-10 h-10 bg-amber-700/50 rounded-full flex items-center justify-center hover:bg-amber-600 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-white mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <motion.a
                    href={link.href}
                    whileHover={{ x: 5, color: "#fcd34d" }}
                    className="text-amber-200 hover:text-amber-300 transition-colors inline-block"
                  >
                    {link.name}
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-white mb-6">Our Services</h3>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <motion.li
                  key={service.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <motion.a
                    href={service.href}
                    whileHover={{ x: 5, color: "#fcd34d" }}
                    className="text-amber-200 hover:text-amber-300 transition-colors inline-block"
                  >
                    {service.name}
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact and Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-white mb-6">Get in Touch</h3>
            <div className="space-y-4 mb-6">
              <motion.a
                href="tel:+1234567890"
                whileHover={{ x: 5 }}
                className="flex items-center gap-3 text-amber-200 hover:text-amber-300 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>+1 (234) 567-890</span>
              </motion.a>
              <motion.a
                href="mailto:info@shiropulse.com"
                whileHover={{ x: 5 }}
                className="flex items-center gap-3 text-amber-200 hover:text-amber-300 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>info@shiropulse.com</span>
              </motion.a>
              <motion.div
                whileHover={{ x: 5 }}
                className="flex items-start gap-3 text-amber-200"
              >
                <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                <span>123 Wellness Street,<br />Ayurveda Plaza, CA 90210</span>
              </motion.div>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-amber-100 mb-3">Newsletter</h4>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="flex-1 px-4 py-2 bg-amber-800/50 border border-amber-600 rounded-lg text-amber-100 placeholder-amber-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Business Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border-t border-amber-700 pt-8 mb-8"
        >
          <div className="text-center">
            <h4 className="text-amber-100 mb-4">Business Hours</h4>
            <div className="flex flex-wrap justify-center gap-8 text-amber-200">
              <div>
                <span className="text-amber-300">Mon - Fri:</span> 9:00 AM - 7:00 PM
              </div>
              <div>
                <span className="text-amber-300">Saturday:</span> 10:00 AM - 6:00 PM
              </div>
              <div>
                <span className="text-amber-300">Sunday:</span> Closed
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="border-t border-amber-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-amber-300 text-sm"
        >
          <p>© 2025 ShiroPulse. All rights reserved.</p>
          <div className="flex gap-6">
            <motion.a
              href="#"
              whileHover={{ y: -2, color: "#fcd34d" }}
              className="hover:text-amber-200 transition-colors"
            >
              Privacy Policy
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ y: -2, color: "#fcd34d" }}
              className="hover:text-amber-200 transition-colors"
            >
              Terms of Service
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ y: -2, color: "#fcd34d" }}
              className="hover:text-amber-200 transition-colors"
            >
              Cookie Policy
            </motion.a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
