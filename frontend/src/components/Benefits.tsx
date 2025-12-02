import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Sparkles, Moon, Zap, Wind } from "lucide-react";

export function Benefits() {
  const benefits = [
    {
      icon: Moon,
      title: "Better Sleep",
      description: "Improves sleep quality and combats insomnia",
    },
    {
      icon: Zap,
      title: "Stress Relief",
      description: "Reduces anxiety and mental fatigue",
    },
    {
      icon: Wind,
      title: "Enhanced Focus",
      description: "Sharpens concentration and mental clarity",
    },
    {
      icon: Sparkles,
      title: "Rejuvenation",
      description: "Revitalizes the mind, body, and spirit",
    },
  ];

  return (
    <section className="relative py-24 px-6 z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-amber-900 mb-4"
          >
            Benefits of Shirodhara
          </motion.h2>
          <p className="text-amber-800/80 max-w-2xl mx-auto">
            Experience profound healing and transformation through this time-honored Ayurvedic practice.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="bg-gradient-to-br from-white/80 to-amber-50/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg text-center cursor-pointer"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.2,
                }}
                className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <benefit.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-amber-900 mb-2">{benefit.title}</h3>
              <p className="text-amber-800/70 text-sm">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 max-w-4xl mx-auto"
        >
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1760696473939-88db0835c908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxheXVydmVkYSUyMGhlcmJzJTIwbmF0dXJhbHxlbnwxfHx8fDE3NjQzOTkwMDN8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Ayurvedic Herbs"
            className="w-full h-auto"
          />
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-900/90 to-transparent p-12 text-center"
          >
            <h3 className="text-white mb-4">Begin Your Healing Journey</h3>
            <p className="text-amber-100 mb-6 max-w-2xl mx-auto">
              Book your personalized Shirodhara session and discover the transformative power of ancient Ayurvedic wisdom.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 40px rgba(255, 255, 255, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-amber-900 px-10 py-4 rounded-full shadow-xl"
            >
              Schedule Your Session
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
