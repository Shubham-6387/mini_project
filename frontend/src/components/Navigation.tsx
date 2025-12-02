import { motion } from "motion/react";
import { Droplet } from "lucide-react";
import { Link } from "react-router-dom";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function Navigation() {
  const navItemClass = "text-amber-800 hover:text-amber-600 transition-colors cursor-pointer text-base font-medium";

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-amber-200/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <Droplet className="w-8 h-8 text-amber-600" />
            <span className="text-amber-900 font-bold text-xl">ShiroPulse</span>
          </motion.div>
        </Link>

        <div className="flex gap-8 items-center">
          {/* Home Button */}
          <Link to="/" className={navItemClass}>
            Home
          </Link>

          {/* About Button - Dialog */}
          <Dialog>
            <DialogTrigger className={navItemClass}>About</DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-amber-50 border-amber-200">
              <DialogHeader>
                <DialogTitle className="text-2xl text-amber-900">About Shirodhara</DialogTitle>
                <DialogDescription className="text-amber-700">
                  An ancient Ayurvedic healing therapy
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-amber-900/80">
                <p>
                  <strong>Shirodhara</strong> comes from the Sanskrit words <em>shiro</em> (head) and <em>dhara</em> (flow). It is an Ayurvedic healing technique that involves having someone pour liquid—usually oil, milk, buttermilk, or water—onto your forehead.
                </p>
                <p>
                  It is often combined with a body, scalp, or head massage. Shirodhara is said to have relaxing, soothing, and calming effects on the body and mind.
                </p>
                <p>
                  Research suggests that Shirodhara may help with insomnia, stress, anxiety, and improving sleep quality.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Therapy Button - Hover Card */}
          <HoverCard>
            <HoverCardTrigger className={navItemClass}>Therapy</HoverCardTrigger>
            <HoverCardContent className="w-64 bg-white border-amber-200">
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-900">Shirodhara Therapies</h4>
                <div className="grid gap-2">
                  <div className="p-2 hover:bg-amber-50 rounded-md cursor-pointer transition-colors">
                    <div className="font-medium text-amber-800">Taila Dhara</div>
                    <div className="text-xs text-gray-500">Warm herbal oil for stress & nervous system</div>
                  </div>
                  <div className="p-2 hover:bg-amber-50 rounded-md cursor-pointer transition-colors">
                    <div className="font-medium text-amber-800">Ksheera Dhara</div>
                    <div className="text-xs text-gray-500">Medicated milk for cooling & mental fatigue</div>
                  </div>
                  <div className="p-2 hover:bg-amber-50 rounded-md cursor-pointer transition-colors">
                    <div className="font-medium text-amber-800">Takra Dhara</div>
                    <div className="text-xs text-gray-500">Medicated buttermilk for insomnia & skin</div>
                  </div>
                  <div className="p-2 hover:bg-amber-50 rounded-md cursor-pointer transition-colors">
                    <div className="font-medium text-amber-800">Jala Dhara</div>
                    <div className="text-xs text-gray-500">Cool water for pitta imbalance & heat</div>
                  </div>
                  <div className="p-2 hover:bg-amber-50 rounded-md cursor-pointer transition-colors">
                    <div className="font-medium text-amber-800">Kwatha Dhara</div>
                    <div className="text-xs text-gray-500">Herbal decoction for therapeutic cleansing</div>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Contact Button - Dialog */}
          <Dialog>
            <DialogTrigger className={navItemClass}>Contact</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white border-amber-200">
              <DialogHeader>
                <DialogTitle className="text-2xl text-amber-900">Contact Us</DialogTitle>
                <DialogDescription>
                  Get in touch with our wellness center
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold text-amber-900 text-right">Email:</span>
                  <span className="col-span-3 text-gray-600">contact@shiropulse.com</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold text-amber-900 text-right">Phone:</span>
                  <span className="col-span-3 text-gray-600">+1 (555) 123-4567</span>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="font-bold text-amber-900 text-right mt-1">Address:</span>
                  <span className="col-span-3 text-gray-600">
                    123 Wellness Way<br />
                    Ayurveda City, AC 12345
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.nav>
  );
}
