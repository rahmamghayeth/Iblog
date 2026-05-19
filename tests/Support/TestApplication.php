<?php
declare(strict_types=1);

namespace IBlog\Tests\Support;

use PDO;
use RuntimeException;

final class TestApplication
{
    private static ?string $baseUrl = null;
    private static ?PDO $pdo = null;
    private static ?PDO $adminPdo = null;
    private static ?array $databaseConfig = null;
    private static array $isolatedDatabases = [];
    private static int $isolatedCounter = 0;
    private static $serverProcess = null;
    private static bool $ownsServer = false;
    private static bool $shutdownRegistered = false;

    public static function rootPath(): string
    {
        return dirname(__DIR__, 2);
    }

    public static function runtimeDirectory(): string
    {
        $path = self::rootPath() . DIRECTORY_SEPARATOR . 'tests' . DIRECTORY_SEPARATOR . 'runtime';
        if (!is_dir($path) && !mkdir($path, 0777, true) && !is_dir($path)) {
            throw new RuntimeException('Unable to create test runtime directory.');
        }

        return $path;
    }

    public static function sessionDirectory(): string
    {
        $path = rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR . 'iblog-functional-sessions-' . getmypid();
        if (!is_dir($path) && !mkdir($path, 0777, true) && !is_dir($path)) {
            throw new RuntimeException('Unable to create test session directory.');
        }

        return $path;
    }

    public static function databaseName(): string
    {
        return (string) (self::databaseConfig()['name'] ?? ('ibloglv_test_' . getmypid()));
    }

    public static function databaseDsn(): string
    {
        $config = self::databaseConfig();

        return sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['port'],
            $config['name']
        );
    }

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        self::ensureTestDatabaseExists();
        self::$pdo = self::connectToDatabase(self::databaseName());

        return self::$pdo;
    }

    public static function resetDatabase(): void
    {
        self::$pdo = null;

        $admin = self::adminPdo();
        $database = self::quoteIdentifier(self::databaseName());
        $admin->exec("DROP DATABASE IF EXISTS {$database}");
        $admin->exec("CREATE DATABASE {$database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        $pdo = self::pdo();
        self::createSchema($pdo);
        self::seedBaseData($pdo);
    }

    public static function createIsolatedDatabase(string $label = 'isolated'): PDO
    {
        $sanitizedLabel = preg_replace('/[^a-z0-9_]+/i', '_', strtolower($label)) ?: 'isolated';
        $name = sprintf('ibloglv_%s_%d_%d', $sanitizedLabel, getmypid(), ++self::$isolatedCounter);
        $name = substr($name, 0, 60);

        $admin = self::adminPdo();
        $database = self::quoteIdentifier($name);
        $admin->exec("DROP DATABASE IF EXISTS {$database}");
        $admin->exec("CREATE DATABASE {$database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        self::$isolatedDatabases[] = $name;

        return self::connectToDatabase($name);
    }

    public static function baseUrl(): string
    {
        if (self::$baseUrl === null) {
            $configured = getenv('IBLOG_TEST_BASE_URL');
            self::$baseUrl = rtrim($configured !== false && $configured !== '' ? $configured : self::defaultBaseUrl(), '/');
            self::startServer();
        }

        return self::$baseUrl ?? throw new RuntimeException('Test server did not start.');
    }

    public static function startServer(): void
    {
        $healthUrl = self::$baseUrl . '/backend/view/components/auth/api-auth.php';
        if (self::waitForServer($healthUrl)) {
            return;
        }

        if (!self::canAutoStartServer()) {
            throw new RuntimeException(
                'Test server is not reachable. Start the suite with tests/run-functional-suite.ps1 or provide IBLOG_TEST_BASE_URL.'
            );
        }

        if (!self::spawnServer()) {
            $details = self::serverErrorSummary();
            self::stopServer();
            throw new RuntimeException('Test server did not start correctly.' . ($details !== '' ? ' ' . $details : ''));
        }
    }

    public static function stopServer(): void
    {
        if (self::$ownsServer && is_resource(self::$serverProcess)) {
            @proc_terminate(self::$serverProcess);
            @proc_close(self::$serverProcess);
        }

        self::$serverProcess = null;
        self::$ownsServer = false;
        self::$baseUrl = null;
    }

    public static function createClient(): WebClient
    {
        $configured = getenv('IBLOG_TEST_BASE_URL');
        if ($configured === false || $configured === '') {
            self::bootstrapEnvironment();
            return new WebClient('local://iblog', self::rootPath());
        }

        return new WebClient(self::baseUrl());
    }

    private static function databaseConfig(): array
    {
        if (is_array(self::$databaseConfig)) {
            return self::$databaseConfig;
        }

        if (!function_exists('iblogConfig')) {
            require_once self::rootPath() . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'config.php';
        }

        $appConfig = \iblogConfig()['database'];
        self::$databaseConfig = [
            'host' => (string) (getenv('IBLOG_TEST_DB_HOST') ?: getenv('DB_HOST') ?: $appConfig['host'] ?? '127.0.0.1'),
            'port' => (string) (getenv('IBLOG_TEST_DB_PORT') ?: getenv('DB_PORT') ?: $appConfig['port'] ?? '3306'),
            'user' => (string) (getenv('IBLOG_TEST_DB_USER') ?: getenv('DB_USER') ?: $appConfig['user'] ?? 'root'),
            'pass' => (string) (getenv('IBLOG_TEST_DB_PASS') ?: getenv('DB_PASS') ?: $appConfig['pass'] ?? ''),
            'name' => (string) (getenv('IBLOG_TEST_DB_NAME') ?: ('ibloglv_test_' . getmypid())),
        ];

        return self::$databaseConfig;
    }

    private static function adminPdo(): PDO
    {
        if (self::$adminPdo instanceof PDO) {
            return self::$adminPdo;
        }

        $config = self::databaseConfig();
        $dsn = sprintf(
            'mysql:host=%s;port=%s;charset=utf8mb4',
            $config['host'],
            $config['port']
        );

        self::$adminPdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$adminPdo;
    }

    private static function connectToDatabase(string $databaseName): PDO
    {
        $config = self::databaseConfig();
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['port'],
            $databaseName
        );

        return new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    private static function ensureTestDatabaseExists(): void
    {
        $database = self::quoteIdentifier(self::databaseName());
        self::adminPdo()->exec("CREATE DATABASE IF NOT EXISTS {$database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    private static function quoteIdentifier(string $value): string
    {
        return '`' . str_replace('`', '``', $value) . '`';
    }

    private static function waitForServer(string $url, float $timeoutSeconds = 5.0): bool
    {
        $start = microtime(true);
        do {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HEADER => false,
                CURLOPT_TIMEOUT_MS => 500,
                CURLOPT_CUSTOMREQUEST => 'GET',
            ]);
            curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);

            if ($status > 0) {
                return true;
            }

            usleep(100000);
        } while ((microtime(true) - $start) < $timeoutSeconds);

        return false;
    }

    private static function defaultBaseUrl(): string
    {
        return 'http://127.0.0.1:18080';
    }

    private static function canAutoStartServer(): bool
    {
        $parts = parse_url((string) self::$baseUrl);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $scheme = strtolower((string) ($parts['scheme'] ?? 'http'));

        return $scheme === 'http' && in_array($host, ['127.0.0.1', 'localhost'], true);
    }

    private static function bootstrapEnvironment(): void
    {
        $config = self::databaseConfig();

        self::clearEnvValue('DB_DSN');
        self::setEnvValue('DB_HOST', $config['host']);
        self::setEnvValue('DB_PORT', $config['port']);
        self::setEnvValue('DB_USER', $config['user']);
        self::setEnvValue('DB_PASS', $config['pass']);
        self::setEnvValue('DB_NAME', $config['name']);
        self::setEnvValue('APP_ENV', 'test');
        self::setEnvValue('MAIL_DISABLE', '1');
        self::setEnvValue('IBLOG_TEST_BASE_URL', (string) self::$baseUrl);
    }

    private static function setEnvValue(string $name, string $value): void
    {
        $_ENV[$name] = $value;
        putenv($name . '=' . $value);
    }

    private static function clearEnvValue(string $name): void
    {
        unset($_ENV[$name]);
        putenv($name);
    }

    private static function spawnServer(): bool
    {
        if (self::$serverProcess !== null) {
            return true;
        }

        if (!function_exists('proc_open')) {
            throw new RuntimeException('Cannot auto-start the test server because proc_open is unavailable.');
        }

        $stdout = self::runtimeDirectory() . DIRECTORY_SEPARATOR . 'server.out.log';
        $stderr = self::runtimeDirectory() . DIRECTORY_SEPARATOR . 'server.err.log';
        foreach (self::serverCandidates() as $candidateBaseUrl) {
            self::$baseUrl = $candidateBaseUrl;
            self::bootstrapEnvironment();
            file_put_contents($stdout, '');
            file_put_contents($stderr, '');

            $parts = parse_url($candidateBaseUrl);
            $host = (string) ($parts['host'] ?? '127.0.0.1');
            $port = (int) ($parts['port'] ?? 18080);
            $address = $host . ':' . $port;

            $command = [
                PHP_BINARY,
                '-d',
                'session.save_path=' . self::sessionDirectory(),
                '-S',
                $address,
                '-t',
                self::rootPath(),
            ];

            $descriptors = [
                0 => ['pipe', 'r'],
                1 => ['file', $stdout, 'a'],
                2 => ['file', $stderr, 'a'],
            ];

            $config = self::databaseConfig();
            $baseEnvironment = getenv();
            if (!is_array($baseEnvironment)) {
                $baseEnvironment = [];
            }
            $environment = array_merge($baseEnvironment, $_ENV, [
                'DB_HOST' => $config['host'],
                'DB_PORT' => $config['port'],
                'DB_USER' => $config['user'],
                'DB_PASS' => $config['pass'],
                'DB_NAME' => $config['name'],
                'APP_ENV' => 'test',
                'MAIL_DISABLE' => '1',
                'IBLOG_TEST_BASE_URL' => $candidateBaseUrl,
            ]);
            unset($environment['DB_DSN']);

            $process = @proc_open($command, $descriptors, $pipes, self::rootPath(), $environment, ['bypass_shell' => true]);
            if (!is_resource($process)) {
                continue;
            }

            if (isset($pipes[0]) && is_resource($pipes[0])) {
                fclose($pipes[0]);
            }

            self::$serverProcess = $process;
            self::$ownsServer = true;

            if (self::waitForServer($candidateBaseUrl . '/backend/view/components/auth/api-auth.php', 3.0)) {
                if (!self::$shutdownRegistered) {
                    register_shutdown_function(static function (): void {
                        TestApplication::cleanupDatabases();
                        TestApplication::stopServer();
                    });
                    self::$shutdownRegistered = true;
                }

                return true;
            }

            self::stopOwnedServerProcessOnly();
        }

        return false;
    }

    private static function serverCandidates(): array
    {
        $configured = getenv('IBLOG_TEST_BASE_URL');
        if ($configured !== false && $configured !== '') {
            return [rtrim($configured, '/')];
        }

        $candidates = [];
        for ($port = 18080; $port <= 18089; $port++) {
            $candidates[] = 'http://127.0.0.1:' . $port;
        }

        return $candidates;
    }

    private static function stopOwnedServerProcessOnly(): void
    {
        if (self::$ownsServer && is_resource(self::$serverProcess)) {
            @proc_terminate(self::$serverProcess);
            @proc_close(self::$serverProcess);
        }

        self::$serverProcess = null;
        self::$ownsServer = false;
    }

    private static function serverErrorSummary(): string
    {
        $stderr = self::runtimeDirectory() . DIRECTORY_SEPARATOR . 'server.err.log';
        if (!is_file($stderr)) {
            return '';
        }

        $contents = trim((string) file_get_contents($stderr));
        if ($contents === '') {
            return '';
        }

        $lines = preg_split('/\R/', $contents) ?: [];
        $tail = array_slice($lines, -3);

        return 'Server log: ' . implode(' | ', $tail);
    }

    private static function cleanupDatabases(): void
    {
        try {
            $admin = self::adminPdo();
            $admin->exec('DROP DATABASE IF EXISTS ' . self::quoteIdentifier(self::databaseName()));
            foreach (self::$isolatedDatabases as $databaseName) {
                $admin->exec('DROP DATABASE IF EXISTS ' . self::quoteIdentifier($databaseName));
            }
        } catch (\Throwable) {
        }
    }

    private static function createSchema(PDO $pdo): void
    {
        $statements = [
            "CREATE TABLE users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(160) NOT NULL,
                email VARCHAR(190) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                plan VARCHAR(32) NOT NULL DEFAULT 'free',
                isPremium TINYINT(1) NOT NULL DEFAULT 0,
                isAdmin TINYINT(1) NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'active',
                bio TEXT NULL,
                avatar VARCHAR(255) DEFAULT '',
                cover VARCHAR(255) DEFAULT '',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE user_follow (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                followerId INT UNSIGNED NOT NULL,
                followedId INT UNSIGNED NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_user_follow (followerId, followedId),
                INDEX idx_user_follow_follower (followerId),
                INDEX idx_user_follow_followed (followedId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE article (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                body LONGTEXT NOT NULL,
                category VARCHAR(120) DEFAULT 'General',
                tags TEXT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'draft',
                coverImage VARCHAR(255) DEFAULT '',
                readingTime VARCHAR(32) DEFAULT '1 min',
                likesCount INT NOT NULL DEFAULT 0,
                views INT NOT NULL DEFAULT 0,
                label VARCHAR(64) NOT NULL DEFAULT 'none',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_article_user (userId),
                INDEX idx_article_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE savedarticle (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                articleId INT UNSIGNED NOT NULL,
                savedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_saved_article (userId, articleId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE comment (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                articleId INT UNSIGNED NOT NULL,
                userId INT UNSIGNED NOT NULL,
                body TEXT NOT NULL,
                parentId INT UNSIGNED DEFAULT NULL,
                likesCount INT NOT NULL DEFAULT 0,
                isFlagged TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_comment_article (articleId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE community (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                creatorId INT UNSIGNED NOT NULL,
                name VARCHAR(180) NOT NULL,
                description TEXT NOT NULL,
                icon VARCHAR(32) NOT NULL,
                topics TEXT NULL,
                memberCount INT NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE communitymember (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                communityId INT UNSIGNED NOT NULL,
                userId INT UNSIGNED NOT NULL,
                role VARCHAR(32) NOT NULL DEFAULT 'member',
                joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                isBanned TINYINT(1) NOT NULL DEFAULT 0,
                notificationsOn TINYINT(1) NOT NULL DEFAULT 1,
                UNIQUE KEY uniq_community_member (communityId, userId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE community_message (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                communityId INT UNSIGNED NOT NULL,
                userId INT UNSIGNED NOT NULL,
                message TEXT NOT NULL,
                isDeleted TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE subscription (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                plan VARCHAR(32) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(8) NOT NULL DEFAULT 'TND',
                status VARCHAR(32) NOT NULL DEFAULT 'active',
                method VARCHAR(32) NOT NULL DEFAULT 'card',
                startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expiresAt DATETIME DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ];

        foreach ($statements as $statement) {
            $pdo->exec($statement);
        }
    }

    private static function seedBaseData(PDO $pdo): void
    {
        $password = password_hash('StrongPass1!', PASSWORD_DEFAULT);

        $users = [
            [1, 'Admin Root', 'admin@example.com', $password, 'premium', 1, 1, 'active'],
            [2, 'Free User', 'free@example.com', $password, 'free', 0, 0, 'active'],
            [3, 'Premium User', 'premium@example.com', $password, 'premium', 1, 0, 'active'],
            [4, 'Other Writer', 'other@example.com', $password, 'free', 0, 0, 'active'],
        ];

        $userStmt = $pdo->prepare(
            'INSERT INTO users (id, name, email, password, plan, isPremium, isAdmin, status, bio, avatar, cover, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($users as $user) {
            $userStmt->execute([
                $user[0],
                $user[1],
                $user[2],
                $user[3],
                $user[4],
                $user[5],
                $user[6],
                $user[7],
                'Bio for ' . $user[1],
                '',
                '',
                '2026-01-01 10:00:00',
            ]);
        }

        $articleStmt = $pdo->prepare(
            'INSERT INTO article (id, userId, title, body, category, tags, status, coverImage, readingTime, likesCount, views, label, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $articleStmt->execute([
            1,
            4,
            'Searchable Article Alpha',
            'This published article contains alpha keyword content for search and comment tests.',
            'AI',
            'alpha,search',
            'published',
            '',
            '2 min',
            0,
            12,
            'none',
            '2026-01-10 09:00:00',
        ]);
        $articleStmt->execute([
            2,
            4,
            'Community Search Story',
            'A second published article focused on community workflows and search results.',
            'Culture',
            'community,filter',
            'published',
            '',
            '3 min',
            0,
            4,
            'none',
            '2026-01-11 10:00:00',
        ]);
        $articleStmt->execute([
            3,
            2,
            'Existing Draft',
            'This draft belongs to the free user and should not appear in public search.',
            'General',
            'draft',
            'draft',
            '',
            '1 min',
            0,
            0,
            'none',
            '2026-01-12 11:00:00',
        ]);

        $communityStmt = $pdo->prepare(
            'INSERT INTO community (id, creatorId, name, description, icon, topics, memberCount, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $communityStmt->execute([
            1,
            3,
            'Quality Writers',
            'A community for premium and free writers.',
            'QW',
            'writing,quality,community',
            1,
            '2026-01-15 08:00:00',
        ]);

        $communityMemberStmt = $pdo->prepare(
            'INSERT INTO communitymember (communityId, userId, role, joinedAt, isBanned, notificationsOn)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $communityMemberStmt->execute([1, 3, 'creator', '2026-01-15 08:05:00', 0, 1]);

        $subscriptionStmt = $pdo->prepare(
            'INSERT INTO subscription (userId, plan, amount, currency, status, method, startedAt, expiresAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $subscriptionStmt->execute([3, 'premium', 9.00, 'TND', 'active', 'card', '2026-01-01 00:00:00', '2026-02-01 00:00:00']);
        $subscriptionStmt->execute([1, 'premium', 9.00, 'TND', 'active', 'card', '2026-01-01 00:00:00', '2026-02-01 00:00:00']);
    }
}
