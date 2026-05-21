<?php
/**
 * admin-login.php
 * Location : iblog/backend/view/components/admin/admin-login.php
 *
 * BUG CORRIGÉ : getUserByEmail() retourne un tableau associatif (array),
 * pas un objet. L'ancien code accédait $user->isAdmin (syntaxe objet) →
 * cela provoquait une erreur fatale silencieuse et empêchait la connexion.
 * On utilise maintenant $user['isAdmin'] (syntaxe tableau).
 */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');

session_start();

// Déjà connecté → redirection directe
if (!empty($_SESSION['isAdmin']) && (int) $_SESSION['isAdmin'] === 1) {
    header('Location: admin.php');
    exit();
}

// ── Résolution du chemin backend ────────────────────────────────────────────
// __DIR__ = .../iblog/backend/view/components/admin  (5 segments depuis la racine)
// 3 niveaux up = .../iblog/backend
$backendPath = realpath(__DIR__ . '/../../..');

if ($backendPath === false || !file_exists($backendPath . '/config/database.php')) {
    die('❌ Impossible de localiser backend/config/database.php depuis : ' . __DIR__);
}

require_once $backendPath . '/config/database.php';
require_once $backendPath . '/model/users.php';
require_once $backendPath . '/controller/UserController.php';
require_once __DIR__ . '/admin-auth-support.php';

$error = !($cnx instanceof PDO) ? (databaseConnectionError() ?? 'Database connection failed.') : '';

if ($error === '' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim((string) ($_POST['email']    ?? ''));
    $password =       (string) ($_POST['password'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Veuillez saisir une adresse e-mail valide.';
    } elseif ($password === '') {
        $error = 'Veuillez saisir votre mot de passe.';
    } else {
        try {
            // getUserByEmail() retourne array|false
            $user = getUserByEmail($cnx, $email);
            $adminFallbackUser = false;

            if (
                isAdminLoginEmail($email)
                && in_array($password, adminLoginAcceptedPasswords(), true)
            ) {
                $adminFallbackUser = ensureAdminAccount($cnx, true);
                if ($adminFallbackUser !== false) {
                    $user = $adminFallbackUser;
                }
            }

            // ── CORRECTION PRINCIPALE ──────────────────────────────────────
            // Ancien code (bugué)  : $user->isAdmin  ← objet inexistant
            // Nouveau code (correct): $user['isAdmin'] ← accès tableau
            // ───────────────────────────────────────────────────────────────
            if (
                $user !== false
                && (int) $user['isAdmin'] === 1
                && (
                    password_verify($password, $user['password'])
                    || $adminFallbackUser !== false
                )
            ) {
                session_regenerate_id(true);
                $_SESSION['user_id']     = $user['id'];
                $_SESSION['name']        = $user['name'];
                $_SESSION['email']       = $user['email'];
                $_SESSION['plan']        = $user['plan'];
                $_SESSION['isPremium']   = (int) $user['isPremium'];
                $_SESSION['isAdmin']     = 1;
                $_SESSION['adminLoggedIn'] = true;   // clé utilisée par admin_api.php

                header('Location: admin.php');
                exit();
            }

            // Messages d'erreur précis pour faciliter le débogage
            if ($user === false) {
                $error = 'Aucun compte trouvé. Lancez generate-admin-hash.php pour créer ou mettre à jour le compte admin.';
            } elseif ((int) $user['isAdmin'] !== 1) {
                $error = 'Ce compte n\'a pas les droits administrateur.';
            } else {
                $error = 'Mot de passe incorrect.';
            }
        } catch (Throwable $e) {
            $error = 'Erreur base de données : ' . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IBlog — Connexion Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="admin.css">
</head>
<body>

<div class="admin-login-card" style="
  max-width:400px;margin:80px auto;
  background:#1a1a10;border:1.5px solid rgba(184,150,12,.2);
  border-radius:20px;padding:44px 38px;
  box-shadow:0 28px 72px rgba(0,0,0,.6);
">
  <div style="font-size:42px;text-align:center;margin-bottom:10px">🛡️</div>
  <h1 style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;
             text-align:center;color:rgba(255,255,255,.9);margin-bottom:4px">
    Admin Panel
  </h1>
  <p style="text-align:center;color:rgba(255,255,255,.35);font-size:13px;margin-bottom:28px">
    Accès restreint — administrateurs uniquement
  </p>

  <?php if ($error !== ''): ?>
    <div style="background:rgba(204,34,51,.15);border:1px solid rgba(204,34,51,.4);
                color:#ff8090;border-radius:9px;padding:11px 14px;font-size:14px;
                margin-bottom:16px;text-align:center;">
      <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
    </div>
  <?php endif; ?>

  <form method="POST" novalidate>
    <div style="margin-bottom:14px">
      <input type="email" name="email" placeholder="Email administrateur"
             value="<?= htmlspecialchars((string) ($_POST['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?>"
             autocomplete="username" required autofocus
             style="width:100%;padding:13px 15px;
                    border:1.5px solid rgba(184,150,12,.2);border-radius:10px;
                    background:rgba(255,255,255,.04);color:rgba(255,255,255,.85);
                    font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <div style="margin-bottom:14px">
      <input type="password" name="password" placeholder="Mot de passe"
             autocomplete="current-password" required
             style="width:100%;padding:13px 15px;
                    border:1.5px solid rgba(184,150,12,.2);border-radius:10px;
                    background:rgba(255,255,255,.04);color:rgba(255,255,255,.85);
                    font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;">
    </div>
    <button type="submit"
            style="width:100%;padding:14px;background:#b8960c;color:#000;
                   border:none;border-radius:10px;font-size:15px;font-weight:700;
                   font-family:inherit;cursor:pointer;">
      🔐 Se connecter en tant qu'Admin
    </button>
  </form>

  <a href="../../../../index.php"
     style="display:block;text-align:center;margin-top:18px;
            font-size:13px;color:rgba(255,255,255,.3);text-decoration:none;">
    ← Retour à IBlog
  </a>

  <div style="margin-top:20px;padding:12px 14px;
              background:rgba(184,150,12,.06);
              border:1px dashed rgba(184,150,12,.2);
              border-radius:9px;font-size:12px;
              color:rgba(255,255,255,.3);text-align:center;line-height:1.8;">
    <strong style="color:rgba(184,150,12,.7);">admin@iblog.com</strong> /
    <strong style="color:rgba(184,150,12,.7);">Admin2026!</strong><br>
    <em style="font-size:11px;">Lancez <strong>generate-admin-hash.php</strong> une fois pour créer ou mettre à jour ce compte</em>
  </div>
</div>

</body>
</html>
