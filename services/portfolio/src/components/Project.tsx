import React from 'react';
import { motion } from 'framer-motion';

const Project: React.FC = () => {
  const features = [
    {
      icon: '⚡',
      title: 'C++20 Scanning Engine',
      description: '16 specialized scanners covering processes, network, kernel modules, SUID/SGID, and compliance'
    },
    {
      icon: '🧠',
      title: 'AI-Powered Analysis',
      description: 'Embedded Mistral-7B with LoRA adapters for local inference—no cloud, no APIs, no drama'
    },
    {
      icon: '🔒',
      title: 'Zero-Trust Security',
      description: 'Capability dropping, seccomp sandboxing, and deterministic JSON outputs'
    },
    {
      icon: '📊',
      title: 'Fleet-Wide Detection',
      description: 'SQLite baselines enable anomaly detection across your infrastructure'
    }
  ];

  const repos = [
    {
      name: 'sys-scan-graph',
      description: 'Main scanning engine and AI intelligence layer',
      url: 'https://github.com/J-mazz/sys-scan-graph',
      tech: ['C++20', 'Python', 'LangGraph', 'Mistral-7B']
    },
    {
      name: 'sys-scan-agent_MLops',
      description: 'ML pipeline for training specialized security models',
      url: 'https://github.com/J-mazz/sys-scan-agent_MLops',
      tech: ['Python', 'TRL', 'Synthetic Data']
    },
    {
      name: 'sys-scan-UI',
      description: 'Native GTK4 dashboard with LangGraph integration',
      url: 'https://github.com/J-mazz/sys-scan-UI',
      tech: ['C++20', 'GTK4', 'Python', 'IPC']
    }
  ];

  return (
    <section id="project" className="py-20 bg-gradient-to-br from-granite-50 to-turquoise-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-granite-800 mb-4">
            Sys-Scan-Graph
          </h2>
          <p className="text-xl text-granite-600 max-w-3xl mx-auto">
            A Linux security analysis platform that combines a high-performance C++ core
            with AI-powered threat reasoning. Because sometimes you need a neural network
            to tell you your server is basically a wide-open barn door. 🚪
          </p>
        </motion.div>

        {/* Main banner and overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-6xl mx-auto mb-16"
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <motion.img
              src="/assets/sys-scan-graph_banner.png"
              alt="Sys-Scan-Graph Banner"
              className="w-full h-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
            <div className="p-8 md:p-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">🛡️</span>
                  <h3 className="text-3xl font-bold text-granite-800">
                    The What and Why
                  </h3>
                </div>
                <p className="text-lg text-granite-700 leading-relaxed mb-6">
                  Sys-scan-graph is what happens when you combine modern C++ with Large Language Models
                  and decide security tools don't have to be boring. It's a hybrid architecture where
                  a blazing-fast C++ core gathers system data while a Python intelligence layer performs
                  cyclical reasoning through LangGraph state machines, guided by industry specific fine-tuning, 
                  and robust heuristics.
                </p>

                <div className="mt-8 mb-6">
                  <h4 className="text-xl font-bold text-granite-800 mb-4">Build, Quality, and Security</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <a href="https://github.com/J-mazz/sys-scan-graph/actions/workflows/ci.yml" target="_blank" rel="noopener noreferrer">
                      <img src="https://github.com/J-mazz/sys-scan-graph/actions/workflows/ci.yml/badge.svg" alt="CI" />
                    </a>
                    <a href="https://github.com/J-mazz/sys-scan-graph/actions/workflows/codeql.yml" target="_blank" rel="noopener noreferrer">
                      <img src="https://github.com/J-mazz/sys-scan-graph/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" />
                    </a>
                    <a href="https://codescene.io/projects/71206" target="_blank" rel="noopener noreferrer">
                      <img src="https://codescene.io/images/analyzed-by-codescene-badge.svg" alt="CodeScene Analysis" />
                    </a>
                    <a href="https://codescene.io/projects/72512" target="_blank" rel="noopener noreferrer">
                      <img src="https://codescene.io/projects/72512/status-badges/average-code-health" alt="CodeScene Code Health" />
                    </a>
                    <img src="https://img.shields.io/badge/coverage-%3E=85%25-brightgreen.svg" alt="Coverage" />
                  </div>
                  <ul className="text-sm text-granite-600 space-y-1 list-disc list-inside">
                    <li>C++: 86% line coverage; Python agent: 83%</li>
                    <li>Sanitizers: ASan/UBSan clean</li>
                    <li>Security: CodeQL passing</li>
                  </ul>
                </div>

                <p className="text-lg text-granite-700 leading-relaxed">
                  Think of it as having a security analyst who never sleeps, never asks for coffee,
                  and works entirely offline. Compliance assessment (PCI DSS, HIPAA, NIST CSF),
                  MITRE ATT&CK mapping, and 32-dimensional process embeddings for novelty detection—all
                  running locally with an embedded model. No cloud. No telemetry. No nonsense.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-t-4 border-turquoise-500"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h4 className="text-lg font-bold text-granite-800 mb-2">{feature.title}</h4>
              <p className="text-granite-600 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Repository cards */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-6xl mx-auto mb-12"
        >
          <h3 className="text-3xl font-bold text-granite-800 mb-8 text-center">
            The Ecosystem
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {repos.map((repo, index) => (
              <motion.a
                key={index}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-8 h-8 text-turquoise-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xl font-bold text-granite-800 mb-2 group-hover:text-turquoise-600 transition-colors">
                      {repo.name}
                    </h4>
                    <p className="text-granite-600 text-sm mb-4">{repo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {repo.tech.map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-turquoise-100 text-turquoise-700 text-xs rounded-full font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Debian contribution callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="max-w-4xl mx-auto bg-gradient-to-r from-granite-800 to-granite-700 rounded-2xl p-8 text-white shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <span className="text-5xl">📦</span>
            <div>
              <h3 className="text-2xl font-bold mb-3">Debian Packaging Journey</h3>
              <p className="text-gray-300 mb-4">
                Submitted sys-scan-graph for official Debian inclusion. Learned the hard way that
                "just ship the code" doesn't fly with Debian mentors. Separated packaging files,
                fixed changelogs, and followed proper procedures.
              </p>
              <p className="text-gray-300 mb-4">
                Progress: Mentors were patient. Feedback was constructive. Package is getting there.
                Debian standards are no joke. 🎯
              </p>
              <motion.a
                href="https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1118151"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-turquoise-500 hover:bg-turquoise-600 px-6 py-3 rounded-lg font-semibold transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>View Bug Report #1118151</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Project;
