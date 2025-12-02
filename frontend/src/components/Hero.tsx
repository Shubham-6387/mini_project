import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { onAuthState } from '../lib/firebase';
import { type User } from 'firebase/auth';

export function Hero() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthState((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="space-y-6 z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-flex items-center gap-2 bg-amber-100/80 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-300/50"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-amber-900 text-sm">Ancient Ayurvedic Therapy</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-amber-900"
          >
            Professional{" "}
            <motion.span
              className="text-amber-600 inline-block"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundImage: "linear-gradient(90deg, #d97706, #f59e0b, #d97706)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Shirodhara
            </motion.span>
            {" "}Therapy Management
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-amber-800/80 max-w-lg"
          >
            Manage your Shirodhara therapy sessions with real-time monitoring, patient management, and comprehensive session analytics. Designed for professional therapists.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex gap-4"
          >
            {user ? (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(217, 119, 6, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-3 rounded-full shadow-lg font-medium"
              >
                Go to Dashboard
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(217, 119, 6, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-3 rounded-full shadow-lg"
                >
                  Login
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, borderColor: "#d97706" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/register')}
                  className="border-2 border-amber-400 text-amber-800 px-8 py-3 rounded-full backdrop-blur-sm bg-white/50"
                >
                  Register
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50"
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1731597076108-f3bbe268162f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxheXVydmVkaWMlMjBzaGlyb2RoYXJhJTIwdGhlcmFweXxlbnwxfHx8fDE3NjQzOTkwMDN8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Shirodhara Therapy"
              className="w-full h-auto"
            />
          </motion.div>

          {/* Floating oil drops animation */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-amber-400/30 rounded-full blur-sm"
              animate={{
                y: [0, -100],
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
              }}
              transition={{
                duration: 3,
                delay: i * 0.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{
                left: `${20 + i * 15}%`,
                bottom: "10%",
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
