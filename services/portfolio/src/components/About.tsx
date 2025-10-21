import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
  const skills = [
    { category: 'Languages', items: ['C++20', 'Python', 'TypeScript', 'Bash'] },
    { category: 'AI/ML', items: ['LangGraph', 'Mistral-7B', 'LoRA', 'AWS SageMaker'] },
    { category: 'Security', items: ['Seccomp', 'MITRE ATT&CK', 'Compliance', 'Threat Analysis'] },
    { category: 'Tools & Frameworks', items: ['CMake', 'GTK4', 'React', 'SQLite'] },
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-br from-granite-800 to-granite-900 text-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-turquoise-400 to-turquoise-200">
            About Me
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 mb-12 border border-turquoise-500/20"
          >
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl">👨‍💻</span>
              <div>
                <h3 className="text-2xl font-bold mb-4 text-turquoise-400">Joseph Mazzini</h3>
                <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
                  <p>
                    I build open-source security tools because I believe that good security shouldn't
                    require sending your data to someone else's cloud. Or paying a subscription.
                    Or reading 200 pages of documentation just to find out if your server has a rogue process.
                  </p>
                  <p>
                    My work combines modern C++ with AI—not the buzzword kind, but the "actually runs
                    locally and doesn't require an API key" kind. I'm particularly fond of taking complex
                    security problems and making them accessible through clean code and thoughtful architecture.
                  </p>
                  <p>
                    When I'm not wrangling C++20 templates or debugging LangGraph state machines, I'm
                    probably learning the finer points of Debian packaging policy. The hard way. As one does.
                  </p>
                  <p className="text-turquoise-300 font-medium">
                    Currently working on getting sys-scan-graph into Debian's official repositories,
                    contributing to open source, and occasionally remembering to push my commits.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-3xl font-bold mb-8 text-center text-turquoise-400">
              Technical Skills
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {skills.map((skillGroup, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-turquoise-500/20 hover:border-turquoise-500/40 transition-all"
                >
                  <h4 className="text-xl font-bold mb-4 text-turquoise-400">
                    {skillGroup.category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.6 + index * 0.1 + i * 0.05 }}
                        className="px-3 py-1 bg-turquoise-500/20 text-turquoise-300 rounded-full text-sm font-medium border border-turquoise-500/30"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12 text-center"
          >
            <p className="text-xl text-gray-400 italic">
              "Making security tools that don't suck since... well, recently actually." 🚀
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;
