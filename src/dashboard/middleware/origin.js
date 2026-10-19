function createOriginCheck(port) {
  const origins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    'http://127.0.0.1:5173',
    'http://localhost:5173',
  ]);
  if (process.env.HELLBOT_DASHBOARD_ORIGIN) {
    origins.add(new URL(process.env.HELLBOT_DASHBOARD_ORIGIN).origin);
  }

  return (request, response, next) => {
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (
      mutation &&
      (!origins.has(request.get('origin')) || request.get('x-hellbot-request') !== 'dashboard')
    ) {
      return response.status(403).json({ error: 'Request origin is not allowed.' });
    }
    next();
  };
}

module.exports = { createOriginCheck };
