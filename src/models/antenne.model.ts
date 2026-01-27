import pool from '../config/database';
import { Antenne, CreateAntenneDTO, UpdateAntenneDTO, AntenneFilters, PaginationParams } from '../types/antenne';

export class AntenneModel {

  // Récupérer toutes les antennes avec filtres et pagination
  static async findAll(
    filters: AntenneFilters = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: Antenne[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE deleted = false';
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (filters.key) {
      whereClause += ` AND (
        nom ILIKE $${paramIndex} OR
        prenom ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        raison_sociale ILIKE $${paramIndex} OR
        ville ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.key}%`);
      paramIndex++;
    }

    if (filters.etat) {
      whereClause += ` AND etat = $${paramIndex}`;
      params.push(filters.etat);
      paramIndex++;
    }

    if (filters.ville) {
      whereClause += ` AND ville ILIKE $${paramIndex}`;
      params.push(`%${filters.ville}%`);
      paramIndex++;
    }

    if (filters.type_profil_id) {
      whereClause += ` AND type_profil_id = $${paramIndex}`;
      params.push(filters.type_profil_id);
      paramIndex++;
    }

    if (filters.antenne_principale !== undefined) {
      whereClause += ` AND antenne_principale = $${paramIndex}`;
      params.push(filters.antenne_principale);
      paramIndex++;
    }

    if (filters.has_iban) {
      whereClause += ` AND iban IS NOT NULL AND iban != ''`;
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM antennes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get data with pagination
    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT * FROM antennes ${whereClause} ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    return {
      data: result.rows as Antenne[],
      total,
    };
  }

  // Récupérer une antenne par ID
  static async findById(id: number): Promise<Antenne | null> {
    const result = await pool.query(
      'SELECT * FROM antennes WHERE id = $1 AND deleted = false',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Antenne;
  }

  // Créer une nouvelle antenne
  static async create(data: CreateAntenneDTO): Promise<Antenne> {
    const fields = [
      'nom', 'prenom', 'civilite', 'date_naissance', 'tel_portable', 'tel_fixe',
      'email', 'situation_professionnelle', 'adresse', 'adresse_complementaire',
      'cp', 'ville', 'pays', 'pays_id', 'type_statut_id', 'raison_sociale',
      'siret', 'etat', 'type_profil_id', 'antenne_principale', 'bon_savoir',
      'information_facturation', 'iban', 'bic', 'precisions_lieu',
      'preferences_horaires_pickup_retrait', 'preferences_horaires_pickup_retour',
      'not_share_phone_number', 'deleted', 'created_at', 'updated_at'
    ];

    const values = [
      data.nom || null,
      data.prenom,
      data.civilite,
      data.date_naissance || null,
      data.tel_portable || null,
      data.tel_fixe || null,
      data.email || null,
      data.situation_professionnelle || null,
      data.adresse || null,
      data.adresse_complementaire || null,
      data.cp || null,
      data.ville || null,
      data.pays || null,
      data.pays_id || null,
      data.type_statut_id || null,
      data.raison_sociale || null,
      data.siret || null,
      data.etat || 'actif',
      data.type_profil_id || null,
      data.antenne_principale ?? false,
      data.bon_savoir || null,
      data.information_facturation || null,
      data.iban || null,
      data.bic || null,
      data.precisions_lieu || null,
      data.preferences_horaires_pickup_retrait || null,
      data.preferences_horaires_pickup_retour || null,
      data.not_share_phone_number ?? false,
      false, // deleted
      new Date(), // created_at
      new Date(), // updated_at
    ];

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO antennes (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    return result.rows[0] as Antenne;
  }

  // Mettre à jour une antenne
  static async update(id: number, data: UpdateAntenneDTO): Promise<Antenne | null> {
    const existingAntenne = await this.findById(id);
    if (!existingAntenne) return null;

    const updates: string[] = [];
    const values: (string | number | boolean | null | Date)[] = [];
    let paramIndex = 1;

    const fieldMapping: { [key: string]: string } = {
      nom: 'nom',
      prenom: 'prenom',
      civilite: 'civilite',
      date_naissance: 'date_naissance',
      tel_portable: 'tel_portable',
      tel_fixe: 'tel_fixe',
      email: 'email',
      situation_professionnelle: 'situation_professionnelle',
      adresse: 'adresse',
      adresse_complementaire: 'adresse_complementaire',
      cp: 'cp',
      ville: 'ville',
      pays: 'pays',
      pays_id: 'pays_id',
      type_statut_id: 'type_statut_id',
      raison_sociale: 'raison_sociale',
      siret: 'siret',
      etat: 'etat',
      type_profil_id: 'type_profil_id',
      antenne_principale: 'antenne_principale',
      bon_savoir: 'bon_savoir',
      information_facturation: 'information_facturation',
      iban: 'iban',
      bic: 'bic',
      precisions_lieu: 'precisions_lieu',
      preferences_horaires_pickup_retrait: 'preferences_horaires_pickup_retrait',
      preferences_horaires_pickup_retour: 'preferences_horaires_pickup_retour',
      not_share_phone_number: 'not_share_phone_number',
    };

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && fieldMapping[key]) {
        updates.push(`${fieldMapping[key]} = $${paramIndex}`);
        values.push(value as string | number | boolean | null | Date);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return existingAntenne;
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id);

    const result = await pool.query(
      `UPDATE antennes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] as Antenne;
  }

  // Supprimer une antenne (soft delete)
  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE antennes SET deleted = true, updated_at = $1 WHERE id = $2',
      [new Date(), id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Récupérer les antennes par ville
  static async findByVille(ville: string): Promise<Antenne[]> {
    const result = await pool.query(
      'SELECT * FROM antennes WHERE ville ILIKE $1 AND deleted = false',
      [`%${ville}%`]
    );

    return result.rows as Antenne[];
  }

  // Statistiques
  static async getStats(): Promise<{ total: number; actifs: number; inactifs: number; principales: number }> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE etat = 'actif') as actifs,
        COUNT(*) FILTER (WHERE etat = 'inactif') as inactifs,
        COUNT(*) FILTER (WHERE antenne_principale = true) as principales
      FROM antennes
      WHERE deleted = false
    `);

    return {
      total: parseInt(result.rows[0].total),
      actifs: parseInt(result.rows[0].actifs),
      inactifs: parseInt(result.rows[0].inactifs),
      principales: parseInt(result.rows[0].principales),
    };
  }
}
