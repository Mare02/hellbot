module.exports = {
  apps: [
    {
      name: 'hellbot',
      script: 'src/main.js',
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      notify: {
        restart: true,
        update: true,
        error: true,
        success: true,
        message: 'Hellbot has been updated!',
        email: 'marko123obradovic@gmail.com',
      },
    },
  ],
};
