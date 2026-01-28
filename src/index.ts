import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

import antenneRoutes from './routes/antenne.routes';
import { connectRabbitMQ, closeRabbitMQ } from './services/rabbitmq.service';
import { initDatabase } from './config/database';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares de sécurité et parsing
app.use(helmet());

// Configuration CORS
const corsOrigins = process.env.CORS_ORIGINS;
app.use(cors({
  origin: corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'konitys-api-antennes',
    timestamp: new Date().toISOString(),
  });
});

// Routes API
app.use('/api/antennes', antenneRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
  });
});

// Gestion des erreurs globales
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
  });
});

// Démarrage du serveur
async function start() {
  try {
    // Initialiser la base de données
    await initDatabase();

    // Connexion à RabbitMQ
    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`🚀 API Antennes running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api/antennes`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closeRabbitMQ();
  process.exit(0);
});

start();
