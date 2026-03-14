import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 8001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'scanner-service' });
});

app.listen(PORT, () => {
  console.log(`scanner-service listening on port ${PORT}`);
});
