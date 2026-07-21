// PM2 owns the single long-running MUSE server and pins it to this checkout.
//
//   npm run pm2:start    - start or reconcile the process
//   npm run pm2:restart  - restart after environment changes
//   npm run pm2:logs     - follow server output
//   pm2 save             - persist the process list across PM2 daemon restarts
module.exports = {
  apps: [
    {
      name: "muse",
      script: "scripts/start-muse-server.mjs",
      cwd: __dirname,
      env: {
        HOST: "127.0.0.1",
        PORT: "4175",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 1000,
      max_restarts: 50,
      watch: false,
    },
  ],
};
