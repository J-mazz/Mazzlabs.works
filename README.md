# Mazzlabs.works

> Personal infrastructure monorepo for Joseph Mazzini's services

This repository contains all services and infrastructure components for the Mazzlabs ecosystem.

## Services

### 📧 [Mail Server](./services/mail-server)
Custom SMTP/IMAP mail server for @mazzlabs.works email addresses.

- **Tech Stack:** Node.js, SMTP, IMAP
- **Status:** Active
- **Docs:** [services/mail-server/README.md](./services/mail-server/README.md)

### 🌐 [Portfolio](./services/portfolio)
Professional portfolio website showcasing full-stack development projects.

- **Tech Stack:** React 18, Tailwind CSS, TypeScript
- **Status:** Active
- **Live:** [mazzlabs.works](https://mazzlabs.works)
- **Docs:** [services/portfolio/README.md](./services/portfolio/README.md)

## Repository Structure

```
Mazzlabs.works/
├── services/           # Individual service directories
│   ├── mail-server/    # Email server
│   └── portfolio/      # Portfolio website
├── infrastructure/     # Shared deployment configs (future)
├── docs/              # Cross-service documentation (future)
└── README.md          # This file
```

## Quick Start

Each service is self-contained with its own dependencies and documentation. Navigate to the specific service directory for setup instructions.

```bash
# Mail Server
cd services/mail-server
npm install

# Portfolio
cd services/portfolio
npm install
npm start
```

## Development Philosophy

- **Service Independence**: Each service can be developed and deployed independently
- **Shared Infrastructure**: Common deployment patterns and configurations stored in infrastructure/
- **Clear Boundaries**: No code sharing between services unless explicitly documented

## Contact

**Joseph Mazzini**
📧 joseph@mazzlabs.works
💼 [LinkedIn](https://www.linkedin.com/in/joseph-mazzini-357b62348/)
🔗 [GitHub](https://github.com/Mazzlabs)

---

*Personal infrastructure demonstrating modern DevOps practices, service architecture, and full-stack development capabilities.*
