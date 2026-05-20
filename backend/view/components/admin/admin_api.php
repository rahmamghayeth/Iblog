<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (
    (empty($_SESSION['adminLoggedIn']) || $_SESSION['adminLoggedIn'] !== true)
    && ((int) ($_SESSION['isAdmin'] ?? 0) !== 1)
) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden - admin access required']);
    exit();
}

$_SESSION['adminLoggedIn'] = true;

$backendPath = realpath(__DIR__ . '/../../..');
if ($backendPath === false || !file_exists($backendPath . '/config/database.php')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Config introuvable']);
    exit();
}

require_once $backendPath . '/config/database.php';
require_once $backendPath . '/controller/UserController.php';

if (!isset($cnx) || !($cnx instanceof PDO)) {
    $cnx = getDatabaseConnection();
}

header('Content-Type: application/json');

$action = trim((string) ($_GET['action'] ?? $_POST['action'] ?? ''));

function ensureStatusColumn(PDO $db): void
{
    try {
        $db->query("SELECT status FROM users LIMIT 1");
    } catch (PDOException) {
        $db->exec("ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'");
    }
}

function ensureLabelColumn(PDO $db): void
{
    try {
        $db->query("SELECT label FROM article LIMIT 1");
    } catch (PDOException) {
        $db->exec("ALTER TABLE article ADD COLUMN label VARCHAR(20) NOT NULL DEFAULT 'none'");
    }
}

function articleTableExists(PDO $db): bool
{
    try {
        $db->query("SELECT 1 FROM article LIMIT 1");
        return true;
    } catch (PDOException) {
        return false;
    }
}

function subscriptionTableExists(PDO $db): bool
{
    try {
        $db->query("SELECT 1 FROM subscription LIMIT 1");
        return true;
    } catch (PDOException) {
        return false;
    }
}

function ensureSubscriptionMethodColumn(PDO $db): void
{
    if (!subscriptionTableExists($db)) {
        return;
    }
    try {
        $db->query("SELECT method FROM subscription LIMIT 1");
    } catch (PDOException) {
        $db->exec("ALTER TABLE subscription ADD COLUMN method VARCHAR(30) NOT NULL DEFAULT 'card'");
    }
}

function boolFlag(mixed $value): int
{
    return (int) ($value === '1' || $value === 1 || $value === true || $value === 'true');
}

function premiumUserWhereClause(): string
{
    return "COALESCE(u.isAdmin, 0) = 0
            AND COALESCE(u.status, 'active') <> 'banned'
            AND (u.plan = 'premium' OR COALESCE(u.isPremium, 0) = 1)";
}

function premiumRevenueMembers(PDO $cnx): array
{
    ensureStatusColumn($cnx);

    if (subscriptionTableExists($cnx)) {
        ensureSubscriptionMethodColumn($cnx);
        $sql = "SELECT
                    u.id,
                    u.id AS userId,
                    u.name,
                    u.email,
                    'premium' AS plan,
                    COALESCE(s.amount, 9.00) AS amount,
                    COALESCE(s.currency, 'USD') AS currency,
                    CASE
                        WHEN COALESCE(s.status, '') = 'cancelled' THEN 'cancelled'
                        ELSE 'active'
                    END AS status,
                    COALESCE(s.method, 'card') AS method,
                    COALESCE(s.startedAt, u.createdAt) AS started_at,
                    s.expiresAt AS expires_at
                FROM users u
                LEFT JOIN subscription s
                    ON s.id = (
                        SELECT s2.id
                        FROM subscription s2
                        WHERE s2.userId = u.id
                        ORDER BY
                            CASE WHEN s2.status = 'active' THEN 0 ELSE 1 END,
                            s2.id DESC
                        LIMIT 1
                    )
                WHERE " . premiumUserWhereClause() . "
                ORDER BY
                    CASE
                        WHEN COALESCE(s.status, '') = 'active' THEN 0
                        ELSE 1
                    END,
                    COALESCE(s.startedAt, u.createdAt) DESC,
                    u.id DESC";

        return $cnx->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    $sql = "SELECT
                u.id,
                u.id AS userId,
                u.name,
                u.email,
                'premium' AS plan,
                9.00 AS amount,
                'USD' AS currency,
                'active' AS status,
                'card' AS method,
                u.createdAt AS started_at,
                NULL AS expires_at
            FROM users u
            WHERE " . premiumUserWhereClause() . "
            ORDER BY u.createdAt DESC, u.id DESC";

    return $cnx->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

try {
    switch ($action) {
        case 'get_users':
            ensureStatusColumn($cnx);

            if (articleTableExists($cnx)) {
                $sql = "SELECT u.id, u.name, u.email, u.plan,
                               COALESCE(u.isPremium, 0) AS isPremium,
                               COALESCE(u.isAdmin, 0) AS isAdmin,
                               COALESCE(u.status, 'active') AS status,
                               u.createdAt,
                               u.createdAt AS created_at,
                               (SELECT COUNT(*) FROM article a WHERE a.userId = u.id) AS article_count
                        FROM users u
                        ORDER BY u.id DESC";
            } else {
                $sql = "SELECT id, name, email, plan,
                               COALESCE(isPremium, 0) AS isPremium,
                               COALESCE(isAdmin, 0) AS isAdmin,
                               COALESCE(status, 'active') AS status,
                               createdAt,
                               createdAt AS created_at,
                               0 AS article_count
                        FROM users
                        ORDER BY id DESC";
            }

            $users = $cnx->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['users' => $users]);
            break;

        case 'get_stats':
            $totalUsers = (int) $cnx->query("SELECT COUNT(*) FROM users")->fetchColumn();
            $totalArticles = 0;
            $premiumMembers = premiumRevenueMembers($cnx);
            $premiumCount = count($premiumMembers);
            $activeSubs = count(array_filter(
                $premiumMembers,
                static fn (array $member): bool => strtolower((string) ($member['status'] ?? 'active')) === 'active'
            ));
            $monthlyRevenueValue = array_reduce(
                $premiumMembers,
                static function (float $carry, array $member): float {
                    if (strtolower((string) ($member['status'] ?? 'active')) !== 'active') {
                        return $carry;
                    }

                    return $carry + (float) ($member['amount'] ?? 0);
                },
                0.0
            );

            if (articleTableExists($cnx)) {
                $totalArticles = (int) $cnx->query("SELECT COUNT(*) FROM article")->fetchColumn();
            }

            echo json_encode([
                'total_users' => $totalUsers,
                'total_articles' => $totalArticles,
                'premium_count' => $premiumCount,
                'active_subscriptions' => $activeSubs,
                'monthly_revenue' => '$' . number_format($monthlyRevenueValue, 2),
                'monthly_revenue_value' => $monthlyRevenueValue,
            ]);
            break;

        case 'get_articles':
            if (!articleTableExists($cnx)) {
                echo json_encode(['articles' => []]);
                break;
            }

            ensureLabelColumn($cnx);
            $stmt = $cnx->query(
                "SELECT a.id, a.title,
                        COALESCE(a.category, 'Uncategorized') AS category,
                        COALESCE(a.views, 0) AS views,
                        COALESCE(a.label, 'none') AS label,
                        a.createdAt AS created_at,
                        u.name AS author,
                        u.id AS author_id
                 FROM article a
                 LEFT JOIN users u ON u.id = a.userId
                 ORDER BY a.createdAt DESC"
            );
            echo json_encode(['articles' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_revenue':
            echo json_encode(['members' => premiumRevenueMembers($cnx)]);
            break;

        case 'get_subscriptions':
            if (!subscriptionTableExists($cnx)) {
                echo json_encode(['subscriptions' => []]);
                break;
            }

            ensureSubscriptionMethodColumn($cnx);
            $subs = $cnx->query(
                "SELECT s.id, s.userId, s.plan, s.amount, s.currency, s.status,
                        COALESCE(s.method, 'card') AS method,
                        s.startedAt AS started_at, s.expiresAt AS expires_at,
                        u.name, u.email
                 FROM subscription s
                 LEFT JOIN users u ON u.id = s.userId
                 ORDER BY s.id DESC"
            )->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['subscriptions' => $subs]);
            break;

        case 'create_user':
            $name = trim((string) ($_POST['name'] ?? ''));
            $email = trim((string) ($_POST['email'] ?? ''));
            $password = (string) ($_POST['password'] ?? '');
            $plan = trim((string) ($_POST['plan'] ?? 'free'));
            $isAdmin = boolFlag($_POST['isAdmin'] ?? 0);
            $isPremium = ($plan === 'premium' || boolFlag($_POST['isPremium'] ?? 0) === 1) ? 1 : 0;

            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 4) {
                echo json_encode(['error' => 'Nom, email valide et mot de passe requis']);
                break;
            }

            if (getUserByEmail($cnx, $email)) {
                echo json_encode(['error' => 'Cet email existe deja']);
                break;
            }

            $ok = AddUser($cnx, [
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'plan' => $isPremium ? 'premium' : 'free',
                'isPremium' => $isPremium,
                'isAdmin' => $isAdmin,
            ]);

            echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => 'Unable to create user']);
            break;

        case 'update_user':
            $id = (int) ($_POST['id'] ?? 0);
            $name = trim((string) ($_POST['name'] ?? ''));
            $email = trim((string) ($_POST['email'] ?? ''));
            $password = (string) ($_POST['password'] ?? '');
            $plan = trim((string) ($_POST['plan'] ?? 'free'));
            $isAdmin = boolFlag($_POST['isAdmin'] ?? 0);
            $isPremium = ($plan === 'premium' || boolFlag($_POST['isPremium'] ?? 0) === 1) ? 1 : 0;

            if ($id <= 0 || $name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['error' => 'Donnees utilisateur invalides']);
                break;
            }

            $existing = getUserById($cnx, $id);
            if (!$existing) {
                echo json_encode(['error' => 'Utilisateur introuvable']);
                break;
            }

            $emailOwner = getUserByEmail($cnx, $email);
            if ($emailOwner && (int) ($emailOwner['id'] ?? 0) !== $id) {
                echo json_encode(['error' => 'Cet email appartient deja a un autre compte']);
                break;
            }

            $ok = updateUser($cnx, $id, [
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'plan' => $isPremium ? 'premium' : 'free',
                'isPremium' => $isPremium,
                'isAdmin' => $isAdmin,
            ]);

            echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => 'Unable to update user']);
            break;

        case 'toggle_ban':
            $id = (int) ($_POST['id'] ?? 0);
            if ($id <= 0) {
                echo json_encode(['error' => 'ID invalide']);
                break;
            }

            ensureStatusColumn($cnx);
            $stmt = $cnx->prepare("SELECT status FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $current = $stmt->fetchColumn();
            $newStatus = ($current === 'banned') ? 'active' : 'banned';
            $cnx->prepare("UPDATE users SET status = ? WHERE id = ?")->execute([$newStatus, $id]);
            echo json_encode(['ok' => true, 'new_status' => $newStatus]);
            break;

        case 'delete_user':
            $id = (int) ($_POST['id'] ?? 0);
            if ($id <= 0) {
                echo json_encode(['error' => 'ID invalide']);
                break;
            }

            if ($id === (int) ($_SESSION['user_id'] ?? 0)) {
                echo json_encode(['error' => 'Impossible de supprimer votre propre compte admin']);
                break;
            }

            if (subscriptionTableExists($cnx)) {
                $cnx->prepare("DELETE FROM subscription WHERE userId = ?")->execute([$id]);
            }
            if (articleTableExists($cnx)) {
                $cnx->prepare("DELETE FROM article WHERE userId = ?")->execute([$id]);
            }

            $ok = deleteUser($cnx, $id);
            echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => 'Unable to delete user']);
            break;

        case 'set_label':
            $id = (int) ($_POST['id'] ?? 0);
            $label = trim((string) ($_POST['label'] ?? ''));
            $allowed = ['featured', 'pinned', 'boosted', 'hidden', 'none'];

            if ($id <= 0 || !in_array($label, $allowed, true) || !articleTableExists($cnx)) {
                echo json_encode(['error' => 'Parametres invalides']);
                break;
            }

            ensureLabelColumn($cnx);
            $cnx->prepare("UPDATE article SET label = ? WHERE id = ?")->execute([$label, $id]);
            echo json_encode(['ok' => true]);
            break;

        case 'change_cat':
            $id = (int) ($_POST['id'] ?? 0);
            $cat = trim((string) ($_POST['cat'] ?? ''));

            if ($id <= 0 || $cat === '' || !articleTableExists($cnx)) {
                echo json_encode(['error' => 'Parametres invalides']);
                break;
            }

            $cnx->prepare("UPDATE article SET category = ? WHERE id = ?")->execute([$cat, $id]);
            echo json_encode(['ok' => true]);
            break;

        case 'cancel_sub':
            $id = (int) ($_POST['id'] ?? 0);
            if ($id <= 0) {
                echo json_encode(['error' => 'ID invalide']);
                break;
            }

            $cnx->prepare("UPDATE users SET plan = 'free', isPremium = 0 WHERE id = ?")->execute([$id]);
            if (subscriptionTableExists($cnx)) {
                $cnx->prepare("UPDATE subscription SET status = 'cancelled' WHERE userId = ? AND status = 'active'")->execute([$id]);
            }
            echo json_encode(['ok' => true]);
            break;

        case 'ping':
            echo json_encode([
                'ok' => true,
                'msg' => 'API joignable',
                'admin' => !empty($_SESSION['adminLoggedIn']),
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Action inconnue : ' . htmlspecialchars($action, ENT_QUOTES, 'UTF-8')]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de donnees : ' . $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
}
