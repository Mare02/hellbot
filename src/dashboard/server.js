const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const dashboardDist = path.resolve(__dirname, '../../dashboard/dist');
const indexPath = path.join(dashboardDist, 'index.html');
const port = Number(process.env.DASHBOARD_PORT || 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DASHBOARD_PORT must be an integer between 1 and 65535.');
}

if (!fs.existsSync(indexPath)) {
  throw new Error('Dashboard build is missing. Run npm run dashboard:build first.');
}

app.use(express.static(dashboardDist));
app.get('/', (request, response) => response.sendFile(indexPath));

app.listen(port, '127.0.0.1', error => {
  if (error) throw error;
  console.log(`Hellbot dashboard is listening on 127.0.0.1:${port}`);
});
