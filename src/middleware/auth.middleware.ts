import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

// Interface pour le token décodé de Keycloak
interface KeycloakToken {
  exp: number;
  iat: number;
  sub: string;
  preferred_username: string;
  email: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
}

// Étendre l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: KeycloakToken;
    }
  }
}

// URL interne pour récupérer les clés (accessible depuis Docker)
const keycloakInternalUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
// URL publique pour la vérification de l'issuer (celle utilisée par le frontend)
const keycloakPublicUrl = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const keycloakRealm = process.env.KEYCLOAK_REALM || 'konitys';

// Client JWKS pour récupérer les clés publiques de Keycloak
const jwksClient = jwksRsa({
  jwksUri: `${keycloakInternalUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// Fonction pour récupérer la clé de signature
const getSigningKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // En mode développement, permettre de désactiver l'auth
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    req.user = {
      exp: 0,
      iat: 0,
      sub: 'dev-user',
      preferred_username: 'developer',
      email: 'dev@konitys.local',
      realm_access: { roles: ['admin'] },
    };
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Token d\'authentification manquant',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await new Promise<KeycloakToken>((resolve, reject) => {
      jwt.verify(
        token,
        getSigningKey,
        {
          algorithms: ['RS256'],
          issuer: `${keycloakPublicUrl}/realms/${keycloakRealm}`,
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded as KeycloakToken);
          }
        }
      );
    });

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Token invalide ou expiré',
    });
  }
};

// Middleware pour vérifier un rôle spécifique
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié',
      });
      return;
    }

    const realmRoles = req.user.realm_access?.roles || [];
    const clientRoles = req.user.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || 'konitys-api']?.roles || [];

    if (!realmRoles.includes(role) && !clientRoles.includes(role)) {
      res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes',
      });
      return;
    }

    next();
  };
};
