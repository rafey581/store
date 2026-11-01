// PM2 process file. Start with:  pm2 start deploy/ec2/ecosystem.config.cjs
// Next.js reads the .env file in the project folder automatically.
module.exports = {
  apps: [
    {
      name: "store",
      cwd: __dirname + "/../..",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000", // only nginx can reach the app
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "900M",
      env: { NODE_ENV: "production" },
      out_file: "/var/log/store/out.log",
      error_file: "/var/log/store/error.log",
      time: true,
    },
  ],
};
