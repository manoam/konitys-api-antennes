import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'konitys',
  password: process.env.DB_PASSWORD || 'konitys_dev_2024',
  database: process.env.DB_NAME || 'konitys',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS antennes (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255),
        prenom VARCHAR(255) NOT NULL,
        civilite VARCHAR(50) NOT NULL,
        date_naissance DATE,
        tel_portable VARCHAR(50),
        tel_fixe VARCHAR(50),
        email VARCHAR(255),
        situation_professionnelle VARCHAR(255),
        adresse TEXT,
        adresse_complementaire TEXT,
        cp VARCHAR(20),
        ville VARCHAR(255),
        pays VARCHAR(255),
        pays_id INTEGER,
        type_statut_id INTEGER,
        raison_sociale VARCHAR(255),
        siret VARCHAR(50),
        etat VARCHAR(20) DEFAULT 'actif' CHECK (etat IN ('actif', 'inactif')),
        type_profil_id INTEGER,
        antenne_principale BOOLEAN DEFAULT FALSE,
        bon_savoir TEXT,
        information_facturation TEXT,
        iban VARCHAR(255),
        bic VARCHAR(255),
        precisions_lieu TEXT,
        preferences_horaires_pickup_retrait TEXT,
        preferences_horaires_pickup_retour TEXT,
        not_share_phone_number BOOLEAN DEFAULT FALSE,
        deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_antennes_etat ON antennes(etat)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_antennes_ville ON antennes(ville)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_antennes_deleted ON antennes(deleted)`);

    // Insert default data if table is empty
    const result = await client.query('SELECT COUNT(*) FROM antennes');
    if (parseInt(result.rows[0].count) === 0) {
      console.log('Inserting default data...');
      await client.query(`
        INSERT INTO antennes (civilite, prenom, nom, email, tel_portable, ville, raison_sociale, siret, etat, antenne_principale) VALUES
        ('M.', 'Jean', 'Dupont', 'jean.dupont@example.com', '0612345678', 'Paris', 'Dupont SARL', '12345678901234', 'actif', true),
        ('Mme', 'Marie', 'Martin', 'marie.martin@example.com', '0698765432', 'Lyon', 'Martin & Co', '98765432109876', 'actif', true),
        ('M.', 'Pierre', 'Bernard', 'pierre.bernard@example.com', '0611223344', 'Marseille', NULL, NULL, 'actif', false),
        ('Mme', 'Sophie', 'Petit', 'sophie.petit@example.com', '0655667788', 'Bordeaux', 'Petit Services', '11223344556677', 'inactif', false)
      `);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
