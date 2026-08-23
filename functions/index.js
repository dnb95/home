const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Ajoute ici les origines autorisées à appeler la Cloud Function.
// Le site GitHub Pages est autorisé, ainsi que localhost pour les tests.
const ALLOWED_ORIGINS = new Set([
  "https://dnb95.github.io",
  "https://dnb95.github.io/home",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

function isAllowedOrigin(origin) {
  // Les appels serveur-à-serveur n'ont généralement pas d'Origin.
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function applyCors(req, res) {
  const origin = req.get("origin");

  if (origin && isAllowedOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.set("Access-Control-Max-Age", "3600");
}

function getBodyValue(body, keys, fallback = "") {
  for (const key of keys) {
    if (
      body &&
      Object.prototype.hasOwnProperty.call(body, key) &&
      body[key] !== undefined &&
      body[key] !== null
    ) {
      return String(body[key]);
    }
  }

  return fallback;
}

async function findAdmin(adminId) {
  if (!adminId) return null;

  const snap = await db.collection("users").doc(adminId).get();

  if (!snap.exists) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  };
}

async function authorizeRequest(req) {
  // 1) Méthode recommandée : Authorization: Bearer <Firebase ID token>
  const authorization = req.get("authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    const idToken = authorization.slice("Bearer ".length).trim();

    if (idToken) {
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userSnap = await db.collection("users").doc(decoded.uid).get();

        if (!userSnap.exists) {
          return {
            ok: false,
            status: 403,
            error: "Utilisateur Firebase introuvable.",
          };
        }

        const user = userSnap.data() || {};
        const role = String(user.role || user.userRole || "").toLowerCase();

        if (role !== "admin" && role !== "hs") {
          return {
            ok: false,
            status: 403,
            error: "Accès réservé aux administrateurs et HS.",
          };
        }

        return {
          ok: true,
          userId: decoded.uid,
          via: "idToken",
        };
      } catch (error) {
        logger.warn("Échec de validation du token Firebase.", {
          error: error.message,
        });

        return {
          ok: false,
          status: 401,
          error: "Jeton Firebase invalide ou expiré.",
        };
      }
    }
  }

  // 2) Compatibilité avec ton frontend actuel :
  //    le frontend envoie probablement { adminId: ... }.
  //
  //    Cette compatibilité permet au correctif CORS de fonctionner
  //    immédiatement sans casser l'appel existant.
  //    Pour une sécurité maximale, on pourra ensuite passer entièrement
  //    le frontend sur Authorization: Bearer <ID token>.
  const adminId = getBodyValue(req.body, ["adminId", "adminID", "uid"]);

  if (!adminId) {
    return {
      ok: false,
      status: 401,
      error:
        "Authentification requise. Envoyez un Firebase ID token ou adminId.",
    };
  }

  const adminUser = await findAdmin(adminId);

  if (!adminUser) {
    return {
      ok: false,
      status: 403,
      error: "Compte administrateur introuvable.",
    };
  }

  const role = String(
    adminUser.role || adminUser.userRole || ""
  ).toLowerCase();

  if (role !== "admin" && role !== "hs") {
    return {
      ok: false,
      status: 403,
      error: "Accès réservé aux administrateurs et HS.",
    };
  }

  return {
    ok: true,
    userId: adminId,
    via: "adminId",
  };
}

async function loadPushTokens() {
  const snapshot = await db
    .collection("users")
    .where("pushEnabled", "==", true)
    .get();

  const tokenToUserIds = new Map();

  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const rawToken = data.fcmToken;

    if (typeof rawToken !== "string") return;

    const token = rawToken.trim();

    if (!token) return;

    if (!tokenToUserIds.has(token)) {
      tokenToUserIds.set(token, []);
    }

    tokenToUserIds.get(token).push(doc.id);
  });

  return tokenToUserIds;
}

async function removeInvalidTokens(invalidTokens, tokenToUserIds) {
  if (!invalidTokens.length) return 0;

  const refs = [];

  for (const token of invalidTokens) {
    const userIds = tokenToUserIds.get(token) || [];

    for (const userId of userIds) {
      refs.push(db.collection("users").doc(userId));
    }
  }

  if (!refs.length) return 0;

  let batch = db.batch();
  let operations = 0;
  let updated = 0;

  for (const ref of refs) {
    batch.update(ref, {
      pushEnabled: false,
      fcmToken: admin.firestore.FieldValue.delete(),
    });

    operations++;
    updated++;

    if (operations === 450) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  return updated;
}

exports.sendPushNotification = onRequest(
  {
    region: "us-central1",
    invoker: "public",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Méthode HTTP non autorisée. Utilisez POST.",
      });
    }

    const origin = req.get("origin");

    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).json({
        success: false,
        error: "Origine non autorisée.",
      });
    }

    try {
      const authorization = await authorizeRequest(req);

      if (!authorization.ok) {
        return res.status(authorization.status).json({
          success: false,
          error: authorization.error,
        });
      }

      const title = getBodyValue(
        req.body,
        ["title", "notificationTitle"],
        "Nouvelle notification"
      ).trim();

      const message = getBodyValue(
        req.body,
        ["message", "body", "notificationBody"],
        ""
      ).trim();

      const url = getBodyValue(
        req.body,
        ["url", "link", "clickUrl"],
        "https://dnb95.github.io/home/"
      ).trim();

      if (!message) {
        return res.status(400).json({
          success: false,
          error: "Le message de notification est obligatoire.",
        });
      }

      const tokenToUserIds = await loadPushTokens();
      const tokens = Array.from(tokenToUserIds.keys());

      if (!tokens.length) {
        return res.status(200).json({
          success: true,
          message: "Aucun utilisateur activé pour les notifications push.",
          targeted: 0,
          successCount: 0,
          failureCount: 0,
          invalidTokenCount: 0,
        });
      }

      let successCount = 0;
      let failureCount = 0;
      const invalidTokens = [];

      // FCM autorise au maximum 500 tokens par envoi multicast.
      for (let start = 0; start < tokens.length; start += 500) {
        const chunk = tokens.slice(start, start + 500);

        const result = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: {
            title,
            body: message,
          },
          data: {
            title,
            message,
            url,
          },
          webpush: {
            fcmOptions: {
              link: url,
            },
          },
        });

        successCount += result.successCount;
        failureCount += result.failureCount;

        result.responses.forEach((response, index) => {
          if (response.success) return;

          const code = response.error?.code || "";

          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            invalidTokens.push(chunk[index]);
          }

          logger.warn("Échec d'envoi FCM.", {
            tokenIndex: start + index,
            code,
            message: response.error?.message || "Erreur inconnue",
          });
        });
      }

      const invalidTokenCount = await removeInvalidTokens(
        [...new Set(invalidTokens)],
        tokenToUserIds
      );

      return res.status(200).json({
        success: true,
        targeted: tokens.length,
        successCount,
        failureCount,
        invalidTokenCount,
        authorizedUserId: authorization.userId,
      });
    } catch (error) {
      logger.error("Erreur sendPushNotification", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        error: "Erreur interne lors de l'envoi de la notification.",
      });
    }
  }
);
