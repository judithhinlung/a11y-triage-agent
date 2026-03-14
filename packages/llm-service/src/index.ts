import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 8003;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'llm-service' });
});

app.listen(PORT, () => {
  console.log(`llm-service listening on port ${PORT}`);
});
