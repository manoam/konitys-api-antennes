import { Request, Response } from 'express';
import { AntenneModel } from '../models/antenne.model';
import { CreateAntenneDTO, UpdateAntenneDTO, AntenneFilters } from '../types/antenne';
import { publishEvent } from '../services/rabbitmq.service';

export class AntenneController {

  // GET /antennes
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: AntenneFilters = {
        key: req.query.key as string,
        etat: req.query.etat as 'actif' | 'inactif' | undefined,
        ville: req.query.ville as string,
        type_profil_id: req.query.type_profil_id ? parseInt(req.query.type_profil_id as string) : undefined,
        antenne_principale: req.query.antenne_principale === 'true' ? true :
                           req.query.antenne_principale === 'false' ? false : undefined,
        has_iban: req.query.has_iban === 'true',
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await AntenneModel.findAll(filters, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      });
    } catch (error) {
      console.error('Error fetching antennes:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des antennes',
      });
    }
  }

  // GET /antennes/stats
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AntenneModel.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
      });
    }
  }

  // GET /antennes/:id
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);

      const antenne = await AntenneModel.findById(id);

      if (!antenne) {
        res.status(404).json({
          success: false,
          error: 'Antenne non trouvée',
        });
        return;
      }

      res.json({
        success: true,
        data: antenne,
      });
    } catch (error) {
      console.error('Error fetching antenne:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'antenne',
      });
    }
  }

  // POST /antennes
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateAntenneDTO = req.body;

      // Validation basique
      if (!data.prenom || !data.civilite) {
        res.status(400).json({
          success: false,
          error: 'prenom et civilite sont obligatoires',
        });
        return;
      }

      const antenne = await AntenneModel.create(data);

      // Publier l'événement sur RabbitMQ
      await publishEvent('antenne.created', {
        id: antenne.id,
        data: antenne,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: antenne,
        message: 'Antenne créée avec succès',
      });
    } catch (error) {
      console.error('Error creating antenne:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de l\'antenne',
      });
    }
  }

  // PUT /antennes/:id
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      const data: UpdateAntenneDTO = req.body;

      const antenne = await AntenneModel.update(id, data);

      if (!antenne) {
        res.status(404).json({
          success: false,
          error: 'Antenne non trouvée',
        });
        return;
      }

      // Publier l'événement de mise à jour sur RabbitMQ
      await publishEvent('antenne.updated', {
        antenneId: antenne.id,
        data: {
          id: antenne.id,
          prenom: antenne.prenom,
          nom: antenne.nom,
          etat: antenne.etat,
        },
        timestamp: new Date().toISOString(),
      });

      // Si le statut est passé à inactif, publier un événement spécifique
      if (data.etat === 'inactif') {
        await publishEvent('antenne.deactivated', {
          antenneId: id,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: antenne,
        message: 'Antenne mise à jour avec succès',
      });
    } catch (error) {
      console.error('Error updating antenne:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'antenne',
      });
    }
  }

  // DELETE /antennes/:id
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);

      const deleted = await AntenneModel.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Antenne non trouvée',
        });
        return;
      }

      // Publier l'événement sur RabbitMQ
      await publishEvent('antenne.deleted', {
        antenneId: id,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Antenne supprimée avec succès',
      });
    } catch (error) {
      console.error('Error deleting antenne:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de l\'antenne',
      });
    }
  }

  // GET /antennes/ville/:ville
  static async getByVille(req: Request, res: Response): Promise<void> {
    try {
      const ville = req.params.ville as string;
      const antennes = await AntenneModel.findByVille(ville);

      res.json({
        success: true,
        data: antennes,
      });
    } catch (error) {
      console.error('Error fetching antennes by ville:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des antennes',
      });
    }
  }
}
