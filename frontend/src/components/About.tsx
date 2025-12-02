import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Leaf, Heart, Brain } from "lucide-react";

export function About() {
  const features = [
    {
      icon: Brain,
      title: "Mental Clarity",
      description: "Calms the nervous system and promotes deep relaxation",
    },
    {
      icon: Heart,
      title: "Emotional Balance",
      description: "Releases stress and restores inner peace",
    },
    {
      icon: Leaf,
      title: "Natural Healing",
      description: "Uses pure Ayurvedic oils and traditional techniques",
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
            What is Shirodhara?
          </motion.h2>
          <p className="text-amber-800/80 max-w-2xl mx-auto">
            A deeply therapeutic practice where warm, herbal-infused oil flows in a continuous stream across the forehead, activating the body's natural healing response.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl overflow-hidden shadow-xl border-4 border-white/50"
            >
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1667061481921-b31e615ae740?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGF0aW9uJTIwc3BhJTIwd2VsbG5lc3N8ZW58MXx8fHwxNzY0Mzk5MDAzfDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Meditation and Wellness"
                className="w-full h-auto"
              />
            </motion.div>
            
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-xl"
            />
          </motion.div>

          <div className="grid gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ scale: 1.05, x: 10 }}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50 shadow-lg cursor-pointer"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4"
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-amber-900 mb-2">{feature.title}</h3>
                <p className="text-amber-800/70">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
