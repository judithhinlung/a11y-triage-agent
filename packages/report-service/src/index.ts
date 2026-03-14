import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 8002;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'report-service' });
});

app.listen(PORT, () => {
  console.log(`report-service listening on port ${PORT}`);
});
